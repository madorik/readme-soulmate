import { expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
    .split("\n")
    .map((l) => /^([A-Z_]+)=(.*)$/.exec(l.trim()))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => [m[1]!, m[2]!]),
);

export const CRON_SECRET = env.CRON_SECRET!;
export const ADMIN_KEY = env.ADMIN_KEY;

/** 데모 로그인(샘플 없이 빈 계정). 지금 화면에 로그인 버튼이 있어야 한다. ?demo=empty는 개발 서버에서만 먹는다 */
export async function signIn(page: Page) {
  const url = new URL(page.url());
  url.searchParams.set("demo", "empty");
  await page.goto(url.toString());
  await page.getByRole("button", { name: "데모로 둘러보기" }).click();
  await page.waitForURL((u) => !u.searchParams.has("demo"));
}

/** 온보딩 세 단계와 이어지는 체험(기본은 건너뛰기, intro: "stay"면 체험 첫 화면에서 멈춘다) */
export async function onboard(page: Page, opts: { name: string; allergy?: string; dislike?: string; lunar?: { month: number; day: number }; solar?: { month: number; day: number }; intro?: "skip" | "stay" }) {
  await expect(page).toHaveURL(/\/onboarding\/avatar/);
  await page.getByLabel("부를 이름").fill(opts.name);
  await page.getByRole("button", { name: "단발" }).click();
  await page.getByRole("button", { name: "이 얼굴로 할게요" }).click();

  await expect(page).toHaveURL(/\/onboarding\/food/);
  if (opts.allergy) await page.getByRole("button", { name: opts.allergy, exact: true }).first().click();
  if (opts.dislike) await page.getByRole("button", { name: opts.dislike, exact: true }).first().click();
  await page.getByRole("button", { name: "다음" }).click();

  await expect(page).toHaveURL(/\/onboarding\/birthday/);
  const date = opts.lunar ?? opts.solar ?? { month: 1, day: 1 };
  if (opts.lunar) await page.getByRole("radio", { name: "음력" }).click();
  await page.getByLabel("월").selectOption(String(date.month));
  await page.getByLabel("일").selectOption(String(date.day));
  if (opts.lunar) await expect(page.getByText(/올해는 양력/)).toBeVisible();
  if (process.env.SHOTS && opts.lunar) await page.screenshot({ path: `${process.env.SHOTS}/00-birthday.png`, fullPage: true });
  await page.getByRole("button", { name: "이제 시작해요" }).click();

  // 온보딩을 마치면 직접 해 보는 체험이 시작된다(말로·글로 적기 → 물어보기 → 홈). 기본은 안내 화면만 확인하고 건너뛰고, "stay"면 그 화면에서 멈춘다
  await expect(page).toHaveURL(/\/voice\?tour=1/);
  await expect(page.getByText("1 / 2")).toBeVisible();
  await expect(page.getByText("“엄마는 장미꽃을 좋아해”")).toBeVisible();
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/00-tour-voice.png` });
  if (opts.intro === "stay") return;
  await page.getByRole("button", { name: "건너뛰기" }).click();
  await expect(page).toHaveURL(/\/home$/);
}
