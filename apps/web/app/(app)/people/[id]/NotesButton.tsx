"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { addNote, deleteNote } from "@/app/actions/people";
import { Icon } from "@/components/marks";

export interface NoteItem {
  id: string;
  body: string;
  /** 적은 때(직접 단 이름이 있으면 그것) */
  when: string;
}

function AddButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="btn-primary !h-12 shrink-0 !rounded-[14px] px-4 !text-[15px]">
      {label}
    </button>
  );
}

/**
 * 사람 화면 이름 오른쪽 '메모' 버튼: 누르면 아래에서 시트가 올라와 나만 보는 메모를 보고 적는다.
 * 적거나 지우면 서버가 사람 화면을 다시 그려 목록이 바로 바뀐다(시트는 열린 채로)
 */
export function NotesButton({
  contactId,
  notes,
  labels,
}: {
  contactId: string;
  notes: NoteItem[];
  labels: { button: string; title: string; add: string; placeholder: string; body: string; del: string; close: string };
}) {
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
        className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-white pl-3 pr-3.5 text-[14px] font-bold shadow-[inset_0_0_0_1px_var(--color-edge)] active:scale-95"
      >
        <Icon name="pencil" size={15} strokeWidth={2} />
        {labels.button}
        {notes.length ? <span className="num min-w-5 rounded-full bg-sky-soft px-1.5 text-center text-[12px] leading-5 text-accent">{notes.length}</span> : null}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-[rgba(31,35,64,0.32)]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="notes-title" className="mx-auto flex max-h-[82dvh] w-full max-w-[480px] flex-col rounded-t-[28px] bg-paper" style={{ marginBottom: "var(--kb, 0px)" }}>
            <div className="flex items-center gap-2 pb-1 pl-5 pr-2 pt-3">
              <Icon name="lock" size={15} strokeWidth={2.2} />
              <h2 id="notes-title" className="flex-1 text-[17px] font-bold tracking-[-0.02em]">
                {labels.title}
              </h2>
              <button type="button" aria-label={labels.close} onClick={() => setOpen(false)} className="flex h-11 w-11 items-center justify-center text-muted">
                <Icon name="close" size={20} />
              </button>
            </div>
            {notes.length ? (
              <ul className="min-h-0 flex-1 overflow-y-auto px-5 pb-2">
                {notes.map((n) => (
                  <li key={n.id} className="flex items-start gap-2 border-t border-rule py-3 text-[15px] leading-[1.5] first:border-t-0">
                    <span className="min-w-0 flex-1 whitespace-pre-line">{n.body}</span>
                    <span className="shrink-0 pt-[2px] text-[12.5px] text-muted">{n.when}</span>
                    <form action={deleteNote} className="-my-1.5 -mr-2 shrink-0">
                      <input type="hidden" name="contactId" value={contactId} />
                      <input type="hidden" name="noteId" value={n.id} />
                      <button aria-label={labels.del} className="flex h-9 w-9 items-center justify-center text-muted">
                        <Icon name="close" size={15} />
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : null}
            <form action={addNote} className="flex items-end gap-2 border-t border-rule px-4 pt-3" style={{ paddingBottom: "max(var(--pb), 12px)" }}>
              <input type="hidden" name="contactId" value={contactId} />
              <textarea
                name="body"
                required
                maxLength={1000}
                rows={1}
                placeholder={labels.placeholder}
                aria-label={labels.body}
                className="field max-h-40 flex-1 resize-none [field-sizing:content]"
              />
              <AddButton label={labels.add} />
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
