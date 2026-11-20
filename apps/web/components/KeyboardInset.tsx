"use client";

import { useEffect } from "react";

/** 글자를 적는 칸에 커서가 있나(휴대폰에서 키보드가 뜨는 칸) */
function typing(): boolean {
  const el = document.activeElement;
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable || el instanceof HTMLTextAreaElement) return true;
  return el instanceof HTMLInputElement && !["checkbox", "radio", "button", "submit", "reset", "range", "file", "color", "image"].includes(el.type);
}

/** 가장 컸던 화면 높이보다 이만큼(px) 넘게 줄고 글자 칸에 커서가 있으면 키보드가 화면을 줄인 것으로 본다 */
const SHRUNK = 150;

/**
 * 키보드가 떠 있는 동안 <html data-kb>를 켜고 --kb에 키보드가 가린 높이를 넣는다. 키보드는 두 가지로 뜬다:
 * - 화면 위에 겹쳐 뜬다(앱 웹뷰·휴대폰 브라우저 대부분): 화면은 그대로여서 아래에 붙은 버튼 줄(.bottom-bar)이 키보드 뒤로 숨는다 → 보이는 영역(visualViewport)으로 재서 --kb만큼 올린다.
 * - 화면 자체가 줄어든다(안드로이드 앱 등): --kb는 0이지만 하단 메뉴가 키보드 바로 위에 붙어 적는 칸을 가리니, 줄어든 걸 알아채 data-kb로 메뉴를 접고 칸을 줄인다.
 */
export function KeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    let frame = 0;
    // 키보드가 없을 때의 가장 큰 화면 높이(돌리면 다시 잰다)
    let tall = Math.max(window.innerHeight, vv.height);
    let width = window.innerWidth;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (window.innerWidth !== width) {
          width = window.innerWidth;
          tall = Math.max(window.innerHeight, vv.height);
        }
        const zoomed = vv.scale > 1.01;
        // 손가락으로 확대한 동안은 보이는 영역이 줄어도 키보드가 아니다
        const covered = zoomed ? 0 : Math.round(window.innerHeight - vv.height - vv.offsetTop);
        const kb = covered > 24 ? covered : 0;
        const editing = typing();
        if (!editing) tall = Math.max(tall, window.innerHeight, vv.height);
        const shrunk = !zoomed && editing && tall - Math.round(vv.height) > SHRUNK;
        root.style.setProperty("--kb", `${kb}px`);
        root.toggleAttribute("data-kb", kb > 0 || shrunk);
      });
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    return () => {
      cancelAnimationFrame(frame);
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
      root.style.removeProperty("--kb");
      root.removeAttribute("data-kb");
    };
  }, []);
  return null;
}
