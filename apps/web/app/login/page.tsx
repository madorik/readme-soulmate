import { redirect } from "next/navigation";
import { AuthButtons } from "@/components/AuthButtons";
import { TopBar } from "@/components/chrome";
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
      <TopBar back={`/?next=${encodeURIComponent(next)}`} label={t("common.back")} />
      <h1 className="headline px-6 pt-3 text-[28px]">{t("login.title")}</h1>
      {sp.failed ? (
        <p role="alert" className="px-6 pt-3 text-[14px] text-red">
          {t("login.failed")}
        </p>
      ) : null}
      <div className="mt-auto px-6 pt-8">
        <AuthButtons locale={locale} next={next} google={PROVIDERS.google} apple={PROVIDERS.apple} />
      </div>
    </main>
  );
}
