import { useEffect, useState } from "react";
import { SwipeTabs } from "@/components/SwipeTabs";
import type { RoutePattern } from "@/lib/pages/routes";
import { api, ApiError } from "./api";
import { useNav } from "./nav";
import { Failed, Loading } from "./ui";
import { ONBOARDING, VIEWS } from "./views";

// 앱 화면 하나: 서버가 웹 페이지와 같은 loader로 읽어 준 데이터(/api/t/page)를 같은 화면 조각으로 그린다.
// 한 번 본 화면은 먼저 그려 두고 새로 읽는다(뒤로 갈 때 빈 화면 없이). redirect는 그 주소로, 로그인이 풀렸으면 시작 화면으로

type PageOk = { pattern: RoutePattern; data: Record<string, unknown> };
type PageResult = PageOk | { redirect: string } | { notFound: true };

const cache = new Map<string, PageOk>();

export function PageScreen({ path }: { path: string }) {
  const nav = useNav();
  const [page, setPage] = useState<PageOk | null>(() => cache.get(path) ?? null);
  const [failed, setFailed] = useState(false);
  const [n, setN] = useState(0);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    api<PageResult>(`page?path=${encodeURIComponent(path)}`)
      .then((r) => {
        if (!alive) return;
        if ("redirect" in r) {
          if (r.redirect === "/" || r.redirect.startsWith("/?") || r.redirect.startsWith("/login")) nav.reset(["/start"]);
          else nav.navigate(r.redirect, { replace: true });
          return;
        }
        if ("notFound" in r) {
          setFailed(true);
          return;
        }
        cache.set(path, r);
        setPage(r);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        if (e instanceof ApiError && e.status === 401) nav.reset(["/start"]);
        else setFailed(true);
      });
    return () => {
      alive = false;
    };
    // nav는 화면마다 바뀌므로 넣지 않는다(version으로 다시 읽는다)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, nav.version, n]);

  if (!page) {
    return <main className="screen !pb-0">{failed ? <Failed onRetry={() => setN((v) => v + 1)} /> : <Loading />}</main>;
  }
  const View = VIEWS[page.pattern];
  if (!View) return <main className="screen !pb-0"><Failed onRetry={() => setN((v) => v + 1)} /></main>;
  if (ONBOARDING.has(page.pattern)) {
    return (
      <main className="screen !pt-0 bg-paper">
        <View {...page.data} />
      </main>
    );
  }
  return (
    <main className="screen !pb-0 overflow-x-clip">
      <View {...page.data} />
      <SwipeTabs />
    </main>
  );
}
