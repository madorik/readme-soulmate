import Link from "next/link";
import type { T } from "@/lib/i18n";
import { Icon } from "./marks";

/** 위쪽 줄: 뒤로(또는 닫기) · 가운데 글 · 오른쪽 자리 */
export function TopBar({ back, close, label, center, right }: { back?: string; close?: string; label: string; center?: React.ReactNode; right?: React.ReactNode }) {
  const href = back ?? close;
  return (
    <div className="flex min-h-11 items-center justify-between px-3">
      {href ? (
        <Link href={href} aria-label={label} className="flex h-11 w-11 items-center justify-center">
          <Icon name={back ? "back" : "close"} size={back ? 24 : 22} />
        </Link>
      ) : (
        <span className="w-11" />
      )}
      {center ?? null}
      {right ?? <span className="w-11" />}
    </div>
  );
}

/** 로고: READ + 하늘 그라데이션 알약 안의 ME */
export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <span role="img" aria-label="README" className="wordmark inline-flex items-center gap-[0.12em] leading-[44px]" style={{ fontSize: size }}>
      READ
      <span className="grad rounded-[0.36em] px-[0.26em] leading-[1.32]" style={{ fontSize: Math.round(size * 0.86) }}>
        ME
      </span>
    </span>
  );
}

/** 아래쪽에 떠 있는 흰 탭 막대. fab: 막대 바로 위 오른쪽에 떠 있는 버튼(사람들 화면의 직접 적기 등) */
export function TabBar({ active, t, fab }: { active: "home" | "people" | "me" | "privacy"; t: T; fab?: React.ReactNode }) {
  const tabs = [
    { key: "home", href: "/home", icon: "calendar", label: t("nav.home") },
    { key: "people", href: "/people", icon: "people", label: t("nav.people") },
    { key: "me", href: "/me", icon: "card", label: t("nav.me") },
    { key: "privacy", href: "/privacy", icon: "settings", label: t("nav.privacy") },
  ] as const;
  return (
    <nav
      aria-label="menu"
      className="sticky bottom-0 z-30 mt-auto px-4 pt-3"
      style={{ paddingBottom: "max(var(--sab), 14px)", background: "linear-gradient(to top, var(--color-bg) 60%, rgb(243 248 255 / 0))" }}
    >
      {fab ? <div className="absolute bottom-full right-4">{fab}</div> : null}
      <div className="grid h-[66px] grid-cols-4 rounded-[26px] bg-white px-1 shadow-[0_8px_24px_rgba(34,48,74,0.09),0_0_0_1px_rgba(34,48,74,0.04)]">
        {tabs.map((tab) => {
          const on = tab.key === active;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={on ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-[3px] whitespace-nowrap text-[11.5px] ${on ? "font-bold text-accent" : "font-medium text-muted"}`}
            >
              <Icon name={tab.icon} strokeWidth={on ? 2.1 : 1.7} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Notice({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "red" | "ok" }) {
  const color = tone === "red" ? "text-red" : tone === "ok" ? "text-ok" : "text-muted";
  return (
    <p role={tone === "red" ? "alert" : "status"} className={`text-[13.5px] leading-[1.5] ${color}`}>
      {children}
    </p>
  );
}
