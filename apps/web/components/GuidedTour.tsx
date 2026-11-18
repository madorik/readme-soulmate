"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { useDialog } from "./Sheet";

// 가입하고 온보딩을 마치면 홈(/home?tour=1)에서 시작하는 안내: 실제 화면의 해당 부분만 밝게 비추고, 말풍선과 '다음'으로 순서대로 짚어 준다.
// 짚을 곳은 화면 요소의 data-tour 값으로 찾는다(orb: 가운데 버튼, ask: 물어보기, people: 사람들 탭). 화면에 없는 곳(예: AI가 꺼져 가운데 버튼이 없을 때)은 건너뛴다.
// 문구는 서버가 번역해 prop으로 준다(사전을 클라이언트로 끌어오지 않는다)

export type TourTarget = "orb" | "ask" | "people";
export interface TourStep {
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

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

const find = (target: TourTarget) => document.querySelector<HTMLElement>(`[data-tour="${target}"]`);

/** 주소가 /home?tour=1일 때만 안내를 켠다. 끝내거나 건너뛰면 ?tour를 지운다 */
export function GuidedTour({ steps, labels }: { steps: TourStep[]; labels: TourLabels }) {
  const pathname = usePathname();
  const params = useSearchParams();
  if (pathname !== "/home" || params.get("tour") !== "1") return null;
  return <Tour steps={steps} labels={labels} />;
}

function Tour({ steps, labels }: { steps: TourStep[]; labels: TourLabels }) {
  const router = useRouter();
  const finish = useCallback(() => router.replace("/home"), [router]);
  // 화면에 실제로 있는 곳만. 홈으로 넘어오는 동안은 뼈대(loading)가 먼저 그려지니, 짚을 곳이 나타날 때까지 기다린다(끝내 안 나타나면 접는다)
  const [list, setList] = useState<TourStep[] | null>(null);
  useEffect(() => {
    const pick = () => {
      const present = steps.filter((s) => find(s.target));
      if (!present.length) return false;
      setList(present);
      return true;
    };
    if (pick()) return;
    const watch = new MutationObserver(() => {
      if (pick()) {
        watch.disconnect();
        clearTimeout(giveUp);
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
  }, [steps, finish]);
  if (!list?.length) return null;
  return <Dialog list={list} labels={labels} finish={finish} />;
}

function Dialog({ list, labels, finish }: { list: TourStep[]; labels: TourLabels; finish: () => void }) {
  const ref = useDialog(finish);
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const step = list[i]!;
  const last = i === list.length - 1;

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

  // 말풍선 자리: 짚은 곳이 위쪽 절반이면 그 아래, 아래쪽 절반이면 그 위. 아래 막대 가림 띠 안으로는 들어가지 않는다
  const place = () => {
    if (!box) return null;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maskH = document.querySelector(".bar-mask-bottom")?.getBoundingClientRect().height ?? 0;
    const w = Math.min(vw - 32, 360);
    const left = (vw - w) / 2;
    const cx = box.left + box.width / 2;
    const arrow = Math.min(Math.max(cx - left, 28), w - 28);
    const below = box.top + box.height / 2 < vh / 2;
    const gap = PAD + 14;
    const top = box.top + box.height + gap;
    const style: React.CSSProperties = below
      ? { top, maxHeight: Math.max(160, vh - top - maskH - 8) }
      : { bottom: vh - box.top + gap, maxHeight: Math.max(160, box.top - gap - 8) };
    return { w, left, arrow, below, style };
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
              borderRadius: Math.min(24, (box.height + PAD * 2) / 2),
              boxShadow: "0 0 0 3px #FFC23D, 0 0 0 100vmax rgba(31, 35, 64, 0.62)",
            }}
          />
          {/* 바깥 틀(화살표가 잘리지 않게 스크롤은 안쪽 상자에서) */}
          <div className="absolute flex flex-col" style={{ left: p.left, width: p.w, ...p.style }}>
            <span
              aria-hidden="true"
              className="absolute h-3.5 w-3.5 rotate-45 bg-white"
              style={p.below ? { top: -7, left: p.arrow - 7 } : { bottom: -7, left: p.arrow - 7 }}
            />
            <div className="relative flex min-h-0 flex-col overflow-y-auto rounded-[22px] bg-white px-5 pb-4 pt-[18px] shadow-[0_12px_32px_rgba(31,35,64,0.28)]">
              <span className="num text-[12px] font-bold text-accent" aria-live="polite">
                {labels.page.replace("{n}", String(i + 1)).replace("{total}", String(list.length))}
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
                <button type="button" autoFocus onClick={() => (last ? finish() : setI(i + 1))} className="btn-primary min-w-[112px] px-5 !text-[15px]">
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
