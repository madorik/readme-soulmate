"use client";

import { useCallback, useMemo, useState } from "react";
import { composeShareText, type SharePart } from "@/lib/share-record";
import { DrawnCheck, Icon } from "./marks";
import { Sheet } from "./Sheet";
import { ShareTextButton } from "./ShareButtons";

/**
 * 적어 둔 기록을 글로 보내기: 누르면 아래에서 시트가 올라와 보낼 항목을 고르고(적어 둔 것만, 처음엔 모두),
 * 휴대폰 공유창(카카오톡·문자 등)이나 복사로 보낸다. 링크를 만들지 않는다: 글이 그대로 나가고 기억해유에는 남지 않는다.
 * 사람 화면은 '이름도 같이'를 고를 수 있고(처음엔 켜짐), 내 기록은 늘 내 이름으로 나간다
 */
export function ShareRecord({
  parts,
  header,
  headerNamed,
  footer,
  nameToggle,
  labels,
}: {
  parts: SharePart[];
  header: string;
  headerNamed: string;
  footer: string;
  nameToggle: boolean;
  labels: { open: string; title: string; share: string; done: string; withName: string; close: string };
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const [picked, setPicked] = useState<string[]>(() => parts.map((p) => p.section));
  const [withName, setWithName] = useState(true);
  const chosen = useMemo(() => parts.filter((p) => picked.includes(p.section)), [parts, picked]);
  const text = useMemo(() => composeShareText(chosen, nameToggle && !withName ? header : headerNamed, footer), [chosen, nameToggle, withName, header, headerNamed, footer]);
  const toggle = (section: string) => setPicked((cur) => (cur.includes(section) ? cur.filter((x) => x !== section) : [...cur, section]));

  return (
    <>
      <button
        type="button"
        aria-label={labels.open}
        aria-haspopup="dialog"
        disabled={!parts.length}
        onClick={() => setOpen(true)}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-muted shadow-[inset_0_0_0_1.5px_var(--color-edge)] active:bg-fill disabled:opacity-40"
      >
        <Icon name="share" size={21} strokeWidth={1.8} />
      </button>
      {open ? (
        <Sheet
          id="share-record-title"
          title={labels.title}
          closeLabel={labels.close}
          onClose={close}
          footer={<ShareTextButton key={text} text={text} label={labels.share} doneLabel={labels.done} className="btn-primary w-full !text-[20px] disabled:opacity-50" />}
        >
          <ul className="flex flex-col px-6 pb-2">
            {parts.map((p) => {
              const on = picked.includes(p.section);
              return (
                <li key={p.section} className="border-t border-dashed border-rule first:border-t-0">
                  <button type="button" aria-pressed={on} onClick={() => toggle(p.section)} className="flex min-h-[56px] w-full items-center gap-3 py-2 text-left">
                    <DrawnCheck on={on} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[19px]">{p.title}</span>
                      <span className="truncate text-[15px] text-muted">{p.lines[0]}</span>
                    </span>
                  </button>
                </li>
              );
            })}
            {nameToggle ? (
              <li className="border-t border-dashed border-rule">
                <button type="button" aria-pressed={withName} onClick={() => setWithName(!withName)} className="flex min-h-[56px] w-full items-center gap-3 py-2 text-left text-[19px]">
                  <DrawnCheck on={withName} />
                  {labels.withName}
                </button>
              </li>
            ) : null}
          </ul>
          <pre aria-label={labels.title} className="mx-6 mb-3 max-h-44 overflow-auto whitespace-pre-wrap break-words rounded-[12px] bg-fill px-3.5 py-3 text-[16px] leading-[1.5] text-ink-2">
            {chosen.length ? text : ""}
          </pre>
        </Sheet>
      ) : null}
    </>
  );
}
