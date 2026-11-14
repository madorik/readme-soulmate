"use client";

import type { AvatarConfig } from "@readme/core";
import Link from "next/link";
import { useEffect, useState } from "react";
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
}

/** 제목 오른쪽 글자 버튼(리드미 요청·선택) */
const HEAD_BUTTON = "flex min-h-11 items-center gap-1 px-2.5 text-[14.5px] font-bold";

/**
 * 내 사람들. 위에 리드미 요청·선택, 직접 적기는 오른쪽 아래 떠 있는 버튼.
 * "선택"을 누르면 사람을 고르는 모드가 되고, 고른 사람으로 메뉴 고르기·선물 고르기·공유하기를 한다.
 * 고른 상태는 주소(pick=1&with=…&me=…)로 오가서, 메뉴 화면에서 뒤로 와도 그대로다.
 */
export function PeopleBoard({
  rows,
  meAvatar,
  initialPick,
  initial,
  initialMe,
  labels,
}: {
  rows: PersonRow[];
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
        <ul className="flex flex-col px-6 pt-3">
          {picking ? (
            <li className="border-b border-rule">
              <button type="button" aria-pressed={withMe} onClick={() => setWithMe(!withMe)} className="flex min-h-[60px] w-full items-center gap-3 text-left">
                <Avatar config={meAvatar} size={36} label={labels.meName} />
                <span className="flex-1 text-[15px] font-medium">{labels.withMe}</span>
                <DrawnCheck on={withMe} />
              </button>
            </li>
          ) : null}
          {rows.map((r) => {
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
      ) : (
        <p className="px-6 pt-5 text-[14px] leading-[1.6] text-muted">{labels.empty}</p>
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
