"use client";

import { emptySection, type AvatarConfig, type DateSpec, type Locale, type ReminderOffset, type SafetyData } from "@readme/core";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { finishOnboarding, saveAvatar, saveFood } from "@/app/actions/card";
import { Avatar } from "@/components/Avatar";
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

export function AvatarStep({ locale, name, avatar, next, mode = "onboarding" }: { locale: Locale; name: string; avatar: AvatarConfig; next: string; mode?: "onboarding" | "edit" }) {
  const t = useT(locale);
  const [value, setValue] = useState(avatar);
  const [tz] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone ?? "");
  return (
    <form action={saveAvatar} className="flex flex-1 flex-col">
      <input type="hidden" name="avatar" value={JSON.stringify(value)} />
      <input type="hidden" name="tz" value={tz} />
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="mode" value={mode} />
      <div className="flex flex-col items-center gap-3 px-6 pt-5">
        <Avatar config={value} size={132} label={t("avatar.of", { name: name || "me" })} />
        <label className="flex flex-col items-center gap-0.5">
          <span className="text-[12px] font-bold text-muted">{t("onb.avatar.name")}</span>
          <input name="name" defaultValue={name} required maxLength={40} className="h-10 w-[180px] border-b-2 border-ink bg-transparent text-center text-[21px] font-bold tracking-[-0.03em] outline-none" />
        </label>
      </div>
      <div className="px-6 pt-5">
        <AvatarBuilder value={value} onChange={setValue} locale={locale} />
      </div>
      <div className={`${mode === "edit" ? "" : "mt-auto"} px-6 pt-6`}>
        <Submit>{mode === "edit" ? t("common.save") : t("onb.avatar.cta")}</Submit>
      </div>
    </form>
  );
}

export function FoodStep({ locale, safety, spicy, next }: { locale: Locale; safety: SafetyData | null; spicy: number | null; next: string }) {
  const t = useT(locale);
  const [value, setValue] = useState<SafetyData>(safety ?? emptySection("safety"));
  const [level, setLevel] = useState<number | null>(spicy);
  return (
    <form action={saveFood} className="flex flex-1 flex-col">
      <input type="hidden" name="safety" value={JSON.stringify(value)} />
      <input type="hidden" name="spicy" value={JSON.stringify(level)} />
      <input type="hidden" name="next" value={next} />
      <div className="flex flex-col gap-6 px-6 pt-5">
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
    <form action={finishOnboarding} className="flex flex-1 flex-col">
      <input type="hidden" name="birthday" value={JSON.stringify(spec)} />
      <input type="hidden" name="offsets" value={JSON.stringify(when)} />
      <input type="hidden" name="next" value={next} />
      <div className="flex flex-col gap-7 px-6 pt-5">
        <DateSpecPicker value={spec} onChange={setSpec} locale={locale} year="birth" />
        <ReminderPicker value={when} onChange={setWhen} locale={locale} />
      </div>
      <div className="mt-auto px-6 pt-8">
        <Submit>{t("onb.finish")}</Submit>
      </div>
    </form>
  );
}
