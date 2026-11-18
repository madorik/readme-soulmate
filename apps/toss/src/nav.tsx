import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { closeApp, onBack, openExternal } from "./bridge";

// 화면 이동: 앱(웹)과 같은 주소(/home, /people/123 …)를 쌓는다. 브라우저 주소·히스토리는 바꾸지 않는다(토스 정책).
// 탭 주소로 가면 쌓인 것을 비우고, 바로 아래 화면 주소로 가면 내려간다(앱 화면의 닫기·뒤로 링크가 그대로 맞게).
// 토스 네비게이션 바 뒤로가기·안드로이드 백버튼은 맨 위 화면을 내리고, 맨 처음 화면이면 미니앱을 닫는다

export const TAB_PATHS = ["/home", "/people", "/me", "/privacy"];

/** 우리 사이트 주소 → 미니앱 안 주소. 약관·처리방침은 토스 화면 안에서 */
export function localPath(href: string): string | null {
  // 화면 안 위치(#)는 쓰지 않는다
  let path = href.split("#")[0];
  const m = path.match(/^https?:\/\/remember-you\.watalabs\.com(\/.*)?$/);
  if (m) path = m[1] || "/";
  else if (/^[a-z]+:/i.test(path)) return null;
  if (!path.startsWith("/")) return null;
  if (path.startsWith("/privacy-policy")) return "/legal/privacy";
  if (path.startsWith("/terms")) return "/legal/terms";
  if (path === "/" || path.startsWith("/?")) return "/home";
  return path;
}

interface Nav {
  /** 맨 위 화면 주소(쿼리 포함) */
  path: string;
  depth: number;
  /** 앱 화면 링크·router.push처럼: 탭이면 비우고, 바로 아래 화면이면 내려가고, 아니면 쌓는다 */
  navigate: (href: string, opts?: { replace?: boolean }) => void;
  push: (path: string) => void;
  replace: (path: string) => void;
  back: () => void;
  reset: (paths: string[]) => void;
  /** 저장(서버 액션) 뒤 지금 화면을 다시 읽게 하는 숫자 */
  version: number;
  bump: () => void;
}

const NavContext = createContext<Nav | null>(null);

/** React 밖(서버 액션 부르기)에서 쓰는 지금 Nav */
export const navRef: { current: Nav | null } = { current: null };

export function useNav(): Nav {
  const v = useContext(NavContext);
  if (!v) throw new Error("NavProvider missing");
  return v;
}

export function NavProvider({ initial, children }: { initial: string[]; children: React.ReactNode }) {
  const [stack, setStack] = useState<string[]>(initial);
  const [version, setVersion] = useState(0);
  const stackRef = useRef(stack);
  stackRef.current = stack;

  const back = useCallback(() => {
    const s = stackRef.current;
    if (s.length > 1) setStack(s.slice(0, -1));
    else if (s[0] !== "/home" && TAB_PATHS.includes(s[0].split("?")[0])) setStack(["/home"]);
    else void closeApp();
  }, []);

  const navigate = useCallback((href: string, opts?: { replace?: boolean }) => {
    const path = localPath(href);
    if (!path) {
      if (/^(https?|mailto|tel):/i.test(href)) void openExternal(href);
      return;
    }
    const s = stackRef.current;
    const pathname = path.split("?")[0];
    if (TAB_PATHS.includes(pathname)) setStack([path]);
    else if (s.length > 1 && s[s.length - 2] === path) setStack(s.slice(0, -1));
    else if (opts?.replace) setStack([...s.slice(0, -1), path]);
    else if (s[s.length - 1] !== path) setStack([...s, path]);
  }, []);

  useEffect(() => {
    const off = onBack(back);
    return () => off();
  }, [back]);
  // 개발(브라우저): Esc가 뒤로가기
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && back();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [back]);

  const value = useMemo<Nav>(
    () => ({
      path: stack[stack.length - 1] ?? "/home",
      depth: stack.length,
      navigate,
      push: (p) => setStack((s) => [...s, p]),
      replace: (p) => setStack((s) => [...s.slice(0, -1), p]),
      back,
      reset: (paths) => setStack(paths.length ? paths : ["/home"]),
      version,
      bump: () => setVersion((v) => v + 1),
    }),
    [stack, navigate, back, version],
  );
  navRef.current = value;

  // 화면이 바뀌면 맨 위부터
  const top = stack[stack.length - 1];
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [stack.length, top]);

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}
