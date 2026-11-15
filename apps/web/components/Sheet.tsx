"use client";

import { useEffect } from "react";
import { Icon } from "./marks";

/**
 * 아래에서 올라오는 시트(메모 시트와 같은 모양). 바깥을 누르거나 Esc면 닫힌다.
 * 아래 버튼 줄(footer)은 휴대폰 아래 막대 위로 띄운다(--pb), 키보드가 뜨면 그 위로(--kb)
 */
export function Sheet({
  id,
  title,
  icon,
  closeLabel,
  onClose,
  children,
  footer,
}: {
  id: string;
  title: string;
  icon?: React.ReactNode;
  closeLabel: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-[rgba(31,35,64,0.32)]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby={id} className="mx-auto flex max-h-[90dvh] w-full max-w-[480px] flex-col rounded-t-[28px] bg-paper" style={{ marginBottom: "var(--kb, 0px)" }}>
        <div className="flex items-center gap-2.5 pb-1 pl-6 pr-2 pt-3">
          {icon}
          <h2 id={id} className="min-w-0 flex-1 truncate text-[17px] font-bold tracking-[-0.02em]">
            {title}
          </h2>
          <button type="button" aria-label={closeLabel} onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center text-muted">
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer ? (
          <div className="flex flex-col gap-1 px-6 pt-3" style={{ paddingBottom: "max(var(--pb), 16px)" }}>
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
