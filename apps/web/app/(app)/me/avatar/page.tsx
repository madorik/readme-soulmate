import { AvatarStep } from "@/app/onboarding/Steps";
import { TopBar } from "@/components/chrome";
import { LanguageSetting } from "@/components/LanguageSetting";
import { requireSession } from "@/lib/data";
import { makeT } from "@/lib/i18n";

// 내 프로필: 얼굴과 이름(저장 버튼) + 언어(누르면 바로 바뀐다)
export default async function MeProfile() {
  const s = await requireSession();
  const t = makeT(s.profile.locale);
  return (
    <div className="flex flex-1 flex-col pb-8">
      <TopBar back="/me" label={t("common.back")} />
      <h1 className="headline px-6 pt-2 text-[28px]">{t("profile.title")}</h1>
      <AvatarStep locale={s.profile.locale} name={s.profile.displayName} avatar={s.profile.avatar} next="/me" mode="edit" />
      <div className="mx-6 mt-9 border-y border-rule">
        <LanguageSetting choice={s.profile.localeChoice} back="/me/avatar" t={t} />
      </div>
    </div>
  );
}
