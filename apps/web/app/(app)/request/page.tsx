import { SECTIONS, type Section } from "@readme/core";
import { TopBar } from "@/components/chrome";
import { displayName, listPeople, requireSession } from "@/lib/data";
import { makeT } from "@/lib/i18n";
import { RequestForm } from "./RequestForm";

// 물어보기: 주소록 사람(to)에게, 또는 새 사람(name)에게. 이미 아는 사람이면 아직 안 적힌 항목을 먼저 고른다
export default async function Request({ searchParams }: { searchParams: Promise<{ to?: string; name?: string }> }) {
  const sp = await searchParams;
  const s = await requireSession();
  const t = makeT(s.profile.locale);
  let name = (sp.name ?? "").slice(0, 40);
  let to: string | null = null;
  let topics: Section[] = ["dates", "safety", "gifts"];
  if (sp.to) {
    const p = (await listPeople(s)).find((x) => x.contactId === sp.to);
    if (p) {
      to = p.contactId;
      name = displayName(p);
      const missing = SECTIONS.filter((x) => !p.card[x]);
      if (missing.length) topics = missing;
    }
  }
  return (
    <div className="flex flex-1 flex-col">
      <TopBar close={to ? `/people/${to}` : "/home"} label={t("common.close")} />
      <h1 className="headline px-6 pt-1 text-[28px]">{to ? t("request.titleTo", { name }) : t("request.title")}</h1>
      <RequestForm locale={s.profile.locale} to={to} name={name} topics={topics} />
    </div>
  );
}
