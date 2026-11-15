import type { AvatarConfig } from "@readme/core";
import { COLOR_FILL, ICON_PATH, type FolderColor, type FolderIcon } from "@/lib/folders";
import { Avatar } from "./Avatar";

// 폴더 그림: 남색 선 + 파스텔 색(항목 아이콘과 같은 결). 뒤판 → 들어 있는 사람 얼굴(없으면 빈 종이) → 앞주머니 + 모양 순서로 겹쳐서
// 얼굴이 주머니 위로 빼꼼 보인다. 서버·화면이 같이 쓴다

const INK = "#1F2340";
const BACK = "M7 13a5 5 0 0 1 5-5h14.5a4 4 0 0 1 3 1.4L33.4 13H60a5 5 0 0 1 5 5v28a5 5 0 0 1-5 5H12a5 5 0 0 1-5-5z";
const FRONT = "M5 25a4 4 0 0 1 4-4h54a4 4 0 0 1 4 4l-1.6 21.4A5 5 0 0 1 60.4 51H11.6a5 5 0 0 1-5-4.6z";

export function FolderArt({
  icon,
  color,
  size = 77,
  faces,
}: {
  icon: FolderIcon;
  color: FolderColor;
  /** 폭(px). 높이는 72:56 */
  size?: number;
  /** 들어 있는 사람 얼굴(앞에서 셋까지). 없거나 비면 빈 종이 */
  faces?: { key: string; avatar: AvatarConfig | null; label: string }[];
}) {
  const fill = COLOR_FILL[color];
  // 화면에서 선 굵기가 비슷하게(작을수록 뷰박스 안에서는 굵게)
  const sw = Math.max(1.5, Math.min(3, 140 / size));
  const shown = (faces ?? []).slice(0, 3);
  const face = Math.round(size * 0.31);
  return (
    <span aria-hidden="true" className="relative block shrink-0" style={{ width: size, height: Math.round((size * 56) / 72) }}>
      <svg viewBox="0 0 72 56" className="absolute inset-0 h-full w-full overflow-visible">
        <path d={BACK} fill={fill.back} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
        {shown.length ? null : (
          <>
            <rect x="13" y="13.5" width="46" height="20" rx="2.5" fill="#fff" stroke={INK} strokeWidth={sw * 0.8} />
            <path d="M18 19h22M18 24h14" stroke="#E4E6EE" strokeWidth={sw} strokeLinecap="round" />
          </>
        )}
      </svg>
      {shown.length ? (
        <span className="absolute inset-x-0 flex justify-center" style={{ top: Math.round(size * 0.055) - 4 }}>
          {shown.map((f, i) => (
            <span key={f.key} className="rounded-full shadow-[0_0_0_1.5px_#fff]" style={{ marginLeft: i ? -Math.round(face * 0.36) : 0 }}>
              <Avatar config={f.avatar} size={face} label={f.label} />
            </span>
          ))}
        </span>
      ) : null}
      <svg viewBox="0 0 72 56" className="absolute inset-0 h-full w-full overflow-visible">
        <path d={FRONT} fill={fill.front} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
        <path d="M11 26.5h50" stroke="#fff" strokeOpacity="0.6" strokeWidth={sw} strokeLinecap="round" />
        <path d={ICON_PATH[icon]} fill="#fff" stroke={INK} strokeWidth={sw * 0.8} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </span>
  );
}

/** 작은 폴더(칩·목록 앞): 모양 없이 색만 */
export function FolderMini({ color, size = 20 }: { color: FolderColor; size?: number }) {
  const fill = COLOR_FILL[color];
  return (
    <svg aria-hidden="true" viewBox="0 0 20 16" width={size} height={(size * 16) / 20} className="block shrink-0">
      <path d="M1.5 3.5A1.5 1.5 0 0 1 3 2h4l1.5 1.5H17A1.5 1.5 0 0 1 18.5 5v8.5A1.5 1.5 0 0 1 17 15H3a1.5 1.5 0 0 1-1.5-1.5z" fill={fill.back} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M1 6.5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1l-.5 7A1.5 1.5 0 0 1 17 15H3a1.5 1.5 0 0 1-1.5-1.5z" fill={fill.front} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

/** 모양 고르기 칸에 쓰는 그림만(앞주머니 없이) */
export function FolderIconGlyph({ icon, size = 26 }: { icon: FolderIcon; size?: number }) {
  return (
    <svg aria-hidden="true" viewBox="27.5 28 17 17" width={size} height={size} className="block">
      <path d={ICON_PATH[icon]} fill="#fff" stroke={INK} strokeWidth="1.1" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
