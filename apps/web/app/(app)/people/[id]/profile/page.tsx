import { DEFAULT_AVATAR } from "@readme/core";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/chrome";
import { listPeople, requireSession } from "@/lib/data";
import { makeT } from "@/lib/i18n";
import { PersonProfileForm } from "./PersonProfileForm";

// 사람 프로필: 그 사람의 얼굴과 부르는 말을 내가 꾸민다(내 프로필 고치기와 같은 화면)
export default async function PersonProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  const { locale } = s.profile;
  const t = makeT(locale);
  const p = (await listPeople(s)).find((x) => x.contactId === id);
  if (!p) notFound();
  return (
    <div className="flex flex-1 flex-col">
      <TopBar back={`/people/${p.contactId}`} label={t("common.back")} />
      <h1 className="headline px-6 pt-2 text-[28px]">{t("person.profileTitle", { name: p.name || p.nickname })}</h1>
      <PersonProfileForm
        contactId={p.contactId}
        name={p.nickname}
        avatar={p.avatar ?? DEFAULT_AVATAR}
        locale={locale}
        labels={{ name: p.personId ? t("person.relation") : t("person.callName"), save: t("common.save") }}
      />
    </div>
  );
}
