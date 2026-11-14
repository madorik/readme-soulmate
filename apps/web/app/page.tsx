import { addDays, monthName, solarToLunar, todayIn } from "@readme/core";
import { redirect } from "next/navigation";
import { setLocale } from "@/app/actions/auth";
import { AuthButtons } from "@/components/AuthButtons";
import { CalendarWeeks, sundayOf } from "@/components/CalendarWeeks";
import { Wordmark } from "@/components/chrome";
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
  const today = todayIn("Asia/Seoul");
  const circled = addDays(today, 7);
  const lunar = solarToLunar(today);

  return (
    <main className="screen">
      <div className="flex items-center justify-between pl-6 pr-4">
        <Wordmark />
        <form action={setLocale}>
          <input type="hidden" name="locale" value={locale === "ko" ? "en" : "ko"} />
          <input type="hidden" name="back" value={rawNext ? `/?next=${encodeURIComponent(next)}` : "/"} />
          <button className="flex min-h-11 items-center px-2 text-[15px] font-semibold">{t("lang.other")}</button>
        </form>
      </div>

      <section aria-hidden="true" className="mt-7 px-4">
        <div className="flex items-baseline justify-between px-2 pb-3">
          <span className="text-[16px] font-bold">{locale === "ko" ? `${today.y}년 ${today.m}월` : `${monthName(today.m, "en", true)} ${today.y}`}</span>
          {lunar ? <span className="text-[13px] text-muted">{locale === "ko" ? `음력 ${lunar.m}월` : `Lunar month ${lunar.m}`}</span> : null}
        </div>
        <CalendarWeeks start={sundayOf(today)} weeks={2} today={today} circled={{ date: circled, label: t("start.example") }} locale={locale} />
      </section>

      <section className="mt-10 flex flex-col gap-3.5 px-6">
        <h1 className="headline whitespace-pre-line text-[34px]">{t("start.headline")}</h1>
        <p className="max-w-[300px] text-[15px] leading-[1.6] text-muted">{t("start.body")}</p>
      </section>

      <div className="mt-auto px-6 pt-8">
        <AuthButtons locale={locale} next={next} google={PROVIDERS.google} apple={PROVIDERS.apple} />
        <p className="flex justify-center gap-x-4 pt-1 text-[12px] text-muted">
          <a href={`/terms?lang=${locale}`} className="flex min-h-10 items-center underline underline-offset-2">
            {t("legal.terms")}
          </a>
          <a href={`/privacy-policy?lang=${locale}`} className="flex min-h-10 items-center underline underline-offset-2">
            {t("legal.privacy")}
          </a>
        </p>
      </div>
    </main>
  );
}
