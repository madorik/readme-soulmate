"use client";

import type { AvatarConfig } from "@readme/core";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { addToFolder } from "@/app/actions/people";
import { Avatar } from "@/components/Avatar";
import { FolderArt, FolderMini } from "@/components/FolderArt";
import { FolderSheet } from "@/components/FolderSheet";
import { Mascot } from "@/components/Mascot";
import { DrawnCheck, Icon } from "@/components/marks";
import { RowBody, type PersonRow } from "@/components/PersonRow";
import type { FolderSheetLabels, FolderView } from "@/lib/folders";
import { matchesPerson } from "@/lib/search";
import { useDragToFolder } from "./useDragToFolder";

interface Labels {
  title: string;
  /** "{n}명 · 즐겨찾기 {f}명" */
  summary: string;
  bannerTitle: string;
  bannerCta: string;
  pick: string;
  cancel: string;
  withMe: string;
  meName: string;
  selected: string;
  pickSome: string;
  menu: string;
  gift: string;
  avatarOf: string;
  pickOne: string;
  empty: string;
  folders: string;
  /** 아래 목록 제목: 폴더 없음 */
  unfiled: string;
  /** 찾기 칸: "이름이나 태그로 찾기" */
  search: string;
  searchEmpty: string;
  clear: string;
  newFolder: string;
  /** "{n}명" */
  count: string;
  /** 선택 중 폴더 칩: "{name} 모두 선택" */
  pickFolder: string;
}

/**
 * 내 사람들: 위에 폴더 칸(누르면 그 폴더, 맨 끝은 새 폴더), 아래에 아직 폴더에 없는 사람(즐겨찾기 먼저).
 * 아래 사람을 길게 눌러(마우스는 끌어) 위 폴더 칸에 놓으면 그 폴더에 들어간다.
 * "선택"을 누르면 사람을 고르는 모드가 되고(폴더 칩으로 그 폴더 사람을 한 번에), 고른 사람으로 메뉴 고르기·선물 고르기를 한다.
 * 고른 상태는 주소(pick=1&with=…&me=…)로 오가서, 메뉴 화면에서 뒤로 와도 그대로다.
 */
export function PeopleBoard({
  rows,
  folders,
  meAvatar,
  initialPick,
  initial,
  initialMe,
  labels,
  sheet,
}: {
  rows: PersonRow[];
  folders: FolderView[];
  meAvatar: AvatarConfig | null;
  initialPick: boolean;
  initial: string[];
  initialMe: boolean;
  labels: Labels;
  sheet: FolderSheetLabels;
}) {
  const canPick = rows.length > 0;
  // 처음 상태: 주소에서 읽는다. 기기 뒤로가기로 돌아오면 Next가 예전 화면을 다시 쓰는데, 그때도 주소(고르던 체크)는 맞으므로
  const [start] = useState(() => {
    if (typeof window !== "undefined" && window.location.pathname === "/people") {
      const q = new URLSearchParams(window.location.search);
      return { pick: q.get("pick") === "1", ids: (q.get("with") ?? "").split(",").filter(Boolean), me: q.get("me") !== "0" };
    }
    return { pick: initialPick, ids: initial, me: initialMe };
  });
  const [picking, setPicking] = useState(start.pick && canPick);
  const [picked, setPicked] = useState<string[]>(start.ids.filter((id) => rows.some((r) => r.contactId === id)));
  const [withMe, setWithMe] = useState(start.me);
  const toggle = (id: string) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : rows.map((r) => r.contactId).filter((x) => x === id || picked.includes(x)));
  // 폴더 칩: 그 폴더 사람을 한 번에 넣고 뺀다
  const toggleMany = (ids: string[], on: boolean) =>
    setPicked(on ? rows.map((r) => r.contactId).filter((x) => ids.includes(x) || picked.includes(x)) : picked.filter((x) => !ids.includes(x)));
  const q = new URLSearchParams();
  if (picked.length) q.set("with", picked.join(","));
  q.set("me", withMe ? "1" : "0");
  const query = `?${q.toString()}`;
  // 지금 상태를 주소에 적어 둔다: 상세로 갔다가 뒤로(버튼·기기 뒤로가기) 와도 고르던 체크가 그대로다
  const here = picking ? `/people${query}&pick=1` : "/people";
  useEffect(() => {
    if (window.location.pathname + window.location.search !== here) window.history.replaceState(window.history.state, "", here);
  }, [here]);
  // 선택 중에는 오른쪽 아래 '직접 적기' 버튼(AddFab)을 숨긴다
  useEffect(() => {
    document.documentElement.toggleAttribute("data-people-picking", picking);
    return () => document.documentElement.removeAttribute("data-people-picking");
  }, [picking]);
  const [making, setMaking] = useState(false);
  // 찾기: 적는 동안은 폴더 칸 대신 찾은 사람(폴더와 상관없이 모두에서). 선택 중이면 고르는 목록을 줄인다
  const [find, setFind] = useState("");
  const searching = !!find.trim();
  const found = searching ? rows.filter((r) => matchesPerson(find, r.name, r.tag)) : rows;

  // 끌어 놓기: 놓는 즉시 화면에서 넣고(서버가 다시 그리면 그 값으로), 실패하면 되돌린다
  // 화면에서 먼저 넣은 것은 서버가 새 목록(rows)을 주면 버린다
  const [local, setLocal] = useState<{ rows: PersonRow[]; added: Record<string, string[]> }>({ rows, added: {} });
  const added = local.rows === rows ? local.added : {};
  const [, startDrop] = useTransition();
  const drag = useDragToFolder({
    enabled: !picking && !searching,
    onDrop: (contactId, folderId) => {
      setLocal((l) => {
        const cur = l.rows === rows ? l.added : {};
        return { rows, added: { ...cur, [contactId]: [...(cur[contactId] ?? []), folderId] } };
      });
      startDrop(async () => {
        const r = await addToFolder(folderId, contactId);
        if (!r.ok)
          setLocal((l) => ({ rows, added: Object.fromEntries(Object.entries(l.rows === rows ? l.added : {}).filter(([id]) => id !== contactId)) }));
      });
    },
  });
  const membersOf = (f: FolderView) => [...f.memberIds, ...Object.keys(added).filter((id) => added[id]!.includes(f.id) && !f.memberIds.includes(id))];
  const unfiled = rows.filter((r) => !r.folderIds.length && !added[r.contactId]?.length);

  const byId = new Map(rows.map((r) => [r.contactId, r]));
  const facesOf = (f: FolderView) =>
    membersOf(f)
      .map((id) => byId.get(id))
      .filter((r): r is PersonRow => !!r)
      .map((r) => ({ key: r.contactId, avatar: r.avatar, label: r.name }));
  const ready = picked.length > 0;
  const action = (href: string, label: string) =>
    ready ? (
      <Link href={href} className="btn-primary">
        {label}
      </Link>
    ) : (
      <span aria-disabled="true" className="btn-primary ![background:#e4e6ee] !text-[#6b7089] !shadow-none">
        {label}
      </span>
    );
  const favCount = rows.filter((r) => r.favorite).length;
  const filled = folders.filter((f) => f.memberIds.some((id) => byId.has(id)));

  return (
    <>
      <div className="flex items-end justify-between gap-2 pl-5 pr-4 pt-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="headline text-[26px]">{labels.title}</h1>
          {rows.length ? <span className="text-[13px] font-medium text-muted">{labels.summary.replace("{n}", String(rows.length)).replace("{f}", String(favCount))}</span> : null}
        </div>
        {canPick ? (
          <button type="button" aria-pressed={picking} onClick={() => setPicking(!picking)} className={`pill !h-10 shrink-0 !gap-1.5 !px-3.5 ${picking ? "grad !shadow-none" : ""}`}>
            {picking ? (
              labels.cancel
            ) : (
              <>
                <Icon name="check" size={17} strokeWidth={2} />
                {labels.pick}
              </>
            )}
          </button>
        ) : null}
      </div>

      {rows.length ? (
        <div className="relative px-4 pt-3.5">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="pointer-events-none absolute left-[31px] top-[29px] text-muted">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
          <input
            type="search"
            value={find}
            onChange={(e) => setFind(e.target.value)}
            placeholder={labels.search}
            aria-label={labels.search}
            enterKeyHint="search"
            className="h-12 w-full rounded-2xl bg-paper pl-[44px] pr-12 text-[16px] shadow-[inset_0_0_0_1.5px_var(--color-rule)] outline-none placeholder:text-muted focus:shadow-[inset_0_0_0_2px_var(--color-sky)] [&::-webkit-search-cancel-button]:appearance-none"
          />
          {find ? (
            <button type="button" aria-label={labels.clear} onClick={() => setFind("")} className="absolute right-5 top-[17px] flex h-11 w-11 items-center justify-center text-muted">
              <Icon name="close" size={18} strokeWidth={2} />
            </button>
          ) : null}
        </div>
      ) : null}

      {picking ? (
        <div className="flex flex-col px-4 pt-3">
          <div className="card px-3.5">
            <button type="button" aria-pressed={withMe} onClick={() => setWithMe(!withMe)} className="flex min-h-[64px] w-full items-center gap-3 text-left">
              <Avatar config={meAvatar} size={44} label={labels.meName} />
              <span className="flex-1 text-[15.5px] font-bold">{labels.withMe}</span>
              <DrawnCheck on={withMe} />
            </button>
          </div>
          {filled.length ? (
            <div role="group" aria-label={labels.folders} className="-mx-4 flex gap-2 overflow-x-auto px-4 pt-3 [scrollbar-width:none]">
              {filled.map((f) => {
                const ids = f.memberIds.filter((id) => byId.has(id));
                const all = ids.every((id) => picked.includes(id));
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={all}
                    aria-label={labels.pickFolder.replace("{name}", f.name)}
                    onClick={() => toggleMany(ids, !all)}
                    className={`flex h-[38px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full pl-3 pr-3.5 text-[14px] ${all ? "chip-on" : "bg-white font-medium shadow-[inset_0_0_0_1.5px_var(--color-rule)]"}`}
                  >
                    <FolderMini color={f.color} size={18} />
                    {f.name}
                    <span className="num text-[13px] !font-bold text-muted">{ids.length}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
          {searching && !found.length ? <p className="px-2 pt-5 text-[14px] text-muted">{labels.searchEmpty}</p> : null}
          <ul className={`card mt-3 flex flex-col px-3.5 ${found.length ? "" : "hidden"}`}>
            {found.map((r) => {
              const on = picked.includes(r.contactId);
              return (
                <li key={r.contactId} className="flex items-center border-t border-rule first:border-t-0">
                  <Link href={`/people/${r.contactId}?back=${encodeURIComponent(here)}`} className="flex min-h-[70px] min-w-0 flex-1 items-center gap-3">
                    <RowBody row={r} avatarLabel={labels.avatarOf.replace("{name}", r.name)} />
                  </Link>
                  <button
                    type="button"
                    aria-pressed={on}
                    aria-label={labels.pickOne.replace("{name}", r.tag ? `${r.name} ${r.tag}` : r.name)}
                    onClick={() => toggle(r.contactId)}
                    className="flex h-[70px] w-12 shrink-0 items-center justify-end"
                  >
                    <DrawnCheck on={on} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : searching ? (
        found.length ? (
          <ul className="card mx-4 mt-3.5 flex flex-col px-3.5">
            {found.map((r) => (
              <li key={r.contactId} className="border-t border-rule first:border-t-0">
                <Link href={`/people/${r.contactId}`} className="flex min-h-[70px] items-center gap-3">
                  <RowBody row={r} avatarLabel={labels.avatarOf.replace("{name}", r.name)} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-6 pt-6 text-[14px] text-muted">{labels.searchEmpty}</p>
        )
      ) : (
        <div onClickCapture={drag.onClickCapture}>
          <h2 className="flex items-baseline gap-1.5 px-6 pb-3 pt-5">
            <span className="section-title">{labels.folders}</span>
            <span className="num text-[14px] !font-bold text-muted">{folders.length}</span>
          </h2>
          <div className="grid grid-cols-3 gap-2.5 px-4">
            {folders.map((f) => {
              // 끄는 중 손가락 아래 폴더는 망고 테두리로
              const target = !!drag.dragging && drag.over === f.id;
              return (
                <Link
                  key={f.id}
                  href={`/people/folder/${f.id}`}
                  data-drop={f.id}
                  className={`flex min-w-0 flex-col items-center gap-2 rounded-[22px] px-1.5 pb-3 pt-4 transition-[transform,background-color,box-shadow] active:scale-[0.97] ${
                    target ? "scale-[1.04] bg-sky-soft shadow-[inset_0_0_0_2px_var(--color-sky)]" : "bg-paper"
                  }`}
                >
                  <FolderArt icon={f.icon} color={f.color} size={77} faces={facesOf(f)} />
                  <span className="w-full truncate text-center text-[15px] font-bold tracking-[-0.02em]">{f.name}</span>
                  <span className="-mt-1.5 text-[12.5px] text-muted">{labels.count.replace("{n}", String(membersOf(f).length))}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setMaking(true)}
              className="flex min-h-[132px] flex-col items-center justify-center gap-1.5 rounded-[22px] text-accent shadow-[inset_0_0_0_2px_#f0d27a] transition-transform active:scale-[0.97]"
            >
              <Icon name="plus" size={26} strokeWidth={2.2} />
              <span className="text-[14.5px] font-bold">{labels.newFolder}</span>
            </button>
          </div>

          {/* 아직 폴더에 없는 사람만. 다 넣었으면 이 칸은 없다 */}
          {unfiled.length ? (
            <>
              <h2 className="flex items-baseline gap-1.5 px-6 pb-2.5 pt-7">
                <span className="section-title">{labels.unfiled}</span>
                <span className="num text-[14px] !font-bold text-muted">{unfiled.length}</span>
              </h2>
              <ul className="card mx-4 flex flex-col px-3.5">
                {unfiled.map((r) => (
                  <li
                    key={r.contactId}
                    onPointerDown={(e) => drag.onPointerDown(e, r.contactId, r.name, "list")}
                    onContextMenu={(e) => e.preventDefault()}
                    className={`select-none border-t border-rule first:border-t-0 [-webkit-touch-callout:none] ${drag.dragging?.id === r.contactId ? "opacity-40" : ""}`}
                  >
                    <Link href={`/people/${r.contactId}`} draggable={false} className="flex min-h-[70px] items-center gap-3">
                      <RowBody row={r} avatarLabel={labels.avatarOf.replace("{name}", r.name)} />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : rows.length ? null : (
            <p className="px-6 pt-6 text-[14px] leading-[1.6] text-muted">{labels.empty}</p>
          )}

          <section className="grad-hero relative mx-4 mt-4 flex items-center gap-2 overflow-hidden rounded-3xl py-4 pl-5 pr-3">
            <span aria-hidden="true" className="absolute -bottom-14 -right-8 h-36 w-36 rounded-full bg-white/25" />
            <div className="relative flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-[16.5px] font-bold leading-[1.35] tracking-[-0.02em]">{labels.bannerTitle}</span>
              <Link href="/request" className="mt-1.5 flex h-9 items-center gap-0.5 self-start rounded-full bg-white pl-3.5 pr-2.5 text-[13.5px] font-bold text-accent">
                {labels.bannerCta}
                <Icon name="chevron" size={15} strokeWidth={2.2} />
              </Link>
            </div>
            <span className="relative">
              <Mascot size={86} bubble="question" />
            </span>
          </section>
        </div>
      )}

      {picking ? (
        <div className="sticky mt-auto flex flex-col gap-2 bg-bg/95 px-5 pb-3 pt-3 backdrop-blur" style={{ bottom: "calc(78px + var(--pb-tab))" }}>
          <span role="status" className="text-[12.5px] text-muted">
            {ready ? labels.selected.replace("{n}", String(picked.length)) : labels.pickSome}
          </span>
          <div className="grid grid-cols-2 gap-2">
            {action(`/plan/menu${query}`, labels.menu)}
            {action(`/plan/gift${query}`, labels.gift)}
          </div>
        </div>
      ) : (
        // 오른쪽 아래 떠 있는 버튼에 마지막 줄이 가리지 않게
        <div className="h-24" />
      )}
      {making ? <FolderSheet labels={sheet} onClose={() => setMaking(false)} /> : null}
      {drag.ghost}
    </>
  );
}
