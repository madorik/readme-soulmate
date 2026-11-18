import "server-only";
import { loadCalendar } from "./calendar";
import { loadFolder } from "./folder";
import { loadHome } from "./home";
import { loadMe, loadMeAvatar, loadMeEdit, loadMeEditSection } from "./me";
import { loadOnboardingAvatar, loadOnboardingBirthday, loadOnboardingFood, loadOnboardingIntro } from "./onboarding";
import { loadPeople } from "./people";
import { loadPerson } from "./person";
import { loadPersonEdit } from "./person-edit";
import { loadPersonEditSection } from "./person-edit-section";
import { loadPersonNew } from "./person-new";
import { loadPersonProfile } from "./person-profile";
import { loadPersonReminder } from "./person-reminder";
import { loadPlan } from "./plan";
import { loadPlanGiftAll } from "./plan-gift";
import { loadPlanMenu } from "./plan-menu";
import { loadPlanShare } from "./plan-share";
import { matchRoute, type PageInput, type RoutePattern } from "./routes";
import { loadPrivacy, loadRequest, loadVoice } from "./settings";

// 주소 → 화면 데이터 읽기. 웹 페이지는 각자 loader를 직접 부르고, 토스 미니앱은 /api/t/page?path=… 로 이 표를 거친다
const LOADERS: Partial<Record<RoutePattern, (input: PageInput) => Promise<unknown>>> = {
  "/home": loadHome,
  "/calendar": loadCalendar,
  "/plan": loadPlan,
  // 토스는 화면을 한 번에 그린다: 고른 선물까지 기다려 넣는다(웹은 Suspense로 나중에)
  "/plan/gift": loadPlanGiftAll,
  "/plan/menu": loadPlanMenu,
  "/plan/share": loadPlanShare,
  "/people": loadPeople,
  "/people/new": loadPersonNew,
  "/people/folder/:id": loadFolder,
  "/people/:id": loadPerson,
  "/people/:id/edit": loadPersonEdit,
  "/people/:id/edit/:section": loadPersonEditSection,
  "/people/:id/profile": loadPersonProfile,
  "/people/:id/reminder": loadPersonReminder,
  "/me": loadMe,
  "/me/edit": loadMeEdit,
  "/me/edit/:section": loadMeEditSection,
  "/me/avatar": loadMeAvatar,
  "/privacy": loadPrivacy,
  "/request": loadRequest,
  "/voice": loadVoice,
  "/onboarding/avatar": loadOnboardingAvatar,
  "/onboarding/food": loadOnboardingFood,
  "/onboarding/birthday": loadOnboardingBirthday,
  "/onboarding/intro": loadOnboardingIntro,
};

export type PageResult = { pattern: RoutePattern; data: unknown } | { redirect: string } | { notFound: true };

/** next/navigation의 redirect()·notFound()가 던진 것을 값으로 바꾼다(토스 미니앱은 그 주소로 화면을 옮긴다) */
export function caught(e: unknown): { redirect: string } | { notFound: true } | null {
  const digest = (e as { digest?: unknown })?.digest;
  if (typeof digest !== "string") return null;
  if (digest.startsWith("NEXT_REDIRECT")) return { redirect: digest.split(";")[2] || "/" };
  if (digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404")) return { notFound: true };
  return null;
}

export async function loadPage(path: string): Promise<PageResult> {
  const m = matchRoute(path);
  const load = m ? LOADERS[m.pattern] : undefined;
  if (!m || !load) return { notFound: true };
  try {
    return { pattern: m.pattern, data: await load(m.input) };
  } catch (e) {
    const c = caught(e);
    if (c) return c;
    throw e;
  }
}
