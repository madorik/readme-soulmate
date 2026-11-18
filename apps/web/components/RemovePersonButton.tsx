"use client";

import { useCallback, useState } from "react";
import { useFormStatus } from "react-dom";
import { removeContact } from "@/app/actions/people";
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
 * 처음 포커스는 취소(실수로 엔터를 쳐도 안 지워진다), 지우기는 빨강
 */
export function RemovePersonButton({
  contactId,
  labels,
}: {
  contactId: string;
  labels: { open: string; title: string; body: string; remove: string; cancel: string; close: string };
}) {
  const [ask, setAsk] = useState(false);
  const close = useCallback(() => setAsk(false), []);
  return (
    <>
      <button type="button" aria-haspopup="dialog" onClick={() => setAsk(true)} className="flex min-h-11 items-center text-[14px] font-bold text-muted">
        {labels.open}
      </button>
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
          <p className="px-6 pb-3 pt-1 text-[15px] leading-[1.6]">{labels.body}</p>
        </Sheet>
      ) : null}
    </>
  );
}
