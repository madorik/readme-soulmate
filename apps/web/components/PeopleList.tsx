import { formatDotted, formatSpec, nextOccurrence, type Locale, type YMD } from "@readme/core";
import Link from "next/link";
import type { T } from "@/lib/i18n";
import { displayName, type Person } from "@/lib/data";
import { RowBody, type PersonRow } from "./PersonRow";

export function personRows(people: Person[], today: YMD, locale: Locale, t: T): PersonRow[] {
  // 즐겨찾기 → 그룹 있는 사람 → 나머지(같은 칸 안에서는 추가한 순서)
  const rank = (p: Person) => (p.favorite ? 0 : p.groupId ? 1 : 2);
  return [...people].sort((a, b) => rank(a) - rank(b)).map((p) => {
    // 목록에는 그 사람 이름을 쓰고, 내가 붙인 부르는 말은 옆에 태그로
    const name = p.name || displayName(p);
    const tag = p.nickname && p.nickname !== name ? p.nickname : "";
    const birthday = p.card.dates?.birthday ?? null;
    const next = birthday ? nextOccurrence(birthday, today) : null;
    // 물어보고 답을 기다리는 중일 때만 한 줄
    const sub = p.asking?.state === "active" ? t("home.waiting") : "";
    return {
      contactId: p.contactId,
      name,
      tag,
      sub,
      avatar: p.avatar,
      date: next ? formatDotted(next.date) : "",
      dateSub:
        next && birthday
          ? next.daysUntil === 0
            ? t("start.today")
            : next.daysUntil <= 7 || birthday.calendar !== "lunar"
              ? t("person.daysLeft", { n: next.daysUntil })
              : formatSpec(birthday, locale)
          : "",
      soon: !!next && next.daysUntil <= 7,
      groupId: p.groupId,
      favorite: p.favorite,
    };
  });
}

/** 내 사람들: 이름 · 부르는 말 · 다음 생일 */
export function PeopleList({ people, today, locale, t }: { people: Person[]; today: YMD; locale: Locale; t: T }) {
  return (
    <ul className="flex flex-col px-6">
      {personRows(people, today, locale, t).map((row) => (
        <li key={row.contactId} className="border-b border-rule">
          <Link href={`/people/${row.contactId}`} className="flex min-h-[60px] items-center gap-3">
            <RowBody row={row} avatarLabel={t("avatar.of", { name: row.name })} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
