import { redirect } from "next/navigation";
import { setLocale } from "@/app/actions/auth";
import { AuthButtons } from "@/components/AuthButtons";
import { LegalLinks, Wordmark } from "@/components/chrome";
import { LoginHero } from "@/components/LoginHero";
import { PROVIDERS } from "@/lib/auth";
import { getSession } from "@/lib/data";
import { makeT, requestLocale } from "@/lib/i18n";
import { safeNext } from "@/lib/site";

export default async function Start({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: rawNext } = await searchParams;
  const next = safeNext(rawNext);
  const session = await getSession();
  if (session) redirect(session.profile.onboardedAt ? next : `/onboarding/avatar${next !== "/home" ? `?next=${encodeURIComponent(next)}` : ""}`);

  const locale = await requestLocale();
  const t = makeT(locale);

  return (
    <main className="screen">
      <div className="flex items-center justify-between pl-6 pr-4">
        <Wordmark locale={locale} />
        <form action={setLocale}>
          <input type="hidden" name="locale" value={locale === "ko" ? "en" : "ko"} />
          <input type="hidden" name="back" value={rawNext ? `/?next=${encodeURIComponent(next)}` : "/"} />
          <button className="flex min-h-11 items-center px-2 text-[15px] font-semibold">{t("lang.other")}</button>
        </form>
      </div>

      {/* 리디와 기억해 둔 쪽지들(로그인 화면과 같은 그림). 키 작은 휴대폰에서는 조금 줄인다 */}
      <div className="flex flex-1 items-center px-6 py-4 [@media(max-height:860px)]:py-2 [@media(max-height:860px)]:[zoom:0.9] [@media(max-height:720px)]:[zoom:0.78]">
        <LoginHero t={t} />
      </div>

      <section className="flex flex-col gap-3 px-6">
        <h1 className="hero-rise headline whitespace-pre-line text-[32px]" style={{ animationDelay: "0.2s" }}>
          {t("start.headline")}
        </h1>
        <p className="hero-rise max-w-[310px] text-[15px] leading-[1.6] text-muted" style={{ animationDelay: "0.3s" }}>
          {t("start.body")}
        </p>
      </section>

      <div className="px-6 pt-7">
        <AuthButtons locale={locale} next={next} google={PROVIDERS.google} apple={PROVIDERS.apple} />
        <LegalLinks locale={locale} t={t} />
      </div>
    </main>
  );
}
