import type { Section } from "@readme/core";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { closeApp, onBack } from "./bridge";

// 화면 이동: 주소(히스토리)를 바꾸지 않고 앱 안에서 화면을 쌓는다(토스 정책상 히스토리 조작을 피한다).
// 토스 네비게이션 바 뒤로가기·안드로이드 백버튼이 맨 위 화면을 내리고, 맨 처음 화면이면 미니앱을 닫는다

export type Tab = "home" | "people" | "settings";

export type Route =
  | { name: "home" }
  | { name: "people" }
  | { name: "settings" }
  | { name: "person"; id: string }
  | { name: "edit"; id: string; section: Section }
  | { name: "newPerson" }
  | { name: "voice"; about?: string }
  | { name: "gifts"; id: string };

interface Nav {
  route: Route;
  depth: number;
  tab: Tab;
  push: (r: Route) => void;
  /** 맨 위 화면을 바꾼다(뒤로 가면 그 아래로) */
  replace: (r: Route) => void;
  back: () => void;
  /** 탭으로 바꾸며 쌓인 화면을 비운다 */
  go: (tab: Tab) => void;
  /** 저장 뒤 다른 화면이 새로 읽게 하는 숫자 */
  version: number;
  bump: () => void;
}

const NavContext = createContext<Nav | null>(null);

export function useNav(): Nav {
  const v = useContext(NavContext);
  if (!v) throw new Error("NavProvider missing");
  return v;
}

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<Route[]>([{ name: "home" }]);
  const [version, setVersion] = useState(0);
  const stackRef = useRef(stack);
  stackRef.current = stack;

  const back = useCallback(() => {
    const s = stackRef.current;
    if (s.length > 1) setStack(s.slice(0, -1));
    else if (s[0].name !== "home") setStack([{ name: "home" }]);
    else void closeApp();
  }, []);

  useEffect(() => {
    const off = onBack(back);
    return () => off();
  }, [back]);
  // 개발(브라우저): Esc가 뒤로가기
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && back();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [back]);

  const value = useMemo<Nav>(() => {
    const route = stack[stack.length - 1];
    const root = stack[0].name;
    return {
      route,
      depth: stack.length,
      tab: root === "people" || root === "settings" ? root : "home",
      push: (r) => setStack((s) => [...s, r]),
      replace: (r) => setStack((s) => [...s.slice(0, -1), r]),
      back,
      go: (tab) => setStack([{ name: tab }]),
      version,
      bump: () => setVersion((v) => v + 1),
    };
  }, [stack, back, version]);

  // 화면이 바뀌면 맨 위부터
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [stack.length, stack[stack.length - 1]]);

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}
