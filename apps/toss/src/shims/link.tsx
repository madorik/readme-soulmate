import type { AnchorHTMLAttributes, ReactNode } from "react";

// next/link 대신. 토스판은 주소로 화면을 옮기지 않으므로(src/nav.tsx) 평범한 <a>만 그리고, 누르면 main.tsx가 막는다
type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string | { pathname?: string }; prefetch?: boolean; scroll?: boolean; replace?: boolean; children?: ReactNode };

export default function Link({ href, prefetch: _p, scroll: _s, replace: _r, ...rest }: Props) {
  return <a href={typeof href === "string" ? href : (href.pathname ?? "#")} {...rest} />;
}
