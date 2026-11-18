import { expect, test } from "@playwright/test";

// 토스 미니앱 API(/api/t): 개발용 로그인 → 사람 더하기 → 생일 저장 → 홈의 다가오는 날 → 지우기. CORS는 토스·개발 주소만 받는다
const ORIGIN = "http://localhost:5183";

test("토스 API: 로그인, 사람·생일 저장, 홈, 기록 지우기", async ({ request }) => {
  const dev = `e2e-${Date.now().toString(36)}`;
  const login = await request.post("/api/t/session", { headers: { origin: ORIGIN }, data: { dev } });
  expect(login.ok()).toBeTruthy();
  expect(login.headers()["access-control-allow-origin"]).toBe(ORIGIN);
  const { token } = (await login.json()) as { token: string };
  const headers = { origin: ORIGIN, authorization: `Bearer ${token}` };

  // 토큰 없으면 막는다
  expect((await request.get("/api/t/home", { headers: { origin: ORIGIN } })).status()).toBe(401);

  const add = await request.post("/api/t/people", { headers, data: { name: "토스엄마" } });
  const { id } = (await add.json()) as { id: string };
  expect(id).toMatch(/^[0-9a-f-]{36}$/);

  // 다음 달 같은 날 생일 → 60일 안에 보인다
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, Math.min(now.getDate(), 28));
  const save = await request.put(`/api/t/people/${id}/sections/dates`, {
    headers,
    data: { data: { birthday: { calendar: "solar", month: next.getMonth() + 1, day: next.getDate(), year: 1960 }, anniversaries: [] } },
  });
  expect(save.ok()).toBeTruthy();

  const home = (await (await request.get("/api/t/home", { headers })).json()) as { events: { title: string }[]; people: { name: string; filled: string[] }[] };
  expect(home.people.map((p) => p.name)).toContain("토스엄마");
  expect(home.people.find((p) => p.name === "토스엄마")?.filled).toContain("dates");
  expect(home.events.map((e) => e.title)).toContain("토스엄마 생일");

  const detail = (await (await request.get(`/api/t/people/${id}`, { headers })).json()) as { person: { card: { dates?: unknown } } };
  expect(detail.person.card.dates).toBeTruthy();

  // 다른 사이트에서 부르면 CORS 허락이 없다
  const other = await request.get("/api/t/home", { headers: { ...headers, origin: "https://evil.example" } });
  expect(other.headers()["access-control-allow-origin"]).toBeUndefined();

  // 같은 개발 키로 다시 들어오면 같은 계정
  const again = (await (await request.post("/api/t/session", { headers: { origin: ORIGIN }, data: { dev } })).json()) as { token: string };
  const home2 = (await (await request.get("/api/t/home", { headers: { origin: ORIGIN, authorization: `Bearer ${again.token}` } })).json()) as { people: { name: string }[] };
  expect(home2.people.map((p) => p.name)).toContain("토스엄마");

  // 기록 모두 지우기 → 이 토큰은 더 못 쓴다
  expect((await request.delete("/api/t/account", { headers })).ok()).toBeTruthy();
  expect((await request.get("/api/t/home", { headers })).status()).toBe(401);
});
