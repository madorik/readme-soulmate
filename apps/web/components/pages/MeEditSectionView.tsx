import { TopBar } from "@/components/chrome";
import { SectionForm } from "@/components/editors/SectionForm";
import type { MeEditSectionData } from "@/lib/pages/types";
import { makeT } from "@/lib/t";

export function MeEditSectionView({ locale, section, card }: MeEditSectionData) {
  const t = makeT(locale);
  return (
    <div className="flex flex-1 flex-col">
      <TopBar back={`/me/edit?open=${section}`} label={t("common.back")} />
      <div className="flex flex-col gap-1.5 px-6 pt-2">
        <h1 className="headline text-[28px]">{t(`section.${section}` as "section.safety")}</h1>
        <p className="text-[14px] leading-[1.5] text-muted">{t(`section.${section}.sub` as "section.safety.sub")}</p>
      </div>
      <SectionForm section={section} initial={card[section] ?? null} locale={locale} />
    </div>
  );
}
