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

  // 토스 알림 켜기·끄기(미니앱이 토스 알림 동의를 받은 뒤에 부른다)
  expect(await (await request.post("/api/t/reminder", { headers, data: { on: true } })).json()).toEqual({ on: true });
  expect((await request.post("/api/t/reminder", { headers, data: { on: "yes" } })).status()).toBe(400);

  // 기록 모두 지우기 → 이 토큰은 더 못 쓴다
  expect((await request.delete("/api/t/account", { headers })).ok()).toBeTruthy();
  expect((await request.get("/api/t/home", { headers })).status()).toBe(401);
});

test("토스 API: 물어보기 만들고, 로그인 없이 답하면 그 사람 기록에 들어간다", async ({ request }) => {
  const login = await request.post("/api/t/session", { headers: { origin: ORIGIN }, data: { dev: `e2e-ask-${Date.now().toString(36)}` } });
  const { token } = (await login.json()) as { token: string };
  const headers = { origin: ORIGIN, authorization: `Bearer ${token}` };
  const { id } = (await (await request.post("/api/t/people", { headers, data: { name: "물어볼엄마" } })).json()) as { id: string };

  // 처음엔 상대에게 보일 내 이름이 있어야 한다
  expect((await request.post(`/api/t/people/${id}/ask`, { headers, data: { sections: ["dates", "taste"] } })).status()).toBe(400);
  const made = await request.post(`/api/t/people/${id}/ask`, { headers, data: { sections: ["dates", "taste"], message: "알려줘", from: "민지" } });
  expect(made.ok()).toBeTruthy();
  const { token: ask, text } = (await made.json()) as { token: string; text: string };
  expect(text).toContain("민지");
  expect((await (await request.get(`/api/t/people/${id}`, { headers })).json()).me).toBe("민지");

  // 받은 사람: 로그인 없이 연다
  const open = (await (await request.get(`/api/t/r/${ask}`, { headers: { origin: ORIGIN } })).json()) as { state: string; from: string; sections: string[] };
  expect(open).toMatchObject({ state: "active", from: "민지" });
  expect(open.sections.sort()).toEqual(["dates", "taste"]);

  // 내 링크에는 못 답한다
  expect((await (await request.post(`/api/t/r/${ask}`, { headers, data: { data: { taste: { likes: ["딸기"] } } } })).json()).error).toBe("self");

  const answer = await request.post(`/api/t/r/${ask}`, {
    headers: { origin: ORIGIN },
    data: { data: { dates: { birthday: { calendar: "solar", month: 3, day: 5 }, anniversaries: [] }, taste: { likes: ["딸기"] } }, consent: false },
  });
  expect((await answer.json()).sent).toBe(true);
  expect((await (await request.get(`/api/t/r/${ask}`, { headers: { origin: ORIGIN } })).json()).state).toBe("used");

  const card = ((await (await request.get(`/api/t/people/${id}`, { headers })).json()) as { person: { card: { dates?: { birthday?: { month: number } }; taste?: { likes: string[] } } } }).person.card;
  expect(card.dates?.birthday?.month).toBe(3);
  expect(card.taste?.likes).toContain("딸기");

  expect((await request.delete("/api/t/account", { headers })).ok()).toBeTruthy();
});

test("토스 앱 화면: 처음엔 시작 화면, 시작하면 온보딩, 앱과 같은 화면 데이터·서버 액션, 기존 계정 연결", async ({ request, playwright, baseURL }) => {
  const stamp = Date.now().toString(36);
  const post = (path: string, data: unknown, token?: string) =>
    request.post(`/api/t/${path}`, { headers: { origin: ORIGIN, ...(token ? { authorization: `Bearer ${token}` } : {}) }, data });
  const page = async (path: string, token: string) =>
    (await (await request.get(`/api/t/page?path=${encodeURIComponent(path)}`, { headers: { origin: ORIGIN, authorization: `Bearer ${token}` } })).json()) as Record<string, unknown>;
  const form = (pairs: [string, string][]) => ({ $form: pairs });

  // 이 토스 계정으로 쓰던 게 없으면 만들지 않는다(시작 화면)
  expect(await (await post("session", { dev: `e2e-app-${stamp}`, create: false })).json()).toEqual({ new: true });
  const { token } = (await (await post("session", { dev: `e2e-app-${stamp}`, create: true })).json()) as { token: string };

  // 새 계정은 앱처럼 처음 화면부터
  expect(await page("/me", token)).toEqual({ redirect: "/onboarding/avatar" });
  expect((await page("/onboarding/avatar", token)).pattern).toBe("/onboarding/avatar");
  expect(await (await post("action/card/saveAvatar", { args: [form([["name", "토스민지"], ["avatar", "{}"], ["next", "/home"]])] }, token)).json()).toEqual({ ok: false, redirect: "/onboarding/food" });
  expect(await (await post("action/card/finishOnboarding", { args: [form([["birthday", "null"], ["offsets", "[7,1]"], ["next", "/home"]])] }, token)).json()).toEqual({ ok: false, redirect: "/home" });

  const me = await page("/me", token);
  expect(me.pattern).toBe("/me");
  expect((me.data as { name: string }).name).toBe("토스민지");
  expect(await page("/no/such/page", token)).toEqual({ notFound: true });
  // 웹 로그인용 데모 만들기는 못 부른다
  expect((await post("action/auth/prepareDemo", { args: [] }, token)).status()).toBe(404);

  // 기존 계정 연결: 코드(한 번만) → 다른 토스 키가 같은 계정으로
  const code = ((await (await post("action/account/createTossLinkCode", { args: [] }, token)).json()) as { value: { code: string } }).value.code;
  expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  const linked = (await (await post("link", { dev: `e2e-app2-${stamp}`, linkCode: code })).json()) as { token: string };
  expect(((await page("/me", linked.token)).data as { name: string }).name).toBe("토스민지");
  expect(await (await post("link", { dev: `e2e-app3-${stamp}`, linkCode: code })).json()).toEqual({ error: "code" });

  // 로그아웃: 토스에서만 쓰는 계정이면 연결은 그대로(다시 들어오면 같은 계정)
  expect(await (await post("action/auth/signOut", { args: [] }, linked.token)).json()).toEqual({ ok: false, redirect: "/start" });
  // 토스 웹뷰는 우리 쿠키를 보내지 않는다(쿠키 없는 요청으로 본다)
  const bare = await playwright.request.newContext({ baseURL });
  expect((await bare.get("/api/t/home", { headers: { origin: ORIGIN, authorization: `Bearer ${linked.token}` } })).status()).toBe(401);
  await bare.dispose();
  expect(((await (await post("session", { dev: `e2e-app2-${stamp}`, create: false })).json()) as { token?: string }).token).toBeTruthy();

  expect((await request.delete("/api/t/account", { headers: { origin: ORIGIN, authorization: `Bearer ${token}` } })).ok()).toBeTruthy();
});
