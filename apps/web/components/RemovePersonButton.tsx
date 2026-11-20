"use client";

import { useCallback, useState } from "react";
import { useFormStatus } from "react-dom";
import { removeContact } from "@/app/actions/people";
import { Icon } from "@/components/marks";
import { Sheet } from "@/components/Sheet";

function RemoveSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} aria-busy={pending} className="btn-soft !bg-red !text-white !shadow-none disabled:opacity-50 motion-safe:disabled:animate-pulse">
      {label}
    </button>
  );
}

/**
 * 사람 지우기: 누르면 바로 지우지 않고 아래에서 시트가 올라와 누구를 지우는지, 무엇이 사라지는지 한 번 더 보여 준다.
 * 처음 포커스는 취소(실수로 엔터를 쳐도 안 지워진다), 지우기는 빨강.
 * 여는 단추는 글자(프로필 고치기 맨 아래) 또는 44px 동그란 휴지통(사람 화면 위 줄, 즐겨찾기 별 옆)
 */
export function RemovePersonButton({
  contactId,
  labels,
  variant = "text",
}: {
  contactId: string;
  labels: { open: string; title: string; body: string; remove: string; cancel: string; close: string };
  variant?: "text" | "icon";
}) {
  const [ask, setAsk] = useState(false);
  const close = useCallback(() => setAsk(false), []);
  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          aria-label={labels.open}
          aria-haspopup="dialog"
          onClick={() => setAsk(true)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-muted shadow-[inset_0_0_0_1.5px_var(--color-edge)] active:scale-95"
        >
          <Icon name="trash" size={21} strokeWidth={1.8} />
        </button>
      ) : (
        <button type="button" aria-haspopup="dialog" onClick={() => setAsk(true)} className="flex min-h-11 items-center text-[18px] text-muted underline underline-offset-4">
          {labels.open}
        </button>
      )}
      {ask ? (
        <Sheet
          id="remove-person-title"
          title={labels.title}
          closeLabel={labels.close}
          onClose={close}
          footer={
            <div className="grid grid-cols-2 gap-2">
              <button type="button" autoFocus onClick={close} className="btn-soft">
                {labels.cancel}
              </button>
              <form action={removeContact} className="contents">
                <input type="hidden" name="contactId" value={contactId} />
                <RemoveSubmit label={labels.remove} />
              </form>
            </div>
          }
        >
          <p className="px-6 pb-3 pt-1 text-[18px] leading-[1.6]">{labels.body}</p>
        </Sheet>
      ) : null}
    </>
  );
}
