"use client";

import type { Locale, PartialCard, Section } from "@readme/core";
import { useEffect, useRef, useState } from "react";
import { SectionForm } from "@/components/editors/SectionForm";
import { Icon } from "@/components/marks";
import { SectionIcon } from "@/components/SectionIcon";

/** 고정된 프로필 영역 바로 아래(상태바 + 프로필 높이) */
const BELOW_HEAD = "calc(var(--sat) + var(--me-head))";

export interface MyRow {
  section: Section;
  title: string;
  /** 제목 아래: 이 항목에서 무엇을 고르고 적을 수 있는지(적은 값은 보이지 않는다) */
  sub: string;
}

/**
 * 내 리드미 항목 목록. 누르면 화면을 옮기지 않고 그 항목 아래에 편집기를 펼친다(한 번에 하나).
 * 위의 프로필 영역은 고정되고, 펼친 항목은 머리(주제와 설명)가 그 바로 아래에 붙어 고치는 동안 계속 보인다. 고치면 바로 저장된다(저장 버튼 없음).
 * 펼친 항목은 주소(?open=)에도 적어 두어, 저장 후 다시 그려지거나 새로고침·뒤로가기를 해도 펼친 채로 있다.
 */
export function MyReadmeList({
  rows,
  card,
  locale,
  initialOpen = null,
  contactId,
  stickyTop = BELOW_HEAD,
}: {
  rows: MyRow[];
  card: PartialCard;
  locale: Locale;
  initialOpen?: Section | null;
  /** 있으면 그 사람 기록에 저장(사람 정보 수정 화면) */
  contactId?: string;
  /** 펼친 항목 머리가 붙을 위치(기본: 내 리드미의 고정 프로필 아래) */
  stickyTop?: string;
}) {
  const [open, setOpen] = useState<Section | null>(initialOpen);
  const items = useRef<Partial<Record<Section, HTMLLIElement | null>>>({});
  const first = useRef(true);

  // 연 항목 머리를 화면 맨 위로(위에 펼쳐 있던 항목이 접힌 뒤 자리에서) + 주소에 적기
  useEffect(() => {
    const url = new URL(window.location.href);
    if (open) url.searchParams.set("open", open);
    else url.searchParams.delete("open");
    // 첫 인자는 null이어야 Next 라우터가 바뀐 주소를 안다(저장 후 다시 그릴 때 ?open=이 지워지지 않게)
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    if (open && !(first.current && !initialOpen)) items.current[open]?.scrollIntoView({ behavior: first.current ? "auto" : "smooth", block: "start" });
    first.current = false;
  }, [open, initialOpen]);

  return (
    <ul className="card mx-4 mt-2 flex flex-col px-[18px]">
      {rows.map(({ section, title, sub }) => {
        const isOpen = open === section;
        return (
          <li
            key={section}
            ref={(el) => {
              items.current[section] = el;
            }}
            className="border-t border-rule first:border-t-0"
            style={{ scrollMarginTop: stickyTop }}
          >
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={`edit-${section}`}
              onClick={() => setOpen(isOpen ? null : section)}
              className={`flex min-h-[76px] w-full items-center gap-2.5 py-3 text-left ${isOpen ? "sticky z-20 border-b border-rule bg-white" : ""}`}
              style={isOpen ? { top: stickyTop } : undefined}
            >
              <SectionIcon section={section} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5 pl-1">
                <span className="text-[16.5px] font-bold tracking-[-0.02em]">{title}</span>
                <span className="text-[13.5px] leading-[1.45] text-muted">{sub}</span>
              </span>
              {/* 글자 없이 아이콘만: 접혀 있으면 연필, 펼치면 접기 화살표 */}
              {isOpen ? (
                <Icon name="chevron" size={18} className="shrink-0 -rotate-90 text-muted" />
              ) : (
                <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center text-muted">
                  <Icon name="pencil" size={17} strokeWidth={2} />
                </span>
              )}
            </button>
            {isOpen ? (
              <div id={`edit-${section}`} className="pt-3">
                <SectionForm section={section} initial={card[section] ?? null} locale={locale} contactId={contactId} inline autoSave />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
