"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { markGiftDone } from "@/app/actions/people";
import { useGiftShare } from "@/components/giftShare";
import { CheckGlyph } from "@/components/marks";
import { Sheet } from "@/components/Sheet";
import { nativeShare } from "@/components/ShareButtons";

// 선물 힌트 화면 아래 단추 줄
// - 가족과 같이 준비: 위에서 고른 선물 카드(가격대별 상품·링크) 주소를 보낸다. 아직 고르는 중이면 날짜 한 줄만
// - 선물 완료: 어떤 선물을 했는지 고르거나 적어 메모로 남긴다(다음 추천에서 빠진다). 남겼으면 무엇을 했는지 보인다

export function GiftActions({
  contactId,
  doneLabel,
  done,
  fallbackText,
  labels,
}: {
  contactId: string;
  /** 메모 이름(예: 2026 아빠 생일) */
  doneLabel: string;
  /** 이미 남긴 선물 메모(없으면 null) */
  done: string | null;
  fallbackText: string;
  labels: { together: string; shared: string; done: string; doneTitle: string; doneOwn: string; doneSave: string; doneEdit: string; close: string };
}) {
  const share = useGiftShare();
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [open, setOpen] = useState(false);
  const [gift, setGift] = useState("");
  const [pending, start] = useTransition();

  const send = async () => {
    const url = share.url ? `${share.url}${share.band ? `?b=${share.band}` : ""}` : undefined;
    const text = url ? share.text : fallbackText;
    if (!(await nativeShare(text, url))) {
      try {
        await navigator.clipboard.writeText(url ? `${text}\n${url}` : text);
      } catch {
        /* 복사도 안 되면 그대로 둔다 */
      }
    }
    setSent(true);
  };

  const save = () =>
    start(async () => {
      const r = await markGiftDone(contactId, doneLabel, gift);
      if (r.ok) {
        setOpen(false);
        router.refresh();
      }
    });

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5">
        <button type="button" onClick={send} className="btn-outline">
          {sent ? labels.shared : labels.together}
        </button>
        {done ? (
          <button type="button" onClick={() => setOpen(true)} aria-label={`${labels.done} · ${done} · ${labels.doneEdit}`} className="btn-soft min-w-0 gap-1.5 !px-3">
            <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-sky text-ink">
              <CheckGlyph size={11} />
            </span>
            <span className="truncate">{labels.done}</span>
          </button>
        ) : (
          <button type="button" onClick={() => setOpen(true)} className="btn-primary">
            {labels.done}
          </button>
        )}
      </div>
      {done ? <p className="truncate px-1 text-center text-[13px] text-muted">{done}</p> : null}
      {open ? (
        <Sheet
          id="gift-done"
          title={labels.doneTitle}
          closeLabel={labels.close}
          onClose={() => setOpen(false)}
          footer={
            <button type="button" disabled={pending || !gift.trim()} onClick={save} className="btn-primary w-full">
              {labels.doneSave}
            </button>
          }
        >
          <div className="flex flex-col gap-3 px-6 pb-2 pt-2">
            {share.items.length ? (
              <div className="flex flex-wrap gap-1.5">
                {share.items.map((name) => (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={gift === name}
                    onClick={() => setGift(name)}
                    className={`flex h-10 items-center rounded-full px-3.5 text-[14px] font-bold ${gift === name ? "chip-on" : "bg-white text-ink-2 shadow-[inset_0_0_0_1.5px_var(--color-edge)]"}`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            ) : null}
            <input value={gift} onChange={(e) => setGift(e.target.value)} maxLength={80} placeholder={labels.doneOwn} aria-label={labels.doneOwn} enterKeyHint="done" className="field" />
          </div>
        </Sheet>
      ) : null}
    </>
  );
}
