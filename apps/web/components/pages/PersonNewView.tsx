import { createPerson } from "@/app/actions/people";
import { TopBar } from "@/components/chrome";
import { Icon } from "@/components/marks";
import type { PersonNewData } from "@/lib/pages/person-new.data";
import { makeT } from "@/lib/t";

// 직접 적어 두기: 이름(부르는 말)만 받고 빈 카드를 만든다. 내용은 그 사람 화면에서 항목별로 적는다
export function PersonNewView({ locale, folders, error, name }: PersonNewData) {
  const t = makeT(locale);
  return (
    <form action={createPerson} className="flex flex-1 flex-col">
      <TopBar close="/people" label={t("common.close")} />
      <div className="flex flex-col gap-1.5 px-6 pt-1">
        <h1 className="headline text-[28px]">{t("people.newTitle")}</h1>
      </div>
      <label className="flex flex-col gap-2 px-6 pt-7">
        <span className="text-[15px] font-bold">{t("people.newName")}</span>
        <input
          name="name"
          required
          maxLength={40}
          autoFocus
          defaultValue={(name ?? "").slice(0, 40)}
          placeholder={t("people.newNamePlaceholder")}
          aria-invalid={error === "name" || undefined}
          className="field"
        />
        {error === "name" ? (
          <span role="alert" className="text-[13.5px] text-red">
            {t("people.newNameError")}
          </span>
        ) : null}
      </label>
      {/* 처음 넣을 폴더(드롭다운). 다른 폴더는 그 사람 화면에서 더 넣는다 */}
      <label className="flex flex-col gap-2 px-6 pt-6">
        <span className="text-[15px] font-bold">{t("folder.label")}</span>
        <span className="relative flex">
          <select name="folderId" defaultValue="" className="field appearance-none pr-10 font-bold">
            <option value="">{t("folder.none")}</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <Icon name="chevron" size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-muted" />
        </span>
      </label>
      <div className="bottom-bar mt-auto bg-bg px-6 pt-4">
        <button className="btn-primary w-full">{t("people.create")}</button>
      </div>
    </form>
  );
}
