"use client";

import { DEFAULT_AVATAR, type AvatarConfig, type Locale } from "@readme/core";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { DropOrb } from "@/components/DropOrb";
import { useT } from "@/components/editors/shared";
import { Icon } from "@/components/marks";

// 가입 뒤 처음 보는 소개 네 장: ① 가운데 버튼으로 말하거나 적기 ② 모르면 물어보기 ③ AI 선물 추천(이유까지) ④ 가족·친구와 같이 고르기.
// 그림은 실제 화면을 흉내 낸 그림일 뿐 데이터를 읽지 않는다. 좌우로 밀거나 아래 버튼으로 넘기고, 건너뛰어도 된다

const TOTAL = 4;
const CARD = "bg-white shadow-[0_6px_18px_rgba(31,35,64,0.08)]";

const WIFE: AvatarConfig = { ...DEFAULT_AVATAR, hair: "long", bg: "rose" };
const MOM: AvatarConfig = { ...DEFAULT_AVATAR, hair: "perm", bg: "lilac" };
const BRO: AvatarConfig = { ...DEFAULT_AVATAR, hair: "buzz", bg: "ocean" };
const FRIEND: AvatarConfig = { ...DEFAULT_AVATAR, hair: "bun", bg: "water" };

type TFn = ReturnType<typeof useT>;

function Chip({ children, on = false }: { children: React.ReactNode; on?: boolean }) {
  return <span className={`inline-flex min-h-6 items-center rounded-full px-2.5 text-[12px] font-bold ${on ? "grad" : "bg-fill text-ink-2"}`}>{children}</span>;
}

function Down() {
  return (
    <span aria-hidden="true" className="self-center text-ink-2">
      <Icon name="up" size={18} className="rotate-180" />
    </span>
  );
}

/** ① 말하거나 적으면 사람이 없을 땐 새로 만들고, 있을 땐 기록에 더한다 */
function MockSay({ t }: { t: TFn }) {
  const result = (caption: string, chip: string, drinks: { label: string; fresh?: boolean }[]) => (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="px-1 text-[12px] font-bold text-ink-2">{caption}</span>
      <div className={`flex flex-1 flex-col gap-2 rounded-[20px] p-3 ${CARD}`}>
        <div className="flex items-center gap-2">
          <Avatar config={WIFE} size={30} label="" />
          <span className="truncate text-[14.5px] font-bold">{t("intro.1.who")}</span>
        </div>
        <Chip on>{chip}</Chip>
        <div className="flex flex-col gap-1">
          <span className="text-[12px] text-muted">{t("taste.drinks")}</span>
          <span className="flex flex-wrap gap-1">
            {drinks.map((d) => (
              <span key={d.label} className={`rounded-full px-2 py-0.5 text-[12px] font-bold ${d.fresh ? "bg-sky-soft text-accent" : "bg-fill text-ink-2"}`}>
                {d.label}
              </span>
            ))}
          </span>
        </div>
      </div>
    </div>
  );
  return (
    <>
      <div className={`flex items-center gap-2 self-center rounded-[22px] py-2.5 pl-4 pr-2.5 ${CARD}`}>
        <span className="min-w-0 text-[15px] font-bold leading-[1.35] tracking-[-0.02em]">{t("intro.1.say")}</span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-soft">
          <Icon name="mic" size={16} />
        </span>
      </div>
      <Down />
      <div className="grid grid-cols-2 gap-2.5">
        {result(t("intro.1.first"), t("intro.1.created"), [{ label: t("intro.1.drink"), fresh: true }])}
        {result(t("intro.1.exists"), t("intro.1.added"), [{ label: t("intro.1.drinkOld") }, { label: t("intro.1.drink"), fresh: true }])}
      </div>
      {/* 막대 한가운데 물방울이 그 버튼 */}
      <div aria-hidden="true" className={`mt-1 grid h-[58px] grid-cols-5 items-center justify-items-center rounded-[24px] text-muted ${CARD}`}>
        <Icon name="calendar" size={22} />
        <Icon name="people" size={22} />
        <span className="rounded-full ring-[3px] ring-white drop-shadow-[0_4px_10px_rgba(70,145,215,0.35)]">
          <DropOrb size={46} />
        </span>
        <Icon name="card" size={22} />
        <Icon name="settings" size={22} />
      </div>
    </>
  );
}

/** ② 링크를 보내면 상대가 답하고, 답이 내 기록에 쌓인다 */
function MockAsk({ t }: { t: TFn }) {
  return (
    <>
      <div className={`rounded-[24px] p-4 ${CARD}`}>
        <div className="flex items-center gap-2.5">
          <Avatar config={MOM} size={34} label="" />
          <span className="text-[15.5px] font-bold">{t("intro.2.to")}</span>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-3">
          <Chip>{t("intro.2.t1")}</Chip>
          <Chip>{t("intro.2.t2")}</Chip>
          <Chip>{t("intro.2.t3")}</Chip>
        </div>
        <div className="grad mt-3.5 flex h-11 items-center justify-center gap-1.5 rounded-[14px] text-[14px] font-bold">
          <Icon name="share" size={16} />
          {t("intro.2.send")}
        </div>
      </div>
      <Down />
      <div className={`flex items-center gap-3 rounded-[22px] p-3.5 ${CARD}`}>
        <Avatar config={MOM} size={38} label="" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[12px] text-muted">
            {t("intro.2.mom")} · {t("intro.2.t1")}
          </span>
          <span className="truncate text-[16px] font-bold">{t("intro.2.answer")}</span>
        </span>
        <Chip on>{t("intro.2.arrived")}</Chip>
      </div>
    </>
  );
}

/** ③ AI가 기록을 보고 고르고, 왜 어울리는지 이유를 붙인다 */
function MockGift({ t }: { t: TFn }) {
  return (
    <div className={`rounded-[24px] px-4 py-4 ${CARD}`}>
      <div className="flex items-center gap-2">
        <Icon name="gift" size={18} />
        <span className="text-[16px] font-bold tracking-[-0.01em]">{t("intro.3.k1")}</span>
      </div>
      <div className="flex flex-wrap gap-1.5 pt-2.5">
        <Chip on>{t("intro.3.basis1")}</Chip>
        <Chip>{t("intro.3.basis2")}</Chip>
      </div>
      <p className="pt-2.5 text-[13.5px] leading-[1.55] text-ink-2">{t("intro.3.reason")}</p>
      <div className="my-3.5 h-px bg-rule" />
      <div className="flex items-center gap-2">
        <Icon name="gift" size={18} />
        <span className="text-[16px] font-bold tracking-[-0.01em]">{t("intro.3.k2")}</span>
      </div>
      <div aria-hidden="true" className="flex flex-col gap-1.5 pt-3">
        <span className="h-2.5 w-full rounded-full bg-fill" />
        <span className="h-2.5 w-2/3 rounded-full bg-fill" />
      </div>
    </div>
  );
}

/** ④ 추천받은 목록을 링크로 보내면 가족·친구가 같이 보고 고른다 */
function MockShare({ t }: { t: TFn }) {
  return (
    <>
      <div className={`rounded-[24px] p-4 ${CARD}`}>
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 truncate text-[15.5px] font-bold">{t("intro.4.card")}</span>
          <span aria-hidden="true" className="flex shrink-0 items-center">
            {[MOM, BRO, FRIEND].map((a, i) => (
              <span key={i} className={`rounded-full ring-2 ring-white ${i ? "-ml-2" : ""}`}>
                <Avatar config={a} size={28} label="" />
              </span>
            ))}
          </span>
        </div>
        <div className="flex gap-1.5 pt-3">
          <Chip on>{t("intro.4.band1")}</Chip>
          <Chip>{t("intro.4.band2")}</Chip>
        </div>
        <div aria-hidden="true" className="grid grid-cols-3 gap-2 pt-3">
          {[0, 1, 2].map((k) => (
            <span key={k} className="relative flex aspect-square items-center justify-center rounded-2xl bg-sky-soft text-accent">
              <Icon name="gift" size={26} />
              {k === 1 ? (
                <span className="grad absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full">
                  <Icon name="check" size={12} strokeWidth={2.6} />
                </span>
              ) : null}
            </span>
          ))}
        </div>
      </div>
      <span className={`flex h-11 items-center justify-center gap-1.5 self-center rounded-full px-5 text-[14px] font-bold ${CARD}`}>
        <Icon name="link" size={16} />
        {t("intro.4.send")}
      </span>
    </>
  );
}

export function IntroTour({ locale, next }: { locale: Locale; next: string }) {
  const t = useT(locale);
  const [i, setI] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const go = (n: number) => {
    const el = box.current;
    if (!el) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: n * el.clientWidth, behavior: calm ? "auto" : "smooth" });
  };
  const onScroll = () => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const el = box.current;
      if (el && el.clientWidth) setI(Math.min(TOTAL - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth))));
    });
  };

  const slides = [
    { title: t("intro.1.title"), body: t("intro.1.body"), mock: <MockSay t={t} /> },
    { title: t("intro.2.title"), body: t("intro.2.body"), mock: <MockAsk t={t} /> },
    { title: t("intro.3.title"), body: t("intro.3.body"), mock: <MockGift t={t} /> },
    { title: t("intro.4.title"), body: t("intro.4.body"), mock: <MockShare t={t} /> },
  ];
  const last = i === TOTAL - 1;

  return (
    <div className="relative flex flex-1 flex-col">
      {!last ? (
        <Link href={next} className="absolute right-2 z-10 flex min-h-11 items-center px-3 text-[14px] font-bold text-ink-2" style={{ top: "max(var(--sat), 12px)" }}>
          {t("common.skip")}
        </Link>
      ) : null}
      <div ref={box} onScroll={onScroll} data-no-swipe="" className="flex flex-1 snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {slides.map((s, k) => (
          <section key={k} role="group" aria-roledescription="slide" aria-label={t("intro.page", { n: k + 1, total: TOTAL })} className="flex shrink-0 basis-full snap-center flex-col">
            <div className="grad-hero relative overflow-hidden rounded-b-[32px] px-5 pb-7" style={{ paddingTop: "calc(max(var(--sat), 12px) + 52px)" }}>
              <span aria-hidden="true" className="absolute -right-16 top-10 h-60 w-60 rounded-full bg-white/25" />
              <div className="relative flex min-h-[300px] flex-col justify-end gap-3">{s.mock}</div>
            </div>
            <div className="flex flex-col gap-2.5 px-6 pt-7">
              {k === 0 ? <h1 className="headline whitespace-pre-line text-[26px]">{s.title}</h1> : <h2 className="headline whitespace-pre-line text-[26px]">{s.title}</h2>}
              <p className="text-[15px] leading-[1.65] text-ink-2">{s.body}</p>
            </div>
          </section>
        ))}
      </div>
      <div className="bottom-bar bg-paper px-6 pt-4">
        <div aria-hidden="true" className="flex justify-center gap-2 pb-4">
          {slides.map((_, k) => (
            <span key={k} className={`h-2 rounded-full motion-safe:transition-all ${k === i ? "grad w-6" : "w-2 bg-edge"}`} />
          ))}
        </div>
        <span className="sr-only" aria-live="polite">
          {t("intro.page", { n: i + 1, total: TOTAL })}
        </span>
        {last ? (
          <Link href={next} className="btn-primary w-full">
            {t("intro.start")}
          </Link>
        ) : (
          <button type="button" onClick={() => go(i + 1)} className="btn-primary w-full">
            {t("common.next")}
          </button>
        )}
      </div>
    </div>
  );
}
