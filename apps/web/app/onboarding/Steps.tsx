"use client";

import { emptySection, type AvatarConfig, type DateSpec, type Locale, type ReminderOffset, type SafetyData } from "@readme/core";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { finishOnboarding, saveAvatar, saveFood } from "@/app/actions/card";
import { AvatarBuilder } from "@/components/editors/AvatarBuilder";
import { DateSpecPicker, ReminderPicker } from "@/components/editors/DatesEditor";
import { SafetyEditor } from "@/components/editors/SafetyEditor";
import { SpicyScale } from "@/components/editors/TasteEditor";
import { useT } from "@/components/editors/shared";

export function Submit({ children, disabled, className = "w-full" }: { children: React.ReactNode; disabled?: boolean; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending || disabled} className={`btn-primary ${className}`}>
      {children}
    </button>
  );
}

/** 글자만 있는 보조 단추(이 단계는 건너뛰기): 같은 폼을 later=1로 보낸다 */
function Later({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name="later" value="1" disabled={pending} className="mt-1 flex min-h-11 w-full items-center justify-center text-[14px] font-bold text-muted">
      {children}
    </button>
  );
}

/** 온보딩 단계의 흰 시트: 그라데이션 머리 위로 살짝 겹쳐 올라온다 */
const SHEET = "relative z-10 -mt-6 flex flex-1 flex-col rounded-t-[28px] bg-paper";

/**
 * 프로필 고치기: 머리 줄(제목 · 오른쪽 끝 저장, 위에 붙어 늘 보인다) 아래에 이름 칸. 내 프로필과 사람 프로필이 같이 쓴다
 */
export function ProfileHeader({ title, name, nameLabel, save, required = true }: { title: string; name: string; nameLabel: string; save: string; required?: boolean }) {
  return (
    <>
      <div className="sticky z-30 flex items-center gap-3 bg-bg pb-3 pl-6 pr-4 pt-1.5" style={{ top: "var(--sat)" }}>
        <h1 className="min-w-0 flex-1 truncate text-[34px] font-normal leading-[1.25]">
          <span className="hl px-1">{title}</span>
        </h1>
        <Submit className="!h-11 shrink-0 !rounded-full !px-[22px] !text-[19px] !shadow-[0_3px_0_var(--color-mango-deep)]">{save}</Submit>
      </div>
      <div className="px-4">
        <label className="mb-5 flex min-h-14 items-center gap-3 rounded-2xl bg-paper px-4 shadow-[inset_0_0_0_1.5px_var(--color-ink),0_3px_0_var(--color-sky)]">
          <span className="shrink-0 text-[17px] text-muted">{nameLabel}</span>
          <input name="name" defaultValue={name} required={required} maxLength={40} className="h-[52px] min-w-0 flex-1 bg-transparent text-[24px] outline-none" />
        </label>
      </div>
    </>
  );
}

export function AvatarStep({
  locale,
  name,
  avatar,
  next,
  mode = "onboarding",
  title = "",
}: {
  locale: Locale;
  name: string;
  avatar: AvatarConfig;
  next: string;
  mode?: "onboarding" | "edit";
  /** 고칠 때 머리 줄 제목(내 프로필) */
  title?: string;
}) {
  const t = useT(locale);
  const [value, setValue] = useState(avatar);
  const [tz] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone ?? "");
  const onboarding = mode === "onboarding";
  const hidden = (
    <>
      <input type="hidden" name="avatar" value={JSON.stringify(value)} />
      <input type="hidden" name="tz" value={tz} />
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="mode" value={mode} />
    </>
  );
  // 고칠 때: 제목 오른쪽에 닉네임 칸, 오른쪽 끝에 저장(위에 붙어 늘 보인다)
  if (!onboarding)
    return (
      <form action={saveAvatar} className="page-end flex flex-col">
        {hidden}
        <ProfileHeader title={title} name={name} nameLabel={t("profile.nickname")} save={t("common.save")} />
        <div className="px-4">
          <AvatarBuilder value={value} onChange={setValue} locale={locale} />
        </div>
      </form>
    );
  return (
    <form action={saveAvatar} className={SHEET}>
      {hidden}
      <div className="px-4 pt-4">
        {/* 온보딩은 미리보기 아래에 이름 칸 */}
        <AvatarBuilder
          value={value}
          onChange={setValue}
          locale={locale}
          between={
            <label className="mt-3 flex min-h-14 items-center gap-3 rounded-[18px] bg-bg px-4 shadow-[inset_0_0_0_1.5px_var(--color-rule)]">
              <span className="shrink-0 text-[13px] font-bold text-muted">{t("onb.avatar.name")}</span>
              <input name="name" defaultValue={name} required maxLength={40} className="min-w-0 flex-1 bg-transparent text-[18px] font-bold tracking-[-0.02em] outline-none" />
            </label>
          }
        />
      </div>
      {/* 시작 버튼은 늘 화면 아래에 붙어 보인다 */}
      <div className="bottom-bar mt-auto bg-paper px-4 pt-4">
        <Submit>{t("onb.avatar.cta")}</Submit>
      </div>
    </form>
  );
}

export function FoodStep({ locale, safety, spicy, next }: { locale: Locale; safety: SafetyData | null; spicy: number | null; next: string }) {
  const t = useT(locale);
  const [value, setValue] = useState<SafetyData>(safety ?? emptySection("safety"));
  const [level, setLevel] = useState<number | null>(spicy);
  return (
    <form action={saveFood} className={SHEET}>
      <input type="hidden" name="safety" value={JSON.stringify(value)} />
      <input type="hidden" name="spicy" value={JSON.stringify(level)} />
      <input type="hidden" name="next" value={next} />
      <div className="flex flex-col gap-7 px-5 pt-6">
        <SafetyEditor value={value} onChange={setValue} locale={locale} showNote={false} />
        <SpicyScale value={level} onChange={setLevel} locale={locale} />
      </div>
      <div className="bottom-bar mt-auto bg-paper px-4 pt-4">
        <Submit>{t("common.next")}</Submit>
      </div>
    </form>
  );
}

export function BirthdayStep({ locale, birthday, offsets, next }: { locale: Locale; birthday: DateSpec | null; offsets: ReminderOffset[]; next: string }) {
  const t = useT(locale);
  // 가짜 생일을 넣지 않는다: 고르기 전에는 비워 두고, 나중에 해도 된다
  const [spec, setSpec] = useState<DateSpec | null>(birthday);
  const [when, setWhen] = useState<ReminderOffset[]>(offsets);
  return (
    <form action={finishOnboarding} className={SHEET}>
      <input type="hidden" name="birthday" value={JSON.stringify(spec)} />
      <input type="hidden" name="offsets" value={JSON.stringify(when)} />
      <input type="hidden" name="next" value={next} />
      <div className="flex flex-col gap-7 px-5 pt-6">
        <DateSpecPicker value={spec} onChange={setSpec} locale={locale} year="birth" />
        <ReminderPicker value={when} onChange={setWhen} locale={locale} />
      </div>
      <div className="bottom-bar mt-auto bg-paper px-4 pt-4">
        <Submit>{t("onb.finish")}</Submit>
        <Later>{t("onb.birthday.later")}</Later>
      </div>
    </form>
  );
}
