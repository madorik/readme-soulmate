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
 * 사람 화면 위쪽: 그룹 고르기(드롭다운) + 바로 새 그룹 만들기(+). 고르는 즉시 저장한다.
 * +를 누르거나 드롭다운 맨 끝 '새 그룹 만들기'를 고르면 이름 칸이 열리고, 만들면 바로 그 그룹에 넣는다.
 * 즐겨찾기는 이름 줄 오른쪽 끝 하트(FavoriteHeart)
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

  return (
    <div className="mx-6 mt-5 flex flex-col gap-2">
      <div className="flex items-center gap-2">
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
        <button
          type="button"
          aria-label={labels.newOption}
          aria-expanded={creating}
          onClick={() => setCreating(!creating)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-[inset_0_0_0_1px_var(--color-edge)]"
        >
          <Icon name="plus" size={18} />
        </button>
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
