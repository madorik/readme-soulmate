// 온보딩: 위는 하늘 그라데이션(StepHeader), 아래는 흰 시트. 화면 맨 위까지 그라데이션이 닿게 위쪽 여백은 StepHeader가 넣는다
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <main className="screen !pt-0 bg-paper">{children}</main>;
}
