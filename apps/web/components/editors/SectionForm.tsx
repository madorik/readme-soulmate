"use client";

import { emptySection, type CardData, type Locale, type Section } from "@readme/core";
import { useActionState, useState } from "react";
import { saveSection, type SaveState } from "@/app/actions/card";
import { savePersonSection } from "@/app/actions/people";
import { DatesEditor } from "@/components/editors/DatesEditor";
import { FavoritesEditor } from "@/components/editors/FavoritesEditor";
import { GiftsEditor } from "@/components/editors/GiftsEditor";
import { SafetyEditor } from "@/components/editors/SafetyEditor";
import { SizesEditor } from "@/components/editors/SizesEditor";
import { TasteEditor } from "@/components/editors/TasteEditor";
import { useT } from "@/components/editors/shared";

/** 탭 막대(높이 57px + 아래 안전 영역) 바로 위 */
// 떠 있는 탭 막대(위 여백 12 + 막대 66) 바로 위
const ABOVE_TAB_BAR = "calc(78px + max(var(--sab), 14px))";

/**
 * 리드미 항목 하나 고치기. contactId가 있으면 내가 직접 적어 둔 그 사람의 카드에, 없으면 내 리드미에 저장한다.
 * inline: 목록 안에서 펼쳐 고칠 때(바깥 여백은 목록이 주고, 저장 막대는 탭 막대 위에 붙는다)
 */
export function SectionForm<S extends Section>({ section, initial, locale, contactId, inline = false }: { section: S; initial: CardData[S] | null; locale: Locale; contactId?: string; inline?: boolean }) {
  const t = useT(locale);
  const [value, setValue] = useState<CardData[Section]>(initial ?? emptySection(section));
  const [state, action, pending] = useActionState<SaveState, FormData>(contactId ? savePersonSection : saveSection, { saved: false, error: false });
  const [dirty, setDirty] = useState(false);
  const change = (v: CardData[Section]) => {
    setValue(v);
    setDirty(true);
  };

  return (
    <form
      action={(fd) => {
        setDirty(false);
        return action(fd);
      }}
      className={inline ? "flex flex-col" : "flex flex-1 flex-col"}
    >
      <input type="hidden" name="section" value={section} />
      {contactId ? <input type="hidden" name="contactId" value={contactId} /> : null}
      <input type="hidden" name="data" value={JSON.stringify(value)} />
      <div className={inline ? "pt-1" : "px-6 pt-5"}>
        {section === "safety" ? <SafetyEditor value={value as CardData["safety"]} onChange={change} locale={locale} /> : null}
        {section === "taste" ? <TasteEditor value={value as CardData["taste"]} onChange={change} locale={locale} /> : null}
        {section === "sizes" ? <SizesEditor value={value as CardData["sizes"]} onChange={change} locale={locale} /> : null}
        {section === "gifts" ? <GiftsEditor value={value as CardData["gifts"]} onChange={change} locale={locale} /> : null}
        {section === "dates" ? <DatesEditor value={value as CardData["dates"]} onChange={change} locale={locale} /> : null}
        {section === "favorites" ? <FavoritesEditor value={value as CardData["favorites"]} onChange={change} locale={locale} /> : null}
      </div>
      <div
        className={inline ? "sticky z-10 flex flex-col gap-2 bg-white pb-3 pt-4" : "sticky bottom-0 mt-auto flex flex-col gap-2 bg-bg px-5 pt-4"}
        style={inline ? { bottom: ABOVE_TAB_BAR } : { paddingBottom: "max(var(--sab), 16px)" }}
      >
        {state.saved && !dirty ? (
          <p role="status" className="text-[13.5px] text-ok">
            {contactId ? t("person.mineSaved") : t("me.saved")}
          </p>
        ) : null}
        {state.error ? (
          <p role="alert" className="text-[13.5px] text-red">
            {t("common.error")}
          </p>
        ) : null}
        <button disabled={pending} className="btn-primary">
          {t("common.save")}
        </button>
      </div>
    </form>
  );
}
