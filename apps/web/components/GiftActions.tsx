"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { markGiftDone } from "@/app/actions/people";
import { beacon } from "@/components/beacon";
import { useGiftShare } from "@/components/giftShare";
import { CheckGlyph } from "@/components/marks";
import { Sheet } from "@/components/Sheet";
import { nativeShare } from "@/components/ShareButtons";

/** 글을 클립보드에 복사한다(막혀 있으면 옛 방식으로 한 번 더). 복사했으면 true. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

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
  labels: { together: string; shared: string; done: string; doneTitle: string; doneOwn: string; doneSave: string; doneEdit: string; copyFailed?: string; close: string };
}) {
  const share = useGiftShare();
  // 보냈어요/복사 못 했어요는 2초만 보이고 처음 글자로 돌아온다
  const [state, setState] = useState<"idle" | "sent" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const flash = (next: "sent" | "failed") => {
    setState(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2000);
  };
  // 남긴 것은 바로 보인다(화면 다시 그리기는 메모가 바뀌어 선물을 새로 고르느라 늦을 수 있다)
  const [saved, setSaved] = useState<string | null>(null);
  const shown = saved ?? done;
  const [open, setOpen] = useState(false);
  const [gift, setGift] = useState("");
  const [pending, start] = useTransition();

  const send = async () => {
    const url = share.url ? `${share.url}${share.band ? `?b=${share.band}` : ""}` : undefined;
    const text = url ? share.text : fallbackText;
    if (url) beacon("card_share", { b: share.band ?? undefined, s: "reminder" });
    // 공유창이 없으면 복사한다. 복사도 안 되면 보냈다고 하지 않는다
    if (!(await nativeShare(text, url)) && !(await copyText(url ? `${text}\n${url}` : text))) return flash("failed");
    flash("sent");
  };

  const save = () =>
    start(async () => {
      // 화면은 액션 응답에 함께 다시 그려져 온다(revalidatePath). 따로 새로고침하지 않는다
      const r = await markGiftDone(contactId, doneLabel, gift);
      if (r.ok) {
        setSaved(r.note ?? gift);
        setOpen(false);
      }
    });

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5">
        <button type="button" onClick={send} className="btn-outline btn-outline-lift !text-[19px]">
          {state === "sent" ? labels.shared : state === "failed" ? (labels.copyFailed ?? labels.together) : labels.together}
        </button>
        <span role="status" className="sr-only">
          {state === "sent" ? labels.shared : state === "failed" ? labels.copyFailed : ""}
        </span>
        {shown ? (
          <button type="button" onClick={() => setOpen(true)} aria-label={`${labels.done} · ${shown} · ${labels.doneEdit}`} className="btn-soft btn-outline-lift min-w-0 gap-1.5 !h-[52px] !rounded-2xl !px-3 !text-[19px]">
            <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-sky text-ink">
              <CheckGlyph size={11} />
            </span>
            <span className="truncate">{labels.done}</span>
          </button>
        ) : (
          <button type="button" onClick={() => setOpen(true)} className="btn-primary !text-[19px]">
            {labels.done}
          </button>
        )}
      </div>
      {shown ? <p className="truncate px-1 text-center text-[16px] text-muted">{shown}</p> : null}
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
                    className={`flex h-11 items-center rounded-full px-3.5 text-[17px] ${gift === name ? "chip-on" : "bg-white text-ink-2 shadow-[inset_0_0_0_1.5px_var(--color-edge)]"}`}
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
