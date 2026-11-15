import { signOut } from "@/app/actions/auth";
import { AvatarStep } from "@/app/onboarding/Steps";
import { TopBar } from "@/components/chrome";
import { DeleteAccount } from "@/components/DeleteAccount";
import { requireSession } from "@/lib/data";
import { makeT } from "@/lib/i18n";

// 내 프로필: 얼굴과 이름(저장 버튼) + 계정(내 정보 내려받기·로그아웃·계정 삭제). 언어는 설정 탭에서 바꾼다
export default async function MeProfile() {
  const s = await requireSession();
  const { locale } = s.profile;
  const t = makeT(locale);
  return (
    <div className="page-end flex flex-1 flex-col">
      <TopBar back="/me" label={t("common.back")} />
      <h1 className="headline px-6 pt-2 text-[28px]">{t("profile.title")}</h1>
      <AvatarStep locale={locale} name={s.profile.displayName} avatar={s.profile.avatar} next="/me" mode="edit" />

      <section aria-label={t("profile.account")} className="mx-6 mt-10 flex flex-col">
        <h2 className="section-title pb-2">{t("profile.account")}</h2>
        <form action={signOut} className="border-t border-rule">
          <button className="flex min-h-14 w-full items-center text-left text-[15px] font-bold">{t("privacy.signOut")}</button>
        </form>
        <div className="border-y border-rule py-1.5">
          <DeleteAccount locale={locale} />
        </div>
      </section>
    </div>
  );
}
