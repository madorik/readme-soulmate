"use client";

import { useState, useTransition } from "react";
import { setFavorite } from "@/app/actions/people";

const STAR = "M12 3.6l2.55 5.2 5.7.82-4.13 4.03.98 5.69L12 16.66l-5.1 2.68.98-5.69L3.75 9.62l5.7-.82z";

/** 사람 화면 오른쪽 위 그룹 오른쪽 별: 누르면 즐겨찾기(사람들 맨 위에 고정). 프로필(얼굴·이름) 쪽에는 두지 않는다 */
export function FavoriteStar({ contactId, initial, label }: { contactId: string; initial: boolean; label: string }) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={on}
      disabled={pending}
      onClick={() => {
        const next = !on;
        setOn(next);
        start(async () => {
          const r = await setFavorite(contactId, next);
          if (!r.ok) setOn(!next);
        });
      }}
      className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-[inset_0_0_0_1.5px_var(--color-edge)] active:scale-95 ${on ? "bg-[#fff0c9]" : "bg-white"}`}
    >
      <svg aria-hidden="true" width={22} height={22} viewBox="0 0 24 24" className={on ? "text-ink" : "text-muted"}>
        <path d={STAR} fill={on ? "var(--color-sky)" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
