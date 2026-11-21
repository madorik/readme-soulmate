"use client";

import { DEFAULT_AVATAR, type AvatarConfig, type Locale } from "@readme/core";
import { useState } from "react";
import { AvatarBuilder } from "./AvatarBuilder";

/** 폼에 얹는 프로필(얼굴) 칸: 화면에 보이는 얼굴이 avatar로 같이 간다(사람 추가하기) */
export function AvatarField({ locale }: { locale: Locale }) {
  const [value, setValue] = useState<AvatarConfig>(DEFAULT_AVATAR);
  return (
    <>
      <input type="hidden" name="avatar" value={JSON.stringify(value)} />
      <AvatarBuilder value={value} onChange={setValue} locale={locale} tape="mango" />
    </>
  );
}
