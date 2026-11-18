import type { Locale } from "@readme/core";
import Link from "next/link";
import { use } from "react";
import { BasisTags, GiftLinkTabs } from "@/components/GiftLinkTabs";
import { Icon } from "@/components/marks";
import type { GiftPickData, GiftPicksData } from "@/lib/pages/gift-picks.data";
import { makeT, type T } from "@/lib/t";
import { SHELL } from "@/lib/shell";

// 이런 선물은 어때요: 이 사람 기록 전체와 메모로 고른 선물. 쿠팡 API 키가 있으면 찾을 말마다 '왜'(이유)와 쿠팡 상품 줄,
// 없으면(파트너스 최종 승인 전) 가격대 칩 + 미리 만든 파트너스 링크 목록에서 고른 것. 누르면 쿠팡(파트너스 링크)으로 간다.
// 화면은 Suspense로 감싸 먼저 그리고, 이 부분만 나중에 채운다(처음엔 AI·쿠팡을 부르느라 몇 초 걸린다).
// 고르기는 서버(lib/pages/gift-picks)가 하고 여기는 그리기만(토스 미니앱 번들도 같이 쓴다. 서버 전용 모듈을 들이지 않는다)

const SCROLLER = "flex snap-x gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

function Row({ pick, pad, t, priceOf }: { pick: GiftPickData; pad: string; t: T; priceOf: (n: number) => string }) {
  return (
    <div className="flex flex-col pt-3.5">
      <div className={`flex items-start justify-between gap-3 pb-2.5 ${pad}`}>
        <span className="flex min-w-0 flex-col gap-1 pt-1">
          <span className="truncate text-[15.5px] font-bold tracking-[-0.01em]">{pick.keyword}</span>
          {pick.basis?.length ? <BasisTags words={pick.basis} /> : null}
          <span className="line-clamp-3 text-[13.5px] leading-[1.5] text-ink-2">{pick.reason}</span>
        </span>
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

/** 가격대 칩 바로 위 오른쪽 줄 */
function PeekRow({ pad, children }: { pad: string; children: React.ReactNode }) {
  return <div className={`flex justify-end pt-3 ${pad}`}>{children}</div>;
}

export function PicksDisclosure({ text, pad = "px-6" }: { text: string; pad?: string }) {
  return <p className={`pt-4 text-[11.5px] leading-[1.5] text-muted ${pad}`}>{text}</p>;
}

/** 이 사람에게 어울릴 선물(max: 찾을 말 몇 개까지). title이 없으면 제목·고지 없이 줄만(여러 사람 화면) */
/** 다시 고르기로 넘어온 '지난번에 보인 것'(주소 ?skip=a,b,…). 목록 id만, 60개까지 */
export function parseSkip(v: string | undefined): string[] {
  return [...new Set((v ?? "").split(",").filter((x) => /^[a-z0-9-]{1,40}$/.test(x)))].slice(-60);
}

/**
 * 고른 선물 그리기(picks: lib/pages/gift-picks가 고른 것). title이 없으면 고지 없이(여러 사람 화면).
 * picks가 Promise면(웹) 여기서 기다린다: 부모 Suspense가 먼저 빈 자리를 보이고 다 고르면 채운다. 토스 미니앱은 다 읽은 값을 준다.
 * again: 다시 고르기 주소의 앞부분(지금 화면 주소). 주면 오른쪽 위에 다시 고르기 단추(부모 section이 relative여야 한다)
 * peek: 가격대 칩 바로 위 오른쪽에 둘 것(선물 힌트 화면의 '컨닝페이퍼 힐끗 보기')
 */
export function GiftPicksBody({ picks, locale, pad = "px-6", title = true, again, peek }: { picks: GiftPicksData | null | Promise<GiftPicksData | null>; locale: Locale; pad?: string; title?: boolean; again?: string; peek?: React.ReactNode }) {
  const data = picks instanceof Promise ? use(picks) : picks;
  const t = makeT(locale);
  const peekRow = peek ? <PeekRow pad={pad}>{peek}</PeekRow> : null;
  if (!data) return peekRow;
  if (data.kind === "links") {
    const { bands, initial, note, next, share, source } = data;
    return (
      <>
        {again ? (
          <Link href={`${again}${again.includes("?") ? "&" : "?"}skip=${next}#picks`} scroll={false} className="absolute right-3 top-[22px] flex h-10 items-center gap-1 rounded-full px-3 text-[13.5px] font-bold text-accent active:bg-sky-soft">
            <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 12a8 8 0 1 1-2.34-5.66" />
              <path d="M20 4v5h-5" />
            </svg>
            {t("picks.again")}
          </Link>
        ) : null}
        {/* 무엇을 보고 어떻게 골랐는지, 얘기하듯 */}
        {title && note ? (
          <p data-note="" className={`pt-1.5 text-[14.5px] leading-[1.6] text-ink-2 ${pad}`}>
            {note}
          </p>
        ) : null}
        {peekRow}
        <GiftLinkTabs
          pad={pad}
          initial={initial}
          share={share ?? undefined}
          source={source}
          label={t("picks.bands")}
          bands={bands.map((b) => ({ band: b.band, label: t(`picks.band.${b.band}` as "picks.band.1"), items: b.items }))}
        />
        {title && SHELL === "web" ? <PicksDisclosure text={t("picks.disclosure")} pad={pad} /> : null}
      </>
    );
  }
  const num = new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US");
  const priceOf = (n: number) => t("picks.price", { n: num.format(n) });
  return (
    <>
      {peekRow}
      {data.picks.map((pick) => (
        <Row key={pick.keyword} pick={pick} pad={pad} t={t} priceOf={priceOf} />
      ))}
      {title && SHELL === "web" ? <PicksDisclosure text={t("picks.disclosure")} pad={pad} /> : null}
    </>
  );
}
