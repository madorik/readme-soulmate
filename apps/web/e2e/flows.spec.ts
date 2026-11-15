import { expect, test, type Browser, type BrowserContext } from "@playwright/test";
import { lunarToSolar, nextOccurrence, todayIn } from "@readme/core";
import { CRON_SECRET, onboard, signIn } from "./helpers";

// 흐름을 실제로 눌러 본다: 가입·온보딩 → 물어보기·앱 없이 답하기(답이 내 기록에) → 받은 답 고치기 → 다시 물어보기 → 로그인하고 답하기 → 영어
test.describe.configure({ mode: "serial" });

let askDadUrl = "";
// SHOTS=폴더 를 주면 주요 화면을 찍어 둔다(디자인 점검용)
const SHOTS = process.env.SHOTS;
async function shot(page: import("@playwright/test").Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
}
// 사람마다 로그인은 한 번만(데모 계정은 로그인할 때마다 새로 생긴다). 이후엔 세션을 재사용한다
const sessions: Record<string, Awaited<ReturnType<BrowserContext["storageState"]>>> = {};

async function newPage(browser: Browser) {
  const ctx = await browser.newContext();
  return ctx.newPage();
}

async function as(browser: Browser, who: string) {
  const ctx = await browser.newContext({ storageState: sessions[who] });
  return ctx.newPage();
}

async function remember(who: string, ctx: BrowserContext) {
  sessions[who] = await ctx.storageState();
}

/** 물어볼 항목을 모두 끄고 고른 것만 켠다 */
async function onlyTopics(page: import("@playwright/test").Page, names: string[]) {
  const on = page.locator("form button[aria-pressed=true]");
  while (await on.count()) await on.first().click();
  for (const name of names) await page.getByRole("button", { name, exact: true }).click();
}

async function makeLink(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "링크 만들기" }).click();
  const url = await page.getByTestId("invite-url").inputValue();
  expect(url).toMatch(/\/r\/[A-Za-z0-9_-]{40,}/);
  return url;
}

test("가입하고 온보딩을 마치면 홈과 내 리드미가 보인다(음력 생일)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /말 안 해도/ })).toBeVisible();
  await shot(page, "01-start");
  await signIn(page);
  await onboard(page, { name: "지수", allergy: "새우", dislike: "오이", lunar: { month: 10, day: 12 } });
  await expect(page).toHaveURL(/\/home/);
  await expect(page.getByRole("heading", { name: "내 사람들" })).toBeVisible();

  await shot(page, "02-home-empty");
  // 이번 주를 누르면 월별 달력, 앞뒤 달로 넘긴다
  await page.getByRole("link", { name: "달력 보기" }).click();
  await expect(page).toHaveURL(/\/calendar$/);
  const month = await page.getByRole("heading", { level: 1 }).textContent();
  await page.getByRole("link", { name: "다음 달" }).click();
  await expect(page).toHaveURL(/\/calendar\?m=\d{4}-\d{2}$/);
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(month ?? "");
  await page.getByRole("link", { name: "이번 달로" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(month ?? "");
  await shot(page, "02b-calendar");
  await page.goto("/me");
  await expect(page.getByRole("heading", { name: "지수" })).toBeVisible();
  await shot(page, "03-me");
  // 내 리드미 목록엔 적은 값 대신 고를 수 있는 것만. 미리보기·보내기 버튼은 없다
  await expect(page.getByText("새우 알레르기")).toHaveCount(0);
  await expect(page.getByText("알레르기, 못 먹는 것, 식단, 꼭 알려 둘 말")).toBeVisible();
  await expect(page.getByRole("button", { name: /^문화생활\s*영화, 드라마, TV·예능·유튜브, 음악, 노래, 책/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "미리보기" })).toHaveCount(0);
  const res = await page.request.get("/api/export");
  const data = await res.json();
  expect(data.myReadme.safety.allergens).toContain("shrimp");
  expect(data.myReadme.dates.birthday).toMatchObject({ calendar: "lunar", month: 10, day: 12 });
  await remember("jisu", page.context());
});

test("물어보기(새 사람) → 앱 없이 웹에서 답하기 → 답이 내 기록에 들어간다", async ({ browser }) => {
  const page = await as(browser, "jisu");
  await page.goto("/request");
  await expect(page.getByRole("heading", { name: "물어보기" })).toBeVisible();
  await page.getByPlaceholder("예: 아빠, 장인어른").fill("아빠");
  askDadUrl = await makeLink(page);
  await shot(page, "04-ask-ready");

  const dad = await newPage(browser);
  await dad.goto(askDadUrl);
  await expect(dad.getByText("설치 없이 답하는 중")).toBeVisible();
  await expect(dad.getByRole("heading", { name: "지수님이 3가지가 궁금하대요" })).toBeVisible();
  await shot(dad, "05-answer");
  // 한 화면에 한 항목씩: 음식과 알레르기 → 선물(건너뛰기) → 생일
  await expect(dad.getByText("1/4")).toBeVisible();
  await dad.getByRole("button", { name: "굴", exact: true }).first().click();
  await dad.getByRole("button", { name: "다음", exact: true }).click();
  await expect(dad.getByText("2/4")).toBeVisible();
  await dad.getByRole("button", { name: "건너뛰기", exact: true }).click();
  await expect(dad.getByText("3/4")).toBeVisible();
  await dad.getByRole("radio", { name: "음력" }).click();
  await dad.getByLabel("월").selectOption("11");
  await dad.getByLabel("일").selectOption("3");
  await dad.getByRole("button", { name: "다음", exact: true }).click();
  await expect(dad.getByRole("heading", { name: "거의 다 됐어요" })).toBeVisible();
  // 답이 어디에 저장되는지 알려 주고, 건강 정보는 동의가 있어야 보낸다
  await expect(dad.getByText("보낸 답은 지수님이 기억해 두고, 그 뒤로는 지수님이 고칠 수 있어요.")).toBeVisible();
  await expect(dad.getByRole("button", { name: "보내기", exact: true })).toBeDisabled();
  await dad.getByRole("button", { name: /건강 정보를 지수님에게 보내 저장하는 데 동의해요/ }).click();
  await dad.getByRole("button", { name: "보내기", exact: true }).click();
  await expect(dad.getByRole("heading", { name: "마음이 전해졌어요" })).toBeVisible();
  await expect(dad.getByRole("link", { name: "나도 물어보기" })).toHaveAttribute("href", /next=%2Frequest%3Fname%3D/);
  await shot(dad, "06-answer-done");

  // 같은 링크로 다시 답할 수 없다
  await dad.goto(askDadUrl);
  await expect(dad.getByText("이미 답한 링크예요.")).toBeVisible();

  // 아빠는 지수 사람들에 들어가 있고, 답한 항목에 받은 날이 붙는다
  await page.goto("/people");
  const today = todayIn("Asia/Seoul");
  const n = nextOccurrence({ calendar: "lunar", month: 11, day: 3 }, today)!;
  const solar = lunarToSolar(n.date.y, 11, 3)!;
  await expect(page.getByText(`${solar.m}.${solar.d}`).first()).toBeVisible();
  await page.getByRole("link", { name: /아빠/ }).click();
  // 굴은 '못 먹는 것'으로 답했다
  await expect(page.getByRole("listitem").filter({ has: page.getByRole("button", { name: /알레르기와 못 먹는 음식/ }) }).getByText("굴", { exact: true })).toBeVisible();
  await shot(page, "07-person-answered");
  await page.goto("/home");
  await expect(page.getByRole("link", { name: /아빠/ })).toBeVisible();
  await shot(page, "08-home");
});

test("받은 답도 내가 고친다", async ({ browser }) => {
  const page = await as(browser, "jisu");
  await page.goto("/people");
  await page.getByRole("link", { name: /아빠/ }).click();
  await page.waitForURL(/\/people\/[0-9a-f-]{36}$/);
  const personUrl = new URL(page.url()).pathname;
  // 항목을 누르면 화면을 옮기지 않고 그 자리에서 고치고, 고르면 바로 저장된다
  const safety = page.getByRole("button", { name: /알레르기와 못 먹는 음식/ });
  await safety.click();
  await expect(safety).toHaveAttribute("aria-expanded", "true");
  await expect(page).toHaveURL(/\?open=safety$/);
  await expect(page.getByRole("button", { name: "저장" })).toHaveCount(0);
  await page.getByRole("button", { name: "땅콩", exact: true }).first().click();
  await expect(page.getByText("저장했어요.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "다 했어요" }).click();
  await expect(safety).toHaveAttribute("aria-expanded", "false");
  await page.goto(personUrl);
  await expect(page.getByText("땅콩", { exact: true })).toBeVisible();
  await expect(page.getByText("굴", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "선물 고르기" }).click();
  await shot(page, "09-reminder");
});

test("아는 사람에게 다시 물어보기: 내 기록 값이 미리 채워져 가고, 기다리는 동안 표시되며, 취소한 링크는 안 열린다", async ({ browser }) => {
  const page = await as(browser, "jisu");
  await page.goto("/people");
  await page.getByRole("link", { name: /아빠/ }).click();
  await page.waitForURL(/\/people\/[0-9a-f-]{36}$/);
  const personUrl = new URL(page.url()).pathname;
  await page.getByRole("link", { name: "물어보기", exact: true }).click();
  await expect(page.getByRole("heading", { name: "아빠님에게 물어보기" })).toBeVisible();
  await expect(page.getByText("누구에게 물어볼까요?")).toHaveCount(0);
  // 아직 안 적힌 항목이 먼저 골라져 있다(생일·알레르기는 적혀 있다)
  await expect(page.getByRole("button", { name: "사이즈", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "생일·기념일", exact: true })).toHaveAttribute("aria-pressed", "false");
  await onlyTopics(page, ["생일·기념일"]);
  const url = await makeLink(page);

  await page.goto(personUrl);
  await expect(page.getByText("답장을 기다리고 있어요")).toBeVisible();
  await page.goto("/people");
  await expect(page.getByRole("link", { name: /아빠.*답장을 기다리고 있어요/ })).toBeVisible();
  await page.goto("/privacy");
  await expect(page.getByText("아빠님에게 물어본 것")).toBeVisible();

  const dad = await newPage(browser);
  await dad.goto(url);
  await expect(dad.getByText("지수님이 이렇게 알고 있어요")).toBeVisible();
  await expect(dad.getByText("음력 11월 3일")).toBeVisible();
  await dad.getByRole("button", { name: "맞아요" }).click();
  await expect(dad.getByRole("heading", { name: "거의 다 됐어요" })).toBeVisible();
  await dad.getByRole("button", { name: "보내기", exact: true }).click();
  await expect(dad.getByRole("heading", { name: "마음이 전해졌어요" })).toBeVisible();
  await page.goto(personUrl);
  await expect(page.getByText("답장을 기다리고 있어요")).toHaveCount(0);

  // 또 물어보고 사람 화면에서 취소하면, 링크가 더는 열리지 않는다
  await page.getByRole("link", { name: "물어보기", exact: true }).click();
  await onlyTopics(page, ["선물"]);
  const canceled = await makeLink(page);
  await page.goto(personUrl);
  await page.getByRole("button", { name: "취소", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${personUrl}$`));
  await expect(page.getByText("답장을 기다리고 있어요")).toHaveCount(0);
  await dad.goto(canceled);
  await expect(dad.getByText("보낸 사람이 취소한 링크예요.")).toBeVisible();
});

test("로그인하고 답하기: 내 리드미 값이 미리 채워지고, 내 리드미에도 저장되며, 물어본 사람 목록에 내 이름으로 보인다", async ({ browser }) => {
  const doyun = await newPage(browser);
  await doyun.goto("/");
  await signIn(doyun);
  await onboard(doyun, { name: "도윤", allergy: "땅콩", solar: { month: 2, day: 14 } });
  await expect(doyun).toHaveURL(/\/home/);
  await remember("doyun", doyun.context());

  const jisu = await as(browser, "jisu");
  await jisu.goto("/request");
  await jisu.getByPlaceholder("예: 아빠, 장인어른").fill("도윤이");
  await onlyTopics(jisu, ["생일·기념일", "사이즈"]);
  const url = await makeLink(jisu);

  await doyun.goto(url);
  await expect(doyun.getByRole("link", { name: "로그인하고 답하기" })).toHaveCount(0);
  // 사이즈: 지수도 모르고 내 리드미에도 없어서 직접 적는다
  await doyun.getByPlaceholder("예: 235").fill("235");
  await doyun.getByPlaceholder("예: 11").fill("11");
  await doyun.getByRole("button", { name: "다음", exact: true }).click();
  // 생일: 내 리드미 값(양력 2월 14일)이 미리 들어 있다
  await expect(doyun.getByLabel("월").first()).toHaveValue("2");
  await expect(doyun.getByLabel("일").first()).toHaveValue("14");
  await doyun.getByRole("button", { name: "다음", exact: true }).click();
  await expect(doyun.getByRole("button", { name: "나에 대한 기록에도 저장" })).toHaveAttribute("aria-pressed", "true");
  await doyun.getByRole("button", { name: "보내기", exact: true }).click();
  await expect(doyun.getByRole("heading", { name: "마음이 전해졌어요" })).toBeVisible();
  await expect(doyun.getByRole("link", { name: "나도 물어보기" })).toHaveAttribute("href", /^\/request\?name=/);
  await doyun.getByRole("link", { name: "기억해유 열기" }).click();
  await expect(doyun).toHaveURL(/\/me$/);
  const mine = await (await doyun.request.get("/api/export")).json();
  expect(mine.myReadme.sizes.shoe).toBe(235);

  // 지수 쪽: 도윤의 앱 이름이 보이고, 내가 붙인 '도윤이'는 태그로
  await jisu.goto("/people");
  await jisu.getByRole("link", { name: /도윤/ }).first().click();
  await expect(jisu.getByRole("heading", { name: "도윤" })).toBeVisible();
  await expect(jisu.getByRole("button", { name: "태그 도윤이 고치기" })).toBeVisible();
  await expect(jisu.getByText("235").first()).toBeVisible();
  // 태그는 이름 밑에서 바로 고친다
  await jisu.getByRole("button", { name: "태그 도윤이 고치기" }).click();
  await jisu.getByRole("textbox", { name: "태그" }).fill("단짝");
  await jisu.getByRole("button", { name: "저장", exact: true }).click();
  await expect(jisu.getByRole("button", { name: "태그 단짝 고치기" })).toBeVisible();
  await jisu.reload();
  await expect(jisu.getByRole("button", { name: "태그 단짝 고치기" })).toBeVisible();
  await shot(jisu, "10-person-linked");

  // 도윤은 지수의 기록을 볼 수 없다(주소를 알아도)
  const personUrl = new URL(jisu.url()).pathname;
  await doyun.goto(personUrl);
  await expect(doyun.getByText("235")).toHaveCount(0);
});

test("영어로 보면 사이즈가 미국 사이즈로도 보인다", async ({ browser }) => {
  const jisu = await as(browser, "jisu");
  await jisu.goto("/privacy");
  await jisu.getByRole("button", { name: "English" }).click();
  await jisu.goto("/people");
  await jisu.getByRole("link", { name: /도윤/ }).first().click();
  await expect(jisu.getByRole("button", { name: /^Sizes/ })).toBeVisible();
  await expect(jisu.getByText("About US women's 6.5")).toBeVisible();
  await expect(jisu.getByText("About US 6")).toBeVisible();
  await shot(jisu, "11-person-en");
  await jisu.goto("/privacy");
  await jisu.getByRole("button", { name: "한국어" }).click();
  await expect(jisu.getByRole("heading", { name: "설정", exact: true })).toBeVisible();
});

test("나만 보는 메모: 사람 화면에 남는다", async ({ browser }) => {
  const jisu = await as(browser, "jisu");
  await jisu.goto("/people");
  await jisu.getByRole("link", { name: /도윤/ }).first().click();
  await jisu.getByLabel("메모", { exact: true }).fill("목도리 줬음. 잘 하고 다님");
  await jisu.getByRole("button", { name: "메모 추가" }).click();
  await expect(jisu.getByText("목도리 줬음. 잘 하고 다님")).toBeVisible();
});

test("직접 적어 두기: 물어보지 않아도 적어 두면 나만 보고, 생일 알림도 온다", async ({ browser, request }) => {
  const cron = async () => (await (await request.get("/api/cron/reminders", { headers: { authorization: `Bearer ${CRON_SECRET}` } })).json()).created as number;
  await cron(); // 이미 잡힌 알림은 먼저 만들어 두고, 아래에서 새로 생긴 것만 센다
  const jisu = await as(browser, "jisu");
  await jisu.goto("/people");
  await jisu.getByRole("link", { name: "직접 적기" }).click();
  await expect(jisu).toHaveURL(/\/people\/new/);
  await jisu.getByLabel("이름이나 부르는 말").fill("할머니");
  await jisu.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(jisu.getByRole("heading", { name: "할머니" })).toBeVisible();
  // 아무것도 없으면 항목마다 제목 한 줄과 '적기'만
  await expect(jisu.getByRole("button", { name: /생일과 기념일\s*적기/ })).toBeVisible();
  const personUrl = new URL(jisu.url()).pathname;

  // 생일을 오늘부터 7일 뒤로(기본 알림 시점이 7일 전·당일)
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date()).split("-").map(Number);
  const in7 = new Date(Date.UTC(y, m - 1, d + 7));
  await jisu.getByRole("button", { name: /생일과 기념일/ }).click();
  await jisu.getByLabel("월").first().selectOption(String(in7.getUTCMonth() + 1));
  await jisu.getByLabel("일").first().selectOption(String(in7.getUTCDate()));
  await expect(jisu.getByText("저장했어요.", { exact: true })).toBeVisible();
  await jisu.getByRole("button", { name: "다 했어요" }).click();

  await jisu.getByRole("button", { name: /알레르기와 못 먹는 음식/ }).click();
  await jisu.getByRole("button", { name: "땅콩", exact: true }).first().click();
  await expect(jisu.getByText("저장했어요.", { exact: true })).toBeVisible();

  await jisu.goto(personUrl);
  await expect(jisu.getByRole("button", { name: /알레르기와 못 먹는 음식\s*고치기/ })).toBeVisible();
  await expect(jisu.getByText("땅콩", { exact: true })).toBeVisible();
  await shot(jisu, "14-mine-person");
  await jisu.goto("/people");
  await expect(jisu.getByRole("link", { name: /할머니.*7일 남음/ })).toBeVisible();
  expect(await cron()).toBeGreaterThanOrEqual(1);

  // 다른 사람은 주소를 알아도 못 본다
  const doyun = await as(browser, "doyun");
  await doyun.goto(personUrl);
  await expect(doyun.getByText("할머니")).toHaveCount(0);

  // 지우면 목록에서 사라진다
  await jisu.goto(personUrl);
  await jisu.getByText("사람들에서 지우기", { exact: true }).click();
  await jisu.getByRole("button", { name: "지우기", exact: true }).last().click();
  await expect(jisu).toHaveURL(/\/people$/);
  await expect(jisu.getByRole("link", { name: /할머니/ })).toHaveCount(0);
});

test("생년월일: 태어난 해를 고르면 나이와 띠가 보인다", async ({ browser }) => {
  const jisu = await as(browser, "jisu");
  await jisu.goto("/me/edit/dates");
  await jisu.getByLabel("태어난 해").first().selectOption("1993");
  await expect(jisu.getByText(/이번 생일에 만 \d+세가 돼요 · 닭띠/)).toBeVisible();
  await jisu.getByRole("button", { name: "저장" }).click();
  await expect(jisu.getByText("저장했어요.", { exact: true })).toBeVisible();
  const data = await (await jisu.request.get("/api/export")).json();
  expect(data.myReadme.dates.birthday.year).toBe(1993);
});

test("좋아하는 것들: 무늬·최애를 적으면 내 리드미에 저장된다", async ({ browser }) => {
  const jisu = await as(browser, "jisu");
  await jisu.goto("/me/edit/favorites");
  await jisu.getByRole("button", { name: "스트라이프" }).click();
  await jisu.getByLabel("최애 연예인·가수").fill("아이유");
  await jisu.getByRole("button", { name: "저장" }).click();
  await expect(jisu.getByText("저장했어요.", { exact: true })).toBeVisible();
  const data = await (await jisu.request.get("/api/export")).json();
  expect(data.myReadme.favorites.idol).toBe("아이유");
  expect(data.myReadme.favorites.patterns).toContain("stripe");
});

test("설정: 알림 받기를 끄면 언제 알릴지가 숨고, 다시 켜면 보인다", async ({ browser }) => {
  const doyun = await as(browser, "doyun");
  const push = doyun.getByRole("button", { name: "알림 받기" });
  await doyun.goto("/privacy");
  await expect(push).toHaveAttribute("aria-pressed", "true");
  await push.click();
  await expect(push).toHaveAttribute("aria-pressed", "false");
  await expect(doyun.locator("#reminders")).toHaveCount(0);
  await push.click();
  await expect(push).toHaveAttribute("aria-pressed", "true");
  await expect(doyun.locator("#reminders")).toBeVisible();
});

test("계정 삭제: 내 리드미는 지워지고, 나에게 물어본 사람의 기록은 그 사람 것이라 남는다", async ({ browser }) => {
  const doyun = await as(browser, "doyun");
  const res = await doyun.request.get("/api/export");
  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.myReadme.dates.birthday).toMatchObject({ calendar: "solar", month: 2, day: 14 });
  // 프로필 고치기에는 얼굴·이름만(로그아웃·계정 삭제 없음), 계정 삭제는 설정 맨 아래
  await doyun.goto("/me/avatar");
  await expect(doyun.getByRole("button", { name: "로그아웃" })).toHaveCount(0);
  await expect(doyun.getByRole("button", { name: "계정 삭제" })).toHaveCount(0);
  await doyun.goto("/privacy");
  await doyun.getByRole("button", { name: "계정 삭제" }).click();
  await doyun.getByRole("button", { name: "모두 지우기" }).click();
  await expect(doyun.getByRole("heading", { name: /말 안 해도/ })).toBeVisible();

  const jisu = await as(browser, "jisu");
  await jisu.goto("/people");
  // 앱 이름은 사라지고 내가 붙인 태그가 이름이 되며, 받은 답(사이즈)은 그대로
  await jisu.getByRole("link", { name: /단짝/ }).first().click();
  await expect(jisu.getByRole("heading", { name: "단짝" })).toBeVisible();
  await expect(jisu.getByText("235").first()).toBeVisible();
});

test("생일 알림 크론: 비밀값이 맞을 때만 돈다", async ({ request }) => {
  expect((await request.get("/api/cron/reminders")).status()).toBe(401);
  const ok = await request.get("/api/cron/reminders", { headers: { authorization: `Bearer ${CRON_SECRET}` } });
  expect(ok.status()).toBe(200);
  const body = await ok.json();
  expect(body.users).toBeGreaterThan(0);
});

test("언어는 설정에서 바꾸고, 내 리드미에는 내 정보만", async ({ browser }) => {
  const jisu = await as(browser, "jisu");
  await jisu.goto("/me");
  await expect(jisu.getByText("언어", { exact: true })).toHaveCount(0);
  // 프로필에는 얼굴과 이름만
  await jisu.getByRole("link", { name: "프로필 고치기" }).click();
  await expect(jisu.getByRole("heading", { name: "내 프로필" })).toBeVisible();
  await expect(jisu.getByText("언어", { exact: true })).toHaveCount(0);
  // 언어는 설정 탭에서
  await jisu.goto("/me");
  await jisu.getByRole("link", { name: "설정" }).click();
  await expect(jisu.getByRole("heading", { name: "설정", exact: true })).toBeVisible();
  await jisu.getByRole("button", { name: "English" }).click();
  await expect(jisu).toHaveURL(/\/privacy$/);
  await expect(jisu.getByText("Language", { exact: true })).toBeVisible();
  await expect(jisu.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "true");
  await jisu.getByRole("button", { name: "한국어" }).click();
  await expect(jisu.getByText("언어", { exact: true })).toBeVisible();
  await expect(jisu.getByRole("button", { name: "한국어" })).toHaveAttribute("aria-pressed", "true");
  await shot(jisu, "13-settings-language");
});

test("내 리드미: 고치기를 누르면 화면을 옮기지 않고 그 항목 아래에서 고치고, 고치면 바로 저장된다", async ({ browser }) => {
  const jisu = await as(browser, "jisu");
  await jisu.goto("/me");
  const sizes = jisu.getByRole("button", { name: /^사이즈/ });
  await expect(sizes).toHaveAttribute("aria-expanded", "false");
  await sizes.click();
  await expect(sizes).toHaveAttribute("aria-expanded", "true");
  // 펼친 항목은 주소에 적혀 새로고침해도 펼친 채로
  await expect(jisu).toHaveURL(/\/me\?open=sizes$/);
  await expect(jisu.getByRole("button", { name: "저장" })).toHaveCount(0);
  // 적는 칸은 칸을 벗어날 때 저장된다
  await jisu.getByPlaceholder("예: 235").fill("240");
  await expect(jisu.getByText("고르면 바로, 적은 건 칸을 벗어나면 저장돼요")).toHaveCount(0);
  await jisu.getByPlaceholder("예: 235").blur();
  await expect(jisu.getByText("저장했어요.", { exact: true })).toBeVisible();
  await jisu.reload();
  await expect(sizes).toHaveAttribute("aria-expanded", "true");
  await expect(jisu.getByPlaceholder("예: 235")).toHaveValue("240");
  await shot(jisu, "16-me-inline");
  // 접어도 목록에는 적은 값이 아니라 고를 수 있는 것(주제)만 보인다
  await sizes.click();
  await expect(sizes).toHaveAttribute("aria-expanded", "false");
  await expect(sizes).toContainText("상의, 하의, 신발, 반지");
  await expect(sizes).not.toContainText("240");
  // 고르는 것은 누르면 바로 저장된다(계절은 생활과 여행 항목)
  const favs = jisu.getByRole("button", { name: /^생활과 여행/ });
  await favs.click();
  const autumn = jisu.getByRole("button", { name: "가을", exact: true });
  await expect(autumn).toHaveAttribute("aria-pressed", "false");
  await autumn.click();
  await expect(autumn).toHaveAttribute("aria-pressed", "true");
  await expect(jisu.getByText("저장했어요.", { exact: true })).toBeVisible();
  await favs.click();
  await expect(favs).not.toContainText("가을");
  await jisu.reload();
  await favs.click();
  await expect(jisu.getByRole("button", { name: "가을", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("사람들: 그룹(기본 4개 + 직접 만들기)과 즐겨찾기. 목록은 즐겨찾기 → 그룹별로 묶이고 접힌다", async ({ browser }) => {
  const jisu = await as(browser, "jisu");
  // 단짝(탈퇴한 도윤, 태그가 이름이 됨): 친구들 그룹 + 즐겨찾기
  await jisu.goto("/people");
  await jisu.getByRole("link", { name: /단짝/ }).first().click();
  const group = jisu.getByRole("combobox", { name: "그룹" });
  for (const builtin of ["가족", "회사", "연인", "친구들"]) await expect(group.locator("option", { hasText: builtin })).toHaveCount(1);
  await group.selectOption({ label: "친구들" });
  await expect(group).toHaveValue(/[0-9a-f-]{36}/);
  const star = jisu.getByRole("button", { name: "즐겨찾기" });
  await star.click();
  await expect(star).toHaveAttribute("aria-pressed", "true");

  // 아빠: 드롭다운에서 새 그룹 '본가'를 만들어 바로 넣는다
  await jisu.goto("/people");
  await jisu.getByRole("link", { name: /아빠/ }).first().click();
  await jisu.getByRole("combobox", { name: "그룹" }).selectOption({ label: "+ 새 그룹 만들기" });
  await jisu.getByRole("textbox", { name: "그룹 이름" }).fill("본가");
  await jisu.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(jisu.getByRole("combobox", { name: "그룹" }).locator("option:checked")).toHaveText("본가");

  // 목록: 즐겨찾기(단짝) → 본가(아빠). 본가를 접으면 아빠가 안 보이고, 다시 펴면 보인다
  await jisu.goto("/people");
  await expect(jisu.getByRole("region", { name: "즐겨찾기" }).getByRole("link", { name: /단짝/ })).toBeVisible();
  const home = jisu.getByRole("region", { name: "본가" });
  await expect(home.getByRole("link", { name: /아빠/ })).toBeVisible();
  await shot(jisu, "18-people-groups");
  // 즐겨찾기가 맨 위, 그다음 사람이 있는 그룹, 빈 그룹은 뒤로
  const order = await jisu.locator("section[aria-label]").evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
  expect(order.slice(0, 2)).toEqual(["즐겨찾기", "본가"]);
  expect(order.indexOf("가족")).toBeGreaterThan(1);
  await home.getByRole("button", { name: /^본가/ }).click();
  await expect(home.getByRole("link", { name: /아빠/ })).toHaveCount(0);
  await home.getByRole("button", { name: /^본가/ }).click();
  await expect(home.getByRole("link", { name: /아빠/ })).toBeVisible();
  // 기본 그룹은 비어 있어도 목록에 보인다
  await expect(jisu.getByRole("region", { name: "가족" })).toBeVisible();

  // 선택 중에는 그룹 머리 체크로 그 그룹 사람을 한 번에 고른다
  await jisu.getByRole("button", { name: "선택" }).click();
  await jisu.getByRole("button", { name: "본가 모두 선택" }).click();
  await expect(jisu.getByRole("button", { name: /아빠 선택/ })).toHaveAttribute("aria-pressed", "true");
  await jisu.getByRole("button", { name: "취소" }).click();

  // 위쪽 '새 그룹'으로 그룹을 만들고(비어 있어도 보인다) 지운다
  await jisu.getByRole("button", { name: "새 그룹" }).first().click();
  await jisu.getByRole("textbox", { name: "그룹 이름" }).fill("동창");
  await jisu.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(jisu.getByRole("region", { name: "동창" })).toBeVisible();
  jisu.once("dialog", (d) => d.accept());
  await jisu.getByRole("button", { name: "그룹 지우기 동창" }).click();
  await expect(jisu.getByRole("region", { name: "동창" })).toHaveCount(0);

  // 끌어서 옮기기: 본가의 아빠를 가족 칸에 놓으면 가족으로 간다(화면은 그대로)
  const from = await jisu.getByRole("region", { name: "본가" }).getByRole("link", { name: /아빠/ }).boundingBox();
  const to = await jisu.getByRole("region", { name: "가족" }).getByRole("button", { name: /^가족/ }).boundingBox();
  await jisu.mouse.move(from!.x + 60, from!.y + from!.height / 2);
  await jisu.mouse.down();
  await jisu.mouse.move(from!.x + 70, from!.y + from!.height / 2 + 10, { steps: 3 });
  await jisu.mouse.move(to!.x + 60, to!.y + to!.height / 2, { steps: 12 });
  await jisu.mouse.up();
  await expect(jisu).toHaveURL(/\/people$/);
  await expect(jisu.getByRole("region", { name: "가족" }).getByRole("link", { name: /아빠/ })).toBeVisible();
  await jisu.reload();
  await expect(jisu.getByRole("region", { name: "가족" }).getByRole("link", { name: /아빠/ })).toBeVisible();
});

test("챙길 날 오른쪽 위 내 얼굴: 내 프로필(닉네임·프로필 사진)과 로그아웃", async ({ browser }) => {
  const jisu = await as(browser, "jisu");
  await jisu.goto("/home");
  await jisu.getByRole("button", { name: "내 프로필 메뉴" }).click();
  await expect(jisu.getByRole("menuitem", { name: "로그아웃" })).toBeVisible();
  await jisu.getByRole("menuitem", { name: "내 프로필" }).click();
  await expect(jisu).toHaveURL(/\/me\/avatar$/);
  await expect(jisu.getByRole("heading", { name: "내 프로필" })).toBeVisible();
  await expect(jisu.getByLabel("닉네임", { exact: true })).toBeVisible();
  await expect(jisu.getByRole("heading", { name: "프로필 사진" })).toHaveCount(0);
  // 바깥을 누르면 메뉴가 닫힌다
  await jisu.goto("/home");
  await jisu.getByRole("button", { name: "내 프로필 메뉴" }).click();
  await jisu.mouse.click(20, 400);
  await expect(jisu.getByRole("menuitem", { name: "로그아웃" })).toHaveCount(0);
});

test("영어로 바꾸면 영어 화면", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByRole("heading", { name: /Know each other/ })).toBeVisible();
  await page.getByRole("button", { name: "한국어" }).click();
  await expect(page.getByRole("heading", { name: /말 안 해도/ })).toBeVisible();
});

test("데모로 둘러보기: 샘플 사람들이 들어 있고, 데모 계정이라고 알려 준다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "데모로 둘러보기" }).click();
  await expect(page).toHaveURL(/\/home/);
  await expect(page.getByRole("link", { name: /엄마/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /아내/ }).first()).toBeVisible();
  await expect(page.getByText("엄마 칠순")).toBeVisible();
  await shot(page, "12-demo-home");
  await page.getByRole("link", { name: /아내/ }).first().click();
  await expect(page.getByRole("button", { name: /알레르기와 못 먹는 음식\s*고치기/ })).toBeVisible();
  await expect(page.getByText("새우", { exact: true })).toBeVisible();
  await page.goto("/privacy");
  await expect(page.getByText(/데모 계정이에요/)).toBeVisible();
  await expect(page.getByRole("button", { name: "시스템" })).toHaveAttribute("aria-pressed", "true");
});

test("사람들 > 고르기: 사람을 고르면 알레르기를 빼고 메뉴를 고르고 선물 힌트를 보여 주며, 각 화면에서 공유한다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "데모로 둘러보기" }).click();
  await expect(page).toHaveURL(/\/home/);
  await page.getByRole("link", { name: "사람들" }).click();
  // 직접 적기는 오른쪽 아래 떠 있는 버튼. 선택 중에는 숨는다
  await expect(page.getByRole("link", { name: "직접 적기" })).toBeVisible();
  await shot(page, "17-people-fab");
  await page.getByRole("button", { name: "선택" }).click();
  await expect(page.getByRole("link", { name: "직접 적기" })).toHaveCount(0);
  await page.getByRole("button", { name: "아내 선택" }).click();
  await page.getByRole("button", { name: "단짝 선택" }).click();
  // 고르는 중에 사람을 누르면 상세로 가고, 뒤로(화면 버튼·브라우저 뒤로가기) 오면 체크가 그대로
  await page.getByRole("link", { name: /아내/ }).click();
  await expect(page).toHaveURL(/\/people\/[0-9a-f-]+\?back=/);
  await page.getByRole("link", { name: "뒤로" }).click();
  await expect(page.getByRole("button", { name: "아내 선택" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("link", { name: /단짝/ }).click();
  await expect(page).toHaveURL(/\/people\/[0-9a-f-]+\?back=/);
  await page.goBack();
  await expect(page.getByRole("button", { name: "단짝 선택" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "아내 선택" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("link", { name: "메뉴 고르기" }).click();
  await expect(page.getByRole("heading", { name: "다 같이 먹을 메뉴" })).toBeVisible();
  await expect(page.getByText(/새우, 게, 땅콩은 빼 주세요/)).toBeVisible();
  await page.getByText("피해야 해요").click();
  await expect(page.getByText("마라탕·훠궈")).toBeVisible();
  // 공유하기는 메뉴 고르기 안에서(이름은 고를 때만)
  await expect(page.getByRole("button", { name: "공유하기" })).toBeVisible();
  await page.getByRole("button", { name: "이름도 같이" }).click();
  await expect(page.getByRole("button", { name: "이름도 같이" })).toHaveAttribute("aria-pressed", "true");
  await shot(page, "15-plan-menu");

  await page.getByRole("link", { name: "뒤로" }).click();
  await expect(page).toHaveURL(/\/people\?.*pick=1/);
  await page.getByRole("link", { name: "선물 고르기" }).click();
  await expect(page.getByText(/캠핑용 접이식 의자/)).toBeVisible();
  await expect(page.getByRole("button", { name: "공유하기" })).toBeVisible();
});

test("기기 언어가 영어면 처음부터 영어로, 직접 고른 언어가 우선", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "en-US" });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Know each other/ })).toBeVisible();
  await page.getByRole("button", { name: "한국어" }).click();
  await expect(page.getByRole("heading", { name: /말 안 해도/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: /말 안 해도/ })).toBeVisible();
  await ctx.close();
});
