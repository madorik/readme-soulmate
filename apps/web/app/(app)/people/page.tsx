import { TabBar } from "@/components/chrome";
import { personRows } from "@/components/PeopleList";
import { folderViews, listFolders, listPeople, requireSession, todayFor } from "@/lib/data";
import { folderSheetLabels } from "@/lib/folders";
import { makeT } from "@/lib/i18n";
import { PeopleBoard } from "./PeopleBoard";
import { aiConfigured } from "@/lib/ai";

// 내 사람들: 폴더 칸 + 폴더 없는 사람(끌어서 폴더에 넣는다). 오른쪽 위에 사람 더하기(직접 적기)와 선택(사람을 골라 메뉴 고르기·선물 고르기)
export default async function People({ searchParams }: { searchParams: Promise<{ pick?: string; with?: string; me?: string }> }) {
  const sp = await searchParams;
  const s = await requireSession();
  const t = makeT(s.profile.locale);
  const [people, folders] = await Promise.all([listPeople(s), s.tx((q) => listFolders(q, s.user.id))]);
  const views = folderViews(folders, people, t);
  const rows = personRows(people, todayFor(s.profile), s.profile.locale, t, views);
  return (
    <>
      <PeopleBoard
        rows={rows}
        folders={views}
        meAvatar={s.profile.avatar}
        initialPick={sp.pick === "1"}
        initial={(sp.with ?? "").split(",").filter(Boolean)}
        initialMe={sp.me !== "0"}
        sheet={folderSheetLabels(t)}
        labels={{
          title: t("home.people"),
          summary: t("people.summary", { n: "{n}", f: "{f}" }),
          bannerTitle: t("people.bannerTitle"),
          bannerCta: t("home.ask"),
          pick: t("people.pick"),
          add: t("people.add"),
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
          folders: t("folder.label"),
          unfiled: t("folder.none"),
          search: t("people.search"),
          searchEmpty: t("people.searchEmpty"),
          clear: t("common.close"),
          newFolder: t("folder.new"),
          count: t("folder.count", { n: "{n}" }),
          pickFolder: t("people.pickGroup", { name: "{name}" }),
        }}
      />
      <TabBar active="people" t={t} voice={aiConfigured()} />
    </>
  );
}
