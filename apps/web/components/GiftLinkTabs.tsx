"use client";

import { useEffect, useRef, useState } from "react";
import { beacon } from "@/components/beacon";
import { setGiftShare } from "@/components/giftShare";
import { Icon } from "@/components/marks";

// 이런 선물은 어때요(목록 방식): 가격대 칩을 누르거나 목록을 좌우로 밀면 그 가격대에서 고른 선물들.
// 칸마다 그 상품 사진과 '왜'. 누르면 쿠팡 상품 페이지(파트너스 링크)로, 누른 것은 이용 기록으로(source: reminder·plan·card)

export interface LinkBand {
  band: string;
  label: string;
  /** basis: 이 사람의 어떤 점을 보고 골랐는지(등산, 60대 아빠). 가족 카드에는 없다 */
  items: { id: string; title: string; reason: string; url: string; image: string; name?: string; basis?: string[] }[];
}

const SWIPE = 56;

/** share: 주면 아래 단추 줄(가족과 같이 준비·선물 완료)에 카드 주소와 지금 가격대를 알린다(선물 힌트 화면 하나에서만) */
export function GiftLinkTabs({ bands, initial, pad = "px-6", label, share, source }: { bands: LinkBand[]; initial: string; pad?: string; label: string; share?: { url: string; text: string }; source: "reminder" | "plan" | "card" }) {
  const [index, setIndex] = useState(() => Math.max(0, bands.findIndex((b) => b.band === initial)));
  const [enter, setEnter] = useState<"left" | "right" | null>(null);
  const [dx, setDx] = useState(0);
  const drag = useRef<{ x: number; y: number; lock: "x" | "y" | null } | null>(null);
  const chips = useRef<(HTMLButtonElement | null)[]>([]);
  const cur = bands[index] ?? bands[0];

  useEffect(() => {
    chips.current[index]?.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
  }, [index]);

  const curBand = cur?.band ?? null;
  const curItems = (cur?.items ?? []).map((i) => i.title).join("\n");
  useEffect(() => {
    if (!share) return;
    setGiftShare({ url: share.url, text: share.text, band: curBand, items: curItems ? curItems.split("\n") : [] });
  }, [share, curBand, curItems]);
  useEffect(() => (share ? () => setGiftShare(null) : undefined), [share]);

  if (!cur) return null;
  const go = (to: number) => {
    if (to < 0 || to >= bands.length || to === index) return;
    setEnter(to > index ? "right" : "left");
    setIndex(to);
  };

  return (
    <div className="flex flex-col">
      <div role="tablist" aria-label={label} className={`flex gap-1.5 overflow-x-auto pb-1 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${pad}`}>
        {bands.map((b, i) => {
          const on = i === index;
          return (
            <button
              key={b.band}
              ref={(el) => {
                chips.current[i] = el;
              }}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => go(i)}
              className={`flex h-10 shrink-0 items-center rounded-full px-3.5 text-[13.5px] font-bold ${on ? "chip-on" : "bg-white text-ink-2 shadow-[inset_0_0_0_1.5px_var(--color-edge)]"}`}
            >
              {b.label}
            </button>
          );
        })}
      </div>
      <div
        data-no-swipe
        className="touch-pan-y overflow-hidden"
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (t) drag.current = { x: t.clientX, y: t.clientY, lock: null };
        }}
        onTouchMove={(e) => {
          const d = drag.current;
          const t = e.touches[0];
          if (!d || !t) return;
          const mx = t.clientX - d.x;
          const my = t.clientY - d.y;
          if (!d.lock) {
            if (Math.abs(mx) > 8 && Math.abs(mx) > Math.abs(my)) d.lock = "x";
            else if (Math.abs(my) > 8) d.lock = "y";
          }
          // 끝 가격대에서는 고무줄처럼 덜 밀린다
          if (d.lock === "x") setDx((mx < 0 && index === bands.length - 1) || (mx > 0 && index === 0) ? mx / 4 : mx);
        }}
        onTouchEnd={() => {
          const d = drag.current;
          drag.current = null;
          if (d?.lock === "x" && Math.abs(dx) > SWIPE) go(index + (dx < 0 ? 1 : -1));
          setDx(0);
        }}
      >
        <ul
          key={cur.band}
          role="tabpanel"
          aria-label={cur.label}
          style={dx ? { transform: `translateX(${dx}px)` } : undefined}
          className={`flex flex-col gap-2 pt-2.5 ${pad} ${dx ? "" : "transition-transform duration-200"} ${enter === "right" ? "motion-safe:animate-[picks-in-right_240ms_ease-out]" : enter === "left" ? "motion-safe:animate-[picks-in-left_240ms_ease-out]" : ""}`}
        >
          {cur.items.map((it) => (
            <li key={it.id}>
              <a href={it.url} target="_blank" rel="sponsored noopener noreferrer" draggable={false} onClick={() => beacon("gift_click", { i: it.id, b: cur.band, s: source })} className="flex items-start gap-3 rounded-2xl bg-white p-3 ring-1 ring-rule active:bg-fill">
                <span aria-hidden="true" className="h-[76px] w-[76px] shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-rule">
                  {it.image ? (
                    // 쿠팡 이미지 주소를 그대로(이미지 최적화 서버를 거치지 않게)
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" draggable={false} className="h-full w-full object-contain" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-sky-soft text-accent">
                      <Icon name="gift" size={24} strokeWidth={1.8} />
                    </span>
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-[15.5px] font-bold tracking-[-0.01em]">{it.title}</span>
                    <Icon name="external" size={15} className="shrink-0 text-muted" />
                  </span>
                  {it.basis?.length ? <BasisTags words={it.basis} /> : null}
                  {it.reason ? (
                    <span className="line-clamp-3 text-[13.5px] leading-[1.5] text-ink-2">{it.reason}</span>
                  ) : it.name ? (
                    <span className="line-clamp-2 text-[13px] leading-[1.45] text-muted">{it.name}</span>
                  ) : null}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** 고른 근거 꼬리표(이 사람 기록의 어느 부분 때문인지) */
export function BasisTags({ words }: { words: string[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {words.map((w) => (
        <span key={w} className="flex h-[22px] items-center rounded-full bg-sky-soft px-2 text-[11.5px] font-bold text-accent">
          {w}
        </span>
      ))}
    </span>
  );
}

/** 고르는 동안: 차례로 바뀌는 한 줄(마지막 줄에서 멈춘다) */
export function PicksLoading({ lines, pad = "px-6" }: { lines: string[]; pad?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (i >= lines.length - 1) return;
    const t = setTimeout(() => setI(i + 1), 1900);
    return () => clearTimeout(t);
  }, [i, lines.length]);
  return (
    <p aria-live="polite" className={`flex min-h-6 items-center gap-2 pt-3 text-[14px] font-semibold text-accent ${pad}`}>
      <span aria-hidden="true" className="flex gap-[3px]">
        {[0, 1, 2].map((d) => (
          <span key={d} style={{ animationDelay: `${d * 160}ms` }} className="h-[5px] w-[5px] rounded-full bg-sky motion-safe:animate-bounce" />
        ))}
      </span>
      <span key={i} className="motion-safe:animate-[picks-fade_320ms_ease-out]">
        {lines[i]}
      </span>
    </p>
  );
}
