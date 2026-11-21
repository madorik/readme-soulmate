// 데모로 둘러보기(익명 로그인)를 열어 둘지. 서버 전용 코드가 없어 시험에서 바로 돌린다.
// 운영(NODE_ENV=production)에서는 닫는다: 시작·로그인 화면에 버튼을 보이지 않고, 서버도 데모 로그인 요청을 거절한다(lib/auth.ts).
// 개발 서버(E2E)는 늘 연다. 운영에서 잠깐 열어야 할 때(스토어 심사 등)만 환경 변수 DEMO_ENABLED=1로 켠다.
export function demoEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.NODE_ENV !== "production" || env.DEMO_ENABLED === "1";
}
