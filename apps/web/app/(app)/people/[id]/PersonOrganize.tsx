"use client";

import { useState, useTransition } from "react";
import { createGroup, setContactGroup } from "@/app/actions/people";
import { Icon } from "@/components/marks";

export interface GroupOption {
  id: string;
  name: string;
}

const NEW = "__new";

/**
 * 사람 화면 오른쪽 위: 그룹 알약(누르면 드롭다운). 고르는 즉시 저장한다.
 * 드롭다운 맨 끝 '새 그룹 만들기'를 고르면 알약 아래에 이름 칸이 뜨고, 만들면 바로 그 그룹에 넣는다.
 * 보이는 건 알약이고, 그 위에 투명한 진짜 select를 덮어 휴대폰 기본 고르기 창과 읽어 주기를 그대로 쓴다.
 * 즐겨찾기는 바로 오른쪽 별(FavoriteStar)
 */
export function PersonOrganize({
  contactId,
  groupId,
  groups: initialGroups,
  labels,
}: {
  contactId: string;
  groupId: string | null;
  groups: GroupOption[];
  labels: { group: string; none: string; newOption: string; namePlaceholder: string; create: string; error: string };
}) {
  const [group, setGroup] = useState(groupId ?? "");
  const [groups, setGroups] = useState(initialGroups);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  function pickGroup(value: string) {
    if (value === NEW) {
      setCreating(true);
      return;
    }
    const before = group;
    setGroup(value);
    setCreating(false);
    setError(false);
    start(async () => {
      const r = await setContactGroup(contactId, value || null);
      if (!r.ok) {
        setGroup(before);
        setError(true);
      }
    });
  }

  function create() {
    const clean = name.replace(/\s+/g, " ").trim();
    if (!clean) return;
    setError(false);
    start(async () => {
      const g = await createGroup(clean);
      if (!g) {
        setError(true);
        return;
      }
      setGroups((list) => (list.some((x) => x.id === g.id) ? list : [...list, g]));
      setCreating(false);
      setName("");
      setGroup(g.id);
      const r = await setContactGroup(contactId, g.id);
      if (!r.ok) setError(true);
    });
  }

  const current = groups.find((g) => g.id === group);
  return (
    <div className="relative">
      <label className="relative flex h-10 max-w-[180px] items-center gap-1 rounded-full bg-white pl-3.5 pr-2.5 shadow-[inset_0_0_0_1px_var(--color-edge)]">
        <span aria-hidden="true" className={`truncate text-[14px] font-bold ${current ? "" : "text-muted"}`}>
          {current ? current.name : labels.group}
        </span>
        <Icon name="chevron" size={15} strokeWidth={2.2} className="shrink-0 rotate-90 text-muted" />
        <select
          value={creating ? NEW : group}
          onChange={(e) => pickGroup(e.target.value)}
          disabled={pending}
          aria-label={labels.group}
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
        >
          <option value="">{labels.none}</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
          <option value={NEW}>{labels.newOption}</option>
        </select>
      </label>
      {creating ? (
        <form
          className="card absolute right-0 top-full z-40 mt-2 flex w-[min(300px,calc(100vw-32px))] gap-2 p-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setCreating(false);
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            autoFocus
            placeholder={labels.namePlaceholder}
            aria-label={labels.namePlaceholder}
            className="field !h-11 min-w-0 flex-1"
          />
          <button disabled={pending || !name.trim()} className="btn-primary !h-11 shrink-0 px-4">
            {labels.create}
          </button>
        </form>
      ) : null}
      {error ? (
        <p role="alert" className="absolute right-0 top-full mt-1 whitespace-nowrap text-[12.5px] font-bold text-red">
          {labels.error}
        </p>
      ) : null}
    </div>
  );
}
