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

export function Submit({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending || disabled} className="btn-primary w-full">
      {children}
    </button>
  );
}

/** 온보딩 단계의 흰 시트: 그라데이션 머리 위로 살짝 겹쳐 올라온다 */
const SHEET = "relative z-10 -mt-6 flex flex-1 flex-col rounded-t-[28px] bg-paper";

export function AvatarStep({ locale, name, avatar, next, mode = "onboarding" }: { locale: Locale; name: string; avatar: AvatarConfig; next: string; mode?: "onboarding" | "edit" }) {
  const t = useT(locale);
  const [value, setValue] = useState(avatar);
  const [tz] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone ?? "");
  const onboarding = mode === "onboarding";
  const nameField = (
    <label className={`flex min-h-14 items-center gap-3 rounded-[18px] px-4 shadow-[inset_0_0_0_1.5px_var(--color-rule)] ${onboarding ? "mt-3 bg-bg" : "mb-3 bg-paper"}`}>
      <span className="shrink-0 text-[13px] font-bold text-muted">{onboarding ? t("onb.avatar.name") : t("profile.nickname")}</span>
      <input name="name" defaultValue={name} required maxLength={40} className="min-w-0 flex-1 bg-transparent text-[18px] font-bold tracking-[-0.02em] outline-none" />
    </label>
  );
  return (
    <form action={saveAvatar} className={onboarding ? SHEET : "flex flex-col"}>
      <input type="hidden" name="avatar" value={JSON.stringify(value)} />
      <input type="hidden" name="tz" value={tz} />
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="mode" value={mode} />
      <div className={`px-4 ${onboarding ? "pt-4" : "pt-3"}`}>
        {/* 내 프로필에서 고칠 때는 닉네임을 맨 위에, 그 아래 캐릭터 만들기. 온보딩은 미리보기 아래에 이름 칸 */}
        {onboarding ? null : nameField}
        <AvatarBuilder value={value} onChange={setValue} locale={locale} between={onboarding ? nameField : undefined} />
      </div>
      {/* 저장(시작) 버튼은 늘 화면 아래에 붙어 보인다 */}
      <div className={`bottom-bar mt-auto px-4 pt-4 ${onboarding ? "bg-paper" : "bg-bg"}`}>
        <Submit>{onboarding ? t("onb.avatar.cta") : t("common.save")}</Submit>
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
