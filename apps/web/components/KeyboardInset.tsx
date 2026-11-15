"use client";

import { useEffect } from "react";

/**
 * 키보드가 가린 높이를 --kb에 넣는다. 앱 웹뷰(키보드 플러그인 없음)와 휴대폰 브라우저는 키보드가 떠도 화면이 줄지 않아
 * 아래에 붙은 버튼 줄(.bottom-bar)이 키보드나 그 위 ^ ∨ ✓ 막대 뒤로 숨는다. 보이는 영역(visualViewport)으로 재서 그만큼 올린다.
 */
export function KeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // 손가락으로 확대한 동안은 보이는 영역이 줄어도 키보드가 아니다
        const covered = vv.scale > 1.01 ? 0 : Math.round(window.innerHeight - vv.height - vv.offsetTop);
        const kb = covered > 24 ? covered : 0;
        root.style.setProperty("--kb", `${kb}px`);
        root.toggleAttribute("data-kb", kb > 0);
      });
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      cancelAnimationFrame(frame);
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      root.style.removeProperty("--kb");
      root.removeAttribute("data-kb");
    };
  }, []);
  return null;
}
