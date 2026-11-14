import { createPerson } from "@/app/actions/people";
import { TopBar } from "@/components/chrome";
import { requireSession } from "@/lib/data";
import { makeT } from "@/lib/i18n";

// 직접 적어 두기: 이름(부르는 말)만 받고 빈 카드를 만든다. 내용은 그 사람 화면에서 항목별로 적는다
export default async function NewPerson({ searchParams }: { searchParams: Promise<{ error?: string; name?: string }> }) {
  const sp = await searchParams;
  const s = await requireSession();
  const t = makeT(s.profile.locale);
  return (
    <form action={createPerson} className="flex flex-1 flex-col">
      <TopBar close="/people" label={t("common.close")} />
      <div className="flex flex-col gap-1.5 px-6 pt-1">
        <h1 className="headline text-[28px]">{t("people.newTitle")}</h1>
        <p className="text-[14px] leading-[1.55] text-muted">{t("people.newSub")}</p>
      </div>
      <label className="flex flex-col gap-2 px-6 pt-7">
        <span className="text-[15px] font-bold">{t("people.newName")}</span>
        <input
          name="name"
          required
          maxLength={40}
          autoFocus
          defaultValue={(sp.name ?? "").slice(0, 40)}
          placeholder={t("people.newNamePlaceholder")}
          aria-invalid={sp.error === "name" || undefined}
          className="field"
        />
        {sp.error === "name" ? (
          <span role="alert" className="text-[13.5px] text-red">
            {t("people.newNameError")}
          </span>
        ) : null}
      </label>
      <div className="sticky bottom-0 mt-auto bg-white px-6 pt-4" style={{ paddingBottom: "max(var(--sab), 16px)" }}>
        <button className="btn-primary w-full">{t("people.create")}</button>
      </div>
    </form>
  );
}
