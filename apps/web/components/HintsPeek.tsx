"use client";

import { useState } from "react";
import { Icon } from "@/components/marks";
import { useDialog } from "@/components/Sheet";
import { APP_ICON } from "@/lib/shell";

// 선물 힌트 화면: 힌트는 접어 두고, 앱 아이콘(컨닝페이퍼를 힐끗 보는 눈) + '컨닝페이퍼'를 누르면
// 컨닝페이퍼가 오른쪽에서 밀려 나온다. 바깥을 누르거나 Esc·닫기로 들어간다.
// 포커스는 시트와 같이 관리한다(열면 안으로, Tab은 안에서만, 뒤 화면은 inert, 닫으면 단추로 돌아온다)
export function HintsPeek({ label, title, closeLabel, children }: { label: string; title: string; closeLabel: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex h-11 items-center gap-2 self-start rounded-full bg-white pl-1.5 pr-4 text-[17px] text-ink-2 shadow-[inset_0_0_0_1.5px_var(--color-edge)] active:bg-fill"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={APP_ICON} alt="" width={32} height={32} className="h-8 w-8 rounded-[9px]" />
        {label}
      </button>
      {open ? (
        <PeekPanel title={title} closeLabel={closeLabel} onClose={() => setOpen(false)}>
          {children}
        </PeekPanel>
      ) : null}
    </>
  );
}

function PeekPanel({ title, closeLabel, onClose, children }: { title: string; closeLabel: string; onClose: () => void; children: React.ReactNode }) {
  const dialog = useDialog(onClose);
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[rgba(31,35,64,0.32)] motion-safe:animate-[picks-fade_200ms_ease-out]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hints-peek"
        tabIndex={-1}
        className="flex h-full w-[88%] max-w-[420px] flex-col rounded-l-[28px] bg-paper shadow-[-8px_0_32px_rgba(31,35,64,0.18)] outline-none motion-safe:animate-[peek-in_280ms_cubic-bezier(0.2,0.8,0.2,1)]"
        style={{ paddingTop: "max(var(--sat), 12px)" }}
      >
        <div className="flex items-center gap-2.5 pb-1 pl-5 pr-2 pt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={APP_ICON} alt="" width={28} height={28} className="h-7 w-7 shrink-0 rounded-[8px]" />
          <h2 id="hints-peek" className="min-w-0 flex-1 truncate text-[21px]">
            {title}
          </h2>
          <button type="button" aria-label={closeLabel} onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center text-muted">
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="page-end flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5">{children}</div>
      </div>
    </div>
  );
}
