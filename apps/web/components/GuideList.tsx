"use client";

import { beacon } from "@/components/beacon";
import { Icon } from "@/components/marks";

// 선물 가이드의 가격대별 목록: 검색에 다 보이도록 가격대를 칩으로 숨기지 않고 모두 펼친다. 누르면 쿠팡 상품 페이지(파트너스 링크), 누른 것은 이용 기록(source: guide)

export interface GuideBand {
  band: string;
  title: string;
  items: { id: string; title: string; name: string; url: string; image: string }[];
}

export function GuideList({ bands }: { bands: GuideBand[] }) {
  return (
    <div className="flex flex-col gap-7">
      {bands.map((b) => (
        <section key={b.band} aria-labelledby={`band-${b.band}`} className="flex flex-col gap-2">
          <h2 id={`band-${b.band}`} className="section-title px-1">
            {b.title}
          </h2>
          <ol className="flex flex-col gap-2">
            {b.items.map((it) => (
              <li key={it.id}>
                <a
                  href={it.url}
                  target="_blank"
                  rel="sponsored noopener noreferrer"
                  onClick={() => beacon("gift_click", { i: it.id, b: b.band, s: "guide" })}
                  className="flex items-start gap-3 rounded-2xl bg-white p-3 ring-1 ring-rule active:bg-fill"
                >
                  <span aria-hidden="true" className="h-[76px] w-[76px] shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-rule">
                    {it.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" className="h-full w-full object-contain" />
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
                    {it.name ? <span className="line-clamp-2 text-[13px] leading-[1.45] text-muted">{it.name}</span> : null}
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
