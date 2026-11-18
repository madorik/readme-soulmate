import "server-only";
import { isSection } from "@readme/core";
import { notFound } from "next/navigation";
import { displayName, listPeople, requireSession } from "@/lib/data";
import type { PersonEditData } from "./person-edit.data";
import type { PageInput } from "./routes";

/** 사람 정보 수정: 그 사람 기록 전체 */
export async function loadPersonEdit({ params, searchParams }: PageInput): Promise<PersonEditData> {
  const { id } = params;
  const { open } = searchParams;
  const s = await requireSession();
  const p = (await listPeople(s)).find((x) => x.contactId === id);
  if (!p) notFound();
  return { locale: s.profile.locale, contactId: p.contactId, name: displayName(p), card: p.card, open: isSection(open) ? open : null };
}
