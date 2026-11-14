"use client";

import { useState, useTransition } from "react";
import { setFavorite } from "@/app/actions/people";

const HEART = "M12 20.3s-7.6-4.6-9.2-9.4C1.7 7.6 3.9 4.6 7.2 4.6c2 0 3.5 1.1 4.8 2.8 1.3-1.7 2.8-2.8 4.8-2.8 3.3 0 5.5 3 4.4 6.3-1.6 4.8-9.2 9.4-9.2 9.4z";

/** 하트 모양: 켜지면 빨갛게 채운다 */
export function Heart({ on, size = 24 }: { on: boolean; size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" className={`transition-transform duration-150 ${on ? "scale-110 text-marker" : "text-ink-2"}`}>
      <path d={HEART} fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

/** 사람 화면 이름 줄 오른쪽 끝 하트: 누르면 즐겨찾기(사람들 맨 위에 고정) */
export function FavoriteHeart({ contactId, initial, label }: { contactId: string; initial: boolean; label: string }) {
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
      className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full active:scale-95"
    >
      <Heart on={on} />
    </button>
  );
}
