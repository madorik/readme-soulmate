"use client";

import type { AvatarConfig } from "@readme/core";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { createGroup, deleteGroup } from "@/app/actions/people";
import { Avatar } from "@/components/Avatar";
import { DrawnCheck, Icon } from "@/components/marks";
import { RowBody, type PersonRow } from "@/components/PersonRow";

interface Labels {
  title: string;
  /** 리드미 요청(/request). 직접 적기는 오른쪽 아래 떠 있는 버튼(AddFab) */
  request: string;
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

/** 즐겨찾기 → 그룹 순서대로 → 그룹 없음. 기본 그룹은 사람이 있을 때만, 직접 만든 그룹은 비어도 보인다 */
function sectionsOf(rows: PersonRow[], groups: BoardGroup[], labels: Labels): Section[] {
  const out: Section[] = [];
  const favs = rows.filter((r) => r.favorite);
  if (favs.length) out.push({ key: "fav", title: labels.favorites, rows: favs, deletable: null });
  for (const g of groups) {
    const list = rows.filter((r) => !r.favorite && r.groupId === g.id);
    if (list.length || g.custom) out.push({ key: g.id, title: g.name, rows: list, deletable: g.custom ? g.id : null });
  }
  const loose = rows.filter((r) => !r.favorite && !groups.some((g) => g.id === r.groupId));
  if (loose.length) out.push({ key: "none", title: labels.noGroup, rows: loose, deletable: null });
  return out;
}

const COLLAPSED_KEY = "readme.people.collapsed";

/** 제목 오른쪽 글자 버튼(리드미 요청·선택) */
const HEAD_BUTTON = "flex min-h-11 items-center gap-1 px-2.5 text-[14.5px] font-bold";

/**
 * 내 사람들. 위에 리드미 요청·선택, 직접 적기는 오른쪽 아래 떠 있는 버튼.
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
  // 새 그룹 만들기·직접 만든 그룹 지우기(서버가 /people을 다시 그린다)
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
  const sections = sectionsOf(rows, groups, labels);
  // 그룹을 하나도 안 썼으면(그룹 없음 하나뿐) 머리 없이 예전처럼
  const plain = sections.length === 1 && sections[0]!.key === "none";
  const ready = picked.length > 0;
  const action = (href: string, label: string) =>
    ready ? (
      <Link href={href} className="btn-primary">
        {label}
      </Link>
    ) : (
      <span aria-disabled="true" className="btn-primary !bg-[#b6b9bd]">
        {label}
      </span>
    );

  return (
    <>
      <div className="flex items-center justify-between gap-2 pl-6 pr-2 pt-3">
        <h1 className="headline shrink-0 text-[26px]">{labels.title}</h1>
        <div className="flex items-center">
          {picking ? null : (
            <Link href="/request" className={HEAD_BUTTON}>
              <Icon name="card" size={17} />
              {labels.request}
            </Link>
          )}
          {canPick ? (
            <button type="button" aria-pressed={picking} onClick={() => setPicking(!picking)} className={HEAD_BUTTON}>
              {picking ? labels.cancel : (
                <>
                  <Icon name="check" size={17} />
                  {labels.pick}
                </>
              )}
            </button>
          ) : null}
        </div>
      </div>

      {picking ? <p className="px-6 pt-1 text-[13.5px] leading-[1.55] text-muted">{labels.hint}</p> : null}

      {rows.length ? (
        <div className="flex flex-col px-6 pt-3">
          {picking ? (
            <div className="border-b border-rule">
              <button type="button" aria-pressed={withMe} onClick={() => setWithMe(!withMe)} className="flex min-h-[60px] w-full items-center gap-3 text-left">
                <Avatar config={meAvatar} size={36} label={labels.meName} />
                <span className="flex-1 text-[15px] font-medium">{labels.withMe}</span>
                <DrawnCheck on={withMe} />
              </button>
            </div>
          ) : null}
          {sections.map((sec) => {
            const open = plain || !collapsed.includes(sec.key);
            return (
              <section key={sec.key} aria-label={sec.title}>
                {plain ? null : (
                  <div className="flex items-center gap-1 border-b border-rule pt-3">
                    <button type="button" aria-expanded={open} onClick={() => fold(sec.key)} className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left">
                      <span className="truncate text-[13.5px] font-bold">{sec.title}</span>
                      <span className="num text-[12.5px] text-muted">{sec.rows.length}</span>
                      <Icon name="chevron" size={16} className={`ml-auto text-muted transition-transform duration-200 ${open ? "-rotate-90" : "rotate-90"}`} />
                    </button>
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
                )}
                {open ? (
                  <ul className="flex flex-col">
                    {sec.rows.map((r) => {
                      const label = labels.avatarOf.replace("{name}", r.name);
                      if (!picking)
                        return (
                          <li key={r.contactId} className="border-b border-rule">
                            <Link href={`/people/${r.contactId}`} className="flex min-h-[60px] items-center gap-3">
                              <RowBody row={r} avatarLabel={label} />
                            </Link>
                          </li>
                        );
                      const on = picked.includes(r.contactId);
                      return (
                        <li key={r.contactId} className="flex items-center border-b border-rule">
                          <Link href={`/people/${r.contactId}?back=${encodeURIComponent(here)}`} className={`flex min-h-[60px] min-w-0 flex-1 items-center gap-3 ${r.pickable ? "" : "opacity-40"}`}>
                            <RowBody row={r} avatarLabel={label} />
                          </Link>
                          <button
                            type="button"
                            aria-pressed={on}
                            aria-label={labels.pickOne.replace("{name}", r.tag ? `${r.name} ${r.tag}` : r.name)}
                            disabled={!r.pickable}
                            onClick={() => toggle(r.contactId)}
                            className={`flex h-[60px] w-12 shrink-0 items-center justify-end ${r.pickable ? "" : "opacity-40"}`}
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
        <p className="px-6 pt-5 text-[14px] leading-[1.6] text-muted">{labels.empty}</p>
      )}

      {/* 새 그룹 만들기(선택 중에는 숨김) */}
      {picking ? null : making ? (
        <form
          className="flex gap-2 px-6 pt-4"
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
      ) : (
        <div className="px-6 pt-2">
          <button type="button" onClick={() => setMaking(true)} className="flex min-h-11 items-center gap-1.5 text-[14px] font-bold text-muted">
            <Icon name="plus" size={16} />
            {labels.newGroup}
          </button>
        </div>
      )}

      {picking ? (
        <div className="sticky mt-auto flex flex-col gap-2 bg-white/95 px-6 pb-3 pt-3 backdrop-blur" style={{ bottom: "calc(56px + max(var(--sab), 10px))" }}>
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
    </>
  );
}
