import "./styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { openExternal, watchSafeArea } from "./bridge";

// 웹 화면 조각 안의 링크(<a href>)는 토스 화면 안에서 이동하지 않는다. 바깥 주소만 기기 브라우저로 연다
document.addEventListener("click", (e) => {
  const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
  if (!a) return;
  const href = a.getAttribute("href") ?? "";
  e.preventDefault();
  if (/^https?:\/\//.test(href)) void openExternal(href);
});

watchSafeArea();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
