"use client";

import { useState } from "react";

/** 글 복사(복사되면 잠깐 "복사했어요") */
export function CopyButton({ text, label, doneLabel, className = "" }: { text: string; label: string; doneLabel: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          /* 복사가 막힌 브라우저면 그대로 둔다 */
        }
      }}
    >
      {done ? doneLabel : label}
    </button>
  );
}
