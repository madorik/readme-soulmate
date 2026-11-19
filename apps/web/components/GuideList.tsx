"use client";

import { beacon } from "@/components/beacon";
import { Tape, type TapeColor } from "@/components/diary";
import { Icon } from "@/components/marks";

// 선물 가이드의 가격대별 목록: 검색에 다 보이도록 가격대를 칩으로 숨기지 않고 모두 펼친다. 누르면 쿠팡 상품 페이지(파트너스 링크), 누른 것은 이용 기록(source: guide)

export interface GuideBand {
  band: string;
  title: string;
  items: { id: string; title: string; name: string; url: string; image: string }[];
}

// 가격대마다 돌아가며: 제목 형광펜 색과 모서리 테이프 색
const TONES: { tape: TapeColor; mark: string }[] = [
  { tape: "mango", mark: "255 194 61 / 0.7" },
  { tape: "pink", mark: "245 155 174 / 0.6" },
  { tape: "mint", mark: "127 214 184 / 0.6" },
  { tape: "mango", mark: "143 210 236 / 0.7" },
];

export function GuideList({ bands }: { bands: GuideBand[] }) {
  return (
    <div className="flex flex-col gap-[26px]">
      {bands.map((b, bi) => {
        const tone = TONES[bi % TONES.length]!;
        return (
          <section key={b.band} aria-labelledby={`band-${b.band}`} className="relative flex flex-col gap-2.5">
            <h2
              id={`band-${b.band}`}
              className="ml-1 self-start px-[3px] text-[25px] font-normal leading-[1.25]"
              style={{ backgroundImage: `linear-gradient(transparent 58%, rgb(${tone.mark}) 58%, rgb(${tone.mark}) 90%, transparent 90%)` }}
            >
              {b.title}
            </h2>
            <ol className="flex flex-col gap-2.5">
              {b.items.map((it, n) => (
                <li key={it.id} className={n % 2 ? "[transform:rotate(0.4deg)]" : "[transform:rotate(-0.4deg)]"}>
                  <a
                    href={it.url}
                    target="_blank"
                    rel="sponsored noopener noreferrer"
                    onClick={() => beacon("gift_click", { i: it.id, b: b.band, s: "guide" })}
                    className="card relative flex items-start gap-3 py-3 pl-2.5 pr-3 active:bg-fill"
                  >
                    <span aria-hidden="true" className={`shrink-0 bg-white px-1 pb-[3px] pt-1 shadow-[0_1px_2px_rgb(31_35_64/0.12),0_6px_12px_-8px_rgb(31_35_64/0.5)] ${n % 2 ? "[transform:rotate(2.5deg)]" : "[transform:rotate(-2.5deg)]"}`}>
                      <span className="flex h-[62px] w-[62px] items-center justify-center overflow-hidden bg-[#fff1cc]">
                        {it.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={it.image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" className="h-full w-full bg-white object-contain" />
                        ) : (
                          <Icon name="gift" size={26} strokeWidth={1.8} className="text-accent" />
                        )}
                      </span>
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-[3px] pt-px">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-[21px] leading-[1.2]">{it.title}</span>
                        <Icon name="external" size={18} strokeWidth={2} className="shrink-0 text-muted" />
                      </span>
                      {it.name ? <span className="line-clamp-2 text-[16px] leading-[1.4] text-muted">{it.name}</span> : null}
                    </span>
                  </a>
                </li>
              ))}
            </ol>
            <Tape color={tone.tape} w={56} h={19} rotate={18} alpha={0.6} className="-right-1.5 -top-2" />
          </section>
        );
      })}
    </div>
  );
}
