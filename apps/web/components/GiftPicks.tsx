import type { YMD } from "@readme/core";
import { Icon } from "@/components/marks";
import type { Person, Session } from "@/lib/data";
import { giftContext, giftPicks, type GiftPick } from "@/lib/gifts";
import type { GiftContext } from "@/lib/gift-core";
import { makeT } from "@/lib/i18n";

// 이런 선물은 어때요: 이 사람 기록으로 고른 찾을 말마다 '왜'(이유)와 쿠팡 상품 줄. 상품을 누르면 쿠팡(파트너스 링크)으로 간다.
// 화면은 Suspense로 감싸 먼저 그리고, 이 부분만 나중에 채운다(처음엔 AI·쿠팡을 부르느라 몇 초 걸린다)

const SCROLLER = "flex snap-x gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

function Row({ pick, pad, t, priceOf }: { pick: GiftPick; pad: string; t: ReturnType<typeof makeT>; priceOf: (n: number) => string }) {
  return (
    <div className="flex flex-col pt-3.5">
      <div className={`flex min-h-11 items-center justify-between gap-3 ${pad}`}>
        <span className="min-w-0 truncate rounded-full bg-sky-soft px-3 py-[5px] text-[13.5px] font-bold text-accent">{pick.reason}</span>
        {pick.products.length ? (
          <a href={pick.more} target="_blank" rel="sponsored noopener noreferrer" aria-label={`${pick.keyword} ${t("picks.more")}`} className="-mr-1.5 flex min-h-11 shrink-0 items-center gap-0.5 pl-2 text-[13px] font-medium text-muted">
            {t("picks.more")}
            <Icon name="chevron" size={15} />
          </a>
        ) : null}
      </div>
      {pick.products.length ? (
        <ul className={`${SCROLLER} ${pad === "px-5" ? "scroll-px-5" : "scroll-px-6"} ${pad}`}>
          {pick.products.map((p) => (
            <li key={p.id} className="w-[124px] shrink-0 snap-start">
              <a href={p.url} target="_blank" rel="sponsored noopener noreferrer" className="flex flex-col">
                <span className="block aspect-square overflow-hidden rounded-2xl bg-white ring-1 ring-rule">
                  {/* 쿠팡 이미지 주소를 그대로(이미지 최적화 서버를 거치지 않게) */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" className="h-full w-full object-contain" />
                </span>
                <span className="mt-2 line-clamp-2 text-[13px] font-medium leading-[1.35] text-ink-2">{p.name}</span>
                <span className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
                  <span className="num text-[14.5px] !font-bold">{priceOf(p.price)}</span>
                  {p.rocket ? <span className="text-[11px] font-bold text-sat">{t("picks.rocket")}</span> : null}
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <div className={pad}>
          <a href={pick.more} target="_blank" rel="sponsored noopener noreferrer" className="flex min-h-[52px] items-center justify-between gap-2 rounded-2xl bg-white px-4 text-[14px] font-bold ring-1 ring-rule">
            <span className="min-w-0 truncate">{pick.keyword}</span>
            <span className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-muted">
              {t("picks.coupang")}
              <Icon name="external" size={15} />
            </span>
          </a>
        </div>
      )}
    </div>
  );
}

export function PicksDisclosure({ text, pad = "px-6" }: { text: string; pad?: string }) {
  return <p className={`pt-4 text-[11.5px] leading-[1.5] text-muted ${pad}`}>{text}</p>;
}

/** 이 사람에게 어울릴 선물(max: 찾을 말 몇 개까지). title이 없으면 제목·고지 없이 줄만(여러 사람 화면) */
export async function GiftPicks({ s, person, occasion, today, max, pad = "px-6", title = true }: { s: Session; person: Person; occasion: GiftContext["occasion"]; today: YMD; max?: number; pad?: string; title?: boolean }) {
  const { locale } = s.profile;
  const t = makeT(locale);
  const ctx = await giftContext(s, person, occasion, today);
  const picks = await giftPicks(s, person, ctx, max);
  if (!picks.length) return null;
  const num = new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US");
  const priceOf = (n: number) => t("picks.price", { n: num.format(n) });
  return (
    <>
      {picks.map((pick) => (
        <Row key={pick.keyword} pick={pick} pad={pad} t={t} priceOf={priceOf} />
      ))}
      {title ? <PicksDisclosure text={t("picks.disclosure")} pad={pad} /> : null}
    </>
  );
}

/** 채우는 동안: 같은 모양의 빈 자리 */
export function GiftPicksSkeleton({ rows = 2, pad = "px-6" }: { rows?: number; pad?: string }) {
  return (
    <div aria-hidden="true" className="flex flex-col motion-safe:animate-pulse">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex flex-col pt-3.5">
          <div className={`flex min-h-11 items-center ${pad}`}>
            <span className="h-[27px] w-28 rounded-full bg-sky-soft" />
          </div>
          <div className={`flex gap-2.5 overflow-hidden pb-1 ${pad}`}>
            {Array.from({ length: 4 }, (_, j) => (
              <span key={j} className="flex w-[124px] shrink-0 flex-col">
                <span className="aspect-square rounded-2xl bg-fill" />
                <span className="mt-2 h-3 w-[90%] rounded bg-fill" />
                <span className="mt-1.5 h-3 w-1/2 rounded bg-fill" />
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
