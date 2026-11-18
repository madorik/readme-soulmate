import { RequestForm } from "@/app/(app)/request/RequestForm";
import { TopBar } from "@/components/chrome";
import type { RequestData } from "@/lib/pages/types";
import { makeT } from "@/lib/t";

// 물어보기: 주소록 사람에게(찾아서 고르거나 사람 화면에서 to로), 또는 새 사람(이름을 적어 새로)에게.
// 아는 사람이면 아직 안 적힌 항목을 먼저 고르고, 받은 답은 그 사람 기록에 들어간다
export function RequestView({ locale, people, fixed, initialName, defaults }: RequestData) {
  const t = makeT(locale);
  return (
    <div className="flex flex-1 flex-col">
      <TopBar close={fixed ? `/people/${fixed.id}` : "/home"} label={t("common.close")} />
      <h1 className="headline px-6 pt-1 text-[28px]">{fixed ? t("request.titleTo", { name: fixed.label }) : t("request.title")}</h1>
      <RequestForm locale={locale} people={people} fixed={fixed?.id ?? null} initialName={initialName} defaults={defaults} />
    </div>
  );
}
