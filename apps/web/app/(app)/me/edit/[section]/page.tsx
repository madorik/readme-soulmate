import { isSection } from "@readme/core";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/chrome";
import { SectionForm } from "@/components/editors/SectionForm";
import { readCard, requireSession } from "@/lib/data";
import { makeT } from "@/lib/i18n";

export default async function EditSection({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!isSection(section)) notFound();
  const s = await requireSession();
  const t = makeT(s.profile.locale);
  const { card } = await s.tx((q) => readCard(q, s.user.id));
  return (
    <div className="flex flex-1 flex-col">
      <TopBar back="/me" label={t("common.back")} />
      <div className="flex flex-col gap-1.5 px-6 pt-2">
        <h1 className="headline text-[28px]">{t(`section.${section}` as "section.safety")}</h1>
        <p className="text-[14px] leading-[1.5] text-muted">{t(`section.${section}.sub` as "section.safety.sub")}</p>
      </div>
      <SectionForm section={section} initial={card[section] ?? null} locale={s.profile.locale} />
    </div>
  );
}
