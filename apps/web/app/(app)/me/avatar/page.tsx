import { AvatarStep } from "@/app/onboarding/Steps";
import { TopBar } from "@/components/chrome";
import { requireSession } from "@/lib/data";
import { makeT } from "@/lib/i18n";

// 내 프로필: 얼굴과 이름(저장 버튼)만. 언어·계정 삭제는 설정 탭, 로그아웃은 홈 오른쪽 위 내 얼굴 메뉴
export default async function MeProfile() {
  const s = await requireSession();
  const { locale } = s.profile;
  const t = makeT(locale);
  return (
    <div className="page-end flex flex-1 flex-col">
      <TopBar back="/me" label={t("common.back")} />
      <h1 className="headline px-6 pt-2 text-[28px]">{t("profile.title")}</h1>
      <AvatarStep locale={locale} name={s.profile.displayName} avatar={s.profile.avatar} next="/me" mode="edit" />
    </div>
  );
}
