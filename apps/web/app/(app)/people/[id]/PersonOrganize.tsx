"use client";

import { useState, useTransition } from "react";
import { createGroup, setContactGroup, setFavorite } from "@/app/actions/people";
import { Icon } from "@/components/marks";

export interface GroupOption {
  id: string;
  name: string;
}

const NEW = "__new";

/** 별 모양: 켜지면 빨갛게 채운다 */
export function Star({ on, size = 18 }: { on: boolean; size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" className={on ? "text-marker" : "text-ink"}>
      <path
        d="M12 3.6l2.55 5.2 5.7.82-4.13 4.03.98 5.69L12 16.66l-5.1 2.68.98-5.69L3.75 9.62l5.7-.82z"
        fill={on ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * 사람 화면 위쪽: 즐겨찾기 별 + 그룹 고르기(드롭다운). 고르는 즉시 저장한다.
 * 드롭다운 맨 끝 '새 그룹 만들기'를 고르면 이름 칸이 열리고, 만들면 바로 그 그룹에 넣는다.
 */
export function PersonOrganize({
  contactId,
  favorite,
  groupId,
  groups: initialGroups,
  labels,
}: {
  contactId: string;
  favorite: boolean;
  groupId: string | null;
  groups: GroupOption[];
  labels: { favorite: string; group: string; none: string; newOption: string; namePlaceholder: string; create: string; error: string };
}) {
  const [fav, setFav] = useState(favorite);
  const [group, setGroup] = useState(groupId ?? "");
  const [groups, setGroups] = useState(initialGroups);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  function toggleFav() {
    const next = !fav;
    setFav(next);
    setError(false);
    start(async () => {
      const r = await setFavorite(contactId, next);
      if (!r.ok) {
        setFav(!next);
        setError(true);
      }
    });
  }

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

  return (
    <div className="mx-6 mt-5 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleFav}
          aria-pressed={fav}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 text-[14px] font-bold shadow-[inset_0_0_0_1px_var(--color-edge)]"
        >
          <Star on={fav} />
          {labels.favorite}
        </button>
        <label className="relative flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full bg-white pl-3.5 pr-3 shadow-[inset_0_0_0_1px_var(--color-edge)]">
          <span className="shrink-0 text-[13px] font-bold text-muted">{labels.group}</span>
          <select
            value={creating ? NEW : group}
            onChange={(e) => pickGroup(e.target.value)}
            disabled={pending}
            aria-label={labels.group}
            className="min-w-0 flex-1 appearance-none truncate bg-transparent pr-6 text-[14.5px] font-bold outline-none"
          >
            <option value="">{labels.none}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
            <option value={NEW}>{labels.newOption}</option>
          </select>
          <Icon name="chevron" size={16} className="pointer-events-none absolute right-3 rotate-90 text-muted" />
        </label>
      </div>
      {creating ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            autoFocus
            placeholder={labels.namePlaceholder}
            aria-label={labels.namePlaceholder}
            className="field min-w-0 flex-1"
          />
          <button disabled={pending || !name.trim()} className="btn-primary !h-12 shrink-0 px-5">
            {labels.create}
          </button>
        </form>
      ) : null}
      {error ? (
        <p role="alert" className="text-[12.5px] font-bold text-red">
          {labels.error}
        </p>
      ) : null}
    </div>
  );
}
