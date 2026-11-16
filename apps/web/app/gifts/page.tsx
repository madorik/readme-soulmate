import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/chrome";
import { JsonLd } from "@/components/JsonLd";
import { GUIDES, guidePicks } from "@/lib/guides";
import { ogMetadata } from "@/lib/og";
import { absoluteUrl } from "@/lib/site";

// 공개 선물 가이드 모음(검색·AI 답변용): 누구에게(부모님·연인·친구·동료)·무엇을 좋아하는 분께(등산·골프·캠핑·커피) 가이드로 이어진다

const TITLE = "선물 추천 가이드 · 누구에게, 얼마로";
const DESCRIPTION = "부모님·연인·친구·직장 동료 선물과 등산·골프·캠핑·커피 좋아하는 분께 줄 선물을 1만원대부터 10만원 이상까지 가격대별로 골랐어요.";

export const metadata: Metadata = { ...ogMetadata("ko", `${TITLE} | 기억해유`, DESCRIPTION), alternates: { canonical: "/gifts" }, keywords: ["선물 추천", "부모님 선물", "생일 선물", "기념일 선물", "가격대별 선물", "5만원대 선물"] };

export default function Gifts() {
  const cards = GUIDES.map((g) => ({ g, cover: guidePicks(g).flatMap((b) => b.items).find((x) => x.image) }));
  return (
    <main className="screen" lang="ko">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: TITLE,
          description: DESCRIPTION,
          url: absoluteUrl("/gifts"),
          hasPart: GUIDES.map((g) => ({ "@type": "WebPage", name: g.title, url: absoluteUrl(`/gifts/${g.slug}`) })),
        }}
      />
      <div className="px-6">
        <Link href="/" aria-label="기억해유">
          <Wordmark size={24} locale="ko" />
        </Link>
      </div>
      <header className="px-6 pt-5">
        <h1 className="headline text-[28px] leading-[1.3]">누구에게, 얼마로 줄까요?</h1>
        <p className="pt-3 text-[15px] leading-[1.65] text-ink-2">{DESCRIPTION}</p>
      </header>
      <ul className="grid grid-cols-2 gap-2.5 px-5 pt-6">
        {cards.map(({ g, cover }) => (
          <li key={g.slug}>
            <Link href={`/gifts/${g.slug}`} className="flex h-full flex-col gap-2 rounded-2xl bg-white p-3 ring-1 ring-rule active:bg-fill">
              <span aria-hidden="true" className="aspect-square overflow-hidden rounded-xl bg-sky-soft">
                {cover?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover.image} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full bg-white object-contain" />
                ) : null}
              </span>
              <span className="text-[15.5px] font-bold leading-[1.35]">{g.who} 선물</span>
            </Link>
          </li>
        ))}
      </ul>
      <section className="flex flex-col gap-3 px-6 pt-9">
        <h2 className="section-title">그 사람에게 꼭 맞는 선물은</h2>
        <p className="text-[14.5px] leading-[1.6] text-ink-2">기억해유에 가까운 사람의 취향·사이즈·챙길 날을 적어 두면, 그 사람에게 맞춘 선물을 가격대별로 골라 드려요.</p>
        <Link href="/" className="btn-primary w-full">
          기억해유 시작하기
        </Link>
      </section>
      <p className="px-6 pt-6 text-[11.5px] leading-[1.5] text-muted">이 페이지는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.</p>
      <div className="page-end" />
    </main>
  );
}
