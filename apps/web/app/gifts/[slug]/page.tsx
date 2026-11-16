import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Wordmark } from "@/components/chrome";
import { PicksDisclosure } from "@/components/GiftPicks";
import { GuideList } from "@/components/GuideList";
import { JsonLd } from "@/components/JsonLd";
import { BAND_NAME, GUIDE_BY_SLUG, GUIDES, bandFaq, guidePicks } from "@/lib/guides";
import { ogMetadata } from "@/lib/og";
import { absoluteUrl } from "@/lib/site";

// 공개 선물 가이드(검색·AI 답변용): 먼저 답하는 몇 문장 → 가격대별 선물 다섯 → 묻고 답하기 → 기억해유로 이어 가기.
// 구조화 데이터: 상품 목록(ItemList)·묻고 답하기(FAQPage)·위치(BreadcrumbList)

export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const g = GUIDE_BY_SLUG.get((await params).slug);
  if (!g) return {};
  return { ...ogMetadata("ko", `${g.title} | 기억해유`, g.description), alternates: { canonical: `/gifts/${g.slug}` }, keywords: [`${g.who} 선물`, `${g.who} 선물 추천`, ...Object.values(BAND_NAME).map((b) => `${g.who} 선물 ${b}`)] };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const g = GUIDE_BY_SLUG.get((await params).slug);
  if (!g) notFound();
  const picks = guidePicks(g);
  const faq = [...g.faq, ...bandFaq(g, picks)];
  const url = absoluteUrl(`/gifts/${g.slug}`);
  const others = GUIDES.filter((x) => x.slug !== g.slug);
  return (
    <main className="screen" lang="ko">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "기억해유", item: absoluteUrl("/") },
              { "@type": "ListItem", position: 2, name: "선물 가이드", item: absoluteUrl("/gifts") },
              { "@type": "ListItem", position: 3, name: `${g.who} 선물`, item: url },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: g.title,
            url,
            itemListElement: picks.flatMap((b) => b.items).map((x, i) => ({ "@type": "ListItem", position: i + 1, name: `${x.q} (${BAND_NAME[x.band]})`, url: x.url, ...(x.image ? { image: x.image } : {}) })),
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          },
        ]}
      />
      <nav aria-label="위치" className="flex items-center gap-1.5 px-6 text-[13px] text-muted">
        <Link href="/" aria-label="기억해유">
          <Wordmark size={22} locale="ko" />
        </Link>
        <span aria-hidden="true">›</span>
        <Link href="/gifts" className="flex min-h-11 items-center font-semibold">
          선물 가이드
        </Link>
      </nav>
      <article className="flex flex-col px-5">
        <header className="px-1 pt-4">
          <h1 className="headline text-[26px] leading-[1.3]">{g.title}</h1>
          <p className="pt-3 text-[15px] leading-[1.65] text-ink-2">{g.answer}</p>
        </header>
        <div className="pt-7">
          <GuideList bands={picks.map((b) => ({ band: b.band, title: `${BAND_NAME[b.band]} ${g.who} 선물`, items: b.items.map((x) => ({ id: x.id, title: x.q, name: x.name, url: x.url, image: x.image })) }))} />
        </div>
        <section aria-labelledby="faq" className="flex flex-col gap-2 pt-9">
          <h2 id="faq" className="section-title px-1">
            자주 묻는 질문
          </h2>
          <div className="flex flex-col rounded-2xl bg-white px-4 py-1 ring-1 ring-rule">
            {faq.map((f) => (
              <details key={f.q} className="border-t border-rule py-3.5 first:border-t-0">
                <summary className="cursor-pointer text-[15px] font-bold leading-[1.45]">{f.q}</summary>
                <p className="pt-2 text-[14px] leading-[1.6] text-ink-2">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="flex flex-col gap-3 pt-9">
          <h2 className="section-title px-1">{g.who}의 취향을 알면 더 꼭 맞아요</h2>
          <p className="px-1 text-[14.5px] leading-[1.6] text-ink-2">기억해유에 {g.who}의 취향·사이즈·챙길 날을 적어 두면, 그 사람에게 맞춘 선물을 가격대별로 골라 드려요. 가족과 카드로 같이 고를 수도 있어요.</p>
          <Link href="/" className="btn-primary w-full">
            기억해유 시작하기
          </Link>
        </section>
        <nav aria-label="다른 선물 가이드" className="flex flex-col gap-2 pt-9">
          <h2 className="section-title px-1">다른 선물 가이드</h2>
          <div className="flex flex-wrap gap-1.5">
            {others.map((x) => (
              <Link key={x.slug} href={`/gifts/${x.slug}`} className="flex h-10 items-center rounded-full bg-white px-3.5 text-[14px] font-bold text-ink-2 shadow-[inset_0_0_0_1.5px_var(--color-edge)]">
                {x.who} 선물
              </Link>
            ))}
          </div>
        </nav>
      </article>
      <PicksDisclosure text="이 페이지는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다." />
      <div className="page-end" />
    </main>
  );
}
