import { leaveTour } from "@/app/actions/tour";
import { VoiceCapture } from "@/app/(app)/voice/VoiceCapture";
import { TopBar } from "@/components/chrome";
import { AiNotice } from "@/components/shell/AiNotice";
import type { VoiceData } from "@/lib/pages/types";
import { makeT } from "@/lib/t";

// 말로 적기: 말하면(또는 적으면) 누구의 어느 칸인지 나눠서 바로 넣는다. 없는 사람은 새로, 맞는 칸이 없으면 메모로
export function VoiceView({ locale, people, tour }: VoiceData) {
  const t = makeT(locale);
  return (
    <div className="flex flex-1 flex-col">
      {/* 가입 직후 체험이면 닫기 대신 오른쪽 위 '건너뛰기'(체험을 접고 홈으로) */}
      <TopBar
        close={tour ? undefined : "/home"}
        label={t("common.close")}
        right={
          tour ? (
            <form action={leaveTour}>
              <input type="hidden" name="kind" value="skip" />
              <input type="hidden" name="source" value="voice" />
              <button className="flex min-h-11 items-center px-3 text-[14px] font-bold text-muted">{t("common.skip")}</button>
            </form>
          ) : undefined
        }
      />
      <AiNotice locale={locale} />
      {/* 키보드가 뜨면(적는 동안) 제목은 숨겨 적는 칸과 사람 줄이 한 화면에. 체험이면 제목 대신 아래 안내(이렇게 말해보세요) */}
      {tour ? null : <h1 className="headline whitespace-pre-line px-6 pt-1 text-center text-[22px] leading-[1.35] [html[data-kb]_&]:hidden">{t("voice.headline")}</h1>}
      <VoiceCapture
        locale={locale}
        people={people}
        tour={tour ? { page: t("tour.page", { n: tour.n, total: tour.total }), say: t("tour.say"), write: t("tour.write"), example: t("tour.example"), next: t("common.next") } : null}
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
          placeholder: tour ? t("tour.example") : t("voice.placeholder"),
          placeholderText: tour ? t("tour.example") : t("voice.placeholderText"),
          mention: t("voice.mention"),
          mentionList: t("voice.mentionList"),
          save: t("voice.save"),
          saved: t("voice.saved"),
          isNew: t("voice.newPerson"),
          undo: t("voice.undo"),
          undone: t("voice.undone"),
          more: t("voice.more"),
          done: t("voice.done"),
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
