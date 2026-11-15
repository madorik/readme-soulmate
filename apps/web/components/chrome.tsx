import Link from "next/link";
import { BRAND, type Locale } from "@readme/core";
import type { T } from "@/lib/i18n";
import { DropOrb } from "./DropOrb";
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

/** 로고: 이름 그대로 글자만(한국어 '기억해유', 영어 'Remember You'). 글자에 알약·강조를 씌우지 않는다 */
export function Wordmark({ size = 22, locale = "ko" }: { size?: number; locale?: Locale }) {
  return (
    <span className="wordmark inline-flex items-center leading-[44px]" style={{ fontSize: size }}>
      {BRAND[locale].name}
    </span>
  );
}

/** 아래쪽에 떠 있는 흰 탭 막대. fab: 막대 바로 위 오른쪽에 떠 있는 버튼(사람들 화면의 직접 적기 등) */
/** voice: 가운데 마이크(말로 적기). AI 키가 있을 때만 화면이 aiConfigured()로 켠다(이 파일은 클라이언트에서도 불려서 서버 전용 모듈을 못 들인다) */
export function TabBar({ active, t, fab, voice = false }: { active: "home" | "people" | "me" | "privacy"; t: T; fab?: React.ReactNode; voice?: boolean }) {
  const tabs = [
    { key: "home", href: "/home", icon: "calendar", label: t("nav.home") },
    { key: "people", href: "/people", icon: "people", label: t("nav.people") },
    { key: "me", href: "/me", icon: "card", label: t("nav.me") },
    { key: "privacy", href: "/privacy", icon: "settings", label: t("nav.privacy") },
  ] as const;
  const tab = (item: (typeof tabs)[number]) => {
    const on = item.key === active;
    return (
      <Link
        key={item.key}
        href={item.href}
        aria-current={on ? "page" : undefined}
        className={`flex flex-col items-center justify-center gap-[3px] whitespace-nowrap text-[11.5px] ${on ? "font-bold text-accent" : "font-medium text-muted"}`}
      >
        <Icon name={item.icon} strokeWidth={on ? 2.1 : 1.7} />
        {item.label}
      </Link>
    );
  };
  return (
    <nav
      aria-label="menu"
      data-tabbar=""
      className="sticky bottom-0 z-30 mt-auto px-4 pt-3"
      style={{ paddingBottom: "var(--pb-tab)", background: "linear-gradient(to top, var(--color-bg) 60%, rgb(246 247 251 / 0))" }}
    >
      {fab ? <div className="absolute bottom-full right-4">{fab}</div> : null}
      <div className={`grid h-[66px] ${voice ? "grid-cols-5" : "grid-cols-4"} rounded-[26px] bg-white px-1 shadow-[0_8px_24px_rgba(31,35,64,0.09),0_0_0_1px_rgba(31,35,64,0.04)]`}>
        {tabs.slice(0, 2).map(tab)}
        {voice ? (
          <div className="flex items-center justify-center">
            {/* 가운데 물방울(막대 한가운데): 누르면 말로 또는 글로 기억해 두기 */}
            <Link href="/voice" aria-label={t("voice.title")} className="flex h-[56px] w-[56px] items-center justify-center rounded-full transition-transform active:scale-95">
              <DropOrb size={52} />
            </Link>
          </div>
        ) : null}
        {tabs.slice(2).map(tab)}
      </div>
    </nav>
  );
}

/** 시작·로그인 화면 아래 약관 · 개인정보 처리방침 */
export function LegalLinks({ locale, t }: { locale: Locale; t: T }) {
  return (
    <p className="flex justify-center gap-x-4 pt-1 text-[12px] text-muted">
      <a href={`/terms?lang=${locale}`} className="flex min-h-10 items-center underline underline-offset-2">
        {t("legal.terms")}
      </a>
      <a href={`/privacy-policy?lang=${locale}`} className="flex min-h-10 items-center underline underline-offset-2">
        {t("legal.privacy")}
      </a>
    </p>
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
