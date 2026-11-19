"use client";

import { useState } from "react";
import { DrawnCheck } from "@/components/marks";
import { ShareTextButton } from "@/components/ShareButtons";

/** 메뉴 고르기·선물 고르기 아래 공유하기. named가 있으면 "이름도 같이" 칸을 보여 준다 */
export function ShareBar({ plain, named, label, doneLabel, namesLabel }: { plain: string; named?: string; label: string; doneLabel: string; namesLabel?: string }) {
  const [withNames, setWithNames] = useState(false);
  return (
    <div className="bottom-bar mt-auto flex items-center gap-3 bg-bg/95 px-6 pt-3 backdrop-blur">
      {named && namesLabel ? (
        <button type="button" aria-pressed={withNames} onClick={() => setWithNames(!withNames)} className="flex min-h-12 shrink-0 items-center gap-2 text-[18px]">
          <DrawnCheck on={withNames} />
          {namesLabel}
        </button>
      ) : null}
      <ShareTextButton key={String(withNames)} text={withNames && named ? named : plain} label={label} doneLabel={doneLabel} className="btn-primary flex-1 !text-[20px]" />
    </div>
  );
}
