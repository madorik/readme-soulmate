import Link from "next/link";
import { createPerson } from "@/app/actions/people";
import { TopBar } from "@/components/chrome";
import { Heart, MarginLine, Squiggle, SKY_STAR, Star, Tape } from "@/components/diary";
import { AvatarField } from "@/components/editors/AvatarField";
import { Icon } from "@/components/marks";
import type { PersonNewData } from "@/lib/pages/person-new.data";
import { makeT } from "@/lib/t";

// 직접 적어 두기: 이름(부르는 말)·프로필(얼굴)·폴더만 받고 카드를 만든다. 나머지(생일 포함)는 그 사람 화면에서 항목별로 적는다
export function PersonNewView({ locale, folders, error, name, ai, xmas }: PersonNewData) {
  const t = makeT(locale);
  return (
    <form action={createPerson} className="flex flex-1 flex-col">
      {xmas ? <input type="hidden" name="xmas" value="1" /> : null}
      <TopBar
        close="/people"
        label={t("common.close")}
        right={
          ai ? (
            <Link href="/import?new=1" className="flex min-h-11 items-center gap-1 px-3 text-[19px] text-accent">
              <Icon name="pencil" size={18} strokeWidth={2} />
              {t("import.open")}
            </Link>
          ) : undefined
        }
      />
      <div className="relative px-6 pt-1.5">
        <h1 className="hl inline-block px-1 text-[34px] font-normal leading-[1.2]">{t("people.newTitle")}</h1>
        <Star size={22} rotate={14} className="right-[42px] top-0" />
      </div>
      <div className="card ruled relative mx-4 mt-[22px] flex flex-col gap-[22px] pb-6 pl-10 pr-5 pt-[26px] [background-position:0_18px]">
      <MarginLine left={26} />
      <Tape color="mango" w={100} h={24} rotate={-3} alpha={0.62} className="-top-[11px] left-1/2 -ml-[50px]" />
      <label className="flex flex-col gap-2">
        <span className="text-[20px]">{t("people.newName")}</span>
        <input
          name="name"
          required
          maxLength={40}
          autoFocus
          defaultValue={(name ?? "").slice(0, 40)}
          placeholder={t("people.newNamePlaceholder")}
          aria-invalid={error === "name" || undefined}
          className="field !text-[21px]"
        />
        {error === "name" || error === "limit" ? (
          <span role="alert" className="text-[16px] text-red">
            {t(error === "limit" ? "people.newLimit" : "people.newNameError")}
          </span>
        ) : null}
      </label>
      {/* 처음 넣을 폴더(드롭다운). 다른 폴더는 그 사람 화면에서 더 넣는다 */}
      <label className="flex flex-col gap-2">
        <span className="text-[20px]">{t("folder.label")}</span>
        <span className="relative flex">
          <select name="folderId" defaultValue="" className="field appearance-none pr-10 !text-[21px] !shadow-none !border-[1.5px]">
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
      <Heart size={24} rotate={16} className="-right-2 top-[70px]" />
      <Star size={20} rotate={-12} color={SKY_STAR} className="-left-[7px] top-[150px]" />
      <Squiggle w={54} width={2.4} className="-bottom-2 right-9" />
      </div>
      {/* 프로필: 그 사람의 얼굴(사람 화면의 프로필 고치기와 같은 만들기). 안 만져도 보이는 얼굴이 그대로 저장된다 */}
      <div className="mt-7 px-4">
        <AvatarField locale={locale} />
      </div>
      <div className="h-6" />
      <div className="bottom-bar mt-auto bg-bg px-6 pt-4">
        <button className="btn-primary w-full">{t(xmas ? "people.createAsk" : "people.create")}</button>
      </div>
    </form>
  );
}
