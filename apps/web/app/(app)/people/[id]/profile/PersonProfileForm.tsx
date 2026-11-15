"use client";

import type { AvatarConfig, Locale } from "@readme/core";
import { useState } from "react";
import { savePersonProfile } from "@/app/actions/people";
import { Submit } from "@/app/onboarding/Steps";
import { AvatarBuilder } from "@/components/editors/AvatarBuilder";

/** 사람 프로필 고치기: 내 프로필처럼 부르는 말을 맨 위에, 그 아래 캐릭터 만들기, 아래에 저장 */
export function PersonProfileForm({ contactId, name, avatar, locale, labels }: { contactId: string; name: string; avatar: AvatarConfig; locale: Locale; labels: { name: string; save: string } }) {
  const [value, setValue] = useState(avatar);
  return (
    <form action={savePersonProfile} className="flex flex-1 flex-col">
      <input type="hidden" name="contactId" value={contactId} />
      <input type="hidden" name="avatar" value={JSON.stringify(value)} />
      <div className="px-4 pt-3">
        <label className="mb-3 flex min-h-14 items-center gap-3 rounded-[18px] bg-paper px-4 shadow-[inset_0_0_0_1.5px_var(--color-rule)]">
          <span className="shrink-0 text-[13px] font-bold text-muted">{labels.name}</span>
          <input name="name" defaultValue={name} maxLength={40} className="min-w-0 flex-1 bg-transparent text-[18px] font-bold tracking-[-0.02em] outline-none" />
        </label>
        <AvatarBuilder value={value} onChange={setValue} locale={locale} />
      </div>
      <div className="bottom-bar mt-auto bg-bg px-4 pt-4">
        <Submit>{labels.save}</Submit>
      </div>
    </form>
  );
}
