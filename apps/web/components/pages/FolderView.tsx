import Link from "next/link";
import { FolderSheets } from "@/app/(app)/people/folder/[id]/FolderSheets";
import { TopBar } from "@/components/chrome";
import { FolderArt } from "@/components/FolderArt";
import { Icon } from "@/components/marks";
import { RowBody } from "@/components/PersonRow";
import { folderSheetLabels } from "@/lib/folders";
import type { FolderData } from "@/lib/pages/folder.data";
import { makeT } from "@/lib/t";

// 폴더 하나: 큰 폴더 그림(든 사람 얼굴이 빼꼼) · 이름 · 몇 명, 생일 가까운 순/이름순, 목록 끝에 사람 넣기.
// 아래에서 이 폴더 사람들로 바로 선물 고르기·메뉴 고르기
export function FolderView({ locale, folder, rows, byName, memberIds, people, open }: FolderData) {
  const t = makeT(locale);
  const here = `/people/folder/${folder.id}${byName ? "?sort=name" : ""}`;
  const withParam = (key: string) => `${here}${byName ? "&" : "?"}${key}=1`;
  const faces = rows.map((r) => ({ key: r.contactId, avatar: r.avatar, label: r.name }));
  const picked = `?with=${memberIds.join(",")}&me=1`;
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
          <span className="text-[14px] text-muted">{t("folder.count", { n: memberIds.length })}</span>
        </div>
      </div>

      {memberIds.length > 1 ? (
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

      {memberIds.length ? (
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
        people={people}
        sheet={folderSheetLabels(t)}
        labels={{
          title: t("folder.addPeople"),
          search: t("people.search"),
          addN: t("folder.addN", { n: "{n}" }),
          done: t("folder.done"),
          close: t("common.close"),
          error: t("common.error"),
        }}
      />
    </>
  );
}
