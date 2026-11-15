import { DEFAULT_AVATAR } from "@readme/core";
import { notFound } from "next/navigation";
import { removeContact } from "@/app/actions/people";
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
      {/* 사람들에서 지우기: 사람 화면에는 두지 않고 프로필 고치기 맨 아래에 */}
      <details className="mx-6 mt-8">
        <summary className="flex min-h-11 cursor-pointer list-none items-center text-[14px] font-bold text-muted">{t("person.remove")}</summary>
        <form action={removeContact}>
          <input type="hidden" name="contactId" value={p.contactId} />
          <button className="flex min-h-11 items-center text-[14px] font-bold text-red">{t("common.delete")}</button>
        </form>
      </details>
    </div>
  );
}
