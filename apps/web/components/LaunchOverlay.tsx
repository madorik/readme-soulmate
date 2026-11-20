"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { LAUNCH_SEEN_KEY } from "@/lib/launch-boot";

// 앱(Capacitor 웹뷰)을 처음 켜서 웹을 불러오는 동안 보이는 로딩 화면: 네이티브 실행 화면(크림 바탕 + 기억해U 로고 정지판)과
// 같은 자리·크기에서 U가 그려지고 점 둘이 콕, 망고 물결선이 이어진다(CSS만, 4초 반복. 모양은 app/globals.css의 .ry-*).
// 서버가 첫 HTML에 그려서 JS 없이 바로 보이고, 앱이 hydrate되면 부드럽게 사라진다(일부러 기다리지 않는다). 글자는 로고뿐, 스크린리더에는 '불러오는 중'.
// 그림이 바뀌면 apps/mobile/scripts/make-assets.mjs(네이티브 실행 화면)도 같이 고친다
const noop = () => () => {};
/** 이 앱 실행에서 이미 보여 줬는지(lib/launch-boot.ts 스크립트가 html에 ry-seen을 붙인다). 서버·hydrate 첫 그리기는 false */
const seenBefore = () => document.documentElement.classList.contains("ry-seen");

export function LaunchOverlay({ word, label, os }: { word: string; label: string; os: "ios" | "android" }) {
  // on: 보이는 중 → out: 사라지는 중(눌러도 아래로 통과) → gone: 걷음
  const [phase, setPhase] = useState<"on" | "out" | "gone">("on");
  // 전체 새로고침이면 처음부터 CSS로 숨겨져 있고, hydrate되면 아예 걷는다
  const seen = useSyncExternalStore(noop, seenBefore, () => false);

  useEffect(() => {
    if (seen) return;
    let out = false;
    let gone: ReturnType<typeof setTimeout> | undefined;
    const fade = () => {
      if (out) return;
      out = true;
      setPhase("out");
      try {
        sessionStorage.setItem(LAUNCH_SEEN_KEY, "1");
      } catch {
        // 저장을 못 해도 덮개는 걷힌다(다음 전체 새로고침에 한 번 더 보일 뿐)
      }
      gone = setTimeout(() => setPhase("gone"), 450);
    };
    // hydrate가 끝난 화면이 한 프레임 그려진 뒤에 걷는다. 화면이 안 그려지는 상태(백그라운드 등)에서 멈추지 않게 타이머도 건다
    const id = requestAnimationFrame(() => requestAnimationFrame(fade));
    const safety = setTimeout(fade, 1500);
    return () => {
      cancelAnimationFrame(id);
      clearTimeout(safety);
      clearTimeout(gone);
    };
  }, [seen]);

  if (seen || phase === "gone") return null;
  return (
    <div role="status" aria-label={label} data-os={os} className={phase === "out" ? "ry-boot ry-out" : "ry-boot"}>
      <div className="ry-stack">
        <span aria-hidden="true" className="ry-word">
          {word}
          <svg className="ry-u" viewBox="0 0 26 34" width="44" height="58">
            <circle className="ry-d1" cx="4.4" cy="3.6" r="2.4" fill="currentColor" />
            <circle className="ry-d2" cx="22.3" cy="3.6" r="2.4" fill="currentColor" />
            <path
              className="ry-up"
              d="M4.2 10.6 C3.8 18.5 4.3 24 6.6 27.6 C8.6 30.6 11 31.8 13.4 31.8 C15.8 31.8 18.2 30.6 20.2 27.6 C22.5 24 22.9 18.5 22.5 10.2"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.1"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <svg aria-hidden="true" viewBox="0 0 200 14" width="200" height="14" fill="none" stroke="#E09A12" strokeWidth="3" strokeLinecap="round" style={{ display: "block" }}>
          <path className="ry-w" d="M3 8 C 15 1, 27 14, 40 7 S 65 1, 78 8 S 103 14, 116 7 S 141 1, 154 8 S 179 14, 197 6" />
        </svg>
        <svg aria-hidden="true" className="ry-deco" viewBox="0 0 24 24" width="26" height="26" fill="#FFC23D" stroke="#1F2340" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ right: -30, top: -34, transform: "rotate(14deg)" }}>
          <path d="M12 3 L14.2 9 L20.5 9.3 L15.5 13.2 L17.3 19.5 L12 15.8 L6.7 19.5 L8.5 13.2 L3.5 9.3 L9.8 9 Z" />
        </svg>
        <svg aria-hidden="true" className="ry-deco" viewBox="0 0 24 24" width="28" height="28" fill="#F59BAE" stroke="#1F2340" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ left: -34, bottom: -14, transform: "rotate(-14deg)" }}>
          <path d="M12 20 C4 14 2 9 5.5 6.5 C8 4.7 11 6 12 8.5 C13 6 16 4.7 18.5 6.5 C22 9 20 14 12 20 Z" />
        </svg>
        <svg aria-hidden="true" className="ry-deco" viewBox="0 0 24 24" width="18" height="18" fill="#8FD2EC" stroke="#1F2340" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ right: -24, bottom: -10, transform: "rotate(10deg)" }}>
          <path d="M12 3 L14.2 9 L20.5 9.3 L15.5 13.2 L17.3 19.5 L12 15.8 L6.7 19.5 L8.5 13.2 L3.5 9.3 L9.8 9 Z" />
        </svg>
      </div>
    </div>
  );
}
