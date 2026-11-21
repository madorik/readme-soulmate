import "server-only";
import { notFound, redirect } from "next/navigation";
import { aiConfigured } from "@/lib/ai";
import { displayName, listPeopleLite, requireSession } from "@/lib/data";
import { isUuid } from "@/lib/uuid";
import type { ImportData } from "./import.data";
import type { PageInput } from "./routes";

/**
 * 메모 가져오기: 적어 둔 메모를 붙여 넣거나 말하면 AI가 읽어 새 사람을 더하거나 있는 사람에 없는 것만 더한다.
 * ?to=<사람 id>: 그 사람 이야기뿐(사람 편집에서), ?new=1: 아직 없는 한 사람(사람 추가에서), 없으면 메모에 여러 사람(가운데 구슬에서)
 */
export async function loadImport({ searchParams }: PageInput): Promise<ImportData> {
  if (!aiConfigured()) notFound();
  const s = await requireSession();
  const people = (await listPeopleLite(s)).map((p) => ({ id: p.contactId, name: displayName(p), avatar: p.avatar }));
  const to = searchParams.to;
  if (to) {
    const p = isUuid(to) ? people.find((x) => x.id === to) : undefined;
    if (!p) redirect("/people");
    return { locale: s.profile.locale, scope: { kind: "person", id: p.id, name: p.name, avatar: p.avatar }, people, back: `/people/${p.id}/edit` };
  }
  if (searchParams.new) return { locale: s.profile.locale, scope: { kind: "new" }, people, back: "/people/new" };
  return { locale: s.profile.locale, scope: { kind: "any" }, people, back: "/voice" };
}
