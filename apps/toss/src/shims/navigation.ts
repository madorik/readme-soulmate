import { useMemo } from "react";
import { navRef, useNav } from "../nav";

// next/navigation 대신(앱 화면 조각이 쓰는 것만): useRouter·usePathname·useSearchParams. 서버 전용 redirect·notFound는 화면 이동으로

export function useRouter() {
  const nav = useNav();
  return useMemo(
    () => ({
      push: (href: string, _opts?: { scroll?: boolean }) => nav.navigate(href),
      replace: (href: string, _opts?: { scroll?: boolean }) => nav.navigate(href, { replace: true }),
      back: () => nav.back(),
      forward: () => {},
      refresh: () => nav.bump(),
      prefetch: (_href?: string) => {},
    }),
    [nav],
  );
}

export function usePathname(): string {
  return useNav().path.split("?")[0];
}

export function useSearchParams(): URLSearchParams {
  const { path } = useNav();
  return useMemo(() => new URLSearchParams(path.split("?")[1] ?? ""), [path]);
}

export function redirect(href: string): never {
  navRef.current?.navigate(href, { replace: true });
  throw new Error("redirect");
}

export function notFound(): never {
  throw new Error("not found");
}
