import { useEffect, useState } from "react";
import { resumeSession } from "./api";
import { openedParam } from "./bridge";
import { NavProvider, useNav } from "./nav";
import { PageScreen } from "./page";
import { Answer } from "./screens/Answer";
import { Legal } from "./screens/Legal";
import { LinkAccount } from "./screens/LinkAccount";
import { Start } from "./screens/Start";
import { Loading } from "./ui";

// 미니앱 화면: 앱과 같은 주소의 앱 화면(PageScreen) + 토스에만 있는 것(시작·계정 연결·약관·물어보기 답하기)

function Screen() {
  const { path } = useNav();
  const pathname = path.split("?")[0];
  if (pathname === "/start") return <Start />;
  if (pathname === "/link") return <LinkAccount />;
  if (pathname === "/legal/privacy") return <Legal key="privacy" doc="privacy" />;
  if (pathname === "/legal/terms") return <Legal key="terms" doc="terms" />;
  if (pathname.startsWith("/r/")) return <Answer key={pathname} token={decodeURIComponent(pathname.slice(3))} />;
  return <PageScreen key={path} path={path} />;
}

/** 처음 열 때: 물어보기 링크면 답하기, 이 토스 계정으로 쓰던 기억해유가 있으면 홈, 없으면 시작 화면 */
export function App() {
  const [initial, setInitial] = useState<string[] | null>(null);
  useEffect(() => {
    const ask = openedParam("ask");
    if (ask && /^[\w-]{8,128}$/.test(ask)) {
      setInitial([`/r/${ask}`]);
      return;
    }
    resumeSession()
      .then((ok) => setInitial(ok ? ["/home"] : ["/start"]))
      .catch(() => setInitial(["/start"]));
  }, []);
  if (!initial) {
    return (
      <main className="screen">
        <Loading />
      </main>
    );
  }
  return (
    <NavProvider initial={initial}>
      <Screen />
    </NavProvider>
  );
}
