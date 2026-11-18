import { closeView, Environment, getOperationalEnvironment, getSchemeUri, graniteEvent, openURL, requestPermission, SafeArea, Share, Storage, User } from "@apps-in-toss/web-framework";

// 토스 앱 기능(브릿지). 브라우저에서 열면(개발) 브릿지가 없어 실패하므로 브라우저 기능으로 대신한다

/** 토스 앱 안(실제 서비스·샌드박스)에서 열렸는지 */
export function inToss(): boolean {
  try {
    const env = getOperationalEnvironment();
    return env === "toss" || env === "sandbox";
  } catch {
    return false;
  }
}

export async function loadValue(key: string): Promise<string | null> {
  try {
    return await Storage.getItem(key);
  } catch {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }
}

export async function saveValue(key: string, value: string | null): Promise<void> {
  try {
    if (value == null) await Storage.removeItem(key);
    else await Storage.setItem(key, value);
  } catch {
    try {
      if (value == null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    } catch {
      /* 저장 못 해도 이번 실행은 그대로 쓴다 */
    }
  }
}

/** 서버로 보낼 일회용 코드(사용자 식별키 교환용). 토스 밖이면 null */
export async function authCode(): Promise<string | null> {
  try {
    const { code } = await User.createAnonymousKeyAuthCode();
    return code || null;
  } catch {
    return null;
  }
}

/** 바깥 사이트는 토스 화면 안에서 열지 않고 기기 브라우저로 연다 */
export async function openExternal(url: string): Promise<void> {
  try {
    await openURL(url);
  } catch {
    window.open(url, "_blank", "noopener");
  }
}

export async function closeApp(): Promise<void> {
  try {
    await closeView();
  } catch {
    /* 브라우저에서는 닫을 창이 없다 */
  }
}

/** 토스 네비게이션 바 뒤로가기·안드로이드 백버튼. 구독하면 기본 동작이 막히므로 handler가 화면을 되돌리거나 앱을 닫는다 */
export function onBack(handler: () => void): () => void {
  try {
    // 브라우저(브릿지 없음)에서는 함수가 아닌 값이 올 수 있다
    const off: unknown = graniteEvent.addEventListener("backEvent", { onEvent: handler, onError: () => {} });
    return typeof off === "function" ? (off as () => void) : () => {};
  } catch {
    return () => {};
  }
}

/** 마이크 권한(녹음 직전에만 묻는다). 토스 밖에서는 브라우저가 따로 묻는다 */
export async function askMicrophone(): Promise<boolean> {
  if (!inToss()) return true;
  try {
    return (await requestPermission({ name: "microphone", access: "access" })) === "allowed";
  } catch {
    return false;
  }
}

/** 아래 안전 영역(홈 막대) 높이. 토스가 알려 주는 값을 CSS 변수로 둔다 */
export function watchSafeArea(): void {
  const apply = (bottom: number) => document.documentElement.style.setProperty("--safe-area-inset-bottom", `${Math.max(0, bottom)}px`);
  try {
    apply(SafeArea.get().bottom);
    SafeArea.subscribe({ onEvent: (i) => apply(i.bottom) });
  } catch {
    /* 브라우저: env(safe-area-inset-bottom)만 쓴다 */
  }
}

/** 이 미니앱 이름(intoss://<이름>). apps-in-toss.config.ts의 appName과 같다 */
export const APP_NAME = "remember-you";

/**
 * 처음 열 때 받은 값 하나(공유 링크 intoss://remember-you/r?ask=… 의 ask 같은 것).
 * 토스가 주는 처음 주소, 테스트 스킴의 queryParams(JSON), 화면 주소 순으로 찾는다
 */
export function openedParam(name: string): string | null {
  const sources: string[] = [];
  try {
    sources.push(Environment.initialURL);
  } catch {
    /* 브라우저 */
  }
  try {
    sources.push(getSchemeUri());
  } catch {
    /* 브라우저 */
  }
  sources.push(window.location.href);
  for (const raw of sources) {
    if (!raw) continue;
    try {
      const u = new URL(raw);
      const direct = u.searchParams.get(name);
      if (direct) return direct;
      const packed = u.searchParams.get("queryParams");
      if (packed) {
        const v = (JSON.parse(packed) as Record<string, unknown>)[name];
        if (typeof v === "string" && v) return v;
      }
    } catch {
      /* 다음 것 */
    }
  }
  return null;
}

/**
 * 토스 공유 링크로 감싸 공유 시트를 연다. 토스 밖(개발)에서는 브라우저 공유나 복사로 대신한다.
 * 돌려주는 값: 공유 시트를 열었으면 "shared", 복사했으면 "copied", 못 했으면 "failed"
 */
export async function shareDeepLink(path: string, text: string): Promise<"shared" | "copied" | "failed"> {
  if (inToss()) {
    try {
      const link = await Share.createLink({ path });
      await Share.sendMessage({ message: `${text}\n${link}` });
      return "shared";
    } catch {
      return "failed";
    }
  }
  const message = `${text}\n${path}`;
  try {
    if (navigator.share) {
      await navigator.share({ text: message });
      return "shared";
    }
  } catch {
    /* 닫았거나 못 씀: 복사로 */
  }
  try {
    await navigator.clipboard.writeText(message);
    return "copied";
  } catch {
    return "failed";
  }
}
