import { TopBar } from "@/components/chrome";
import { getSession } from "@/lib/data";
import { makeT, requestLocale } from "@/lib/i18n";
import { CodeForm } from "./CodeForm";

export default async function CodePage() {
  const session = await getSession();
  const locale = await requestLocale(session?.profile.locale);
  const t = makeT(locale);
  return (
    <main className="screen">
      <TopBar back={session ? "/home" : "/"} label={t("common.back")} />
      <h1 className="headline px-6 pt-3 text-[28px]">{t("code.title")}</h1>
      <CodeForm locale={locale} />
    </main>
  );
}
