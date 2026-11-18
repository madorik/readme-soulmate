import "server-only";
import { notFound } from "next/navigation";
import { listPeople, requireSession } from "@/lib/data";
import type { PersonProfileData } from "./person-profile.data";
import type { PageInput } from "./routes";

/** 사람 프로필: 그 사람의 얼굴과 부르는 말 */
export async function loadPersonProfile({ params }: PageInput): Promise<PersonProfileData> {
  const { id } = params;
  const s = await requireSession();
  const p = (await listPeople(s)).find((x) => x.contactId === id);
  if (!p) notFound();
  return { locale: s.profile.locale, person: { contactId: p.contactId, personId: p.personId, name: p.name, nickname: p.nickname, avatar: p.avatar } };
}
