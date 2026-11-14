import { AVATAR_BG_FILLS, AVATAR_INK, BODY_OUTLINE, BODY_PATHS, GLASSES_PATHS, HAIR_PATHS, ITEM_PATHS, type AvatarConfig } from "@readme/core";

const INK = AVATAR_INK;
const PINK = "#FF9DB0";

/** 선 캐릭터 그림만(배경 없음). 캐릭터 만들기의 큰 미리보기·고르기 칸에서 쓴다 */
export function AvatarArt({ config, size, label }: { config: AvatarConfig; size: number; label?: string }) {
  const [back, front] = HAIR_PATHS[config.hair];
  const body = BODY_PATHS[config.body];
  const [glassFill, glassLine] = GLASSES_PATHS[config.glasses];
  const item = ITEM_PATHS[config.item];
  // 짙은 옷 위의 옷 선은 흰색으로
  const detail = config.cloth.toUpperCase() === INK ? "#FFFFFF" : INK;
  const stroke = { stroke: INK, strokeWidth: 3.2, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} className="block">
      {back ? <path d={back} fill={config.hairColor} {...stroke} /> : null}
      <path d="M91 116 V158 H109 V116" fill="#FFFFFF" {...stroke} />
      <path d={BODY_OUTLINE} fill={config.cloth} {...stroke} />
      {body.fill ? <path d={body.fill} fill={config.cloth} {...stroke} /> : null}
      {body.white ? <path d={body.white} fill="#FFFFFF" {...stroke} /> : null}
      <path d={body.line} fill="none" {...stroke} stroke={detail} />
      <path d="M70 88 C58 84 56 108 70 109 Z" fill="#FFFFFF" {...stroke} />
      <path d="M130 88 C142 84 144 108 130 109 Z" fill="#FFFFFF" {...stroke} />
      <ellipse cx="100" cy="96" rx="32" ry="36" fill="#FFFFFF" {...stroke} />
      <path d={front} fill={config.hairColor} {...stroke} />
      <circle cx="88" cy="101" r="3.9" fill={INK} />
      <circle cx="112" cy="101" r="3.9" fill={INK} />
      {glassFill ? <path d={glassFill} fill={INK} {...stroke} strokeWidth={3} /> : null}
      {glassLine ? <path d={glassLine} fill="none" {...stroke} strokeWidth={3} /> : null}
      {item.a ? <path d={item.a} fill={item.color} {...stroke} strokeWidth={3} /> : null}
      {item.b ? <path d={item.b} fill={PINK} {...stroke} strokeWidth={3} /> : null}
      {item.w ? <path d={item.w} fill="#FFFFFF" {...stroke} strokeWidth={3} /> : null}
      {item.l ? <path d={item.l} fill="none" {...stroke} /> : null}
    </svg>
  );
}

export function avatarBackground(config: AvatarConfig): string {
  const [a, b] = AVATAR_BG_FILLS[config.bg];
  return a === b ? a : `linear-gradient(140deg, ${a}, ${b})`;
}

/** 동그라미 안의 선 캐릭터. 얼굴이 없으면 가는 테두리 동그라미에 첫 글자 */
export function Avatar({ config, size = 44, label }: { config: AvatarConfig | null; size?: number; label: string }) {
  if (!config) {
    const initial = label.trim().slice(0, 1) || "?";
    return (
      <span
        role="img"
        aria-label={label}
        className="flex shrink-0 items-center justify-center rounded-full bg-sky-soft font-bold text-accent"
        style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      >
        {initial}
      </span>
    );
  }
  return (
    <span className="block shrink-0 overflow-hidden rounded-full leading-none" style={{ width: size, height: size, background: avatarBackground(config) }}>
      <AvatarArt config={config} size={size} label={label} />
    </span>
  );
}
