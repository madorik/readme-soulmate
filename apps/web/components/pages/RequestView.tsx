import { leaveTour } from "@/app/actions/tour";
import { RequestForm } from "@/app/(app)/request/RequestForm";
import { TopBar } from "@/components/chrome";
import type { RequestData } from "@/lib/pages/types";
import { makeT } from "@/lib/t";

// 물어보기: 주소록 사람에게(찾아서 고르거나 사람 화면에서 to로), 또는 새 사람(이름을 적어 새로)에게.
// 아는 사람이면 아직 안 적힌 항목을 먼저 고르고, 받은 답은 그 사람 기록에 들어간다
export function RequestView({ locale, people, fixed, initialName, defaults, tour }: RequestData) {
  const t = makeT(locale);
  return (
    <div className="flex flex-1 flex-col">
      {/* 가입 직후 체험이면 닫기 대신 오른쪽 위 '건너뛰기'(체험을 접고 홈으로), 제목 자리에 안내 */}
      <TopBar
        close={tour ? undefined : fixed ? `/people/${fixed.id}` : "/home"}
        label={t("common.close")}
        right={
          tour ? (
            <form action={leaveTour}>
              <input type="hidden" name="kind" value="skip" />
              <input type="hidden" name="source" value="ask" />
              <button className="flex min-h-11 items-center px-3 text-[14px] font-bold text-muted">{t("common.skip")}</button>
            </form>
          ) : undefined
        }
      />
      {tour ? (
        <section className="mx-4 mt-1 flex flex-col gap-1 rounded-3xl bg-sky-soft px-5 py-4">
          <span className="num text-[12px] font-bold text-accent">{t("tour.page", { n: tour.n, total: tour.total })}</span>
          <h1 className="headline text-[22px]">{fixed ? t("request.titleTo", { name: fixed.label }) : t("tour.ask.title")}</h1>
          <p className="text-[14.5px] leading-[1.6] text-ink-2">{t("tour.ask.body")}</p>
        </section>
      ) : (
        <h1 className="headline px-6 pt-1 text-[28px]">{fixed ? t("request.titleTo", { name: fixed.label }) : t("request.title")}</h1>
      )}
      <RequestForm locale={locale} people={people} fixed={fixed?.id ?? null} initialName={initialName} defaults={defaults} tour={!!tour} />
    </div>
  );
}
