import { emptySection, type CardData, type Section } from "@readme/core";
import { useEffect, useState } from "react";
import { CultureEditor } from "@/components/editors/CultureEditor";
import { DatesEditor } from "@/components/editors/DatesEditor";
import { FavoritesEditor } from "@/components/editors/FavoritesEditor";
import { GiftsEditor } from "@/components/editors/GiftsEditor";
import { LifeEditor } from "@/components/editors/LifeEditor";
import { PetsEditor } from "@/components/editors/PetsEditor";
import { SafetyEditor } from "@/components/editors/SafetyEditor";
import { useT } from "@/components/editors/shared";
import { SizesEditor } from "@/components/editors/SizesEditor";
import { TasteEditor } from "@/components/editors/TasteEditor";
import { SectionIcon } from "@/components/SectionIcon";
import type { TPersonDetail } from "@/lib/toss-api";
import { api } from "../api";
import { useLoad } from "../load";
import { useNav } from "../nav";
import { BottomBar, Failed, Loading, Page } from "../ui";

// 항목 하나 고치기: 웹과 같은 편집기, 아래 저장 버튼

export function Edit({ id, section }: { id: string; section: Section }) {
  const { data, error, reload } = useLoad<TPersonDetail>(`people/${id}`);
  if (error) return <Page><Failed onRetry={reload} /></Page>;
  if (!data) return <Page><Loading /></Page>;
  return <Form id={id} section={section} initial={(data.person.card[section] as CardData[Section] | undefined) ?? null} name={data.person.name} />;
}

function Form({ id, section, initial, name }: { id: string; section: Section; initial: CardData[Section] | null; name: string }) {
  const t = useT("ko");
  const { back, bump } = useNav();
  const [value, setValue] = useState<CardData[Section]>(initial ?? emptySection(section));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [value]);
  const change = (v: CardData[Section]) => {
    setValue(v);
    setDirty(true);
  };

  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api(`people/${id}/sections/${section}`, { method: "PUT", json: { data: value } });
      bump();
      back();
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  return (
    <Page>
      <div className="flex items-center gap-3 px-6 pt-1">
        <SectionIcon section={section} size={40} />
        <div className="flex min-w-0 flex-col">
          <span className="text-[13px] font-medium text-muted">{name}</span>
          <h1 className={`headline text-[20px] ${section === "safety" ? "text-red" : ""}`}>{t(`section.${section}` as "section.safety")}</h1>
        </div>
      </div>
      <div className="px-6 pt-5">
        {section === "safety" ? <SafetyEditor value={value as CardData["safety"]} onChange={change} locale="ko" /> : null}
        {section === "taste" ? <TasteEditor value={value as CardData["taste"]} onChange={change} locale="ko" /> : null}
        {section === "sizes" ? <SizesEditor value={value as CardData["sizes"]} onChange={change} locale="ko" /> : null}
        {section === "gifts" ? <GiftsEditor value={value as CardData["gifts"]} onChange={change} locale="ko" forOther /> : null}
        {section === "dates" ? <DatesEditor value={value as CardData["dates"]} onChange={change} locale="ko" /> : null}
        {section === "favorites" ? <FavoritesEditor value={value as CardData["favorites"]} onChange={change} locale="ko" /> : null}
        {section === "culture" ? <CultureEditor value={value as CardData["culture"]} onChange={change} locale="ko" /> : null}
        {section === "life" ? <LifeEditor value={value as CardData["life"]} onChange={change} locale="ko" /> : null}
        {section === "pets" ? <PetsEditor value={value as CardData["pets"]} onChange={change} locale="ko" /> : null}
      </div>
      <div className="h-6" />
      <BottomBar>
        {failed ? (
          <p role="alert" className="pb-2 text-center text-[13.5px] text-red">
            저장하지 못했어요. 다시 눌러 주세요
          </p>
        ) : null}
        <button type="button" onClick={() => void save()} disabled={!dirty || busy} className="btn-primary w-full">
          {busy ? "저장하는 중…" : "저장"}
        </button>
      </BottomBar>
    </Page>
  );
}
