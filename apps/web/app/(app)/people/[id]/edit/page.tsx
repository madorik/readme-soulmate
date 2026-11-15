import { isSection, SECTIONS_BY_IMPORTANCE } from "@readme/core";
import { notFound } from "next/navigation";
import { MyReadmeList } from "@/app/(app)/me/MyReadmeList";
import { TopBar } from "@/components/chrome";
import { displayName, listPeople, requireSession } from "@/lib/data";
import { makeT } from "@/lib/i18n";

// 사람 정보 수정: 모든 항목을 한 목록에. 누르면 그 자리에서 펼쳐 고치고 바로 저장된다(나에 대한 기록과 같은 모양)
export default async function EditPerson({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ open?: string }> }) {
  const { id } = await params;
  const { open } = await searchParams;
  const s = await requireSession();
  const { locale } = s.profile;
  const t = makeT(locale);
  const p = (await listPeople(s)).find((x) => x.contactId === id);
  if (!p) notFound();
  return (
    <div className="page-end flex flex-1 flex-col">
      <TopBar back={`/people/${p.contactId}`} label={t("common.back")} />
      <h1 className="headline px-6 pb-2 pt-1 text-[28px]">{t("person.editTitle", { name: displayName(p) })}</h1>
      <MyReadmeList
        rows={SECTIONS_BY_IMPORTANCE.map((section) => ({
          section,
          title: t(`section.${section}` as "section.safety"),
          sub: section === "gifts" ? t("section.gifts.subOther") : t(`section.${section}.sub` as "section.safety.sub"),
        }))}
        card={p.card}
        locale={locale}
        labels={{ edit: t("me.edit"), close: t("me.close") }}
        initialOpen={isSection(open) ? open : null}
        contactId={p.contactId}
        stickyTop="var(--sat)"
      />
    </div>
  );
}
