import { TopBar } from "@/components/chrome";
import { requireSession } from "@/lib/data";
import { makeT } from "@/lib/i18n";
import { ShareForm } from "./ShareForm";

export default async function Share() {
  const s = await requireSession();
  const t = makeT(s.profile.locale);
  return (
    <div className="flex flex-1 flex-col pb-4">
      <TopBar close="/home" label={t("common.close")} />
      <h1 className="headline px-6 pt-1 text-[28px]">{t("share.title")}</h1>
      <ShareForm locale={s.profile.locale} />
    </div>
  );
}
