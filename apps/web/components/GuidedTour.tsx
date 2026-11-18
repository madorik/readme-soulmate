"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { useDialog } from "./Sheet";

// 가입하고 온보딩을 마치면 시작하는 안내: 단계마다 그 기능의 실제 페이지로 옮겨 가서 그 자리에서 짚어 준다(말로 적기 → 물어보기, 끝나면 홈).
// 어느 단계인지는 주소의 ?tour=N(1부터)이 가진다. 페이지에서 해당 부분만 밝게 비추고 말풍선·'다음'으로 넘긴다.
// 짚을 곳은 화면 요소의 data-tour 값으로 찾는다(voice: 말로 적기의 마이크·적는 칸, ask: 물어보기의 사람·항목 고르는 곳).
// 문구는 서버가 번역해 prop으로 준다(사전을 클라이언트로 끌어오지 않는다)

export type TourTarget = "voice" | "ask";
export interface TourStep {
  /** 이 단계를 보여 줄 페이지 */
  path: string;
  target: TourTarget;
  title: string;
  body: string;
}
export interface TourLabels {
  next: string;
  start: string;
  skip: string;
  /** "{n} / {total}" */
  page: string;
}

const PAD = 8;
/** 말풍선이 들어가려면 필요한 높이(대략) */
const NEED = 220;

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

const find = (target: TourTarget) => document.querySelector<HTMLElement>(`[data-tour="${target}"]`);

/** 주소의 ?tour=N이 지금 페이지의 N번째 단계일 때만 안내를 켠다. 끝내거나 건너뛰면 홈으로 */
export function GuidedTour({ steps, labels }: { steps: TourStep[]; labels: TourLabels }) {
  const pathname = usePathname();
  const n = Number(useSearchParams().get("tour"));
  const step = Number.isInteger(n) && n >= 1 ? steps[n - 1] : undefined;
  if (!step || pathname !== step.path) return null;
  return <Tour key={n} n={n} steps={steps} labels={labels} />;
}

function Tour({ n, steps, labels }: { n: number; steps: TourStep[]; labels: TourLabels }) {
  const router = useRouter();
  const step = steps[n - 1]!;
  const finish = useCallback(() => router.replace("/home"), [router]);
  // 다음 단계는 그 기능의 실제 페이지로 옮겨 간다(?tour=N+1)
  const next = useCallback(() => {
    const to = steps[n];
    if (to) router.push(`${to.path}?tour=${n + 1}`);
    else finish();
  }, [router, steps, n, finish]);
  // 페이지가 그려지는 동안은 뼈대(loading)가 먼저 보이니, 짚을 곳이 나타날 때까지 기다린다(끝내 안 나타나면 접는다)
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (find(step.target)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReady(true);
      return;
    }
    const watch = new MutationObserver(() => {
      if (find(step.target)) {
        watch.disconnect();
        clearTimeout(giveUp);
        setReady(true);
      }
    });
    watch.observe(document.body, { childList: true, subtree: true });
    const giveUp = setTimeout(() => {
      watch.disconnect();
      finish();
    }, 8000);
    return () => {
      watch.disconnect();
      clearTimeout(giveUp);
    };
  }, [step, finish]);
  if (!ready) return null;
  return <Dialog step={step} n={n} total={steps.length} labels={labels} next={next} finish={finish} />;
}

function Dialog({ step, n, total, labels, next, finish }: { step: TourStep; n: number; total: number; labels: TourLabels; next: () => void; finish: () => void }) {
  const ref = useDialog(finish);
  const [box, setBox] = useState<Box | null>(null);
  const last = n === total;

  const measure = useCallback(() => {
    const el = find(step.target);
    if (!el) return;
    const r = el.getBoundingClientRect();
    setBox({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  useLayoutEffect(() => {
    const el = find(step.target);
    // 아래 탭 막대에 붙은 것은 이미 보인다. 나머지는 화면 가운데로 가져온다
    if (el && !el.closest("[data-tabbar]")) el.scrollIntoView({ block: "center", behavior: "auto" });
    // 화면에 그려진 요소의 자리를 재서 상태로 둔다(DOM을 읽는 일이라 effect 안에서 하는 게 맞다)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, [step, measure]);

  // 말풍선 자리: 비춘 곳의 위·아래 중 말풍선이 들어갈 만큼 자리가 있는 쪽(둘 다 되면 더 넓은 쪽, 같으면 아래).
  // 어느 쪽도 모자란 작은 화면이면 비춘 곳 반대편 화면 끝에 붙이고 화살표는 뺀다. 어느 경우에도 위·아래 가림 띠(노치·아래 막대) 안으로는 들어가지 않는다
  const place = () => {
    if (!box) return null;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const band = (cls: string) => document.querySelector(cls)?.getBoundingClientRect().height ?? 0;
    const maskTop = band(".bar-mask-top");
    const maskBottom = band(".bar-mask-bottom");
    const w = Math.min(vw - 32, 360);
    const left = (vw - w) / 2;
    const cx = box.left + box.width / 2;
    const arrow = Math.min(Math.max(cx - left, 28), w - 28);
    const gap = PAD + 14;
    const spaceBelow = vh - (box.top + box.height) - gap - maskBottom - 8;
    const spaceAbove = box.top - gap - maskTop - 8;
    const pinMax = Math.max(160, vh - maskTop - maskBottom - 24);
    if (spaceBelow >= NEED || spaceAbove >= NEED) {
      const below = spaceBelow >= spaceAbove;
      const style: React.CSSProperties = below ? { top: box.top + box.height + gap, maxHeight: spaceBelow } : { bottom: vh - box.top + gap, maxHeight: spaceAbove };
      return { w, left, arrow, below, pinned: false, style };
    }
    const bottomPin = box.top + box.height / 2 < vh / 2;
    const style: React.CSSProperties = bottomPin ? { bottom: maskBottom + 12, maxHeight: pinMax } : { top: maskTop + 12, maxHeight: pinMax };
    return { w, left, arrow, below: false, pinned: true, style };
  };
  const p = place();

  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-label={step.title} tabIndex={-1} className="fixed inset-0 z-[70] touch-none outline-none">
      {/* 화면 전체를 막는다: 비추는 곳도 안내 중에는 눌리지 않는다 */}
      <div className="absolute inset-0" />
      {box && p ? (
        <>
          {/* 비추는 곳: 구멍은 그대로, 둘레를 어둡게 */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute motion-safe:transition-all motion-safe:duration-200"
            style={{
              top: box.top - PAD,
              left: box.left - PAD,
              width: box.width + PAD * 2,
              height: box.height + PAD * 2,
              // 동그라미(마이크 방울)면 동그랗게, 아니면 둥근 네모
              borderRadius: Math.abs(box.width - box.height) < 6 ? 9999 : Math.min(24, (box.height + PAD * 2) / 2),
              boxShadow: "0 0 0 3px #FFC23D, 0 0 0 100vmax rgba(31, 35, 64, 0.62)",
            }}
          />
          {/* 바깥 틀(화살표가 잘리지 않게 스크롤은 안쪽 상자에서) */}
          <div className="absolute flex flex-col" style={{ left: p.left, width: p.w, ...p.style }}>
            {p.pinned ? null : (
              <span
                aria-hidden="true"
                className="absolute h-3.5 w-3.5 rotate-45 bg-white"
                style={p.below ? { top: -7, left: p.arrow - 7 } : { bottom: -7, left: p.arrow - 7 }}
              />
            )}
            <div className="relative flex min-h-0 flex-col overflow-y-auto rounded-[22px] bg-white px-5 pb-4 pt-[18px] shadow-[0_12px_32px_rgba(31,35,64,0.28)]">
              <span className="num text-[12px] font-bold text-accent" aria-live="polite">
                {labels.page.replace("{n}", String(n)).replace("{total}", String(total))}
              </span>
              <h2 className="headline pt-1 text-[19px]">{step.title}</h2>
              <p className="pt-1.5 text-[14.5px] leading-[1.6] text-ink-2">{step.body}</p>
              <div className="flex items-center justify-between gap-3 pt-3.5">
                {last ? (
                  <span />
                ) : (
                  <button type="button" onClick={finish} className="-ml-2 flex min-h-11 items-center px-2 text-[14px] font-bold text-muted">
                    {labels.skip}
                  </button>
                )}
                <button type="button" autoFocus onClick={next} className="btn-primary min-w-[112px] px-5 !text-[15px]">
                  {last ? labels.start : labels.next}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
