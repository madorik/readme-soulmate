import { TopBar } from "@/components/chrome";
import { SectionForm } from "@/components/editors/SectionForm";
import type { PersonEditSectionData } from "@/lib/pages/person-edit-section.data";
import { makeT } from "@/lib/t";

// 사람 기록의 항목 하나 고치기(내 리드미 편집과 같은 편집기). 답받은 항목도 고친다
export function PersonEditSectionView({ locale, contactId, name, section, card }: PersonEditSectionData) {
  const t = makeT(locale);
  return (
    <div className="flex flex-1 flex-col">
      <TopBar back={`/people/${contactId}`} label={t("common.back")} />
      <div className="flex flex-col gap-1.5 px-6 pt-2">
        <span className="text-[14px] font-bold text-muted">{name}</span>
        <h1 className="headline text-[28px]">{t(`section.${section}` as "section.safety")}</h1>
        <p className="text-[14px] leading-[1.5] text-muted">{section === "gifts" ? t("section.gifts.subOther") : t(`section.${section}.sub` as "section.safety.sub")}</p>
      </div>
      <SectionForm section={section} initial={card[section] ?? null} locale={locale} contactId={contactId} />
    </div>
  );
}
