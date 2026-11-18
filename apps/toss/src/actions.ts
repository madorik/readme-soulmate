import { api, forgetToken } from "./api";
import { navRef } from "./nav";

// 앱 화면 조각의 서버 액션(@/app/actions/<모듈>)을 부르는 함수. vite.config.ts가 그 모듈을 이 함수를 부르는 것으로 바꿔 끼운다.
// 서버(/api/t/action)가 진짜 액션을 토스 세션으로 부르고, 끝나면 지금 화면을 다시 읽는다(웹의 revalidatePath처럼). redirect는 화면 이동으로

type Result = { ok: true; value: unknown } | { ok: false; redirect?: string; notFound?: true; error?: string };

function encode(arg: unknown): unknown {
  if (typeof FormData !== "undefined" && arg instanceof FormData) {
    return { $form: [...arg.entries()].map(([k, v]) => [k, typeof v === "string" ? v : ""]) };
  }
  return arg;
}

export async function callAction(moduleName: string, name: string, args: unknown[]): Promise<unknown> {
  const r = await api<Result>(`action/${moduleName}/${name}`, { json: { args: args.map(encode) } });
  const nav = navRef.current;
  if (r.ok) {
    nav?.bump();
    return r.value;
  }
  if (r.redirect) {
    // 로그아웃·계정 삭제(웹은 첫 화면 "/"로 보낸다): 토큰을 잊고 시작 화면으로
    if (r.redirect === "/" || r.redirect === "/start" || r.redirect.startsWith("/?")) {
      await forgetToken();
      nav?.reset(["/start"]);
      return undefined;
    }
    nav?.bump();
    nav?.navigate(r.redirect);
    return undefined;
  }
  throw new Error(r.error ?? "action failed");
}
