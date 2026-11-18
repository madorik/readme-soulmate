import "server-only";
import { nextOccurrence } from "@readme/core";
import { notFound } from "next/navigation";
import { personRows } from "@/components/PeopleList";
import { displayName, folderViews, listFolders, listPeople, requireSession, todayFor } from "@/lib/data";
import { makeT } from "@/lib/t";
import type { FolderData } from "./folder.data";
import type { PageInput } from "./routes";

/** 폴더 하나: 든 사람(생일 가까운 순/이름순)과 사람 넣기 시트에 보일 내 사람들 */
export async function loadFolder({ params, searchParams: sp }: PageInput): Promise<FolderData> {
  const { id } = params;
  const s = await requireSession();
  const { locale } = s.profile;
  const t = makeT(locale);
  const today = todayFor(s.profile);
  const [people, folders] = await Promise.all([listPeople(s), s.tx((q) => listFolders(q, s.user.id))]);
  const views = folderViews(folders, people, t);
  const folder = views.find((f) => f.id === id);
  if (!folder) notFound();

  const byName = sp.sort === "name";
  const members = people.filter((p) => folder.memberIds.includes(p.contactId));
  const daysTo = (p: (typeof members)[number]) => {
    const b = p.card.dates?.birthday;
    const next = b ? nextOccurrence(b, today) : null;
    return next ? next.daysUntil : Number.POSITIVE_INFINITY;
  };
  const sorted = [...members].sort((a, b) =>
    byName ? displayName(a).localeCompare(displayName(b), locale) : daysTo(a) - daysTo(b) || displayName(a).localeCompare(displayName(b), locale),
  );
  const rows = personRows(sorted, today, locale, t);
  // personRows는 즐겨찾기를 먼저 세우므로 여기서 고른 순서로 다시
  const order = new Map(sorted.map((p, i) => [p.contactId, i]));
  rows.sort((a, b) => order.get(a.contactId)! - order.get(b.contactId)!);

  return {
    locale,
    folder,
    rows,
    byName,
    memberIds: members.map((p) => p.contactId),
    people: people.map((p) => {
      const name = p.name || displayName(p);
      return { contactId: p.contactId, name, tag: p.nickname && p.nickname !== name ? p.nickname : "", avatar: p.avatar };
    }),
    open: sp.edit === "1" ? "edit" : sp.add === "1" ? "add" : null,
  };
}
