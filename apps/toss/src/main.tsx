import "@fontsource-variable/manrope";
import "@/app/fonts.css";
import "./styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { KeyboardInset } from "@/components/KeyboardInset";
import { App } from "./App";
import { watchSafeArea } from "./bridge";
import { navRef } from "./nav";

// 앱 화면 조각 안의 평범한 링크(<a href>)도 토스 화면 안에서 옮긴다(next/link는 src/shims/link.tsx가 처리).
// 바깥 주소는 nav가 기기 브라우저로 연다
document.addEventListener("click", (e) => {
  if (e.defaultPrevented) return;
  const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
  if (!a) return;
  e.preventDefault();
  navRef.current?.navigate(a.getAttribute("href") ?? "");
});

watchSafeArea();
// 개발: 브라우저 자동 점검에서 화면을 옮길 수 있게
if (import.meta.env.DEV) (window as unknown as { __nav: typeof navRef }).__nav = navRef;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div aria-hidden="true" className="bar-mask-top" />
    <App />
    <div aria-hidden="true" className="bar-mask-bottom" />
    <KeyboardInset />
  </StrictMode>,
);
