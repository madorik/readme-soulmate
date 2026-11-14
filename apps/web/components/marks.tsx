// 손으로 그린 표시들. 붉은 동그라미는 "잊으면 안 되는 것"과 "고른 것"에만 쓴다(시안 C2).

const CIRCLE_PATH = "M14 58 C6 30 30 8 56 8 C82 8 96 30 93 54 C90 80 66 94 44 92 C20 90 4 72 10 46 C13 32 26 18 42 12";

/** 감싼 글자 둘레에 손으로 그린 동그라미. 부모는 position: relative 여야 한다 */
export function MarkerCircle({ color = "red", pad = [11, 9], width = 1.9 }: { color?: "red" | "ink"; pad?: [number, number]; width?: number }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute overflow-visible"
      style={{ left: -pad[0], top: -pad[1], width: `calc(100% + ${pad[0] * 2}px)`, height: `calc(100% + ${pad[1] * 2}px)` }}
    >
      <path d={CIRCLE_PATH} fill="none" stroke={color === "red" ? "var(--color-marker)" : "var(--color-ink)"} strokeWidth={width} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** 글자에 동그라미를 칠 수 있는 자리 */
export function Circled({ on, color = "red", pad, width, children, className = "" }: { on: boolean; color?: "red" | "ink"; pad?: [number, number]; width?: number; children: React.ReactNode; className?: string }) {
  return (
    <span className={`relative ${className}`}>
      {children}
      {on ? <MarkerCircle color={color} pad={pad} width={width} /> : null}
    </span>
  );
}

/** 네모 칸 + 손으로 그린 빨간 체크 */
export function DrawnCheck({ on }: { on: boolean }) {
  return (
    <span className="relative inline-block h-[22px] w-[22px] shrink-0 rounded-[5px] border border-[#b6b9bd] bg-white">
      {on ? (
        <svg aria-hidden="true" viewBox="0 0 32 32" className="absolute overflow-visible" style={{ left: -2, top: -9, width: 30, height: 30 }}>
          <path d="M5 17 C8 19 10 22 12 26 C16 16 22 8 30 2" fill="none" stroke="var(--color-marker)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </span>
  );
}

/** 켜고 끄는 스위치의 모양(누르는 건 감싼 button이 한다) */
export function SwitchLook({ on }: { on: boolean }) {
  return (
    <span className={`flex h-7 w-[46px] items-center rounded-full p-[3px] transition-colors ${on ? "justify-end bg-ink" : "justify-start bg-[#d6d8d4]"}`}>
      <span className="h-[22px] w-[22px] rounded-full bg-white" />
    </span>
  );
}

type IconName =
  | "back" | "close" | "lock" | "alert" | "mic" | "camera" | "link" | "share" | "gift" | "external" | "bell"
  | "plus" | "check" | "calendar" | "people" | "card" | "globe" | "personAdd" | "chevron" | "trash" | "pick" | "map" | "eye";

const ICONS: Record<IconName, React.ReactNode> = {
  back: <path d="M15 18l-6-6 6-6" />,
  close: <path d="M18 6L6 18M6 6l12 12" />,
  lock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  alert: (
    <>
      <path d="M21.73 18l-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 17v5" />
    </>
  ),
  camera: (
    <>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </>
  ),
  share: <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />,
  gift: <path d="M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />,
  external: <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />,
  bell: <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M20 6L9 17l-5-5" />,
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
      <circle cx="15.5" cy="15" r="2.6" />
    </>
  ),
  people: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  card: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </>
  ),
  personAdd: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </>
  ),
  chevron: <path d="M9 18l6-6-6-6" />,
  trash: <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />,
  pick: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M7 9.5l1.8 1.8L12 8M7 15.5l1.8 1.8L12 14M15 10h3M15 16h3" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  map: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </>
  ),
};

export function Icon({ name, size = 22, strokeWidth = 1.7, className = "" }: { name: IconName; size?: number; strokeWidth?: number; className?: string }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {ICONS[name]}
    </svg>
  );
}

export function KakaoGlyph() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24">
      <path d="M12 3.5c-5 0-9 3.1-9 7 0 2.5 1.7 4.7 4.2 5.9l-.9 3.4c-.1.3.3.6.6.4l4-2.6c.4 0 .7.1 1.1.1 5 0 9-3.1 9-7s-4-7.2-9-7.2z" fill="currentColor" />
    </svg>
  );
}
