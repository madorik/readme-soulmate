
// 토스판에만 있는 화면(시작·약관·답하기)의 공통 조각: 화면 틀, AI 표시, 불러오는 중·실패

/** 화면 틀. 위쪽 막대는 토스 네비게이션 바가 그리므로 두지 않는다 */
export function Page({ children, tabs = false, className = "" }: { children: React.ReactNode; tabs?: boolean; className?: string }) {
  return <main className={`mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col pt-3 ${tabs ? "" : "page-end"} ${className}`}>{children}</main>;
}

/** 생성형 AI가 만든 결과 표시(앱인토스·AI 기본법 고지) */
export function AiBadge({ children = "AI" }: { children?: React.ReactNode }) {
  return <span className="inline-flex h-[22px] shrink-0 items-center rounded-md bg-sky-soft px-1.5 text-[14px] text-accent">{children}</span>;
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
