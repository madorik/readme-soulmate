import { TabBar } from "@/components/chrome";
import { personRows } from "@/components/PeopleList";
import { groupName, listGroups, listPeople, requireSession, todayFor } from "@/lib/data";
import { makeT } from "@/lib/i18n";
import { AddFab } from "./AddFab";
import { PeopleBoard } from "./PeopleBoard";
import { aiConfigured } from "@/lib/ai";

// 내 사람들: 그룹 목록. 위에 새 그룹·선택(사람을 골라 메뉴 고르기·선물 고르기), 오른쪽 아래에 사람 더하기
export default async function People({ searchParams }: { searchParams: Promise<{ pick?: string; with?: string; me?: string }> }) {
  const sp = await searchParams;
  const s = await requireSession();
  const t = makeT(s.profile.locale);
  const [people, groups] = await Promise.all([listPeople(s), s.tx((q) => listGroups(q, s.user.id))]);
  const rows = personRows(people, todayFor(s.profile), s.profile.locale, t);
  return (
    <>
      <PeopleBoard
        rows={rows}
        groups={groups.map((g) => ({ id: g.id, name: groupName(g, t), custom: !g.builtin }))}
        meAvatar={s.profile.avatar}
        initialPick={sp.pick === "1"}
        initial={(sp.with ?? "").split(",").filter(Boolean)}
        initialMe={sp.me !== "0"}
        labels={{
          title: t("home.people"),
          summary: t("people.summary", { n: "{n}", f: "{f}" }),
          all: t("people.all"),
          bannerTitle: t("people.bannerTitle"),
          bannerCta: t("home.ask"),
          pick: t("people.pick"),
          cancel: t("people.pickCancel"),
          withMe: t("plan.withMe"),
          meName: t("plan.me"),
          selected: t("plan.selected", { n: "{n}" }),
          pickSome: t("plan.pickSome"),
          menu: t("plan.menu"),
          gift: t("plan.gift"),
          avatarOf: t("avatar.of", { name: "{name}" }),
          pickOne: t("people.pickOne", { name: "{name}" }),
          empty: t("people.empty"),
          favorites: t("people.favorites"),
          noGroup: t("group.none"),
          newGroup: t("group.new"),
          groupNamePlaceholder: t("group.namePlaceholder"),
          create: t("group.create"),
          deleteGroup: t("group.delete"),
          deleteConfirm: t("group.deleteConfirm", { name: "{name}" }),
          pickGroup: t("people.pickGroup", { name: "{name}" }),
        }}
      />
      <TabBar active="people" t={t} voice={aiConfigured()} fab={<AddFab label={t("people.add")} />} />
    </>
  );
}
