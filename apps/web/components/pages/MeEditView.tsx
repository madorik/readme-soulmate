import { SECTIONS_BY_IMPORTANCE } from "@readme/core";
import { MyReadmeList } from "@/app/(app)/me/MyReadmeList";
import { TopBar } from "@/components/chrome";
import type { MeEditData } from "@/lib/pages/types";
import { makeT } from "@/lib/t";

// 나에 대한 기록 고치기: 모든 항목을 한 목록에. 누르면 그 자리에서 펼쳐 고치고 바로 저장된다(사람 정보 수정과 같은 모양)
export function MeEditView({ locale, name, card, open }: MeEditData) {
  const t = makeT(locale);
  return (
    <div className="page-end flex flex-1 flex-col">
      <TopBar back="/me" label={t("common.back")} />
      <div className="flex flex-col gap-1 px-6 pb-2 pt-1">
        <span className="text-[14px] font-bold text-muted">{name}</span>
        <h1 className="headline text-[28px]">{t("me.title")}</h1>
      </div>
      <MyReadmeList
        rows={SECTIONS_BY_IMPORTANCE.map((section) => ({
          section,
          title: t(`section.${section}` as "section.safety"),
          sub: t(`section.${section}.sub` as "section.safety.sub"),
        }))}
        card={card}
        locale={locale}
        initialOpen={open}
      />
    </div>
  );
}
