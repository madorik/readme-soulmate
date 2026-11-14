"use client";

import { SECTIONS_BY_IMPORTANCE, type Locale, type Section } from "@readme/core";
import { useState, useTransition } from "react";
import { setShareSectionsWith, setShareWith } from "@/app/actions/share";
import { CircleOption, useT } from "@/components/editors/shared";
import { SwitchLook } from "@/components/marks";

/**
 * 사람 화면의 '내 리드미 공유': 켜고 끄기 + 보여 줄 항목. 누르는 즉시 저장한다(상대는 다음에 열 때부터 바뀐 대로 본다).
 * neverShared: 아직 한 번도 보낸 적 없는 사람(켜면 상대 사람들에 내가 들어간다)
 */
export function ShareControl({
  locale,
  personId,
  name,
  initialOn,
  initialSections,
  neverShared,
}: {
  locale: Locale;
  personId: string;
  name: string;
  initialOn: boolean;
  initialSections: Section[];
  neverShared: boolean;
}) {
  const t = useT(locale);
  const [on, setOn] = useState(initialOn);
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [never, setNever] = useState(neverShared);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  function toggle() {
    const next = !on;
    const before = { on, sections };
    setOn(next);
    setError(false);
    start(async () => {
      const r = await setShareWith(personId, next);
      if (!r.ok) {
        setOn(before.on);
        setError(true);
        return;
      }
      if (r.sections.length) setSections(r.sections);
      if (next) setNever(false);
    });
  }

  function pick(section: Section) {
    const has = sections.includes(section);
    // 하나는 남긴다(다 빼고 싶으면 공유를 끈다)
    if (has && sections.length === 1) return;
    const before = sections;
    const next = has ? sections.filter((x) => x !== section) : [...sections, section];
    setSections(next);
    setError(false);
    start(async () => {
      const r = await setShareSectionsWith(personId, next);
      if (!r.ok) {
        setSections(before);
        setError(true);
      }
    });
  }

  const sub = on ? t("person.shareOn", { name }) : never ? t("person.shareNever", { name }) : t("person.shareOff", { name });

  return (
    <section aria-label={t("person.share")} className="mx-6 mt-6 border-y border-rule">
      <button type="button" onClick={toggle} disabled={pending} aria-pressed={on} className="flex min-h-[64px] w-full items-center gap-3 py-2 text-left">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[15.5px] font-bold">{t("person.share")}</span>
          <span className="text-[12.5px] leading-[1.45] text-muted">{sub}</span>
        </span>
        <SwitchLook on={on} />
      </button>
      {on ? (
        <div className="flex flex-col gap-0.5 pb-3">
          <span className="text-[12.5px] font-bold text-muted">{t("person.shareWhat", { name })}</span>
          <div className="flex flex-wrap gap-x-3">
            {SECTIONS_BY_IMPORTANCE.map((s) => (
              <CircleOption key={s} label={t(`request.topic.${s}` as "request.topic.dates")} on={sections.includes(s)} onToggle={() => pick(s)} textClass="px-1 !text-[15px]" />
            ))}
          </div>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="pb-3 text-[12.5px] font-bold text-red">
          {t("common.error")}
        </p>
      ) : null}
    </section>
  );
}
