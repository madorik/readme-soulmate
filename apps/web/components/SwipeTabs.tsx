"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

// 아래 탭 화면끼리 좌우로 밀어서 옮긴다: 챙길 날 ↔ 사람들 ↔ 나 ↔ 설정(탭 막대 순서).
// 왼쪽으로 밀면 다음 탭, 오른쪽으로 밀면 앞 탭. 빠르고 가로로 뚜렷한 밀기만 본다.
// 밀지 않는 곳: 화면 양 끝(휴대폰의 뒤로 가기 몸짓), 가로로 넘기는 줄(날짜·폴더 칸), 입력 칸, 시트가 열려 있을 때

const TABS = ["/home", "/people", "/me", "/privacy"];
/** 이만큼 가로로 밀어야 옮긴다(px) */
const MIN_DX = 70;
/** 세로보다 이만큼 더 가로여야 한다(세로 스크롤과 헷갈리지 않게) */
const RATIO = 1.8;
/** 길게 누른 뒤 끄는 것(사람을 폴더로 끌기)은 밀기가 아니다 */
const MAX_MS = 600;
/** 화면 양 끝은 비워 둔다 */
const EDGE = 24;

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

export function SwipeTabs() {
  const router = useRouter();
  const path = usePathname();
  const index = TABS.indexOf(path);

  useEffect(() => {
    if (index < 0) return;
    for (const href of [TABS[index - 1], TABS[index + 1]]) if (href) router.prefetch(href);

    let start: { x: number; y: number; t: number } | null = null;
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (e.touches.length !== 1 || !t || t.clientX < EDGE || t.clientX > window.innerWidth - EDGE || blocked(e.target)) {
        start = null;
        return;
      }
      start = { x: t.clientX, y: t.clientY, t: e.timeStamp };
    };
    const onEnd = (e: TouchEvent) => {
      const s = start;
      start = null;
      const t = e.changedTouches[0];
      if (!s || !t) return;
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      if (Math.abs(dx) < MIN_DX || Math.abs(dx) < Math.abs(dy) * RATIO || e.timeStamp - s.t > MAX_MS) return;
      if (window.getSelection()?.toString()) return;
      const next = TABS[index + (dx < 0 ? 1 : -1)];
      if (next) router.push(next);
    };
    const onCancel = () => {
      start = null;
    };
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onCancel, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onCancel);
    };
  }, [index, router]);

  return null;
}
