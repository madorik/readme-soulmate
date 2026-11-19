// 고른 선물이 채워진 자리의 표시(PicksStage가 이게 DOM에 나타난 걸 보고 '다 골랐다'를 안다).
// 장면이 보이는 동안엔 숨겨 두었다가 번쩍임이 가장 환할 때 드러낸다(CSS는 globals.css의 .picks-stage)
export function PicksContent({ children }: { children: React.ReactNode }) {
  return (
    <div data-picks-content="" className="flex flex-col">
      {children}
    </div>
  );
}

/** 고르는 동안 Suspense 자리에 두는 표시. 이게 있으면 아직 고르는 중이다 */
export function PicksPending() {
  return <span data-picks-pending="" hidden />;
}
