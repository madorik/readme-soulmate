"use client";

import type { Locale, PartialCard, Section } from "@readme/core";
import { useRef, useState } from "react";
import { SectionForm } from "@/components/editors/SectionForm";
import { Icon } from "@/components/marks";

export interface MyRow {
  section: Section;
  title: string;
  /** 펼쳤을 때 제목 아래 설명 */
  sub: string;
  /** 접혀 있을 때 한 줄 요약(비면 "아직 비어 있어요") */
  line: string;
}

/**
 * 내 리드미 항목 목록. 누르면 화면을 옮기지 않고 그 항목 아래에 편집기를 펼친다(한 번에 하나).
 * 저장하면 서버가 /me를 다시 그려 요약 줄이 바로 바뀌고, 펼친 편집기는 그대로 둔다.
 */
export function MyReadmeList({ rows, card, locale, labels }: { rows: MyRow[]; card: PartialCard; locale: Locale; labels: { edit: string; close: string; empty: string } }) {
  const [open, setOpen] = useState<Section | null>(null);
  const items = useRef<Partial<Record<Section, HTMLLIElement | null>>>({});

  function toggle(section: Section) {
    const next = open === section ? null : section;
    setOpen(next);
    // 위에 펼쳐 있던 항목이 접히면 자리가 바뀌니, 새로 연 항목 머리로 맞춘다
    if (next) requestAnimationFrame(() => items.current[next]?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <ul className="card mx-4 mt-5 flex flex-col px-[18px]">
      {rows.map(({ section, title, sub, line }) => {
        const isOpen = open === section;
        return (
          <li
            key={section}
            ref={(el) => {
              items.current[section] = el;
            }}
            className="scroll-mt-2 border-t border-rule first:border-t-0"
          >
            <button type="button" aria-expanded={isOpen} aria-controls={`edit-${section}`} onClick={() => toggle(section)} className="flex min-h-[76px] w-full items-center gap-2.5 py-3 text-left">
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[16.5px] font-bold tracking-[-0.02em]">{title}</span>
                <span className={`text-[13.5px] text-muted ${isOpen ? "" : "truncate"}`}>{isOpen ? sub : line || labels.empty}</span>
              </span>
              <span className="shrink-0 text-[14px] font-bold">{isOpen ? labels.close : labels.edit}</span>
              <Icon name="chevron" size={18} className={`text-muted transition-transform duration-200 ${isOpen ? "-rotate-90" : "rotate-90"}`} />
            </button>
            {isOpen ? (
              <div id={`edit-${section}`}>
                <SectionForm section={section} initial={card[section] ?? null} locale={locale} inline />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
