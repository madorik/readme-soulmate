import { DropOrb } from "@/components/DropOrb";
import { Icon } from "@/components/marks";
import { useNav, type Tab } from "./nav";

// 토스판 공통 조각: 화면 틀, 아래 탭 막대, AI 표시, 불러오는 중·실패

/** 화면 틀. 위쪽 막대는 토스 네비게이션 바가 그리므로 두지 않는다 */
export function Page({ children, tabs = false, className = "" }: { children: React.ReactNode; tabs?: boolean; className?: string }) {
  return <main className={`mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col pt-3 ${tabs ? "" : "page-end"} ${className}`}>{children}</main>;
}

export function TabBar() {
  const { tab, go, push } = useNav();
  const item = (key: Tab, icon: "calendar" | "people" | "settings", label: string) => {
    const on = tab === key;
    return (
      <button
        type="button"
        onClick={() => go(key)}
        aria-current={on ? "page" : undefined}
        className={`flex flex-col items-center justify-center gap-[3px] text-[11.5px] ${on ? "font-bold text-accent" : "font-medium text-muted"}`}
      >
        <Icon name={icon} strokeWidth={on ? 2.1 : 1.7} />
        {label}
      </button>
    );
  };
  return (
    <nav aria-label="menu" className="sticky bottom-0 z-30 mt-auto px-4 pt-3" style={{ paddingBottom: "var(--pb-tab)", background: "linear-gradient(to top, var(--color-bg) 60%, rgb(246 247 251 / 0))" }}>
      <div className="grid h-[66px] grid-cols-4 rounded-[26px] bg-white px-1 shadow-[0_8px_24px_rgba(31,35,64,0.09),0_0_0_1px_rgba(31,35,64,0.04)]">
        {item("home", "calendar", "홈")}
        {item("people", "people", "사람들")}
        <div className="flex items-center justify-center">
          <button type="button" onClick={() => push({ name: "voice" })} aria-label="말로 적기" className="flex h-[56px] w-[56px] items-center justify-center rounded-full transition-transform active:scale-95">
            <DropOrb size={52} />
          </button>
        </div>
        {item("settings", "settings", "설정")}
      </div>
    </nav>
  );
}

/** 생성형 AI가 만든 결과 표시(앱인토스·AI 기본법 고지) */
export function AiBadge({ children = "AI" }: { children?: React.ReactNode }) {
  return <span className="inline-flex h-[22px] shrink-0 items-center rounded-md bg-sky-soft px-1.5 text-[11.5px] font-bold text-accent">{children}</span>;
}

export function Loading() {
  return (
    <div role="status" aria-label="불러오는 중" className="flex flex-col gap-3 px-4 pt-2">
      <div className="h-[132px] animate-pulse rounded-[24px] bg-white" />
      <div className="h-[72px] animate-pulse rounded-[24px] bg-white" />
      <div className="h-[72px] animate-pulse rounded-[24px] bg-white" />
    </div>
  );
}

export function Failed({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 pt-16 text-center">
      <p className="text-[15px] text-ink-2">잠시 연결이 안 돼요</p>
      <button type="button" onClick={onRetry} className="pill">
        다시 불러오기
      </button>
    </div>
  );
}

/** 아래에 붙는 버튼 줄 */
export function BottomBar({ children }: { children: React.ReactNode }) {
  return <div className="bottom-bar mt-auto bg-[var(--color-bg)] px-4 pt-3">{children}</div>;
}
