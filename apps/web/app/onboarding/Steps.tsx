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
import { Icon } from "@/components/marks";

export function Submit({ children, disabled, className = "w-full" }: { children: React.ReactNode; disabled?: boolean; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending || disabled} className={`btn-primary ${className}`}>
      {children}
    </button>
  );
}

/** 온보딩 단계의 흰 시트: 그라데이션 머리 위로 살짝 겹쳐 올라온다 */
const SHEET = "relative z-10 -mt-6 flex flex-1 flex-col rounded-t-[28px] bg-paper";

/**
 * 프로필 고치기 머리 줄(위에 붙어 늘 보인다): 제목 · 이름 칸 · 저장. 내 프로필과 사람 프로필이 같이 쓴다
 */
export function ProfileHeader({ title, name, nameLabel, save, required = true }: { title: string; name: string; nameLabel: string; save: string; required?: boolean }) {
  return (
    <div className="sticky z-30 flex items-center gap-2 bg-bg px-4 pb-3 pt-1" style={{ top: "var(--sat)" }}>
      <h1 className="headline max-w-[45%] shrink-0 truncate text-[24px]">{title}</h1>
      <label className="flex h-11 min-w-0 flex-1 items-center gap-1.5 rounded-full bg-paper pl-3.5 pr-3 shadow-[inset_0_0_0_1.5px_var(--color-rule)]">
        <input
          name="name"
          defaultValue={name}
          required={required}
          maxLength={40}
          placeholder={nameLabel}
          aria-label={nameLabel}
          className="min-w-0 flex-1 bg-transparent text-[16px] font-bold tracking-[-0.02em] outline-none placeholder:font-medium placeholder:text-muted"
        />
        <Icon name="pencil" size={14} strokeWidth={2} className="shrink-0 text-muted" />
      </label>
      <Submit className="!h-11 shrink-0 !rounded-full px-[18px] !text-[15px]">{save}</Submit>
    </div>
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
      <div className="mt-auto px-6 pt-8">
        <Submit>{t("common.next")}</Submit>
      </div>
    </form>
  );
}

export function BirthdayStep({ locale, birthday, offsets, next }: { locale: Locale; birthday: DateSpec | null; offsets: ReminderOffset[]; next: string }) {
  const t = useT(locale);
  const [spec, setSpec] = useState<DateSpec | null>(birthday ?? { calendar: "solar", month: 1, day: 1 });
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
      <div className="mt-auto px-6 pt-8">
        <Submit>{t("onb.finish")}</Submit>
      </div>
    </form>
  );
}
