import { TabBar } from "@/components/chrome";
import { personRows } from "@/components/PeopleList";
import { activeShareIds, listPeople, requireSession, todayFor } from "@/lib/data";
import { makeT } from "@/lib/i18n";
import { PeopleBoard } from "./PeopleBoard";

// 내 사람들: 위에 요청(리드미 부탁하기)·추가(직접 적기)·선택(사람을 골라 메뉴 고르기·선물 고르기·공유하기)
export default async function People({ searchParams }: { searchParams: Promise<{ pick?: string; with?: string; me?: string }> }) {
  const sp = await searchParams;
  const s = await requireSession();
  const t = makeT(s.profile.locale);
  const [people, sharingWith] = await Promise.all([listPeople(s), s.tx((q) => activeShareIds(q, s.user.id))]);
  const rows = personRows(people, todayFor(s.profile), s.profile.locale, t, sharingWith);
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
          request: t("people.request"),
          add: t("people.addShort"),
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
          empty: t("people.empty"),
        }}
      />
      <TabBar active="people" t={t} />
    </>
  );
}
