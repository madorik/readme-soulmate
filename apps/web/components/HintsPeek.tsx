"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/marks";

// 선물 힌트 화면: 힌트는 접어 두고, 앱 아이콘(컨닝페이퍼를 힐끗 보는 눈) + '컨닝페이퍼 힐끗 보기'를 누르면
// 컨닝페이퍼가 오른쪽에서 밀려 나온다. 바깥을 누르거나 Esc·닫기로 들어간다
export function HintsPeek({ label, title, closeLabel, children }: { label: string; title: string; closeLabel: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex h-11 items-center gap-2 self-start rounded-full bg-white pl-1.5 pr-4 text-[14px] font-bold text-ink-2 shadow-[inset_0_0_0_1.5px_var(--color-edge)] active:bg-fill"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.png" alt="" width={32} height={32} className="h-8 w-8 rounded-[9px]" />
        {label}
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-[rgba(31,35,64,0.32)] motion-safe:animate-[picks-fade_200ms_ease-out]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="hints-peek"
            className="flex h-full w-[88%] max-w-[420px] flex-col rounded-l-[28px] bg-paper shadow-[-8px_0_32px_rgba(31,35,64,0.18)] motion-safe:animate-[peek-in_280ms_cubic-bezier(0.2,0.8,0.2,1)]"
            style={{ paddingTop: "max(var(--sat), 12px)", paddingBottom: "var(--pb)" }}
          >
            <div className="flex items-center gap-2.5 pb-1 pl-5 pr-2 pt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon.png" alt="" width={28} height={28} className="h-7 w-7 shrink-0 rounded-[8px]" />
              <h2 id="hints-peek" className="min-w-0 flex-1 truncate text-[17px] font-bold tracking-[-0.02em]">
                {title}
              </h2>
              <button type="button" aria-label={closeLabel} onClick={() => setOpen(false)} className="flex h-11 w-11 shrink-0 items-center justify-center text-muted">
                <Icon name="close" size={20} />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-4">{children}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
