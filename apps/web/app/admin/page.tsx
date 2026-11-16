import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Wordmark } from "@/components/chrome";
import { CATALOG_BY_ID } from "@/lib/gift-catalog";
import { loadStats, type Windows } from "@/lib/stats";
import { adminLogin, adminLogout, isAdmin } from "./auth";

// 우리 통계: 가입·활동·앱 설치·기록·물어보기·선물(추천 봄 → 쿠팡 링크 누름 → 카드 보냄·열림 → 선물 완료). 데모 계정은 뺀다.
// 관리자 키(ADMIN_KEY)로만 들어온다. 수익(구매·수수료)은 쿠팡 파트너스 리포트에서 본다

export const metadata: Metadata = { title: "통계", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const EVENT_LABEL: Record<string, string> = {
  gift_picks_view: "선물 추천 봄",
  gift_reroll: "다시 고르기",
  gift_click: "쿠팡 링크 누름",
  card_share: "가족에게 카드 보냄",
  card_open: "카드 열림",
  gift_done: "선물 완료",
};
const BAND_LABEL: Record<string, string> = { "1": "1만원대", "3": "3만원대", "5": "5만원대", "10": "10만원 이상" };
const SOURCE_LABEL: Record<string, string> = { reminder: "선물 힌트 화면", plan: "같이 고르기", card: "가족 카드", guide: "선물 가이드(검색)", "-": "모름" };

const fmt = (n: number) => n.toLocaleString("ko-KR");
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 1000) / 10}%` : "—");

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-2xl bg-white px-4 py-3.5 ring-1 ring-rule">
      <span className="text-[12.5px] font-medium text-muted">{label}</span>
      <span className="num text-[26px] !font-bold leading-tight tracking-[-0.02em]">{value}</span>
      {sub ? <span className="text-[12px] text-muted">{sub}</span> : null}
    </div>
  );
}

function Section({ title, children, empty }: { title: string; children: React.ReactNode; empty?: boolean }) {
  return (
    <section className="flex flex-col gap-2.5 px-5 pt-7">
      <h2 className="section-title">{title}</h2>
      {empty ? <p className="rounded-2xl bg-white px-4 py-3.5 text-[13.5px] text-muted ring-1 ring-rule">아직 표가 없어요(운영 DB 마이그레이션 전)</p> : children}
    </section>
  );
}

const w3 = (w: Windows) => `오늘 ${fmt(w.d1)} · 7일 ${fmt(w.d7)}`;

/** 최근 30일 막대(한 계열, 한 색). 막대에 대면 날짜·값, 아래에 표로 보기 */
function Bars({ title, data }: { title: string; data: { day: string; n: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.n));
  const total = data.reduce((a, d) => a + d.n, 0);
  return (
    <figure className="flex flex-col gap-2 rounded-2xl bg-white px-4 pb-3 pt-3.5 ring-1 ring-rule">
      <figcaption className="flex items-baseline justify-between">
        <span className="text-[14px] font-bold">{title}</span>
        <span className="text-[12.5px] text-muted">
          30일 합계 <b className="num text-ink">{fmt(total)}</b>
        </span>
      </figcaption>
      <div role="img" aria-label={`${title}: 30일 합계 ${total}`} className="flex h-[120px] items-end gap-[2px] border-b border-rule">
        {data.map((d) => (
          <div key={d.day} title={`${d.day.slice(5).replace("-", "/")} · ${fmt(d.n)}`} className="group relative flex h-full flex-1 items-end">
            <div className="w-full rounded-t-[4px] bg-accent transition-opacity group-hover:opacity-80" style={{ height: d.n ? `${Math.max(3, (d.n / max) * 100)}%` : 0 }} />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-muted">
        <span>{data[0]?.day.slice(5).replace("-", "/")}</span>
        <span>최고 {fmt(max === 1 && !total ? 0 : max)}</span>
        <span>{data[data.length - 1]?.day.slice(5).replace("-", "/")}</span>
      </div>
      <details className="text-[12.5px]">
        <summary className="cursor-pointer text-muted">표로 보기</summary>
        <table className="mt-1.5 w-full">
          <tbody>
            {data
              .filter((d) => d.n)
              .map((d) => (
                <tr key={d.day} className="border-t border-rule">
                  <td className="py-1">{d.day}</td>
                  <td className="num py-1 text-right">{fmt(d.n)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

function Rank({ rows, total }: { rows: { label: string; n: number }[]; total: number }) {
  if (!rows.length) return <p className="rounded-2xl bg-white px-4 py-3.5 text-[13.5px] text-muted ring-1 ring-rule">아직 없어요</p>;
  const max = Math.max(...rows.map((r) => r.n));
  return (
    <ul className="flex flex-col rounded-2xl bg-white px-4 py-1.5 ring-1 ring-rule">
      {rows.map((r) => (
        <li key={r.label} className="flex items-center gap-3 border-t border-rule py-2.5 first:border-t-0">
          <span className="w-[42%] min-w-0 truncate text-[13.5px] font-medium">{r.label}</span>
          <span className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-fill">
            <span className="h-full rounded-full bg-accent" style={{ width: `${(r.n / max) * 100}%` }} />
          </span>
          <span className="num w-[72px] text-right text-[13px]">
            {fmt(r.n)} <span className="text-muted">{pct(r.n, total)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function Admin({ searchParams }: { searchParams: Promise<{ wrong?: string }> }) {
  if (!process.env.ADMIN_KEY) notFound();
  const sp = await searchParams;
  if (!(await isAdmin())) {
    return (
      <main className="screen">
        <div className="px-6">
          <Wordmark size={24} />
        </div>
        <form action={adminLogin} className="flex flex-col gap-3 px-6 pt-10">
          <h1 className="headline text-[24px]">통계</h1>
          <input name="key" type="password" autoComplete="current-password" aria-label="관리자 키" placeholder="관리자 키" className="field" />
          {sp.wrong ? <p className="text-[13.5px] text-red">키가 맞지 않아요</p> : null}
          <button className="btn-primary">들어가기</button>
        </form>
      </main>
    );
  }

  const st = await loadStats();
  const ev = (name: string): Windows => st.events?.[name] ?? { d1: 0, d7: 0, d30: 0 };
  const clicks30 = ev("gift_click").d30;
  return (
    <main className="screen !pb-10">
      <div className="flex items-center justify-between px-5">
        <Wordmark size={24} />
        <form action={adminLogout}>
          <button className="flex min-h-11 items-center px-2 text-[13.5px] font-semibold text-muted">나가기</button>
        </form>
      </div>
      <h1 className="headline px-5 pt-3 text-[26px]">통계</h1>
      <p className="px-5 pt-1 text-[12.5px] text-muted">데모 계정 제외 · 한국 시간 · {new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</p>

      <Section title="사용자" empty={!st.users}>
        {st.users ? (
          <div className="grid grid-cols-2 gap-2">
            <Tile label="가입" value={fmt(st.users.real)} sub={`온보딩 끝 ${fmt(st.users.onboarded)}`} />
            <Tile label="새로 가입(30일)" value={fmt(st.users.new.d30)} sub={w3(st.users.new)} />
            <Tile label="활동(30일)" value={fmt(st.active?.d30 ?? 0)} sub={st.active ? w3(st.active) : undefined} />
            <Tile label="데모로 둘러보기" value={fmt(st.users.demo)} />
          </div>
        ) : null}
        {st.signupsByDay ? <Bars title="날마다 새로 가입" data={st.signupsByDay} /> : null}
      </Section>

      <Section title="앱 설치·기록" empty={!st.records}>
        <div className="grid grid-cols-2 gap-2">
          {(st.installs ?? []).map((i) => (
            <Tile key={i.platform} label={`앱 알림 켬 · ${i.platform === "ios" ? "아이폰" : i.platform === "android" ? "안드로이드" : "웹"}`} value={fmt(i.n)} />
          ))}
          {st.records ? (
            <>
              <Tile label="적어 둔 사람" value={fmt(st.records.contacts)} sub={`한 명이 평균 ${st.records.avgContacts.toFixed(1)}명`} />
              <Tile label="메모" value={fmt(st.records.notes)} sub={`만든 폴더 ${fmt(st.records.folders)}`} />
            </>
          ) : null}
          {st.asks ? (
            <>
              <Tile label="물어보기 보냄(30일)" value={fmt(st.asks.sent.d30)} sub={w3(st.asks.sent)} />
              <Tile label="답 받음(30일)" value={fmt(st.asks.answered.d30)} sub={`답률 ${pct(st.asks.answered.d30, st.asks.sent.d30)}`} />
            </>
          ) : null}
        </div>
      </Section>

      <Section title="선물 추천" empty={!st.events}>
        <div className="grid grid-cols-2 gap-2">
          {Object.keys(EVENT_LABEL).map((name) => (
            <Tile key={name} label={`${EVENT_LABEL[name]}(30일)`} value={fmt(ev(name).d30)} sub={w3(ev(name))} />
          ))}
          <Tile label="링크 누른 비율(30일)" value={pct(clicks30, ev("gift_picks_view").d30)} sub="쿠팡 링크 누름 ÷ 선물 추천 봄" />
          <Tile label="카드 열린 비율(30일)" value={pct(ev("card_open").d30, ev("card_share").d30)} sub="카드 열림 ÷ 카드 보냄" />
        </div>
        {st.clicksByDay ? <Bars title="날마다 쿠팡 링크 누름" data={st.clicksByDay} /> : null}
        <h3 className="pt-2 text-[14px] font-bold">많이 누른 선물(30일)</h3>
        <Rank rows={(st.topItems ?? []).map((r) => ({ label: `${CATALOG_BY_ID.get(r.item)?.q ?? r.item} · ${BAND_LABEL[CATALOG_BY_ID.get(r.item)?.band ?? ""] ?? ""}`, n: r.n }))} total={clicks30} />
        <h3 className="pt-2 text-[14px] font-bold">가격대별 누름(30일)</h3>
        <Rank rows={["1", "3", "5", "10"].map((b) => ({ label: BAND_LABEL[b]!, n: st.byBand?.find((r) => r.band === b)?.n ?? 0 })).filter((r) => r.n)} total={clicks30} />
        <h3 className="pt-2 text-[14px] font-bold">어디서 눌렀나(30일)</h3>
        <Rank rows={(st.bySource ?? []).map((r) => ({ label: SOURCE_LABEL[r.source] ?? r.source, n: r.n }))} total={clicks30} />
      </Section>

      <Section title="바깥에서 보기">
        <ul className="flex flex-col rounded-2xl bg-white px-4 py-1.5 text-[14px] font-semibold ring-1 ring-rule">
          <li className="border-t border-rule py-3 first:border-t-0">
            <a href="https://partners.coupang.com/#affiliate/ws/report/trend/daily" target="_blank" rel="noopener noreferrer" className="text-accent">
              쿠팡 파트너스 리포트(구매·수수료)
            </a>
          </li>
          <li className="border-t border-rule py-3">
            <a href="https://vercel.com/madoriks-projects/readme/analytics" target="_blank" rel="noopener noreferrer" className="text-accent">
              Vercel 웹 분석(방문·유입 경로·페이지)
            </a>
          </li>
          <li className="border-t border-rule py-3">
            <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="text-accent">
              구글 서치 콘솔(검색 노출)
            </a>
          </li>
          <li className="border-t border-rule py-3">
            <a href="https://searchadvisor.naver.com/" target="_blank" rel="noopener noreferrer" className="text-accent">
              네이버 서치어드바이저(검색 노출)
            </a>
          </li>
        </ul>
      </Section>
    </main>
  );
}
