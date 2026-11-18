import type { ComponentType } from "react";
import { CalendarView } from "@/components/pages/CalendarView";
import { FolderView } from "@/components/pages/FolderView";
import { HomeView } from "@/components/pages/HomeView";
import { MeAvatarView } from "@/components/pages/MeAvatarView";
import { MeEditSectionView } from "@/components/pages/MeEditSectionView";
import { MeEditView } from "@/components/pages/MeEditView";
import { MeView } from "@/components/pages/MeView";
import { OnboardingAvatarView, OnboardingBirthdayView, OnboardingFoodView, OnboardingIntroView } from "@/components/pages/OnboardingViews";
import { PeopleView } from "@/components/pages/PeopleView";
import { PersonEditSectionView } from "@/components/pages/PersonEditSectionView";
import { PersonEditView } from "@/components/pages/PersonEditView";
import { PersonNewView } from "@/components/pages/PersonNewView";
import { PersonProfileView } from "@/components/pages/PersonProfileView";
import { PersonReminderView } from "@/components/pages/PersonReminderView";
import { PersonView } from "@/components/pages/PersonView";
import { PlanMenuView } from "@/components/pages/PlanMenuView";
import { PrivacyView } from "@/components/pages/PrivacyView";
import { RequestView } from "@/components/pages/RequestView";
import { VoiceView } from "@/components/pages/VoiceView";
import type { RoutePattern } from "@/lib/pages/routes";
import { PlanGiftToss } from "./screens/PlanGiftToss";

// 주소 패턴 → 앱 화면(apps/web/components/pages). 데이터는 서버가 같은 주소로 읽어 준다(/api/t/page)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const VIEWS: Partial<Record<RoutePattern, ComponentType<any>>> = {
  "/home": HomeView,
  "/calendar": CalendarView,
  "/plan/gift": PlanGiftToss,
  "/plan/menu": PlanMenuView,
  "/people": PeopleView,
  "/people/new": PersonNewView,
  "/people/folder/:id": FolderView,
  "/people/:id": PersonView,
  "/people/:id/edit": PersonEditView,
  "/people/:id/edit/:section": PersonEditSectionView,
  "/people/:id/profile": PersonProfileView,
  "/people/:id/reminder": PersonReminderView,
  "/me": MeView,
  "/me/edit": MeEditView,
  "/me/edit/:section": MeEditSectionView,
  "/me/avatar": MeAvatarView,
  "/privacy": PrivacyView,
  "/request": RequestView,
  "/voice": VoiceView,
  "/onboarding/avatar": OnboardingAvatarView,
  "/onboarding/food": OnboardingFoodView,
  "/onboarding/birthday": OnboardingBirthdayView,
  "/onboarding/intro": OnboardingIntroView,
};

/** 온보딩 화면은 앱처럼 위쪽까지 하늘색 틀로 */
export const ONBOARDING = new Set<RoutePattern>(["/onboarding/avatar", "/onboarding/food", "/onboarding/birthday", "/onboarding/intro"]);
