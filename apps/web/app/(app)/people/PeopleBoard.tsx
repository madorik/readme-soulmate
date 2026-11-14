"use client";

import type { AvatarConfig } from "@readme/core";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { createGroup, deleteGroup, moveContact } from "@/app/actions/people";
import { Avatar } from "@/components/Avatar";
import { Mascot } from "@/components/Mascot";
import { DrawnCheck, Icon } from "@/components/marks";
import { RowBody, type PersonRow } from "@/components/PersonRow";
import { useDragToGroup } from "./useDragToGroup";

interface Labels {
  title: string;
  /** "{n}명 · 즐겨찾기 {f}명" */
  summary: string;
  all: string;
  bannerTitle: string;
  bannerBody: string;
  bannerCta: string;
  pick: string;
  cancel: string;
  hint: string;
  withMe: string;
  meName: string;
  selected: string;
  pickSome: string;
  menu: string;
  gift: string;
  avatarOf: string;
  pickOne: string;
  empty: string;
  favorites: string;
  noGroup: string;
  newGroup: string;
  groupNamePlaceholder: string;
  create: string;
  deleteGroup: string;
  /** "{name} 그룹을 지울까요?…" */
  deleteConfirm: string;
  /** 선택 중 그룹 머리 체크: "{name} 모두 선택" */
  pickGroup: string;
}

export interface BoardGroup {
  id: string;
  name: string;
  /** 직접 만든 그룹(지울 수 있고, 비어 있어도 보인다) */
  custom: boolean;
}

interface Section {
  key: string;
  title: string;
  rows: PersonRow[];
  /** 지울 수 있는 그룹이면 그 id */
  deletable: string | null;
}

/** 즐겨찾기(항상 맨 위) → 사람이 있는 그룹 → 그룹 없음 → 빈 그룹(머리만) */
function sectionsOf(rows: PersonRow[], groups: BoardGroup[], labels: Labels): Section[] {
  const out: Section[] = [];
  const favs = rows.filter((r) => r.favorite);
  if (favs.length) out.push({ key: "fav", title: labels.favorites, rows: favs, deletable: null });
  const byGroup = groups.map((g) => ({ key: g.id, title: g.name, rows: rows.filter((r) => !r.favorite && r.groupId === g.id), deletable: g.custom ? g.id : null }));
  out.push(...byGroup.filter((sec) => sec.rows.length));
  const loose = rows.filter((r) => !r.favorite && !groups.some((g) => g.id === r.groupId));
  if (loose.length) out.push({ key: "none", title: labels.noGroup, rows: loose, deletable: null });
  out.push(...byGroup.filter((sec) => !sec.rows.length));
  return out;
}

const COLLAPSED_KEY = "readme.people.collapsed";

/** 그룹 칩(위 가로 줄): 고르면 하늘 그라데이션 */
const groupChip = (on: boolean) =>
  `flex h-[38px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[14px] ${on ? "grad font-bold" : "bg-white font-medium shadow-[inset_0_0_0_1.5px_var(--color-rule)]"}`;

/**
 * 내 사람들. 그룹 목록으로 보인다(즐겨찾기 → 그룹 → 그룹 없음, 누르면 접힌다). 위에 새 그룹·선택, 직접 적기는 오른쪽 아래 떠 있는 버튼.
 * 사람을 길게 눌러(마우스는 끌어) 다른 그룹 칸에 놓으면 그 그룹으로 옮긴다.
 * "선택"을 누르면 사람을 고르는 모드가 되고, 고른 사람으로 메뉴 고르기·선물 고르기·공유하기를 한다.
 * 고른 상태는 주소(pick=1&with=…&me=…)로 오가서, 메뉴 화면에서 뒤로 와도 그대로다.
 */
export function PeopleBoard({
  rows,
  groups,
  meAvatar,
  initialPick,
  initial,
  initialMe,
  labels,
}: {
  rows: PersonRow[];
  groups: BoardGroup[];
  meAvatar: AvatarConfig | null;
  initialPick: boolean;
  initial: string[];
  initialMe: boolean;
  labels: Labels;
}) {
  const canPick = rows.some((r) => r.pickable);
  // 처음 상태: 주소에서 읽는다. 기기 뒤로가기로 돌아오면 Next가 예전 화면을 다시 쓰는데, 그때도 주소(고르던 체크)는 맞으므로
  const [start] = useState(() => {
    if (typeof window !== "undefined" && window.location.pathname === "/people") {
      const q = new URLSearchParams(window.location.search);
      return { pick: q.get("pick") === "1", ids: (q.get("with") ?? "").split(",").filter(Boolean), me: q.get("me") !== "0" };
    }
    return { pick: initialPick, ids: initial, me: initialMe };
  });
  const [picking, setPicking] = useState(start.pick && canPick);
  const [picked, setPicked] = useState<string[]>(start.ids.filter((id) => rows.some((r) => r.contactId === id && r.pickable)));
  const [withMe, setWithMe] = useState(start.me);
  const toggle = (id: string) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : rows.map((r) => r.contactId).filter((x) => x === id || picked.includes(x)));
  // 그룹 머리 체크: 그 그룹에서 고를 수 있는 사람을 한 번에 넣고 뺀다
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
  // 그룹 머리를 누르면 접고 펼친다(드롭다운). 접은 그룹은 이 기기에 기억해 둔다
  const [collapsed, setCollapsed] = useState<string[]>([]);
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(COLLAPSED_KEY) ?? "[]");
      if (Array.isArray(saved)) setCollapsed(saved.filter((x): x is string => typeof x === "string"));
    } catch {
      /* 저장소를 못 쓰면 다 펼친 채로 */
    }
  }, []);
  function fold(key: string) {
    const next = collapsed.includes(key) ? collapsed.filter((x) => x !== key) : [...collapsed, key];
    setCollapsed(next);
    try {
      window.localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next));
    } catch {
      /* 기억만 못 할 뿐 */
    }
  }
  // 새 그룹 만들기(위 버튼)·직접 만든 그룹 지우기(서버가 /people을 다시 그린다)
  const [making, setMaking] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [busy, startBusy] = useTransition();
  function makeGroup() {
    const name = groupName.replace(/\s+/g, " ").trim();
    if (!name) return;
    startBusy(async () => {
      if (await createGroup(name)) {
        setGroupName("");
        setMaking(false);
      }
    });
  }
  function dropGroup(id: string, name: string) {
    if (!window.confirm(labels.deleteConfirm.replace("{name}", name))) return;
    startBusy(async () => {
      await deleteGroup(id);
    });
  }
  // 끌어 놓기: 놓는 즉시 화면에서 옮기고(서버가 다시 그리면 그 값으로), 실패하면 되돌린다
  const [moved, setMoved] = useState<Record<string, { groupId: string | null; favorite: boolean }>>({});
  useEffect(() => setMoved({}), [rows]);
  const shown = rows.map((r) => (moved[r.contactId] ? { ...r, ...moved[r.contactId] } : r));
  const drag = useDragToGroup({
    enabled: !picking,
    onDrop: (id, target) => {
      const row = shown.find((r) => r.contactId === id);
      if (!row) return;
      // 즐겨찾기 칸이면 즐겨찾기(그룹은 그대로), 그룹 없음이면 그룹 빼기, 그룹 칸이면 그 그룹(즐겨찾기는 풀린다)
      const next = target === "fav" ? { groupId: row.groupId, favorite: true } : target === "none" ? { groupId: null, favorite: false } : { groupId: target, favorite: false };
      setMoved((m) => ({ ...m, [id]: next }));
      startBusy(async () => {
        const r = await moveContact(id, next);
        if (!r.ok)
          setMoved((m) => {
            const { [id]: _, ...rest } = m;
            return rest;
          });
      });
    },
  });
  const sections = sectionsOf(shown, groups, labels);
  // 위 그룹 칩으로 한 그룹만 보기(없어진 그룹이면 전체)
  const [filter, setFilter] = useState("all");
  const visible = filter === "all" || !sections.some((sec) => sec.key === filter) ? sections : sections.filter((sec) => sec.key === filter);
  const groupForm = (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        makeGroup();
      }}
    >
      <input
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        maxLength={30}
        autoFocus
        placeholder={labels.groupNamePlaceholder}
        aria-label={labels.groupNamePlaceholder}
        className="field min-w-0 flex-1"
      />
      <button disabled={busy || !groupName.trim()} className="btn-primary !h-12 shrink-0 px-5">
        {labels.create}
      </button>
    </form>
  );
  const ready = picked.length > 0;
  const action = (href: string, label: string) =>
    ready ? (
      <Link href={href} className="btn-primary">
        {label}
      </Link>
    ) : (
      <span aria-disabled="true" className="btn-primary ![background:#dfe7f1] !text-[#6f7b8f] !shadow-none">
        {label}
      </span>
    );
  const favCount = rows.filter((r) => r.favorite).length;

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

      {rows.length || groups.length ? (
        <div role="group" aria-label={labels.title} className="flex gap-2 overflow-x-auto px-5 pb-1 pt-3.5 [scrollbar-width:none]">
          <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")} className={groupChip(filter === "all")}>
            {labels.all}
            <span className="num text-[13px] !font-bold">{rows.length}</span>
          </button>
          {sections.map((sec) => (
            <button key={sec.key} type="button" aria-pressed={filter === sec.key} onClick={() => setFilter(filter === sec.key ? "all" : sec.key)} className={groupChip(filter === sec.key)}>
              {sec.key === "fav" ? (
                <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="var(--color-marker)">
                  <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
                </svg>
              ) : null}
              {sec.title}
              <span className={`num text-[13px] !font-bold ${filter === sec.key ? "" : "text-muted"}`}>{sec.rows.length}</span>
            </button>
          ))}
          {picking ? null : (
            <button
              type="button"
              aria-expanded={making}
              onClick={() => setMaking(!making)}
              className="flex h-[38px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full border-[1.5px] border-dashed border-[#bfd6ee] px-3.5 text-[14px] font-bold text-accent"
            >
              <Icon name="plus" size={15} strokeWidth={2.2} />
              {labels.newGroup}
            </button>
          )}
        </div>
      ) : null}

      {picking ? <p className="px-5 pt-2 text-[13.5px] leading-[1.55] text-muted">{labels.hint}</p> : null}
      {!picking && making ? <div className="px-4 pt-3">{groupForm}</div> : null}

      {picking ? null : (
        <section className="grad-hero relative mx-4 mt-3.5 flex items-center gap-2 overflow-hidden rounded-3xl py-4 pl-5 pr-3">
          <span aria-hidden="true" className="absolute -bottom-14 -right-8 h-36 w-36 rounded-full bg-white/25" />
          <div className="relative flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-[16.5px] font-bold leading-[1.35] tracking-[-0.02em]">{labels.bannerTitle}</span>
            <span className="text-[12.5px] leading-[1.5] text-ink-2">{labels.bannerBody}</span>
            <Link href="/request" className="mt-1.5 flex h-9 items-center gap-0.5 self-start rounded-full bg-white pl-3.5 pr-2.5 text-[13.5px] font-bold text-accent">
              {labels.bannerCta}
              <Icon name="chevron" size={15} strokeWidth={2.2} />
            </Link>
          </div>
          <span className="relative">
            <Mascot size={86} bubble="question" />
          </span>
        </section>
      )}

      {rows.length ? (
        <div className="flex flex-col px-4 pt-1" onClickCapture={drag.onClickCapture}>
          {picking ? (
            <div className="card mt-3 px-3.5">
              <button type="button" aria-pressed={withMe} onClick={() => setWithMe(!withMe)} className="flex min-h-[64px] w-full items-center gap-3 text-left">
                <Avatar config={meAvatar} size={44} label={labels.meName} />
                <span className="flex-1 text-[15.5px] font-bold">{labels.withMe}</span>
                <DrawnCheck on={withMe} />
              </button>
            </div>
          ) : null}
          {visible.map((sec) => {
            const open = !collapsed.includes(sec.key);
            const pickIds = sec.rows.filter((r) => r.pickable).map((r) => r.contactId);
            const allPicked = pickIds.length > 0 && pickIds.every((id) => picked.includes(id));
            // 끄는 중 손가락 아래 칸(원래 칸이 아니면) 강조
            const target = !!drag.dragging && drag.over === sec.key && drag.dragging.from !== sec.key;
            return (
              <section
                key={sec.key}
                aria-label={sec.title}
                data-drop={picking ? undefined : sec.key}
                className={`-mx-1.5 mt-2 rounded-[26px] px-1.5 pb-1.5 transition-colors ${target ? "bg-sky-soft shadow-[inset_0_0_0_2px_var(--color-sky)]" : ""}`}
              >
                <div className="flex items-center gap-1 pl-1.5">
                    <button type="button" aria-expanded={open} onClick={() => fold(sec.key)} className="flex min-h-11 min-w-0 flex-1 items-center gap-1.5 text-left">
                      <span className={`truncate text-[15px] font-bold ${target ? "text-accent" : ""}`}>{sec.title}</span>
                      <span className="num text-[13px] !font-bold text-muted">{sec.rows.length}</span>
                      <Icon name="chevron" size={16} className={`ml-0.5 text-muted transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
                    </button>
                    {picking && pickIds.length ? (
                      <button
                        type="button"
                        aria-pressed={allPicked}
                        aria-label={labels.pickGroup.replace("{name}", sec.title)}
                        onClick={() => toggleMany(pickIds, !allPicked)}
                        className="flex h-11 w-12 shrink-0 items-center justify-end"
                      >
                        <DrawnCheck on={allPicked} />
                      </button>
                    ) : null}
                    {sec.deletable && !picking ? (
                      <button
                        type="button"
                        disabled={busy}
                        aria-label={`${labels.deleteGroup} ${sec.title}`}
                        onClick={() => dropGroup(sec.deletable!, sec.title)}
                        className="flex h-11 w-9 shrink-0 items-center justify-end text-muted"
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    ) : null}
                </div>
                {open && sec.rows.length ? (
                  <ul className="card flex flex-col px-3.5">
                    {sec.rows.map((r) => {
                      const label = labels.avatarOf.replace("{name}", r.name);
                      if (!picking)
                        return (
                          <li
                            key={r.contactId}
                            onPointerDown={(e) => drag.onPointerDown(e, r.contactId, r.name, sec.key)}
                            onContextMenu={(e) => e.preventDefault()}
                            className={`select-none border-t border-rule first:border-t-0 [-webkit-touch-callout:none] ${drag.dragging?.id === r.contactId ? "opacity-40" : ""}`}
                          >
                            <Link href={`/people/${r.contactId}`} draggable={false} className="flex min-h-[70px] items-center gap-3">
                              <RowBody row={r} avatarLabel={label} />
                            </Link>
                          </li>
                        );
                      const on = picked.includes(r.contactId);
                      return (
                        <li key={r.contactId} className="flex items-center border-t border-rule first:border-t-0">
                          <Link href={`/people/${r.contactId}?back=${encodeURIComponent(here)}`} className={`flex min-h-[70px] min-w-0 flex-1 items-center gap-3 ${r.pickable ? "" : "opacity-40"}`}>
                            <RowBody row={r} avatarLabel={label} />
                          </Link>
                          <button
                            type="button"
                            aria-pressed={on}
                            aria-label={labels.pickOne.replace("{name}", r.tag ? `${r.name} ${r.tag}` : r.name)}
                            disabled={!r.pickable}
                            onClick={() => toggle(r.contactId)}
                            className={`flex h-[70px] w-12 shrink-0 items-center justify-end ${r.pickable ? "" : "opacity-40"}`}
                          >
                            <DrawnCheck on={on} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : (
        <p className="px-5 pt-5 text-[14px] leading-[1.6] text-muted">{labels.empty}</p>
      )}

      {picking ? (
        <div className="sticky mt-auto flex flex-col gap-2 bg-bg/95 px-5 pb-3 pt-3 backdrop-blur" style={{ bottom: "calc(78px + max(var(--sab), 14px))" }}>
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
        <div className="h-20" />
      )}
      {drag.ghost}
    </>
  );
}
