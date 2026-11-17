import type { Locale } from "@readme/core";
import Link from "next/link";
import { Wordmark } from "./chrome";
import { formatEffective, SUPPORT_EMAIL } from "@/lib/legal";

const LINKS = [
  { path: "/privacy-policy", ko: "개인정보 처리방침", en: "Privacy Policy" },
  { path: "/terms", ko: "이용약관", en: "Terms of Use" },
  { path: "/delete-account", ko: "계정 삭제", en: "Delete Account" },
  { path: "/support", ko: "고객 지원", en: "Support" },
] as const;

/** 약관·처리방침·계정 삭제 안내(로그인 없이 열린다) */
export function LegalPage({ locale, path, title, children }: { locale: Locale; path: string; title: string; children: React.ReactNode }) {
  const other = locale === "ko" ? "en" : "ko";
  return (
    <main className="screen px-6">
      <div className="flex items-center justify-between">
        <Link href="/" aria-label={locale === "ko" ? "기억해유 처음으로" : "Remember You home"}>
          <Wordmark size={24} locale={locale} />
        </Link>
        <Link href={`${path}?lang=${other}`} className="flex min-h-11 items-center px-2 text-[14px] font-semibold">
          {other === "en" ? "English" : "한국어"}
        </Link>
      </div>
      <h1 className="headline pt-6 text-[28px]">{title}</h1>
      <p className="pt-2 text-[13px] text-muted">{locale === "ko" ? `시행일 ${formatEffective(locale)}` : `Effective ${formatEffective(locale)}`}</p>
      <article className="legal pt-4">{children}</article>
      <nav className="mt-10 flex flex-wrap gap-x-5 gap-y-1 border-t border-rule pt-4 text-[13px] font-bold text-muted">
        {LINKS.filter((l) => l.path !== path).map((l) => (
          <Link key={l.path} href={`${l.path}?lang=${locale}`} className="flex min-h-11 items-center">
            {l[locale]}
          </Link>
        ))}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="flex min-h-11 items-center">
          {SUPPORT_EMAIL}
        </a>
      </nav>
    </main>
  );
}
