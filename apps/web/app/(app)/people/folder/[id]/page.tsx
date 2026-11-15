import { nextOccurrence } from "@readme/core";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/chrome";
import { FolderArt } from "@/components/FolderArt";
import { Icon } from "@/components/marks";
import { personRows } from "@/components/PeopleList";
import { RowBody } from "@/components/PersonRow";
import { displayName, folderViews, listFolders, listPeople, requireSession, todayFor } from "@/lib/data";
import { folderSheetLabels } from "@/lib/folders";
import { makeT } from "@/lib/i18n";
import { FolderSheets } from "./FolderSheets";

// 폴더 하나: 큰 폴더 그림(든 사람 얼굴이 빼꼼) · 이름 · 몇 명, 생일 가까운 순/이름순, 목록 끝에 사람 넣기.
// 아래에서 이 폴더 사람들로 바로 선물 고르기·메뉴 고르기
export default async function FolderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string; add?: string; edit?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
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

  const here = `/people/folder/${folder.id}${byName ? "?sort=name" : ""}`;
  const withParam = (key: string) => `${here}${byName ? "&" : "?"}${key}=1`;
  const faces = rows.map((r) => ({ key: r.contactId, avatar: r.avatar, label: r.name }));
  const picked = `?with=${members.map((p) => p.contactId).join(",")}&me=1`;
  const open = sp.edit === "1" ? "edit" : sp.add === "1" ? "add" : null;
  const chip = (on: boolean) =>
    `flex h-10 items-center rounded-full px-[15px] text-[14.5px] ${on ? "chip-on" : "bg-fill font-medium"}`;

  return (
    <>
      <TopBar
        back="/people"
        label={t("common.back")}
        right={
          <Link href={withParam("edit")} scroll={false} aria-label={t("folder.edit")} className="flex h-11 w-11 items-center justify-center rounded-full text-ink-2 active:bg-fill">
            <Icon name="pencil" size={19} strokeWidth={2} />
          </Link>
        }
      />

      <div className="flex items-center gap-[18px] px-6 pt-2.5">
        <FolderArt icon={folder.icon} color={folder.color} size={116} faces={faces} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="truncate text-[32px] font-bold leading-[1.15] tracking-[-0.03em]">{folder.name}</h1>
          <span className="text-[14px] text-muted">{t("folder.count", { n: members.length })}</span>
        </div>
      </div>

      {members.length > 1 ? (
        <div className="flex gap-2 px-5 pb-3 pt-[22px]">
          <Link href={`/people/folder/${folder.id}`} replace scroll={false} aria-current={!byName ? "true" : undefined} className={chip(!byName)}>
            {t("folder.sortSoon")}
          </Link>
          <Link href={`/people/folder/${folder.id}?sort=name`} replace scroll={false} aria-current={byName ? "true" : undefined} className={chip(byName)}>
            {t("folder.sortName")}
          </Link>
        </div>
      ) : (
        <div className="h-5" />
      )}

      <ul className="card mx-4 flex flex-col px-3.5">
        {rows.map((r) => (
          <li key={r.contactId} className="border-t border-rule first:border-t-0">
            <Link href={`/people/${r.contactId}?back=${encodeURIComponent(here)}`} className="flex min-h-[70px] items-center gap-3">
              <RowBody row={r} avatarLabel={t("avatar.of", { name: r.name })} />
            </Link>
          </li>
        ))}
        <li className="border-t border-rule first:border-t-0">
          <Link href={withParam("add")} scroll={false} className="flex min-h-[70px] items-center gap-3 text-accent">
            <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full shadow-[inset_0_0_0_2px_#f0d27a]">
              <Icon name="plus" size={20} strokeWidth={2.2} />
            </span>
            <span className="text-[16px] font-bold">{t("folder.addPeople")}</span>
          </Link>
        </li>
      </ul>

      {members.length ? (
        <>
          <div className="h-6" />
          <div className="bottom-bar mt-auto grid grid-cols-2 gap-2.5 bg-bg px-6 pt-4">
            <Link href={`/plan/gift${picked}`} className="btn-outline">
              {t("plan.gift")}
            </Link>
            <Link href={`/plan/menu${picked}`} className="btn-primary">
              {t("plan.menu")}
            </Link>
          </div>
        </>
      ) : (
        <div className="page-end" />
      )}

      <FolderSheets
        folder={folder}
        open={open}
        back={here}
        people={people.map((p) => ({ contactId: p.contactId, name: p.name || displayName(p), avatar: p.avatar }))}
        sheet={folderSheetLabels(t)}
        labels={{
          title: t("folder.addPeople"),
          search: t("folder.search"),
          addN: t("folder.addN", { n: "{n}" }),
          done: t("folder.done"),
          close: t("common.close"),
          error: t("common.error"),
        }}
      />
    </>
  );
}
