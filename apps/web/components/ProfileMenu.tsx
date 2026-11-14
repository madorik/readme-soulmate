"use client";

import type { AvatarConfig } from "@readme/core";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/actions/auth";
import { Avatar } from "@/components/Avatar";

/** 홈 오른쪽 위 내 얼굴: 누르면 내 프로필 / 로그아웃 메뉴. 바깥을 누르거나 Esc면 닫힌다 */
export function ProfileMenu({ avatar, labels }: { avatar: AvatarConfig | null; labels: { menu: string; profile: string; signOut: string } }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} aria-label={labels.menu} onClick={() => setOpen(!open)} className="flex h-11 w-11 items-center justify-center">
        <span className="rounded-full shadow-[0_0_0_2px_#fff]"><Avatar config={avatar} size={38} label={labels.menu} /></span>
      </button>
      {open ? (
        <div role="menu" className="absolute right-1 top-full z-40 mt-1 w-44 overflow-hidden rounded-2xl bg-white py-1 shadow-[0_0_0_1px_var(--color-rule),0_10px_28px_rgba(34,48,74,0.14)]">
          <Link role="menuitem" href="/me/avatar" onClick={() => setOpen(false)} className="flex min-h-12 items-center px-4 text-[15px] font-semibold">
            {labels.profile}
          </Link>
          <form action={signOut} className="border-t border-rule">
            <button role="menuitem" className="flex min-h-12 w-full items-center px-4 text-left text-[15px] font-semibold">
              {labels.signOut}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
