"use client";

import type { AvatarConfig } from "@readme/core";
import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/marks";
import { Sheet } from "@/components/Sheet";

/** 알림 한 줄(서버에서 문구까지 만들어 넘긴다) */
export interface BellItem {
  id: string;
  /** 누르면 갈 곳(그 사람 화면) */
  href: string;
  avatar: AvatarConfig | null;
  /** 얼굴 읽어 줄 이름 */
  name: string;
  title: string;
  /** "3분 전" */
  when: string;
}

/**
 * 홈 오른쪽 위 종: 아직 안 본 새 알림(물어보기에 온 답장)이 개수로 붙고, 누르면 시트에 모아서 보인다.
 * 알림을 누르면 그 사람 화면으로 간다(사람 화면을 열면 읽은 것으로 바뀌어 종의 숫자가 줄어든다)
 */
export function NotificationBell({ items, labels }: { items: BellItem[]; labels: { title: string; empty: string; close: string } }) {
  const [open, setOpen] = useState(false);
  const count = items.length;
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={count ? `${labels.title} ${count}` : labels.title}
        onClick={() => setOpen(true)}
        className="relative flex h-11 w-11 items-center justify-center rounded-full text-ink active:bg-fill"
      >
        <Icon name="bell" size={23} strokeWidth={1.9} />
        {count ? (
          <span aria-hidden="true" className="num absolute right-[3px] top-[5px] flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-red px-1 text-[11.5px] !font-bold leading-none text-white shadow-[0_0_0_2px_var(--color-bg)]">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>
      {open ? (
        <Sheet id="bell-title" title={labels.title} closeLabel={labels.close} onClose={() => setOpen(false)}>
          {count ? (
            <ul className="flex flex-col px-3" style={{ paddingBottom: "max(var(--pb), 16px)" }}>
              {items.map((n, i) => (
                <li key={n.id} className={i ? "border-t border-rule" : ""}>
                  <Link href={n.href} onClick={() => setOpen(false)} className="flex min-h-[64px] items-center gap-3 rounded-2xl px-3 py-2.5 active:bg-fill">
                    <Avatar config={n.avatar} size={42} label={n.name} />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-[15px] font-bold tracking-[-0.01em]">{n.title}</span>
                      <span className="text-[12.5px] text-muted">{n.when}</span>
                    </span>
                    <Icon name="chevron" size={18} className="shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-6 text-[14.5px] text-muted" style={{ paddingBottom: "max(var(--pb), 24px)" }}>
              {labels.empty}
            </p>
          )}
        </Sheet>
      ) : null}
    </>
  );
}
