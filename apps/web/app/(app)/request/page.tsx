import { SECTIONS, type Section } from "@readme/core";
import { TopBar } from "@/components/chrome";
import { displayName, listPeople, requireSession } from "@/lib/data";
import { makeT } from "@/lib/i18n";
import { RequestForm } from "./RequestForm";

// 물어보기: 주소록 사람에게(찾아서 고르거나 사람 화면에서 to로), 또는 새 사람(이름을 적어 새로)에게.
// 아는 사람이면 아직 안 적힌 항목을 먼저 고르고, 받은 답은 그 사람 기록에 들어간다
export default async function Request({ searchParams }: { searchParams: Promise<{ to?: string; name?: string }> }) {
  const sp = await searchParams;
  const s = await requireSession();
  const t = makeT(s.profile.locale);
  const defaults: Section[] = ["dates", "safety", "gifts"];
  // 찾기에 쓸 사람들(즐겨찾기 먼저). 사람마다 아직 안 적힌 항목
  const people = [...(await listPeople(s))]
    .sort((a, b) => Number(b.favorite) - Number(a.favorite))
    .map((p) => ({
      id: p.contactId,
      name: p.name || displayName(p),
      tag: p.nickname && p.nickname !== (p.name || displayName(p)) ? p.nickname : "",
      label: displayName(p),
      avatar: p.avatar,
      // 반려동물은 키우는 사람만 해당돼서 처음부터 고르지 않는다(직접 고를 수 있다)
      missing: SECTIONS.filter((x) => !p.card[x] && x !== "pets"),
    }));
  const fixed = sp.to ? (people.find((p) => p.id === sp.to) ?? null) : null;
  return (
    <div className="flex flex-1 flex-col">
      <TopBar close={fixed ? `/people/${fixed.id}` : "/home"} label={t("common.close")} />
      <h1 className="headline px-6 pt-1 text-[28px]">{fixed ? t("request.titleTo", { name: fixed.label }) : t("request.title")}</h1>
      <RequestForm locale={s.profile.locale} people={people} fixed={fixed?.id ?? null} initialName={(sp.name ?? "").slice(0, 40)} defaults={defaults} />
    </div>
  );
}
