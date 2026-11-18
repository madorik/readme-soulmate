import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { useNav } from "../nav";

// next/link 대신: 누르면 미니앱 화면 쌓기(src/nav.tsx)로 옮긴다. 주소창·히스토리는 건드리지 않는다
type Href = string | { pathname?: string; query?: Record<string, string | number | undefined> };
type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: Href; prefetch?: boolean | null; scroll?: boolean; replace?: boolean; children?: ReactNode };

function toPath(href: Href): string {
  if (typeof href === "string") return href;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(href.query ?? {})) if (v != null) q.set(k, String(v));
  const qs = q.toString();
  return `${href.pathname ?? "/"}${qs ? `?${qs}` : ""}`;
}

export default function Link({ href, prefetch: _p, scroll: _s, replace, onClick, ...rest }: Props) {
  const { navigate } = useNav();
  const path = toPath(href);
  return (
    <a
      href={path}
      {...rest}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        e.preventDefault();
        navigate(path, { replace });
      }}
    />
  );
}
