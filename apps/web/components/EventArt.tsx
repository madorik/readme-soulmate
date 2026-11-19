import type { AvatarConfig } from "@readme/core";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Heart, Polaroid } from "@/components/diary";

// 홈 '다가오는 날' 왼쪽 그림: 그 사람 얼굴을 끼운 폴라로이드(이름 + 하트). 같은 날 여럿이면 폴라로이드를 겹치고,
// 다가오는 날이 없으면 점선 사진 칸에 불 안 붙인 케이크를 둔다.

const QUIET = "#C3C7D4";

const ICING = "M9 29.5 C11 29.5 11.4 32.6 13.6 32.6 C15.8 32.6 15.8 28.8 18.4 28.8 C21 28.8 21 33 23.6 33 C26.2 33 26.2 28.8 28.8 28.8 C31.2 28.8 31.4 32 33.4 32 C35.4 32 35.6 29.5 39 29.5";

/** 초 하나 꽂은 케이크의 연한 선(다가오는 날이 없는 빈 사진 칸) */
function QuietCake({ size = 48 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" className="block">
      <g fill="none" stroke={QUIET} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 42.5 H43" />
        <rect x="9" y="23" width="30" height="16" rx="2.5" />
        <path d={ICING} />
        <rect x="22" y="13" width="4" height="10" rx="1" />
        <path d="M24 13 V10" />
      </g>
    </svg>
  );
}

/** 다가오는 날의 주인공: 얼굴을 누르면 그 사람 화면으로. 아래 '내 사람들'에 같은 링크가 있어 보조기기에는 숨긴다 */
export function EventPortrait({ href, avatar, name }: { href: string; avatar: AvatarConfig | null; name: string; kind: "birthday" | "anniversary" }) {
  return (
    <Link href={href} aria-hidden="true" tabIndex={-1} className="block shrink-0 py-2 pl-1 pr-2">
      <Polaroid
        rotate={-4}
        caption={
          <>
            <span className="max-w-[72px] truncate">{name}</span>
            <Heart size={13} inline />
          </>
        }
      >
        <Avatar config={avatar} size={74} label={name} />
      </Polaroid>
    </Link>
  );
}

/** 같은 날 챙길 사람이 여럿: 폴라로이드 둘을 서로 다른 쪽으로 기울여 겹치고, 셋 이상이면 '+n' */
export function EventPortraits({ faces }: { faces: { avatar: AvatarConfig | null; name: string }[]; kind: "birthday" | "anniversary" }) {
  const [a, b] = faces;
  if (!a || !b) return null;
  const rest = faces.length - 2;
  return (
    <span aria-hidden="true" className="relative block h-[122px] w-[112px] shrink-0">
      <Polaroid rotate={-6} photo={64} className="absolute left-1 top-0">
        <Avatar config={a.avatar} size={58} label={a.name} />
      </Polaroid>
      <Polaroid rotate={6} photo={64} className="absolute right-0 top-[34px]">
        <Avatar config={b.avatar} size={58} label={b.name} />
      </Polaroid>
      {rest > 0 ? <span className="grad num absolute bottom-0 left-0 rounded-full px-2 py-[2px] text-[14px] shadow-[0_0_0_1.5px_var(--color-ink)]">+{rest}</span> : null}
    </span>
  );
}

/** 다가오는 날이 없을 때: 점선 사진 칸과 불 안 붙인 케이크 */
export function EmptyPortrait() {
  return (
    <span aria-hidden="true" className="block shrink-0 py-2 pl-1 pr-2">
      <Polaroid rotate={-4} dashed>
        <QuietCake />
      </Polaroid>
    </span>
  );
}
