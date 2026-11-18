import "server-only";
import { isSection } from "@readme/core";
import { notFound } from "next/navigation";
import { displayName, listPeople, requireSession } from "@/lib/data";
import type { PersonEditSectionData } from "./person-edit-section.data";
import type { PageInput } from "./routes";

/** 사람 기록의 항목 하나 고치기 */
export async function loadPersonEditSection({ params }: PageInput): Promise<PersonEditSectionData> {
  const { id, section } = params;
  if (!isSection(section)) notFound();
  const s = await requireSession();
  const p = (await listPeople(s)).find((x) => x.contactId === id);
  if (!p) notFound();
  return { locale: s.profile.locale, contactId: p.contactId, name: displayName(p), section, card: p.card };
}
