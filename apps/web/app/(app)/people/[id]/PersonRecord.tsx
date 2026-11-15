"use client";

import type { Locale, PartialCard, Section } from "@readme/core";
import { useEffect, useRef, useState } from "react";
import { SectionForm } from "@/components/editors/SectionForm";
import { Icon } from "@/components/marks";
import { SectionIcon } from "@/components/SectionIcon";

export interface RecordRow {
  section: Section;
  title: string;
  /** 기억해 둔 것(서버에서 그린다). 없으면 null → 제목 줄만 */
  body: React.ReactNode | null;
}

/** 고치는 동안 저장 상태 줄은 화면(키보드) 바로 위에. 아래 버튼 줄은 그동안 숨는다 */
const STICK_BOTTOM = "calc(var(--kb, 0px) + var(--pb))";

/**
 * 그 사람에 대해 기억해 둔 것: 항목마다 적어 둔 것이 바로 보이고, 누르면 그 자리에서 고친다(바로 저장, 한 번에 하나).
 * 적어 둔 항목이 위, 빈 항목은 아래에 제목 한 줄로. 순서는 처음 그릴 때 정하고 고치는 동안에는 바꾸지 않는다(채운 칸이 위로 튀지 않게).
 * 펼친 항목은 주소(?open=)에도 적어 두어, 저장 후 다시 그려지거나 새로고침해도 펼친 채로 있다.
 */
export function PersonRecord({
  contactId,
  card,
  locale,
  rows,
  labels,
  initialOpen = null,
}: {
  contactId: string;
  card: PartialCard;
  locale: Locale;
  rows: RecordRow[];
  labels: { edit: string; close: string; write: string; done: string };
  initialOpen?: Section | null;
}) {
  const [order] = useState(() => [...rows.filter((r) => r.body != null), ...rows.filter((r) => r.body == null)].map((r) => r.section));
  const [open, setOpen] = useState<Section | null>(initialOpen);
  const items = useRef<Partial<Record<Section, HTMLLIElement | null>>>({});
  const first = useRef(true);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (open) url.searchParams.set("open", open);
    else url.searchParams.delete("open");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    if (open && !(first.current && !initialOpen)) items.current[open]?.scrollIntoView({ behavior: first.current ? "auto" : "smooth", block: "start" });
    first.current = false;
  }, [open, initialOpen]);

  return (
    <ul className="card mx-4 mt-3 flex flex-col px-[18px]" data-editing={open ? "true" : undefined}>
      {order.map((section) => {
        const row = rows.find((r) => r.section === section)!;
        const isOpen = open === section;
        const filled = row.body != null;
        return (
          <li
            key={section}
            ref={(el) => {
              items.current[section] = el;
            }}
            className="border-t border-rule first:border-t-0"
            style={{ scrollMarginTop: "var(--sat)" }}
          >
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={`edit-${section}`}
              onClick={() => setOpen(isOpen ? null : section)}
              className={`flex min-h-[64px] w-full items-center gap-3 text-left ${filled && !isOpen ? "pb-1 pt-3.5" : "py-2.5"} ${isOpen ? "sticky z-20 border-b border-rule bg-paper" : ""}`}
              style={isOpen ? { top: "var(--sat)" } : undefined}
            >
              <span className={filled || isOpen ? "" : "opacity-55"}>
                <SectionIcon section={section} size={36} />
              </span>
              <span className={`min-w-0 flex-1 text-[16px] font-bold tracking-[-0.02em] ${section === "safety" && filled ? "text-red" : ""} ${!filled && !isOpen ? "text-ink-2" : ""}`}>
                {row.title}
              </span>
              {isOpen ? (
                <span className="flex shrink-0 items-center gap-1 text-[14px] font-bold">
                  {labels.close}
                  <Icon name="chevron" size={16} className="-rotate-90 text-muted" />
                </span>
              ) : filled ? (
                <span className="flex shrink-0 items-center gap-1 text-[14px] font-bold text-muted">
                  <Icon name="pencil" size={14} strokeWidth={2} />
                  {labels.edit}
                </span>
              ) : (
                <span className="flex shrink-0 items-center gap-0.5 text-[14px] font-bold text-accent">
                  <Icon name="plus" size={15} strokeWidth={2.4} />
                  {labels.write}
                </span>
              )}
            </button>
            {isOpen ? (
              <div id={`edit-${section}`} className="pb-4 pt-3">
                <SectionForm section={section} initial={card[section] ?? null} locale={locale} contactId={contactId} inline autoSave stickTo={STICK_BOTTOM} />
                <button type="button" onClick={() => setOpen(null)} className="btn-outline mt-4 w-full">
                  {labels.done}
                </button>
              </div>
            ) : filled ? (
              // 적어 둔 것을 눌러도 고치기로(안의 링크는 그대로 열린다)
              <div
                className="cursor-pointer pb-3.5"
                onClick={(e) => {
                  if (!(e.target as HTMLElement).closest("a")) setOpen(section);
                }}
              >
                {row.body}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
