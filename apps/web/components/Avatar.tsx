import { HAIR_PATHS, TONE_COLORS, type AvatarConfig } from "@readme/core";

const BODY = "M13 124 C13 99 35 89 60 89 C85 89 107 99 107 124";

/** 먹색 선 그림 + 살짝 어긋나게 찍힌 색면(인쇄물 느낌). 얼굴이 없으면 가는 테두리 동그라미에 첫 글자 */
export function Avatar({ config, size = 44, label }: { config: AvatarConfig | null; size?: number; label: string }) {
  if (!config) {
    const initial = label.trim().slice(0, 1) || "?";
    return (
      <span
        role="img"
        aria-label={label}
        className="flex shrink-0 items-center justify-center rounded-full border border-edge font-medium text-ink-2"
        style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      >
        {initial}
      </span>
    );
  }
  const tone = TONE_COLORS[config.tone];
  const [back, front] = HAIR_PATHS[config.hair];
  return (
    <span className="block shrink-0 overflow-hidden rounded-full leading-none" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={label} className="block">
        <rect width="120" height="120" fill={tone.bg} />
        <g transform="translate(3 2.5)">
          {back ? <path d={back} fill={config.hairColor} /> : null}
          <path d={`${BODY} Z`} fill={tone.ink} />
          <rect x="51.5" y="70" width="17" height="22" rx="8" fill={config.skin} />
          <circle cx="35.5" cy="56" r="5" fill={config.skin} />
          <circle cx="84.5" cy="56" r="5" fill={config.skin} />
          <ellipse cx="60" cy="52" rx="25" ry="27" fill={config.skin} />
          <circle cx="45" cy="63" r="4.5" fill="#E0574B" opacity="0.26" />
          <circle cx="75" cy="63" r="4.5" fill="#E0574B" opacity="0.26" />
          <path d={front} fill={config.hairColor} />
        </g>
        <g fill="none" stroke="#1D2125" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          {back ? <path d={back} /> : null}
          <path d={BODY} />
          <path d="M51.5 78 V90 M68.5 78 V90" />
          <path d="M35 51.5 a5 5 0 0 0 0.5 9.5 M85 51.5 a5 5 0 0 1 -0.5 9.5" />
          <ellipse cx="60" cy="52" rx="25" ry="27" />
          <path d={front} />
          <path d="M54.5 65 Q60 69.5 65.5 65" />
        </g>
        <circle cx="50.5" cy="55" r="2.6" fill="#1D2125" />
        <circle cx="69.5" cy="55" r="2.6" fill="#1D2125" />
        {config.glasses ? (
          <g fill="none" stroke="#1D2125" strokeWidth="2" strokeLinecap="round">
            <circle cx="50.5" cy="55" r="7.5" />
            <circle cx="69.5" cy="55" r="7.5" />
            <path d="M58 55 h4 M43 54 L36.5 52 M77 54 L83.5 52" />
          </g>
        ) : null}
      </svg>
    </span>
  );
}
