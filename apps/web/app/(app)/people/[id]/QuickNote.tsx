"use client";

import { useState, useTransition } from "react";
import { captureNote, undoCapture, type CaptureState } from "@/app/actions/capture";
import { Icon } from "@/components/marks";

/**
 * 그 사람 화면 맨 위 한 줄: "해바라기 좋아함"처럼 적으면 맞는 칸에 알아서 넣는다(말로 적기와 같은 AI, 이 사람 이야기로).
 * 맞는 칸이 없으면 메모로. 넣은 것은 바로 아래에 보이고 되돌릴 수 있다
 */
export function QuickNote({
  contactId,
  labels,
}: {
  contactId: string;
  labels: { placeholder: string; save: string; same: string; undo: string; undone: string; failed: string; nothing: string; aiOff: string };
}) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<CaptureState | null>(null);
  const [undone, setUndone] = useState(false);
  const [pending, start] = useTransition();
  const self = `/people/${contactId}`;

  const submit = () => {
    const v = text.trim();
    if (!v || pending) return;
    start(async () => {
      const r = await captureNote(v, contactId).catch((): CaptureState => ({ lines: [], undo: [], error: "failed" }));
      setResult(r);
      setUndone(false);
      if (!r.error) setText("");
    });
  };

  const error = result?.error === "ai_off" ? labels.aiOff : result?.error === "nothing" ? labels.nothing : result?.error ? labels.failed : null;

  return (
    <div className="card mx-4 mt-5 flex flex-col p-1.5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-end gap-1.5"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          maxLength={500}
          enterKeyHint="send"
          placeholder={labels.placeholder}
          aria-label={labels.placeholder}
          className="max-h-36 min-h-12 flex-1 resize-none bg-transparent py-[13px] pl-3.5 text-[15.5px] leading-[1.4] outline-none [field-sizing:content] placeholder:text-muted"
        />
        <button
          type="submit"
          aria-label={labels.save}
          disabled={!text.trim() || pending}
          className="mb-0.5 mr-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky text-ink transition-colors disabled:bg-fill disabled:text-muted"
        >
          {pending ? <span className="h-[18px] w-[18px] animate-spin rounded-full border-[2.5px] border-current border-t-transparent" /> : <Icon name="up" size={20} strokeWidth={2.4} />}
        </button>
      </form>

      {result ? (
        <div role="status" aria-live="polite" className="mx-2 border-t border-rule pb-0.5 pt-1.5">
          {error ? (
            <p className="py-2 text-[14px] text-red">{error}</p>
          ) : (
            <div className="flex items-end gap-2">
              <ul className={`flex min-w-0 flex-1 flex-col py-1 ${undone ? "opacity-40" : ""}`}>
                {result.lines.map((l, i) => (
                  <li key={i} className="flex min-h-8 items-center gap-2 text-[14.5px]">
                    <Icon name="check" size={15} strokeWidth={2.6} className={`shrink-0 ${l.same ? "text-muted" : "text-ok"}`} />
                    <span className="shrink-0 text-muted">{l.href === self ? l.field : `${l.who} · ${l.field}`}</span>
                    <span className="min-w-0 flex-1 truncate font-bold">{l.value}</span>
                    {l.same ? <span className="shrink-0 rounded-full bg-fill px-2 py-[1px] text-[11.5px] text-muted">{labels.same}</span> : null}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={undone || pending || !result.undo.length}
                onClick={() =>
                  start(async () => {
                    const r = await undoCapture(result.undo);
                    if (r.ok) setUndone(true);
                  })
                }
                className="flex min-h-11 shrink-0 items-center px-1.5 text-[13.5px] font-bold text-muted disabled:opacity-60"
              >
                {undone ? labels.undone : labels.undo}
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
