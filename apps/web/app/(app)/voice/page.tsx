import { notFound } from "next/navigation";
import { TopBar } from "@/components/chrome";
import { aiConfigured } from "@/lib/ai";
import { requireSession } from "@/lib/data";
import { makeT } from "@/lib/i18n";
import { VoiceCapture } from "./VoiceCapture";

// 말로 적기: 말하면(또는 적으면) 누구의 어느 칸인지 나눠서 바로 넣는다. 없는 사람은 새로, 맞는 칸이 없으면 메모로
export default async function Voice() {
  if (!aiConfigured()) notFound();
  const s = await requireSession();
  const { locale } = s.profile;
  const t = makeT(locale);
  return (
    <div className="flex flex-1 flex-col">
      <TopBar close="/home" label={t("common.close")} />
      <h1 className="headline px-6 pt-1 text-[28px]">{t("voice.title")}</h1>
      <VoiceCapture
        locale={locale}
        labels={{
          speak: t("voice.speak"),
          listening: t("voice.listening"),
          placeholder: t("voice.placeholder"),
          save: t("voice.save"),
          saved: t("voice.saved"),
          isNew: t("voice.newPerson"),
          undo: t("voice.undo"),
          undone: t("voice.undone"),
          more: t("voice.more"),
          aiOff: t("voice.aiOff"),
          failed: t("voice.failed"),
          nothing: t("voice.nothing"),
          micError: t("voice.micError"),
        }}
      />
    </div>
  );
}
