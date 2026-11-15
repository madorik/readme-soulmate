"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

// 아래 탭 화면끼리 좌우로 밀어서 옮긴다: 챙길 날 ↔ 사람들 ↔ 나 ↔ 설정(탭 막대 순서).
// 미는 동안 화면이 손가락을 따라오고(끝 탭에서는 고무줄처럼 덜), 충분히 밀거나 빠르게 튕기면 옆으로 밀려나며
// 다음 화면이 반대쪽에서 들어온다. 덜 밀면 제자리로 돌아온다. 탭을 눌러 옮길 때도 같은 쪽으로 살짝 미끄러져 들어온다.
// 움직이는 건 화면 내용만(탭 막대[data-tabbar]·떠 있는 것은 그대로). 움직임 줄이기를 켠 사람에게는 옮기기만 한다.
// 밀지 않는 곳: 화면 양 끝(휴대폰의 뒤로 가기 몸짓), 가로로 넘기는 줄(날짜·폴더 칸), 입력 칸, 시트가 열려 있을 때

const TABS = ["/home", "/people", "/me", "/privacy"];
/** 가로로 이만큼 움직이면 '밀기'로 본다(그 전에 세로로 움직이면 스크롤) */
const LOCK = 10;
/** 화면 너비의 이만큼 넘게 밀었거나 */
const COMMIT_RATIO = 0.25;
/** 이만큼 빠르게 튕기면(px/ms) 옮긴다 */
const FLING = 0.45;
/** 화면 양 끝은 비워 둔다 */
const EDGE = 24;
const EASE = "cubic-bezier(0.22, 0.8, 0.24, 1)";

function blocked(target: EventTarget | null): boolean {
  if (document.querySelector('[aria-modal="true"]')) return true;
  let el = target instanceof Element ? target : null;
  if (el?.closest('input, textarea, select, [contenteditable="true"], [data-no-swipe]')) return true;
  for (; el && el !== document.body; el = el.parentElement) {
    const s = getComputedStyle(el);
    if ((s.overflowX === "auto" || s.overflowX === "scroll") && el.scrollWidth > el.clientWidth + 1) return true;
  }
  return false;
}

/** 움직일 화면 내용: 앱 화면(main)의 바로 아래 것들 중 탭 막대와 떠 있는 것을 뺀 것 */
function movers(): HTMLElement[] {
  const main = document.querySelector("main.screen");
  if (!main) return [];
  return Array.from(main.children).filter(
    (el): el is HTMLElement => el instanceof HTMLElement && !el.hasAttribute("data-tabbar") && getComputedStyle(el).position !== "fixed",
  );
}

function stillMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function setX(els: HTMLElement[], x: number, width: number) {
  for (const el of els) {
    el.style.transform = x ? `translate3d(${x}px, 0, 0)` : "";
    el.style.opacity = x ? String(1 - Math.min(0.35, (Math.abs(x) / width) * 0.35)) : "";
  }
}

function animateTo(els: HTMLElement[], from: number, to: number, width: number, ms: number): Promise<void> {
  const opacity = (x: number) => String(1 - Math.min(0.35, (Math.abs(x) / width) * 0.35));
  const runs = els.map((el) =>
    el.animate(
      [
        { transform: `translate3d(${from}px, 0, 0)`, opacity: opacity(from) },
        { transform: `translate3d(${to}px, 0, 0)`, opacity: opacity(to) },
      ],
      { duration: ms, easing: EASE, fill: "forwards" },
    ),
  );
  return Promise.all(runs.map((a) => a.finished.catch(() => undefined))).then(() => {
    for (const el of els) {
      el.style.transform = to ? `translate3d(${to}px, 0, 0)` : "";
      el.style.opacity = to ? opacity(to) : "";
    }
    for (const a of runs) a.cancel();
  });
}

export function SwipeTabs() {
  const router = useRouter();
  const path = usePathname();
  const index = TABS.indexOf(path);
  // 밀어서 옮긴 방향(+1: 다음 탭, -1: 앞 탭). 새 화면이 그쪽에서 들어온다
  const pending = useRef<number | null>(null);
  const prevIndex = useRef(index);

  // 새 탭 화면이 들어오는 움직임(밀기는 크게, 탭 누르기는 살짝)
  useEffect(() => {
    const from = prevIndex.current;
    prevIndex.current = index;
    const swiped = pending.current;
    pending.current = null;
    if (index < 0 || from < 0 || from === index || stillMotion()) return;
    const dir = swiped ?? Math.sign(index - from);
    const els = movers();
    const width = document.querySelector("main.screen")?.clientWidth ?? window.innerWidth;
    for (const el of els) {
      el.style.transform = "";
      el.style.opacity = "";
      el.animate(
        [
          { transform: `translate3d(${dir * (swiped ? width * 0.35 : 36)}px, 0, 0)`, opacity: 0 },
          { transform: "translate3d(0, 0, 0)", opacity: 1 },
        ],
        { duration: swiped ? 260 : 220, easing: EASE },
      );
    }
  }, [index]);

  useEffect(() => {
    if (index < 0) return;
    for (const href of [TABS[index - 1], TABS[index + 1]]) if (href) router.prefetch(href);

    let g: { x: number; y: number; lastX: number; lastT: number; v: number; mode: "wait" | "drag" | "scroll"; els: HTMLElement[]; width: number } | null = null;
    let busy = false;
    let raf = 0;
    let dx = 0;
    // 옮기기가 끝나지 않으면(주소가 그대로면) 화면을 제자리로 돌려놓는다
    let safety = 0;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (busy || e.touches.length !== 1 || !t || t.clientX < EDGE || t.clientX > window.innerWidth - EDGE || blocked(e.target)) {
        g = null;
        return;
      }
      g = { x: t.clientX, y: t.clientY, lastX: t.clientX, lastT: e.timeStamp, v: 0, mode: "wait", els: [], width: 0 };
    };

    const onMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!g || !t || g.mode === "scroll") return;
      const mx = t.clientX - g.x;
      const my = t.clientY - g.y;
      if (g.mode === "wait") {
        if (Math.abs(my) > LOCK && Math.abs(my) >= Math.abs(mx)) {
          g.mode = "scroll";
          return;
        }
        if (Math.abs(mx) < LOCK || Math.abs(mx) < Math.abs(my) * 1.2 || window.getSelection()?.toString()) return;
        g.mode = "drag";
        g.els = stillMotion() ? [] : movers();
        g.width = document.querySelector("main.screen")?.clientWidth ?? window.innerWidth;
      }
      e.preventDefault();
      const dt = e.timeStamp - g.lastT;
      if (dt > 0) g.v = 0.7 * ((t.clientX - g.lastX) / dt) + 0.3 * g.v;
      g.lastX = t.clientX;
      g.lastT = e.timeStamp;
      // 옆 탭이 없는 쪽은 고무줄처럼 덜 따라온다
      const hasNext = !!TABS[index + (mx < 0 ? 1 : -1)];
      dx = hasNext ? mx : mx * 0.25;
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0;
          if (g?.mode === "drag") setX(g.els, dx, g.width);
        });
      }
    };

    const onEnd = () => {
      const s = g;
      g = null;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      if (!s || s.mode !== "drag") return;
      const dir = dx < 0 ? 1 : -1;
      const next = TABS[index + dir];
      const go = !!next && (Math.abs(dx) > s.width * COMMIT_RATIO || (Math.abs(dx) > 40 && Math.abs(s.v) > FLING && Math.sign(s.v) === Math.sign(dx)));
      const from = dx;
      dx = 0;
      if (!go || !next) {
        if (s.els.length) void animateTo(s.els, from, 0, s.width, 220);
        return;
      }
      busy = true;
      pending.current = dir;
      const leave = s.els.length ? animateTo(s.els, from, -dir * s.width, s.width, 170) : Promise.resolve();
      void leave.then(() => {
        router.push(next);
        safety = window.setTimeout(() => {
          busy = false;
          pending.current = null;
          setX(s.els, 0, s.width);
        }, 3000);
      });
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
      if (raf) cancelAnimationFrame(raf);
      window.clearTimeout(safety);
    };
  }, [index, router]);

  return null;
}
