import { isSection } from "@readme/core";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/chrome";
import { SectionForm } from "@/components/editors/SectionForm";
import { displayName, listPeople, requireSession } from "@/lib/data";
import { makeT } from "@/lib/i18n";

// 사람 기록의 항목 하나 고치기(내 리드미 편집과 같은 편집기). 답받은 항목도 고친다
export default async function EditPersonSection({ params }: { params: Promise<{ id: string; section: string }> }) {
  const { id, section } = await params;
  if (!isSection(section)) notFound();
  const s = await requireSession();
  const t = makeT(s.profile.locale);
  const p = (await listPeople(s)).find((x) => x.contactId === id);
  if (!p) notFound();
  return (
    <div className="flex flex-1 flex-col">
      <TopBar back={`/people/${p.contactId}`} label={t("common.back")} />
      <div className="flex flex-col gap-1.5 px-6 pt-2">
        <span className="text-[14px] font-bold text-muted">{displayName(p)}</span>
        <h1 className="headline text-[28px]">{t(`section.${section}` as "section.safety")}</h1>
        <p className="text-[14px] leading-[1.5] text-muted">{t(`section.${section}.sub` as "section.safety.sub")}</p>
      </div>
      <SectionForm section={section} initial={p.card[section] ?? null} locale={s.profile.locale} contactId={p.contactId} />
    </div>
  );
}
