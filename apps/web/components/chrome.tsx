import Link from "next/link";
import type { T } from "@/lib/i18n";
import { Icon, MarkerCircle } from "./marks";

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

/** 로고: README, ME에 붉은 손그림 동그라미 */
export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <span role="img" aria-label="README" className="wordmark inline-flex items-baseline leading-[44px]" style={{ fontSize: size }}>
      READ
      <span className="relative pl-[1px]">
        ME
        <MarkerCircle pad={[Math.round(size * 0.3), Math.round(size * 0.12)]} width={size >= 30 ? 2.2 : 1.9} />
      </span>
    </span>
  );
}

export function TabBar({ active, t }: { active: "home" | "people" | "me" | "privacy"; t: T }) {
  const tabs = [
    { key: "home", href: "/home", icon: "calendar", label: t("nav.home") },
    { key: "people", href: "/people", icon: "people", label: t("nav.people") },
    { key: "me", href: "/me", icon: "card", label: t("nav.me") },
    { key: "privacy", href: "/privacy", icon: "lock", label: t("nav.privacy") },
  ] as const;
  return (
    <nav
      aria-label="menu"
      className="sticky bottom-0 mt-auto grid grid-cols-4 border-t border-rule bg-white/95 px-2 pt-1.5 backdrop-blur"
      style={{ paddingBottom: "max(var(--sab), 10px)" }}
    >
      {tabs.map((tab) => {
        const on = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={on ? "page" : undefined}
            className={`flex h-[50px] flex-col items-center justify-center gap-[3px] whitespace-nowrap text-[11px] ${on ? "font-bold text-ink" : "font-medium text-muted"}`}
          >
            <Icon name={tab.icon} strokeWidth={on ? 1.9 : 1.6} />
            {tab.label}
          </Link>
        );
      })}
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
