import { expect, test, type Browser, type BrowserContext } from "@playwright/test";
import { lunarToSolar, nextOccurrence, todayIn } from "@readme/core";
import { ADMIN_KEY, CRON_SECRET, onboard, signIn } from "./helpers";

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

/** 물어보기에서 새 사람: 찾기 칸에 이름을 적고 '○○ 새로'를 고른다 */
async function askNew(page: import("@playwright/test").Page, name: string) {
  await page.getByPlaceholder("이름이나 태그로 찾기").fill(name);
  await page.getByRole("button", { name: `${name} 새로` }).click();
}

async function makeLink(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "링크 만들기" }).click();
  const url = await page.getByTestId("invite-url").inputValue();
  expect(url).toMatch(/\/r\/[A-Za-z0-9_-]{40,}/);
  return url;
}

test("가입하고 온보딩을 마치면 홈과 내 리드미가 보인다(음력 생일)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /사랑하는 사람들의/ })).toBeVisible();
  await shot(page, "01-start");
  await signIn(page);
  await onboard(page, { name: "지수", allergy: "새우", dislike: "오이", lunar: { month: 10, day: 12 }, intro: "tour" });
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
  // 나는 적어 둔 것을 미리보기로 보여 준다(알레르기·못 먹는 것)
  const mine = page.getByRole("region", { name: "나에 대한 기록" });
  await expect(mine.getByText("새우", { exact: true })).toBeVisible();
  await expect(mine.getByText("오이")).toBeVisible();
  await shot(page, "03-me");
  // 연필을 누르면 고치기: 목록엔 적은 값 대신 고를 수 있는 것만. 미리보기·보내기 버튼은 없다
  await mine.getByRole("link", { name: "수정" }).click();
  await expect(page).toHaveURL(/\/me\/edit$/);
  await expect(page.getByRole("heading", { name: "나에 대한 기록" })).toBeVisible();
  await expect(page.getByText("새우", { exact: true })).toHaveCount(0);
  await expect(page.getByText("알레르기, 못 먹는 것, 식단, 꼭 알려 둘 말")).toBeVisible();
  await expect(page.getByRole("button", { name: /^문화생활\s*영화, 드라마, TV·예능·유튜브, 음악, 노래, 책/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^반려동물\s*이름, 종류, 품종, 좋아하는 간식/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "미리보기" })).toHaveCount(0);
  await shot(page, "03b-me-edit");
  // 고친 뒤 뒤로 가면 다시 미리보기
  await page.getByRole("link", { name: "뒤로" }).click();
  await expect(page).toHaveURL(/\/me$/);
  const res = await page.request.get("/api/export");
  const data = await res.json();
  expect(data.aboutMe.safety.allergens).toContain("shrimp");
  expect(data.aboutMe.dates.birthday).toMatchObject({ calendar: "lunar", month: 10, day: 12 });
  await remember("jisu", page.context());
});

test("물어보기(새 사람) → 앱 없이 웹에서 답하기 → 답이 내 기록에 들어간다", async ({ browser }) => {
  const page = await as(browser, "jisu");
  await page.goto("/request");
  await expect(page.getByRole("heading", { name: "물어보기" })).toBeVisible();
  await askNew(page, "아빠");
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
  await expect(dad.getByText("보낸 답은 지수님이 기억해 두고, 그 뒤로는 지수님이 언제든 바꿀 수 있어요.")).toBeVisible();
  await expect(dad.getByRole("button", { name: "보내기", exact: true })).toBeDisabled();
  await dad.getByRole("button", { name: /건강 정보를 지수님에게 보내 저장하는 데 동의해요/ }).click();
  await dad.getByRole("button", { name: "보내기", exact: true }).click();
  await expect(dad.getByRole("heading", { name: "마음이 전해졌어요" })).toBeVisible();
  // 나도 물어보기 = 앱 받기(/get: 안드로이드·PC는 Play 스토어, 아이폰은 아직 웹으로 이어서 로그인 → 물어보기)
  await expect(dad.getByRole("link", { name: "나도 물어보기" })).toHaveAttribute("href", /^\/get\?from=answer&next=%2F%3Fnext%3D%252Frequest%253Fname%253D/);
  const store = async (ua: string) => (await dad.request.get("/get?from=answer&next=%2Frequest", { headers: { "user-agent": ua }, maxRedirects: 0 })).headers().location ?? "";
  expect(await store("Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile Safari/537.36")).toMatch(/^https:\/\/play\.google\.com\/store\/apps\/details\?id=kr\.readme\.app&referrer=utm_source%3Danswer/);
  expect(await store("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148")).toMatch(/\/request$/);
  await shot(dad, "06-answer-done");

  // 같은 링크로 다시 답할 수 없다
  await dad.goto(askDadUrl);
  await expect(dad.getByText("이미 답한 링크예요.")).toBeVisible();

  // 답장이 오면 홈 맨 위에 알림. 누르면 그 사람 화면, 열면 읽은 것으로 사라진다
  await page.goto("/home");
  const reply = page.getByRole("region", { name: "새 답장" }).getByRole("link", { name: /아빠가 답장을 보냈어요/ });
  await expect(reply).toBeVisible();
  await expect(reply).toContainText(/방금|분 전/);
  await shot(page, "07a-home-reply");
  await reply.click();
  await expect(page).toHaveURL(/\/people\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("link", { name: /알레르기와 못 먹는 음식/ })).toBeVisible();
  await expect.poll(async () => (await page.request.get("/home")).text().then((h) => h.includes("답장을 보냈어요"))).toBe(false);

  // 아빠는 지수 사람들에 들어가 있고, 답한 항목에 받은 날이 붙는다
  await page.goto("/people");
  const today = todayIn("Asia/Seoul");
  const n = nextOccurrence({ calendar: "lunar", month: 11, day: 3 }, today)!;
  const solar = lunarToSolar(n.date.y, 11, 3)!;
  await expect(page.getByText(`${solar.m}.${solar.d}`).first()).toBeVisible();
  await page.getByRole("link", { name: /아빠/ }).click();
  // 굴은 '못 먹는 것'으로 답했다
  await expect(page.getByRole("listitem").filter({ has: page.getByRole("link", { name: /알레르기와 못 먹는 음식/ }) }).getByText("굴", { exact: true })).toBeVisible();
  await shot(page, "07-person-answered");
  await page.goto("/home");
  await expect(page.getByRole("region", { name: "새 답장" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /아빠/ })).toBeVisible();
  await shot(page, "08-home");
});

test("하나만 물으면 답하는 화면도 하나: 진행 막대 없이 바로 보내기", async ({ browser }) => {
  const page = await as(browser, "jisu");
  await page.goto("/request");
  await askNew(page, "이모");
  await onlyTopics(page, ["생활·여행"]);
  const url = await makeLink(page);

  const aunt = await newPage(browser);
  await aunt.goto(url);
  await expect(aunt.getByRole("heading", { name: "지수님이 1가지가 궁금하대요" })).toBeVisible();
  await expect(aunt.getByText("1/2")).toHaveCount(0);
  await expect(aunt.getByRole("button", { name: "다음", exact: true })).toHaveCount(0);
  await aunt.getByRole("button", { name: "가을", exact: true }).click();
  await aunt.getByRole("button", { name: "보내기", exact: true }).click();
  await expect(aunt.getByRole("heading", { name: "마음이 전해졌어요" })).toBeVisible();
});

test("받은 답도 내가 고친다", async ({ browser }) => {
  const page = await as(browser, "jisu");
  await page.goto("/people");
  await page.getByRole("link", { name: /아빠/ }).click();
  await page.waitForURL(/\/people\/[0-9a-f-]{36}$/);
  const personUrl = new URL(page.url()).pathname;
  // 사람 화면은 적어 둔 것만 미리 보기. 항목을 누르면 수정 화면에서 그 항목이 펼쳐진 채로 열리고, 고르면 바로 저장된다
  await expect(page.getByRole("button", { name: /^사이즈/ })).toHaveCount(0);
  await page.getByRole("link", { name: /알레르기와 못 먹는 음식/ }).click();
  await expect(page).toHaveURL(/\/edit\?open=safety$/);
  const safety = page.getByRole("button", { name: /^알레르기와 못 먹는 음식/ });
  await expect(safety).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("button", { name: "저장" })).toHaveCount(0);
  await page.getByRole("button", { name: "땅콩", exact: true }).first().click();
  await expect(page.getByText("저장했어요.", { exact: true })).toBeVisible();
  // 수정 화면에는 비어 있는 항목도 다 있다
  await expect(page.getByRole("button", { name: /^사이즈/ })).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "아빠에게 물어보기" })).toBeVisible();
  await expect(page.getByText("누구에게 물어볼까요?")).toHaveCount(0);
  // 아직 안 적힌 항목이 먼저 골라져 있다(생일·알레르기는 적혀 있다)
  await expect(page.getByRole("button", { name: "사이즈", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "생일·기념일", exact: true })).toHaveAttribute("aria-pressed", "false");

  // 물어보기 첫 화면에서 찾아 골라도 같다: 아빠를 고르면 새로가 아니라 그 사람(아직 안 적힌 항목이 먼저), 다시 고르기로 되돌린다
  await page.goto("/request");
  await page.getByPlaceholder("이름이나 태그로 찾기").fill("아");
  await expect(page.getByRole("button", { name: "아 새로" })).toBeVisible();
  await page.getByPlaceholder("이름이나 태그로 찾기").fill("아빠");
  await expect(page.getByRole("button", { name: "아빠 새로" })).toHaveCount(0);
  await page.getByRole("button", { name: /아빠/ }).first().click();
  await expect(page.locator('input[name="to"]')).toHaveCount(1);
  await expect(page.getByRole("button", { name: "사이즈", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "생일·기념일", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByLabel("같이 보낼 말")).toHaveValue("");
  await page.getByRole("button", { name: "다시 고르기" }).click();
  await expect(page.getByPlaceholder("이름이나 태그로 찾기")).toBeVisible();
  // 다시 찾아 아빠를 골라 보낸다: 답은 아빠 기록에 들어간다(아래에서 확인)
  await page.getByPlaceholder("이름이나 태그로 찾기").fill("아빠");
  await page.getByRole("button", { name: /아빠/ }).first().click();
  await onlyTopics(page, ["생일·기념일"]);
  const url = await makeLink(page);

  await page.goto(personUrl);
  await expect(page.getByText("답장을 기다리고 있어요")).toBeVisible();
  await page.goto("/people");
  await expect(page.getByRole("link", { name: /아빠.*답장을 기다리고 있어요/ })).toBeVisible();
  await page.goto("/privacy");
  await expect(page.getByText("아빠에게 물어본 것")).toBeVisible();

  const dad = await newPage(browser);
  await dad.goto(url);
  await expect(dad.getByText("지수님이 이렇게 알고 있어요")).toBeVisible();
  await expect(dad.getByText("음력 11월 3일")).toBeVisible();
  await dad.getByRole("button", { name: "맞아요" }).click();
  // 하나만 물었으니 마지막 화면 없이 같은 화면에서 바로 보낸다
  await expect(dad.getByRole("heading", { name: "거의 다 됐어요" })).toHaveCount(0);
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
  await askNew(jisu, "도윤이");
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
  await expect(doyun.getByRole("link", { name: "나도 물어보기" })).toHaveAttribute("href", /^\/get\?from=answer&next=%2Frequest%3Fname%3D/);
  await doyun.getByRole("link", { name: "기억해유 열기" }).click();
  await expect(doyun).toHaveURL(/\/me$/);
  const mine = await (await doyun.request.get("/api/export")).json();
  expect(mine.aboutMe.sizes.shoe).toBe(235);

  // 지수 쪽: 도윤의 앱 이름이 보이고, 내가 붙인 '도윤이'는 태그로
  await jisu.goto("/people");
  await jisu.getByRole("link", { name: /도윤/ }).first().click();
  await expect(jisu.getByRole("heading", { name: "도윤" })).toBeVisible();
  await expect(jisu.getByRole("button", { name: "태그 도윤이 수정" })).toBeVisible();
  await expect(jisu.getByText("235").first()).toBeVisible();
  // 태그는 이름 밑에서 바로 고친다
  await jisu.getByRole("button", { name: "태그 도윤이 수정" }).click();
  await jisu.getByRole("textbox", { name: "태그" }).fill("단짝");
  await jisu.getByRole("button", { name: "저장", exact: true }).click();
  await expect(jisu.getByRole("button", { name: "태그 단짝 수정" })).toBeVisible();
  await jisu.reload();
  await expect(jisu.getByRole("button", { name: "태그 단짝 수정" })).toBeVisible();
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
  await expect(jisu.getByRole("link", { name: /^Sizes/ })).toBeVisible();
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
  // 이름 오른쪽 '메모'를 누르면 시트에서 보고 적는다(적어도 시트는 열린 채로, 버튼에 개수)
  await jisu.getByRole("button", { name: /^메모/ }).click();
  const sheet = jisu.getByRole("dialog", { name: "나만 보는 메모" });
  await sheet.getByLabel("메모", { exact: true }).fill("목도리 줬음. 잘 하고 다님");
  await sheet.getByRole("button", { name: "메모 추가" }).click();
  await expect(sheet.getByText("목도리 줬음. 잘 하고 다님")).toBeVisible();
  await expect(jisu.getByRole("button", { name: /^메모\s*1$/ })).toBeVisible();
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
  // 아무것도 없으면 미리 보기 대신 '적기' 하나
  await expect(jisu.getByRole("link", { name: "적기" })).toBeVisible();
  const personUrl = new URL(jisu.url()).pathname;

  // 생일을 오늘부터 7일 뒤로(기본 알림 시점이 7일 전·당일)
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date()).split("-").map(Number);
  const in7 = new Date(Date.UTC(y, m - 1, d + 7));
  await jisu.getByRole("link", { name: "적기" }).click();
  // 빈 사람의 '적기'는 생일과 기념일 칸이 열린 채로 간다
  await expect(jisu).toHaveURL(/\/edit\?open=dates$/);
  await expect(jisu.getByRole("button", { name: /^생일과 기념일/ })).toHaveAttribute("aria-expanded", "true");
  await jisu.getByLabel("월").first().selectOption(String(in7.getUTCMonth() + 1));
  await jisu.getByLabel("일").first().selectOption(String(in7.getUTCDate()));
  await expect(jisu.getByText("저장했어요.", { exact: true })).toBeVisible();

  await jisu.getByRole("button", { name: /^알레르기와 못 먹는 음식/ }).click();
  await jisu.getByRole("button", { name: "땅콩", exact: true }).first().click();
  await expect(jisu.getByText("저장했어요.", { exact: true })).toBeVisible();

  await jisu.goto(personUrl);
  await expect(jisu.getByRole("link", { name: /알레르기와 못 먹는 음식/ })).toBeVisible();
  await expect(jisu.getByText("땅콩", { exact: true })).toBeVisible();
  await shot(jisu, "14-mine-person");
  await jisu.goto("/people");
  await expect(jisu.getByRole("link", { name: /할머니.*7일 남음/ })).toBeVisible();
  expect(await cron()).toBeGreaterThanOrEqual(1);

  // 다른 사람은 주소를 알아도 못 본다
  const doyun = await as(browser, "doyun");
  await doyun.goto(personUrl);
  await expect(doyun.getByText("할머니")).toHaveCount(0);

  // 지우기는 사람 화면이 아니라 프로필 고치기 맨 아래. 지우면 목록에서 사라진다
  await jisu.goto(personUrl);
  await expect(jisu.getByText("사람들에서 지우기", { exact: true })).toHaveCount(0);
  await jisu.getByRole("link", { name: "프로필 수정" }).click();
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
  expect(data.aboutMe.dates.birthday.year).toBe(1993);
});

test("좋아하는 것들: 무늬·최애를 적으면 내 리드미에 저장된다", async ({ browser }) => {
  const jisu = await as(browser, "jisu");
  await jisu.goto("/me/edit/favorites");
  await jisu.getByRole("button", { name: "스트라이프" }).click();
  await jisu.getByLabel("최애 연예인·가수").fill("아이유");
  await jisu.getByRole("button", { name: "저장" }).click();
  await expect(jisu.getByText("저장했어요.", { exact: true })).toBeVisible();
  const data = await (await jisu.request.get("/api/export")).json();
  expect(data.aboutMe.favorites.idol).toBe("아이유");
  expect(data.aboutMe.favorites.patterns).toContain("stripe");
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
  expect(data.aboutMe.dates.birthday).toMatchObject({ calendar: "solar", month: 2, day: 14 });
  // 프로필 고치기에는 얼굴·이름만(로그아웃·계정 삭제 없음), 계정 삭제는 설정 맨 아래
  await doyun.goto("/me/avatar");
  await expect(doyun.getByRole("button", { name: "로그아웃" })).toHaveCount(0);
  await expect(doyun.getByRole("button", { name: "계정 삭제" })).toHaveCount(0);
  await doyun.goto("/privacy");
  await doyun.getByRole("button", { name: "계정 삭제" }).click();
  await doyun.getByRole("button", { name: "모두 지우기" }).click();
  await expect(doyun.getByRole("heading", { name: /사랑하는 사람들의/ })).toBeVisible();

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
  await jisu.getByRole("link", { name: "프로필 수정" }).click();
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
  // 예전 주소(/me?open=…)는 고치는 화면으로 옮겨 준다
  await jisu.goto("/me?open=taste");
  await expect(jisu).toHaveURL(/\/me\/edit\?open=taste$/);
  await jisu.goto("/me/edit");
  const sizes = jisu.getByRole("button", { name: /^사이즈/ });
  await expect(sizes).toHaveAttribute("aria-expanded", "false");
  await sizes.click();
  await expect(sizes).toHaveAttribute("aria-expanded", "true");
  // 펼친 항목은 주소에 적혀 새로고침해도 펼친 채로
  await expect(jisu).toHaveURL(/\/me\/edit\?open=sizes$/);
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
  // 다시 펼쳐도(새로고침 없이) 고친 값 그대로
  await favs.click();
  await expect(jisu.getByRole("button", { name: "가을", exact: true })).toHaveAttribute("aria-pressed", "true");
  await jisu.reload();
  await expect(jisu.getByRole("button", { name: "가을", exact: true })).toHaveAttribute("aria-pressed", "true");
  // 뒤로 가면 미리보기에 고친 것이 보인다
  await jisu.getByRole("link", { name: "뒤로" }).click();
  await expect(jisu).toHaveURL(/\/me$/);
  const mine = jisu.getByRole("region", { name: "나에 대한 기록" });
  await expect(mine).toContainText("240");
  await expect(mine).toContainText("가을");
  // 미리보기 항목을 누르면 그 항목을 펼친 고치기 화면으로
  await mine.getByRole("link", { name: /^사이즈/ }).click();
  await expect(jisu).toHaveURL(/\/me\/edit\?open=sizes$/);
  await expect(jisu.getByRole("button", { name: /^사이즈/ })).toHaveAttribute("aria-expanded", "true");
});

test("사람들: 폴더(기본 4개 + 직접 만들기, 한 사람이 여러 폴더), 폴더 없는 사람만 목록에, 끌어서 폴더에 넣기, 찾기, 즐겨찾기", async ({ browser }) => {
  const jisu = await as(browser, "jisu");
  // 기본 폴더 네 개가 사람들 위에 보인다
  await jisu.goto("/people");
  for (const builtin of ["가족", "회사", "연인", "친구들"]) await expect(jisu.getByRole("link", { name: new RegExp(`^${builtin} `) })).toHaveCount(1);

  // 단짝(탈퇴한 도윤, 태그가 이름이 됨): 사람 화면 폴더 시트에서 친구들에 넣고 즐겨찾기
  await jisu.getByRole("link", { name: /단짝/ }).first().click();
  await jisu.getByRole("button", { name: "폴더에 넣기" }).click();
  const sheet = jisu.getByRole("dialog");
  await sheet.getByRole("button", { name: /친구들/ }).click();
  await sheet.getByRole("button", { name: "완료" }).click();
  await expect(sheet).toHaveCount(0);
  await expect(jisu.getByRole("link", { name: "친구들", exact: true })).toBeVisible();
  const star = jisu.getByRole("button", { name: "즐겨찾기" });
  await star.click();
  await expect(star).toHaveAttribute("aria-pressed", "true");

  // 아빠: 시트에서 새 폴더 '본가'를 만들어 바로 넣고, 가족에도 넣는다(여러 폴더)
  await jisu.goto("/people");
  await jisu.getByRole("link", { name: /아빠/ }).first().click();
  await jisu.getByRole("button", { name: "폴더에 넣기" }).click();
  await sheet.getByRole("button", { name: "새 폴더" }).click();
  await sheet.getByRole("textbox", { name: "폴더 이름" }).fill("본가");
  await sheet.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(sheet.getByRole("button", { name: /본가/ })).toHaveAttribute("aria-pressed", "true");
  await sheet.getByRole("button", { name: /가족/ }).click();
  await sheet.getByRole("button", { name: "완료" }).click();
  await expect(sheet).toHaveCount(0);
  await expect(jisu.getByRole("link", { name: "가족", exact: true })).toBeVisible();
  await expect(jisu.getByRole("link", { name: "본가", exact: true })).toBeVisible();

  // 목록에는 아직 폴더에 없는 사람만(폴더에 넣은 단짝·아빠는 빠진다)
  await jisu.goto("/people");
  await expect(jisu.getByRole("link", { name: /^본가 / })).toContainText("1명");
  const unfiled = jisu.locator('li a[href^="/people/"]:not([href*="folder"])');
  await expect(unfiled.filter({ hasText: "아빠" })).toHaveCount(0);
  await expect(unfiled.filter({ hasText: "단짝" })).toHaveCount(0);

  // 끌어서 폴더에: 폴더 없는 첫 사람을 회사 칸에 놓으면 회사에 들어가고 목록에서 빠진다(새로 고쳐도 그대로).
  // 놓기만 보려고 화면을 길게(사람과 폴더가 한 화면에)
  await jisu.setViewportSize({ width: 390, height: 1100 });
  const first = unfiled.first();
  const href = await first.getAttribute("href");
  const work = jisu.getByRole("link", { name: /^회사 / });
  const from = await first.boundingBox();
  const to = await work.boundingBox();
  await jisu.mouse.move(from!.x + 60, from!.y + from!.height / 2);
  await jisu.mouse.down();
  await jisu.mouse.move(from!.x + 70, from!.y + from!.height / 2 - 10, { steps: 3 });
  await jisu.mouse.move(to!.x + to!.width / 2, to!.y + to!.height / 2, { steps: 12 });
  await jisu.mouse.up();
  await expect(jisu).toHaveURL(/\/people$/);
  await expect(jisu.locator(`li a[href="${href}"]`)).toHaveCount(0);
  await expect(work).toContainText("1명");
  await jisu.reload();
  await expect(jisu.locator(`li a[href="${href}"]`)).toHaveCount(0);
  await expect(jisu.getByRole("link", { name: /^회사 / })).toContainText("1명");
  await shot(jisu, "18-people-folders");
  await jisu.setViewportSize({ width: 390, height: 664 });

  // 찾기: 폴더에 든 사람도 찾고(폴더 칸은 숨는다), 초성으로도 찾으며, 없으면 없다고
  const search = jisu.getByRole("searchbox", { name: "이름이나 태그로 찾기" });
  await search.fill("아빠");
  await expect(jisu.getByRole("link", { name: /^가족 / })).toHaveCount(0);
  await expect(jisu.getByRole("link", { name: /아빠/ })).toContainText("가족 · 본가");
  await search.fill("ㄷㅉ");
  await expect(jisu.getByRole("link", { name: /단짝/ })).toBeVisible();
  await search.fill("없는사람");
  await expect(jisu.getByText("찾는 사람이 없어요")).toBeVisible();
  await search.fill("");
  await expect(jisu.getByRole("link", { name: /^가족 / })).toBeVisible();

  // 폴더 안: 가족에 단짝도 넣는다
  await jisu.getByRole("link", { name: /^가족 / }).click();
  await expect(jisu.getByRole("heading", { name: "가족" })).toBeVisible();
  await expect(jisu.getByRole("link", { name: /아빠/ })).toBeVisible();
  await jisu.getByRole("link", { name: "사람 넣기" }).click();
  await jisu.getByRole("dialog").getByRole("button", { name: /단짝/ }).click();
  await jisu.getByRole("dialog").getByRole("button", { name: "완료" }).click();
  await expect(jisu.getByRole("dialog")).toHaveCount(0);
  await expect(jisu.getByRole("link", { name: /단짝/ })).toBeVisible();
  // 기본 폴더는 이름을 못 바꾸고 못 지운다
  await jisu.getByRole("link", { name: "폴더 고치기" }).click();
  await expect(jisu.getByRole("dialog").getByLabel("이름")).toBeDisabled();
  await expect(jisu.getByRole("dialog").getByRole("button", { name: "폴더 지우기" })).toHaveCount(0);
  await jisu.getByRole("dialog").getByRole("button", { name: "닫기" }).click();

  // 선택 중에는 폴더 칩으로 그 폴더 사람을 한 번에 고른다
  await jisu.goto("/people");
  await jisu.getByRole("button", { name: "선택" }).click();
  await jisu.getByRole("button", { name: "본가 모두 선택" }).click();
  await expect(jisu.getByRole("button", { name: /아빠 선택/ })).toHaveAttribute("aria-pressed", "true");
  await jisu.getByRole("button", { name: "취소" }).click();

  // 위쪽 '새 폴더'로 만들면 그 폴더에서 사람 넣기가 바로 열리고, 고치기에서 지운다(사람은 남는다)
  await jisu.getByRole("button", { name: "새 폴더" }).click();
  await jisu.getByRole("dialog").getByLabel("이름").fill("동창");
  await jisu.getByRole("dialog").getByRole("button", { name: "비행기" }).click();
  await jisu.getByRole("dialog").getByRole("button", { name: "만들기", exact: true }).click();
  await expect(jisu).toHaveURL(/\/people\/folder\/[0-9a-f-]{36}\?add=1$/);
  await expect(jisu.getByRole("dialog")).toContainText("동창");
  await jisu.getByRole("dialog").getByRole("button", { name: "닫기" }).click();
  await jisu.getByRole("link", { name: "폴더 고치기" }).click();
  jisu.once("dialog", (d) => d.accept());
  await jisu.getByRole("dialog").getByRole("button", { name: "폴더 지우기" }).click();
  await expect(jisu).toHaveURL(/\/people$/);
  await expect(jisu.getByRole("link", { name: /^동창 / })).toHaveCount(0);
});

test("챙길 날 오른쪽 위 내 얼굴: 내 프로필(닉네임·프로필 사진)과 로그아웃", async ({ browser }) => {
  const jisu = await as(browser, "jisu");
  await jisu.goto("/home");
  await jisu.getByRole("button", { name: "내 프로필 메뉴" }).click();
  await expect(jisu.getByRole("menuitem", { name: "로그아웃" })).toBeVisible();
  await jisu.getByRole("menuitem", { name: "내 프로필" }).click();
  await expect(jisu).toHaveURL(/\/me\/avatar$/);
  await expect(jisu.getByRole("heading", { name: "내 프로필" })).toBeVisible();
  await expect(jisu.getByText("닉네임", { exact: true })).toBeVisible();
  await expect(jisu.getByRole("heading", { name: "프로필 사진" })).toHaveCount(0);
  // 바깥을 누르면 메뉴가 닫힌다
  await jisu.goto("/home");
  await jisu.getByRole("button", { name: "내 프로필 메뉴" }).click();
  await jisu.mouse.click(20, 400);
  await expect(jisu.getByRole("menuitem", { name: "로그아웃" })).toHaveCount(0);
});

test("아래 탭 화면은 좌우로 밀어 옮긴다: 챙길 날 ↔ 사람들 ↔ 나 ↔ 설정, 끝에서는 그대로", async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: sessions.jisu, hasTouch: true, viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  // 화면 가운데 제목에서 손가락으로 밀기(누르고, 조금씩 옆으로 움직이고, 떼기)
  const swipe = (dir: "left" | "right") =>
    page.evaluate(async (d) => {
      const h = document.querySelector("h1") ?? document.body;
      const r = h.getBoundingClientRect();
      const y = r.top + r.height / 2;
      const [x0, x1] = d === "left" ? [300, 90] : [90, 300];
      const target = document.elementFromPoint(x0, y) ?? document.body;
      const touch = (x: number) => new Touch({ identifier: 1, target, clientX: x, clientY: y });
      const fire = (type: string, x: number, end = false) =>
        target.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: end ? [] : [touch(x)], changedTouches: [touch(x)] }));
      fire("touchstart", x0);
      for (let i = 1; i <= 8; i++) {
        await new Promise((ok) => setTimeout(ok, 16));
        fire("touchmove", x0 + ((x1 - x0) * i) / 8);
      }
      fire("touchend", x1, true);
    }, dir);
  await page.goto("/home");
  await swipe("right");
  await page.waitForTimeout(400);
  await expect(page).toHaveURL(/\/home$/);
  await swipe("left");
  await expect(page).toHaveURL(/\/people$/);
  await swipe("left");
  await expect(page).toHaveURL(/\/me$/);
  await swipe("left");
  await expect(page).toHaveURL(/\/privacy$/);
  await swipe("left");
  await page.waitForTimeout(400);
  await expect(page).toHaveURL(/\/privacy$/);
  await swipe("right");
  await expect(page).toHaveURL(/\/me$/);
  await ctx.close();
});

test("영어로 바꾸면 영어 화면", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByRole("heading", { name: /cheat sheet/ })).toBeVisible();
  await page.getByRole("button", { name: "한국어" }).click();
  await expect(page.getByRole("heading", { name: /사랑하는 사람들의/ })).toBeVisible();
});

test("데모로 둘러보기: 샘플 사람들이 들어 있고, 데모 계정이라고 알려 준다", async ({ page, browser }) => {
  // 공유창 대신 보낸 것을 잡아 둔다
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { configurable: true, value: async (d: unknown) => void ((window as unknown as { __shared: unknown }).__shared = d) });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "데모로 둘러보기" }).click();
  await expect(page).toHaveURL(/\/home/);
  await expect(page.getByRole("link", { name: /엄마/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /아내/ }).first()).toBeVisible();
  await expect(page.getByText("엄마 칠순")).toBeVisible();
  await shot(page, "12-demo-home");
  // 반려동물: 엄마 기록에 콩이(강아지 · 말티즈)와 좋아하는 간식
  await page.locator('a[href^="/people/"]:not([href*="/reminder"])').filter({ hasText: "엄마" }).first().click();
  await expect(page).toHaveURL(/\/people\/[0-9a-f-]{36}$/);
  await expect(page.getByText("콩이", { exact: true })).toBeVisible();
  await expect(page.getByText(/닭가슴살 육포/)).toBeVisible();
  await shot(page, "12b-demo-pets");
  await page.goto("/home");
  await page.getByRole("link", { name: /아내/ }).first().click();
  await expect(page.getByRole("link", { name: /알레르기와 못 먹는 음식/ })).toBeVisible();
  await expect(page.getByText("새우", { exact: true })).toBeVisible();

  // 선물 고르기 → 이런 선물은 어때요: 가격대 넷, 아내(연인)는 5만원대가 먼저 열리고, 누르면 쿠팡 파트너스 링크
  await page.getByRole("link", { name: "선물 고르기" }).click();
  const picks = page.locator("#picks");
  await expect(picks.getByRole("tab")).toHaveText(["1만원대", "3만원대", "5만원대", "10만원 이상"], { timeout: 45_000 });
  await expect(picks.getByRole("tab", { name: "5만원대" })).toHaveAttribute("aria-selected", "true");
  await expect(picks.getByRole("tabpanel").getByRole("link")).toHaveCount(5);
  // 무엇을 보고 어떻게 골랐는지 풀어 쓴 한두 문장
  await expect(picks.locator("[data-note]")).toHaveText(/\S{2,}.*요\.?$/);
  await expect(picks.locator("[data-note]")).not.toContainText("아내");
  await expect(picks.getByText(/하나하나 떠올리며/)).toHaveCount(0);
  await shot(page, "13-picks-note");
  await picks.getByRole("tab", { name: "1만원대" }).click();
  await expect(picks.getByRole("tabpanel").getByRole("link").first()).toHaveAttribute("href", /^https:\/\/link\.coupang\.com\/a\//);
  await expect(picks.getByText(/쿠팡 파트너스 활동의 일환으로/)).toBeVisible();
  // 다시 고르기: 지난번 것을 빼고 다른 선물들
  const before = await picks.getByRole("tabpanel").getByRole("link").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  await picks.getByRole("link", { name: "다시 고르기" }).click();
  await expect(page).toHaveURL(/skip=/);
  await expect(picks.getByRole("tab", { name: "1만원대" })).toBeVisible({ timeout: 45_000 });
  await picks.getByRole("tab", { name: "1만원대" }).click();
  const after = await picks.getByRole("tabpanel").getByRole("link").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  expect(after.some((h) => before.includes(h))).toBe(false);

  // 가족과 같이 준비: 고른 선물 카드 주소를 보내고, 그 카드는 로그인 없이 가격대별 선물·쿠팡 링크로 열린다
  await page.getByRole("button", { name: "가족과 같이 준비" }).click();
  const shared = (await page.evaluate(() => (window as unknown as { __shared?: { url?: string; text?: string } }).__shared)) ?? {};
  expect(shared.text).toContain("아내에게 줄 선물, 우리 같이 골라요");
  // 짧은 주소(/g/8글자)
  expect(shared.url).toMatch(/\/g\/[A-Za-z0-9]{8}\?b=1$/);
  const guest = await browser.newContext();
  const card = await guest.newPage();
  await card.goto(shared.url!);
  await expect(card.getByRole("heading", { name: "아내에게 줄 선물, 같이 골라요" })).toBeVisible();
  await expect(card.getByRole("tab", { name: "1만원대" })).toHaveAttribute("aria-selected", "true");
  await expect(card.getByRole("tabpanel").getByRole("link")).toHaveCount(5);
  await expect(card.getByRole("tabpanel").getByRole("link").first()).toHaveAttribute("href", /^https:\/\/link\.coupang\.com\/a\//);
  await guest.close();

  // 선물 완료: 고른 것 중 하나를 골라 남기면 완료로 바뀌고 무엇을 했는지 보인다
  await page.getByRole("button", { name: "선물 완료" }).click();
  const sheet = page.getByRole("dialog", { name: "어떤 선물을 했나요?" });
  const first = (await sheet.getByRole("button").filter({ hasNotText: "기록하기" }).nth(1).innerText()).trim();
  await sheet.getByRole("button", { name: first, exact: true }).click();
  await sheet.getByRole("button", { name: "기록하기" }).click();
  await expect(page.getByText(new RegExp(`^${first}[을를] 선물했어요$`))).toBeVisible();
  await expect(page.getByRole("button", { name: /선물 완료 · .* · 다시 적기/ })).toBeVisible();

  // 힌트는 접혀 있다가, 앱 아이콘 + 컨닝페이퍼 힐끗 보기를 누르면 오른쪽에서 나온다
  await expect(page.getByText("튤립", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "컨닝페이퍼 힐끗 보기" }).click();
  const peek = page.getByRole("dialog", { name: "아내를 위한 힌트" });
  await expect(peek.getByText("튤립", { exact: true })).toBeVisible();
  await peek.getByRole("button", { name: "닫기" }).click();
  await expect(peek).toHaveCount(0);
  await page.goto("/privacy");
  await expect(page.getByText(/데모 계정이에요/)).toBeVisible();
  await expect(page.getByRole("button", { name: "시스템" })).toHaveAttribute("aria-pressed", "true");
});

test("사람들 > 고르기: 사람을 고르면 알레르기를 빼고 메뉴를 고르고 선물 힌트를 보여 주며, 각 화면에서 공유한다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "데모로 둘러보기" }).click();
  await expect(page).toHaveURL(/\/home/);
  await page.getByRole("link", { name: "사람들" }).click();
  // 직접 적기는 오른쪽 위 사람+ 아이콘. 선택 중에는 숨는다
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
  await expect(page.getByRole("heading", { name: /cheat sheet/ })).toBeVisible();
  await page.getByRole("button", { name: "한국어" }).click();
  await expect(page.getByRole("heading", { name: /사랑하는 사람들의/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: /사랑하는 사람들의/ })).toBeVisible();
  await ctx.close();
});

test("검색·AI 답변: 선물 가이드는 로그인 없이 열리고 구조화 데이터·robots·sitemap·llms.txt가 있으며, 개인 화면은 검색에서 닫는다", async ({ page, request }) => {
  const hub = await request.get("/gifts");
  expect(hub.status()).toBe(200);
  expect(hub.headers()["x-robots-tag"]).toBeUndefined();
  await page.goto("/gifts");
  await expect(page.getByRole("heading", { name: "누구에게, 얼마로 줄까요?" })).toBeVisible();
  await page.getByRole("link", { name: "부모님 선물" }).first().click();
  await expect(page).toHaveURL(/\/gifts\/parents$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("부모님 선물 추천, 가격대별로 골랐어요");
  await expect(page.getByRole("heading", { name: "5만원대 부모님 선물" })).toBeVisible();
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  const types = ld.flatMap((s) => [JSON.parse(s)].flat().map((x: { "@type": string }) => x["@type"]));
  expect(types).toEqual(expect.arrayContaining(["BreadcrumbList", "ItemList", "FAQPage"]));
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/gifts\/parents$/);

  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /people");
  expect(robots).toContain("Sitemap:");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/gifts/parents");
  const llms = await request.get("/llms.txt");
  expect(llms.status()).toBe(200);
  expect(await llms.text()).toContain("# 기억해유");
  expect((await request.get("/people", { maxRedirects: 0 })).headers()["x-robots-tag"]).toBe("noindex, nofollow");
});

test("통계: 이용 기록을 받고, 관리자 키로 들어가 기간을 바꿔 본다", async ({ page, request }) => {
  const ok = await request.post("/api/e", { data: { a: "testAnon12345678", e: [{ n: "visit", p: "/gifts", s: "naver" }, { n: "page_view", p: "/gifts" }, { n: "page_time", p: "/gifts", v: 4200 }] } });
  expect(ok.status()).toBe(204);
  expect((await request.post("/api/e", { data: { e: [{ n: "drop_table" }] } })).status()).toBe(400);

  const key = ADMIN_KEY;
  test.skip(!key, "ADMIN_KEY가 없는 개발 환경");
  await page.goto("/admin");
  await page.getByPlaceholder("관리자 키").fill("wrong");
  await page.getByRole("button", { name: "들어가기" }).click();
  await expect(page.getByText("키가 맞지 않아요")).toBeVisible();
  await page.getByPlaceholder("관리자 키").fill(key!);
  await page.getByRole("button", { name: "들어가기" }).click();
  for (const name of ["요약", "추이", "유입", "가입 퍼널", "리텐션", "화면별", "기능별 사용", "기기", "선물"]) await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await page.getByRole("link", { name: "7일", exact: true }).click();
  await expect(page).toHaveURL(/range=7/);
  await expect(page.getByText(/\(7일\)/)).toBeVisible();
});
