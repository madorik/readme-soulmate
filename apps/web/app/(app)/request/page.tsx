import { SECTIONS, type Section } from "@readme/core";
import { TopBar } from "@/components/chrome";
import { displayName, listPeople, requireSession } from "@/lib/data";
import { makeT } from "@/lib/i18n";
import { RequestForm } from "./RequestForm";

export default async function Request({ searchParams }: { searchParams: Promise<{ to?: string; name?: string }> }) {
  const sp = await searchParams;
  const s = await requireSession();
  const t = makeT(s.profile.locale);
  let name = (sp.name ?? "").slice(0, 40);
  let topics: Section[] = ["dates", "safety", "gifts"];
  if (sp.to) {
    // 이미 아는 사람에게 더 물어보기: 아직 못 본 항목을 먼저 고른다
    const p = (await listPeople(s)).find((x) => x.contactId === sp.to);
    if (p) {
      name = displayName(p);
      const missing = SECTIONS.filter((x) => !p.sections.includes(x) || !p.card[x]);
      if (missing.length) topics = missing;
    }
  }
  return (
    <div className="flex flex-1 flex-col pb-4">
      <TopBar close={sp.to ? `/people/${sp.to}` : "/home"} label={t("common.close")} />
      <h1 className="headline px-6 pt-1 text-[28px]">{t("request.title")}</h1>
      <RequestForm locale={s.profile.locale} name={name} topics={topics} />
    </div>
  );
}
