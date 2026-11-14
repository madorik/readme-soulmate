import { formatDotted, formatSpec, nextOccurrence, type Locale, type YMD } from "@readme/core";
import Link from "next/link";
import type { T } from "@/lib/i18n";
import { displayName, type Person } from "@/lib/data";
import { RowBody, type PersonRow } from "./PersonRow";

export function personRows(people: Person[], today: YMD, locale: Locale, t: T): PersonRow[] {
  return people.map((p) => {
    const name = displayName(p);
    const birthday = p.sections.includes("dates") ? p.card.dates?.birthday : null;
    const next = birthday ? nextOccurrence(birthday, today) : null;
    const sub =
      p.kind === "pending"
        ? t("home.waiting")
        : p.kind === "guest"
          ? t("home.guest")
          : p.kind === "mine"
            ? t("home.mine")
            : p.nickname && p.name && p.nickname !== p.name
              ? p.name
              : "";
    return {
      contactId: p.contactId,
      name,
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
      pickable: p.kind !== "pending" && !p.revoked,
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
