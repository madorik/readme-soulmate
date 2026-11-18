import { DEFAULT_AVATAR } from "@readme/core";
import { PersonProfileForm } from "@/app/(app)/people/[id]/profile/PersonProfileForm";
import { TopBar } from "@/components/chrome";
import { RemovePersonButton } from "@/components/RemovePersonButton";
import type { PersonProfileData } from "@/lib/pages/person-profile.data";
import { makeT } from "@/lib/t";

// 사람 프로필: 그 사람의 얼굴과 부르는 말을 내가 꾸민다(내 프로필 고치기와 같은 화면)
export function PersonProfileView({ locale, person: p }: PersonProfileData) {
  const t = makeT(locale);
  return (
    <div className="page-end flex flex-1 flex-col">
      <TopBar back={`/people/${p.contactId}`} label={t("common.back")} />
      <PersonProfileForm
        contactId={p.contactId}
        title={t("person.profileTitle", { name: p.name || p.nickname })}
        name={p.nickname}
        avatar={p.avatar ?? DEFAULT_AVATAR}
        locale={locale}
        labels={{ name: p.personId ? t("person.relation") : t("person.callName"), save: t("common.save") }}
      />
      {/* 사람들에서 지우기: 사람 화면에는 두지 않고 프로필 고치기 맨 아래에. 누르면 누구를 지우는지 한 번 더 묻는다 */}
      <div className="mx-6 mt-8">
        <RemovePersonButton
          contactId={p.contactId}
          labels={{
            open: t("person.remove"),
            title: t("person.removeTitle", { name: p.name || p.nickname }),
            body: t("person.removeBody", { name: p.name || p.nickname }),
            remove: t("common.delete"),
            cancel: t("common.cancel"),
            close: t("common.close"),
          }}
        />
      </div>
      {/* 지우기가 화면 맨 아래 끝에 붙지 않게(떠 있는 버튼·아래 막대에 가리지 않게) */}
      <div className="h-16" />
    </div>
  );
}
