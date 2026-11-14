import Link from "next/link";
import { TabBar } from "@/components/chrome";
import { personRows } from "@/components/PeopleList";
import { listPeople, requireSession, todayFor } from "@/lib/data";
import { makeT } from "@/lib/i18n";
import { PeopleBoard } from "./PeopleBoard";

// 내 사람들 + 고르기(사람을 골라 메뉴 고르기·선물 고르기·공유하기)
export default async function People({ searchParams }: { searchParams: Promise<{ pick?: string; with?: string; me?: string }> }) {
  const sp = await searchParams;
  const s = await requireSession();
  const t = makeT(s.profile.locale);
  const people = await listPeople(s);
  const rows = personRows(people, todayFor(s.profile), s.profile.locale, t);
  return (
    <>
      <PeopleBoard
        rows={rows}
        meAvatar={s.profile.avatar}
        initialPick={sp.pick === "1"}
        initial={(sp.with ?? "").split(",").filter(Boolean)}
        initialMe={sp.me !== "0"}
        labels={{
          title: t("home.people"),
          count: t("home.count", { n: people.length }),
          pick: t("people.pick"),
          cancel: t("people.pickCancel"),
          hint: t("people.pickHint"),
          withMe: t("plan.withMe"),
          meName: t("plan.me"),
          selected: t("plan.selected", { n: "{n}" }),
          pickSome: t("plan.pickSome"),
          menu: t("plan.menu"),
          gift: t("plan.gift"),
          avatarOf: t("avatar.of", { name: "{name}" }),
          pickOne: t("people.pickOne", { name: "{name}" }),
          empty: t("home.empty"),
        }}
      >
        <div className="grid grid-cols-2 gap-2.5 px-6 pt-4">
          <Link href="/share" className="btn-outline !h-12">
            {t("home.sendMine")}
          </Link>
          <Link href="/request" className="btn-primary !h-12">
            {t("home.ask")}
          </Link>
          <Link href="/people/new" className="btn-outline col-span-2 !h-12">
            {t("people.add")}
          </Link>
        </div>
      </PeopleBoard>
      <TabBar active="people" t={t} />
    </>
  );
}
