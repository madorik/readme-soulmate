// 온보딩: 위는 크림 점 모눈 위의 머리(StepHeader), 아래는 종이 시트. 시트가 화면 맨 아래까지 닿게 아래 여백은 시트의 아래 버튼 줄이 넣는다
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <main className="screen !pb-0">{children}</main>;
}
