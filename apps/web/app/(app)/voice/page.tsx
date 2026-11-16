import { notFound } from "next/navigation";
import { TopBar } from "@/components/chrome";
import { aiConfigured } from "@/lib/ai";
import { listPeople, requireSession } from "@/lib/data";
import { makeT } from "@/lib/i18n";
import { VoiceCapture } from "./VoiceCapture";

// 말로 적기: 말하면(또는 적으면) 누구의 어느 칸인지 나눠서 바로 넣는다. 없는 사람은 새로, 맞는 칸이 없으면 메모로
export default async function Voice() {
  if (!aiConfigured()) notFound();
  const s = await requireSession();
  const { locale } = s.profile;
  const t = makeT(locale);
  // @로 부를 사람: 이름과 내가 붙인 태그(부르는 말), 즐겨찾기가 먼저
  const people = [...(await listPeople(s))]
    .sort((a, b) => Number(b.favorite) - Number(a.favorite))
    .map((p) => ({ id: p.contactId, name: p.name, tag: p.nickname && p.nickname !== p.name ? p.nickname : "", avatar: p.avatar }));
  return (
    <div className="flex flex-1 flex-col">
      <TopBar close="/home" label={t("common.close")} />
      {/* 키보드가 뜨면(적는 동안) 제목은 숨겨 적는 칸과 사람 줄이 한 화면에 */}
      <h1 className="headline whitespace-pre-line px-6 pt-1 text-center text-[22px] leading-[1.35] [html[data-kb]_&]:hidden">{t("voice.headline")}</h1>
      <VoiceCapture
        locale={locale}
        people={people}
        labels={{
          mode: t("voice.mode"),
          modeVoice: t("voice.modeVoice"),
          modeText: t("voice.modeText"),
          speak: t("voice.speak"),
          same: t("voice.same"),
          gone: t("voice.gone"),
          changed: t("voice.changed"),
          removed: t("voice.removed"),
          clear: t("voice.clear"),
          listening: t("voice.listening"),
          placeholder: t("voice.placeholder"),
          placeholderText: t("voice.placeholderText"),
          mention: t("voice.mention"),
          mentionList: t("voice.mentionList"),
          save: t("voice.save"),
          saved: t("voice.saved"),
          isNew: t("voice.newPerson"),
          undo: t("voice.undo"),
          undone: t("voice.undone"),
          more: t("voice.more"),
          aiOff: t("voice.aiOff"),
          failed: t("voice.failed"),
          limit: t("voice.limit"),
          nothing: t("voice.nothing"),
          micError: t("voice.micError"),
        }}
      />
    </div>
  );
}
