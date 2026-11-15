"use client";

import type { AvatarConfig, Locale } from "@readme/core";
import { useState } from "react";
import { savePersonProfile } from "@/app/actions/people";
import { ProfileHeader } from "@/app/onboarding/Steps";
import { AvatarBuilder } from "@/components/editors/AvatarBuilder";

/** 사람 프로필 고치기: 내 프로필처럼 머리 줄(제목 · 부르는 말 · 저장, 위에 붙어 늘 보인다) 아래 캐릭터 만들기 */
export function PersonProfileForm({
  contactId,
  title,
  name,
  avatar,
  locale,
  labels,
}: {
  contactId: string;
  title: string;
  name: string;
  avatar: AvatarConfig;
  locale: Locale;
  labels: { name: string; save: string };
}) {
  const [value, setValue] = useState(avatar);
  return (
    <form action={savePersonProfile} className="page-end flex flex-col">
      <input type="hidden" name="contactId" value={contactId} />
      <input type="hidden" name="avatar" value={JSON.stringify(value)} />
      <ProfileHeader title={title} name={name} nameLabel={labels.name} save={labels.save} required={false} />
      <div className="px-4">
        <AvatarBuilder value={value} onChange={setValue} locale={locale} />
      </div>
    </form>
  );
}
