import { expect, test, type Browser, type BrowserContext } from "@playwright/test";
import { lunarToSolar, nextOccurrence, todayIn } from "@readme/core";
import { CRON_SECRET, onboard, signIn } from "./helpers";

// 시안 v2의 흐름을 실제로 눌러 본다: 가입·온보딩 → 내 리드미 보내기·받기 → 부탁하기·앱 없이 답하기 → 공유 끊기 → 영어
test.describe.configure({ mode: "serial" });

let shareUrl = "";
let requestUrl = "";
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

test("가입하고 온보딩을 마치면 홈과 내 리드미가 보인다(음력 생일)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /말 안 해도/ })).toBeVisible();
  await shot(page, "01-start");
  await signIn(page);
  await onboard(page, { name: "지수", allergy: "새우", dislike: "오이", lunar: { month: 10, day: 12 } });
  await expect(page).toHaveURL(/\/home/);
  await expect(page.getByRole("heading", { name: "내 사람들" })).toBeVisible();

  await shot(page, "02-home-empty");
  await page.goto("/me");
  await expect(page.getByRole("heading", { name: "지수" })).toBeVisible();
  await shot(page, "03-me");
  await expect(page.getByText("새우 알레르기").first()).toBeVisible();
  await expect(page.getByText("음력 10월 12일").first()).toBeVisible();
  await remember("jisu", page.context());
});

test("내 리드미 보내기: 링크를 만들면 한 사람만 7일 동안 열 수 있다", async ({ browser }) => {
  const page = await as(browser, "jisu");
  await page.goto("/share");
  await page.getByRole("button", { name: "배우자나 애인" }).click();
  await page.getByRole("button", { name: "링크 만들기" }).click();
  shareUrl = await page.getByTestId("invite-url").inputValue();
  await shot(page, "04-share-done");
  expect(shareUrl).toMatch(/\/i\/[A-Za-z0-9_-]{40,}/);
});

test("초대받은 사람: 가입 → 리드미 열기 → 온보딩 → 받은 리드미에 알레르기가 빨간 동그라미로", async ({ browser }) => {
  const page = await newPage(browser);
  await page.goto(shareUrl);
  await expect(page.getByRole("heading", { name: /지수님이/ })).toBeVisible();
  await expect(page.getByText("알레르기와 못 먹는 음식")).toBeVisible();
  await shot(page, "05-invite");
  await signIn(page);
  await expect(page).toHaveURL(/\/i\//);
  // 받으면서 내 사람들에 붙일 태그를 적는다
  await page.getByLabel("지수님에게 붙일 태그").fill("단짝");
  await page.getByRole("button", { name: "리드미 열기" }).click();
  await onboard(page, { name: "도윤", allergy: "땅콩", solar: { month: 2, day: 14 } });
  await expect(page).toHaveURL(/\/people\//);
  await expect(page.getByRole("heading", { name: "지수" })).toBeVisible();
  await expect(page.getByText("단짝", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "꼭 알아 두세요" })).toBeVisible();
  await expect(page.getByText("새우", { exact: true })).toBeVisible();
  await shot(page, "06-person");
  await remember("doyun", page.context());

  // 같은 링크는 다른 사람이 못 쓴다
  const stranger = await newPage(browser);
  await stranger.goto(shareUrl);
  await expect(stranger.getByText("이미 다른 사람이 연 초대예요.")).toBeVisible();
});

test("리드미를 돌려받아서 지수 홈에 도윤이 보인다", async ({ browser }) => {
  const page = await as(browser, "jisu");
  await page.goto("/home");
  await expect(page.getByRole("link", { name: /도윤/ })).toBeVisible();
});

test("리드미 부탁하기 → 앱 없이 웹에서 '맞아요'로 답하기 → 홈에 생일 D-day", async ({ browser }) => {
  const page = await as(browser, "jisu");
  await page.goto("/request");
  await page.getByPlaceholder("예: 아빠, 장인어른").fill("아빠");
  await page.getByRole("button", { name: /생일·기념일\s*아직 비어 있어요/ }).click(); // 미리 적기 펼치기
  await page.getByRole("radio", { name: "음력" }).click();
  await page.getByLabel("월").selectOption("11");
  await page.getByLabel("일").selectOption("3");
  await page.getByRole("button", { name: "링크 만들기" }).click();
  requestUrl = await page.getByTestId("invite-url").inputValue();
  expect(requestUrl).toMatch(/\/r\//);

  const dad = await newPage(browser);
  await dad.goto(requestUrl);
  await expect(dad.getByText("설치 없이 답하는 중")).toBeVisible();
  await expect(dad.getByText("음력 11월 3일")).toBeVisible();
  await shot(dad, "07-answer");
  await dad.getByRole("button", { name: "맞아요" }).click();
  await dad.getByRole("button", { name: "적을게요" }).count(); // 없을 수도 있다
  // 음식과 알레르기는 미리 적지 않았으니 바로 고른다
  await dad.getByRole("button", { name: "굴", exact: true }).first().click();
  await dad.getByRole("button", { name: /건강 정보를 저장하는 데 동의해요/ }).click();
  await dad.getByLabel("내 이름").fill("김아빠");
  await dad.getByRole("button", { name: "보내기" }).click();
  await expect(dad.getByRole("heading", { name: "리드미가 통했어요" })).toBeVisible();

  // 같은 링크로 다시 답할 수 없다
  await dad.goto(requestUrl);
  await expect(dad.getByRole("button", { name: "보내기" })).toHaveCount(0);

  await page.goto("/home");
  const today = todayIn("Asia/Seoul");
  const n = nextOccurrence({ calendar: "lunar", month: 11, day: 3 }, today)!;
  await expect(page.getByRole("link", { name: /아빠/ })).toBeVisible();
  const solar = lunarToSolar(n.date.y, 11, 3)!;
  await expect(page.getByText(`${solar.m}.${solar.d}`).first()).toBeVisible();
  await shot(page, "08-home");
  await page.getByRole("link", { name: /아빠/ }).click();
  await page.getByRole("link", { name: "선물 고르기" }).click();
  await shot(page, "09-reminder");
});

test("공유를 끊으면 받은 사람은 바로 못 본다", async ({ browser }) => {
  const page = await as(browser, "jisu");
  await page.goto("/privacy");
  await expect(page.getByText(/내 리드미를 볼 수 있는 사람 1명/)).toBeVisible();
  await shot(page, "10-privacy");
  await page.getByRole("button", { name: "공유 끄기" }).click();
  await expect(page.getByText("공유를 껐어요. 이제 볼 수 없어요")).toBeVisible();

  const doyun = await as(browser, "doyun");
  await doyun.goto("/home");
  await expect(doyun.getByRole("link", { name: /지수.*단짝/ }).first()).toBeVisible();
  await doyun.getByRole("link", { name: /지수/ }).first().click();
  // 도윤은 지수에게 '단짝' 태그를 붙여서 부르는 말로 나온다
  await expect(doyun.getByText("단짝님이 아직 보여 주지 않았어요")).toBeVisible();
  await expect(doyun.getByText("새우", { exact: true })).toHaveCount(0);

  // 되돌리면 다시 보인다
  await page.getByRole("button", { name: "공유 켜기" }).click();
  await doyun.reload();
  await expect(doyun.getByText("새우", { exact: true })).toBeVisible();
});

test("사이즈를 적으면 영어로 보는 사람에게 미국 사이즈로도 보인다", async ({ browser }) => {
  const doyun = await as(browser, "doyun");
  await doyun.goto("/me/edit/sizes");
  await doyun.getByPlaceholder("예: 235").fill("235");
  await doyun.getByPlaceholder("예: 11").fill("11");
  await doyun.getByRole("button", { name: "저장" }).click();
  await expect(doyun.getByText("저장했어요. 내가 보낸 사람들에게 바로 보여요.")).toBeVisible();

  const jisu = await as(browser, "jisu");
  await jisu.goto("/privacy");
  await jisu.getByRole("button", { name: "English" }).click();
  await jisu.goto("/people");
  await jisu.getByRole("link", { name: /도윤/ }).click();
  await expect(jisu.getByRole("heading", { name: "Sizes" })).toBeVisible();
  await expect(jisu.getByText("About US women's 6.5")).toBeVisible();
  await expect(jisu.getByText("About US 6")).toBeVisible();
  await shot(jisu, "11-person-en");
  await jisu.goto("/privacy");
  await jisu.getByRole("button", { name: "한국어" }).click();
  await expect(jisu.getByRole("heading", { name: "설정", exact: true })).toBeVisible();
});

test("나만 보는 메모: 내 쪽에만 남는다", async ({ browser }) => {
  const jisu = await as(browser, "jisu");
  await jisu.goto("/people");
  await jisu.getByRole("link", { name: /도윤/ }).click();
  await jisu.getByText("메모 추가").click();
  await jisu.getByLabel("언제").fill("작년 생일");
  await jisu.getByLabel("메모", { exact: true }).fill("목도리 줬음. 잘 하고 다님");
  await jisu.getByRole("button", { name: "저장" }).first().click();
  await expect(jisu.getByText("목도리 줬음. 잘 하고 다님")).toBeVisible();

  const doyun = await as(browser, "doyun");
  await doyun.goto("/people");
  await doyun.getByRole("link", { name: /지수/ }).first().click();
  await expect(doyun.getByText("목도리 줬음")).toHaveCount(0);
});

test("직접 적어 두기: 앱을 안 쓰는 사람도 적어 두면 나만 보고, 생일 알림도 온다", async ({ browser, request }) => {
  const cron = async () => (await (await request.get("/api/cron/reminders", { headers: { authorization: `Bearer ${CRON_SECRET}` } })).json()).created as number;
  await cron(); // 이미 잡힌 알림은 먼저 만들어 두고, 아래에서 새로 생긴 것만 센다
  const jisu = await as(browser, "jisu");
  await jisu.goto("/people");
  await jisu.getByRole("link", { name: "추가", exact: true }).click();
  await expect(jisu).toHaveURL(/\/people\/new/);
  await jisu.getByLabel("이름이나 부르는 말").fill("할머니");
  await jisu.getByRole("button", { name: "만들기" }).click();
  await expect(jisu.getByRole("heading", { name: "할머니" })).toBeVisible();
  await expect(jisu.getByText("내가 적어 둔 리드미예요. 나만 봐요")).toBeVisible();
  await expect(jisu.getByText(/아직 적은 게 없어요/)).toBeVisible();
  const personUrl = new URL(jisu.url()).pathname;

  // 생일을 오늘부터 7일 뒤로(기본 알림 시점이 7일 전·당일)
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date()).split("-").map(Number);
  const in7 = new Date(Date.UTC(y, m - 1, d + 7));
  await jisu.getByRole("link", { name: /생일과 기념일/ }).click();
  await expect(jisu).toHaveURL(/\/edit\/dates$/);
  await jisu.getByLabel("월").first().selectOption(String(in7.getUTCMonth() + 1));
  await jisu.getByLabel("일").first().selectOption(String(in7.getUTCDate()));
  await jisu.getByRole("button", { name: "저장" }).click();
  await expect(jisu.getByText("저장했어요. 나만 봐요.")).toBeVisible();

  await jisu.goto(`${personUrl}/edit/safety`);
  await jisu.getByRole("button", { name: "땅콩", exact: true }).first().click();
  await jisu.getByRole("button", { name: "저장" }).click();
  await expect(jisu.getByText("저장했어요. 나만 봐요.")).toBeVisible();

  await jisu.goto(personUrl);
  await expect(jisu.getByRole("heading", { name: "꼭 알아 두세요" })).toBeVisible();
  await shot(jisu, "14-mine-person");
  await jisu.goto("/people");
  await expect(jisu.getByRole("link", { name: /할머니.*내가 적어 둔 리드미.*7일 남음/ })).toBeVisible();
  expect(await cron()).toBeGreaterThanOrEqual(1);

  // 다른 사람은 주소를 알아도 못 본다
  const doyun = await as(browser, "doyun");
  await doyun.goto(personUrl);
  await expect(doyun.getByText("할머니")).toHaveCount(0);

  // 지우면 목록에서 사라진다
  await jisu.goto(personUrl);
  await jisu.getByText("태그", { exact: true }).click();
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
  await expect(jisu.getByText("저장했어요. 내가 보낸 사람들에게 바로 보여요.")).toBeVisible();
  await expect(jisu.goto("/me").then(() => jisu.getByText(/생일 음력 1993년 10월 12일/).first())).resolves.toBeTruthy();
  await expect(jisu.getByText(/생일 음력 1993년 10월 12일/).first()).toBeVisible();
  await jisu.goto("/me/preview");
  await expect(jisu.getByText(/만 \d+세 · 닭띠/).first()).toBeVisible();
});

test("좋아하는 것들: 무늬·최애를 적으면 받는 사람 카드(미리보기)에 보인다", async ({ browser }) => {
  const jisu = await as(browser, "jisu");
  await jisu.goto("/me/edit/favorites");
  await jisu.getByRole("button", { name: "스트라이프" }).click();
  await jisu.getByLabel("최애 연예인·가수").fill("아이유");
  await jisu.getByRole("button", { name: "저장" }).click();
  await expect(jisu.getByText("저장했어요. 내가 보낸 사람들에게 바로 보여요.")).toBeVisible();
  await jisu.goto("/me/preview");
  await expect(jisu.getByRole("heading", { name: "좋아하는 것들" })).toBeVisible();
  await expect(jisu.getByText("아이유")).toBeVisible();
  await expect(jisu.getByText("스트라이프")).toBeVisible();
});

test("앱 없이 답한 아빠가 나중에 가입하면 자기 리드미로 가져가고, 지수에게는 그대로 보인다", async ({ browser }) => {
  const dad = await newPage(browser);
  await dad.goto(requestUrl);
  await dad.getByRole("link", { name: "가입하고 내 리드미로 가져오기" }).click();
  await expect(dad).toHaveURL(/next=/);
  await signIn(dad);
  await expect(dad).toHaveURL(/\/r\/.+\/claim/);
  await dad.getByRole("button", { name: "가입하고 내 리드미로 가져오기" }).click();
  await onboard(dad, { name: "김아빠", lunar: { month: 11, day: 3 } });
  await expect(dad).toHaveURL(/\/me/);
  await expect(dad.getByText("음력 11월 3일").first()).toBeVisible();
  await expect(dad.getByText("굴").first()).toBeVisible();
  await remember("dad", dad.context());

  const jisu = await as(browser, "jisu");
  await jisu.goto("/people");
  await jisu.getByRole("link", { name: /아빠/ }).click();
  await expect(jisu.getByRole("heading", { name: "김아빠" })).toBeVisible();
  await expect(jisu.getByText("앱 없이 링크에서 답한 리드미예요")).toHaveCount(0);
  await expect(jisu.getByText("음력 11월 3일").first()).toBeVisible();
});

test("사람 화면에서 내 리드미 공유를 켜고, 보여 줄 것을 바로 고르고, 끄면 바로 못 본다", async ({ browser }) => {
  // 지수는 아빠에게 아직 보낸 적 없다: 목록에 '공유 꺼짐'
  const jisu = await as(browser, "jisu");
  await jisu.goto("/people");
  await expect(jisu.getByRole("link", { name: /아빠.*공유 꺼짐/ })).toBeVisible();
  await jisu.getByRole("link", { name: /아빠/ }).click();
  const share = jisu.getByRole("button", { name: /내 리드미 공유/ });
  await expect(share).toHaveAttribute("aria-pressed", "false");
  await expect(jisu.getByText(/켜면 .*사람들에 내가 들어가요/)).toBeVisible();
  await share.click();
  await expect(share).toHaveAttribute("aria-pressed", "true");
  await expect(jisu.getByText(/지금 볼 수 있어요/)).toBeVisible();

  // 처음 켜면 아빠 사람들에 지수가 들어가고 알레르기가 보인다
  const dad = await as(browser, "dad");
  await dad.goto("/people");
  await dad.getByRole("link", { name: /지수/ }).first().click();
  await expect(dad.getByText("새우", { exact: true })).toBeVisible();
  await shot(jisu, "14-person-share");

  // 음식과 알레르기를 빼면 바로 안 보인다
  await jisu.getByRole("button", { name: "음식과 알레르기" }).click();
  await expect(jisu.getByRole("button", { name: "음식과 알레르기" })).toHaveAttribute("aria-pressed", "false");
  await dad.reload();
  await expect(dad.getByText("새우", { exact: true })).toHaveCount(0);

  // 공유를 끄면 아무것도 못 본다. 목록에도 '공유 꺼짐'
  await share.click();
  await expect(share).toHaveAttribute("aria-pressed", "false");
  await dad.reload();
  await expect(dad.getByText("지수님이 아직 보여 주지 않았어요")).toBeVisible();
  await jisu.goto("/people");
  await expect(jisu.getByRole("link", { name: /아빠.*공유 꺼짐/ })).toBeVisible();
  await shot(jisu, "14-people-share-off");
});

test("내 정보 내려받기와 계정 삭제", async ({ browser }) => {
  const dad = await as(browser, "dad");
  const res = await dad.request.get("/api/export");
  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.myReadme.dates.birthday).toEqual({ calendar: "lunar", month: 11, day: 3, leap: false });
  await dad.goto("/privacy");
  await dad.getByRole("button", { name: "계정 삭제" }).click();
  await dad.getByRole("button", { name: "모두 지우기" }).click();
  await expect(dad.getByRole("heading", { name: /말 안 해도/ })).toBeVisible();

  const jisu = await as(browser, "jisu");
  await jisu.goto("/people");
  // 앱 계정은 사라지고, 가입 전에 앱 없이 답해 준 리드미만 남는다(답은 부탁한 사람 것)
  await expect(jisu.getByRole("link", { name: /김아빠.*앱 없이 답한 리드미/ })).toBeVisible();
  await expect(jisu.getByRole("link", { name: /김아빠.*공유 꺼짐/ })).toHaveCount(0);
});

test("생일 알림 크론: 비밀값이 맞을 때만 돈다", async ({ request }) => {
  expect((await request.get("/api/cron/reminders")).status()).toBe(401);
  const ok = await request.get("/api/cron/reminders", { headers: { authorization: `Bearer ${CRON_SECRET}` } });
  expect(ok.status()).toBe(200);
  const body = await ok.json();
  expect(body.users).toBeGreaterThan(0);
});

test("언어는 설정에서 바꾸고, 내 리드미에는 내 정보만(받는 사람 화면은 미리보기로)", async ({ browser }) => {
  const jisu = await as(browser, "jisu");
  await jisu.goto("/me");
  await expect(jisu.getByText("언어", { exact: true })).toHaveCount(0);
  await expect(jisu.getByText("받는 사람에게 이렇게 보여요")).toHaveCount(0);
  await jisu.getByRole("link", { name: "미리보기" }).click();
  await expect(jisu.getByRole("heading", { name: "받는 사람에게 이렇게 보여요" })).toBeVisible();
  await expect(jisu.getByText("새우").first()).toBeVisible();
  // 프로필에는 얼굴과 이름만
  await jisu.goto("/me");
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

test("내 리드미: 고치기를 누르면 화면을 옮기지 않고 그 항목 아래에서 고친다", async ({ browser }) => {
  const jisu = await as(browser, "jisu");
  await jisu.goto("/me");
  const sizes = jisu.getByRole("button", { name: /^사이즈/ });
  await expect(sizes).toHaveAttribute("aria-expanded", "false");
  await sizes.click();
  await expect(sizes).toHaveAttribute("aria-expanded", "true");
  await jisu.getByPlaceholder("예: 235").fill("240");
  await jisu.getByRole("button", { name: "저장" }).click();
  await expect(jisu.getByText("저장했어요. 내가 보낸 사람들에게 바로 보여요.")).toBeVisible();
  await expect(jisu).toHaveURL(/\/me$/);
  await shot(jisu, "16-me-inline");
  // 접으면 요약 줄에 바로 보인다
  await sizes.click();
  await expect(sizes).toHaveAttribute("aria-expanded", "false");
  await expect(sizes).toContainText("240");
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
  await expect(page.getByRole("heading", { name: "꼭 알아 두세요" })).toBeVisible();
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
  await page.getByRole("button", { name: "선택" }).click();
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
