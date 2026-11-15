import { redirect } from "next/navigation";
import { AuthButtons } from "@/components/AuthButtons";
import { LegalLinks, TopBar, Wordmark } from "@/components/chrome";
import { LoginHero } from "@/components/LoginHero";
import { Icon } from "@/components/marks";
import { PROVIDERS } from "@/lib/auth";
import { getSession } from "@/lib/data";
import { makeT, requestLocale } from "@/lib/i18n";
import { safeNext } from "@/lib/site";

// 초대 받기·답한 뒤 가져오기처럼 다른 화면에서 로그인하러 올 때
export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; failed?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  // 데모 계정은 여기서 구글·애플로 로그인해 진짜 계정으로 넘어간다
  const session = await getSession();
  if (session && !session.user.isAnonymous) redirect(next);
  const locale = await requestLocale();
  const t = makeT(locale);
  return (
    <main className="screen">
      <TopBar back={`/?next=${encodeURIComponent(next)}`} label={t("common.back")} center={<Wordmark size={17} locale={locale} />} />
      <h1 className="headline px-6 pt-3 text-[28px]">{t("login.title")}</h1>

      {/* 키 작은 휴대폰(SE 등)에서는 그림을 조금 줄여 버튼까지 한 화면에 */}
      <div className="flex flex-1 items-center px-6 py-6 [@media(max-height:720px)]:py-2 [@media(max-height:720px)]:[zoom:0.86]">
        <LoginHero t={t} />
      </div>

      <div className="px-6">
        {sp.failed ? (
          <p role="alert" className="mb-3 flex items-center gap-2 rounded-2xl bg-red-soft px-4 py-3 text-[14px] font-medium leading-[1.45] text-red">
            <Icon name="alert" size={18} strokeWidth={2} className="shrink-0" />
            {t("login.failed")}
          </p>
        ) : null}
        <AuthButtons locale={locale} next={next} google={PROVIDERS.google} apple={PROVIDERS.apple} demo={!session} />
        <LegalLinks locale={locale} t={t} />
      </div>
    </main>
  );
}
