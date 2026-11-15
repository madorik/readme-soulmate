import type { AvatarConfig } from "@readme/core";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";

// 홈 '다가오는 날' 오른쪽 그림: 그 사람 얼굴 + 생일이면 케이크, 기념일이면 하트 스티커.
// 남색 선 위에 하늘·분홍 색면을 살짝 어긋나게 찍는다.

const INK = "#1F2340";
const QUIET = "#C3C7D4";
/** 색면을 선에서 어긋나게 찍는 거리(뷰박스 48 기준) */
const SHIFT = "translate(1.3 1.1)";

const FLAME = "M24 3.8 C26.8 7 27.3 9.4 24 11.6 C20.7 9.4 21.2 7 24 3.8 Z";
const ICING = "M9 29.5 C11 29.5 11.4 32.6 13.6 32.6 C15.8 32.6 15.8 28.8 18.4 28.8 C21 28.8 21 33 23.6 33 C26.2 33 26.2 28.8 28.8 28.8 C31.2 28.8 31.4 32 33.4 32 C35.4 32 35.6 29.5 39 29.5";

/** 초 하나 꽂은 케이크. quiet면 색 없이 연한 선, 불도 안 붙인다 */
export function CakeMark({ size = 34, quiet = false }: { size?: number; quiet?: boolean }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" className="block">
      {quiet ? null : (
        <g transform={SHIFT}>
          <rect x="9" y="23" width="30" height="16" rx="2.5" fill="#FFF4D6" />
          <rect x="22" y="13" width="4" height="10" rx="1" fill="#FFC23D" />
          <path d={FLAME} fill="#FF9DB0" />
        </g>
      )}
      <g fill="none" stroke={quiet ? QUIET : INK} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 42.5 H43" />
        <rect x="9" y="23" width="30" height="16" rx="2.5" />
        <path d={ICING} />
        <rect x="22" y="13" width="4" height="10" rx="1" />
        {quiet ? <path d="M24 13 V10" /> : <path d={FLAME} />}
      </g>
    </svg>
  );
}

const HEART = "M24 39 C14.5 32.5 7.5 26.8 7.5 19.6 C7.5 14.8 11.2 11.2 15.6 11.2 C19.2 11.2 22.1 13.3 24 16.4 C25.9 13.3 28.8 11.2 32.4 11.2 C36.8 11.2 40.5 14.8 40.5 19.6 C40.5 26.8 33.5 32.5 24 39 Z";

export function HeartMark({ size = 34 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" className="block">
      <path d={HEART} fill="#FF9DB0" transform={SHIFT} />
      <path d={HEART} fill="none" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

/** 얼굴 왼쪽 아래에 붙는 동그란 스티커 */
function Sticker({ children, className = "bottom-0 left-0 h-[46px] w-[46px]" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`absolute flex -rotate-6 items-center justify-center rounded-full bg-paper shadow-[0_0_0_1px_var(--color-rule),0_2px_6px_rgba(31,35,64,0.08)] ${className}`}>
      {children}
    </span>
  );
}

/** 다가오는 날의 주인공: 얼굴을 누르면 그 사람 리드미로. 아래 '내 사람들'에 같은 링크가 있어 보조기기에는 숨긴다 */
export function EventPortrait({ href, avatar, name, kind }: { href: string; avatar: AvatarConfig | null; name: string; kind: "birthday" | "anniversary" }) {
  return (
    <Link href={href} aria-hidden="true" tabIndex={-1} className="relative block h-[86px] w-[94px] shrink-0">
      <span className="absolute right-0 top-0">
        <Avatar config={avatar} size={74} label={name} />
      </span>
      <Sticker>{kind === "birthday" ? <CakeMark /> : <HeartMark />}</Sticker>
    </Link>
  );
}

/** 같은 날 챙길 사람이 여럿: 큰 얼굴(오른쪽 위)과 작은 얼굴(왼쪽 아래)을 겹치고, 셋 이상이면 '+n', 스티커는 오른쪽 아래 */
export function EventPortraits({ faces, kind }: { faces: { avatar: AvatarConfig | null; name: string }[]; kind: "birthday" | "anniversary" }) {
  const [a, b] = faces;
  if (!a || !b) return null;
  const rest = faces.length - 2;
  return (
    <span aria-hidden="true" className="relative block h-[86px] w-[94px] shrink-0">
      <span className="absolute right-0 top-0">
        <Avatar config={a.avatar} size={60} label={a.name} />
      </span>
      <span className="absolute left-0 top-[28px] rounded-full shadow-[0_0_0_3px_#fff]">
        <Avatar config={b.avatar} size={52} label={b.name} />
      </span>
      {rest > 0 ? <span className="grad num absolute -left-1 bottom-0 rounded-full px-1.5 py-[2px] text-[11px] !font-bold shadow-[0_0_0_2px_#fff]">+{rest}</span> : null}
      <Sticker className="-bottom-1 -right-1 h-[38px] w-[38px]">{kind === "birthday" ? <CakeMark size={28} /> : <HeartMark size={28} />}</Sticker>
    </span>
  );
}

/** 다가오는 날이 없을 때: 빈 자리(점선 동그라미)와 불 안 붙인 케이크 */
export function EmptyPortrait() {
  return (
    <span aria-hidden="true" className="relative block h-[86px] w-[94px] shrink-0">
      <span className="absolute right-0 top-0 h-[74px] w-[74px] rounded-full border-2 border-dashed border-[#f0d27a]" />
      <Sticker>
        <CakeMark quiet />
      </Sticker>
    </span>
  );
}
