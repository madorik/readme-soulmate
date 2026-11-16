"use client";

import { useState } from "react";
import { Icon } from "@/components/marks";

// 이런 선물은 어때요(목록 방식): 가격대 칩을 누르면 그 가격대에서 고른 선물들. 누르면 쿠팡 검색 화면(파트너스 링크)으로

export interface LinkBand {
  band: string;
  label: string;
  items: { id: string; title: string; reason: string; url: string }[];
}

export function GiftLinkTabs({ bands, initial, pad = "px-6", label }: { bands: LinkBand[]; initial: string; pad?: string; label: string }) {
  const [band, setBand] = useState(initial);
  const cur = bands.find((b) => b.band === band) ?? bands[0];
  if (!cur) return null;
  return (
    <div className="flex flex-col">
      <div role="tablist" aria-label={label} className={`flex gap-1.5 overflow-x-auto pb-1 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${pad}`}>
        {bands.map((b) => {
          const on = b.band === cur.band;
          return (
            <button
              key={b.band}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setBand(b.band)}
              className={`flex h-10 shrink-0 items-center rounded-full px-4 text-[14px] font-bold ${on ? "chip-on" : "bg-white text-ink-2 shadow-[inset_0_0_0_1.5px_var(--color-edge)]"}`}
            >
              {b.label}
            </button>
          );
        })}
      </div>
      <ul role="tabpanel" aria-label={cur.label} className={`flex flex-col gap-2 pt-2.5 ${pad}`}>
        {cur.items.map((it) => (
          <li key={it.id}>
            <a href={it.url} target="_blank" rel="sponsored noopener noreferrer" className="flex items-start gap-3 rounded-2xl bg-white py-3.5 pl-3 pr-3.5 ring-1 ring-rule active:bg-fill">
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-soft text-accent">
                <Icon name="gift" size={19} strokeWidth={1.9} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1 pt-px">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-[15.5px] font-bold tracking-[-0.01em]">{it.title}</span>
                  <Icon name="external" size={15} className="shrink-0 text-muted" />
                </span>
                <span className="line-clamp-3 text-[13.5px] leading-[1.5] text-ink-2">{it.reason}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
