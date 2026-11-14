// 아바타: 남색 선 그림 위에 색면을 살짝 어긋나게 찍은 인쇄물 느낌(시안 v2). 웹 컴포넌트가 이 값으로 SVG를 그린다.

export const AVATAR_TONES = ["red", "blue", "yellow", "green", "navy"] as const;
export type AvatarTone = (typeof AVATAR_TONES)[number];

export const AVATAR_HAIRS = ["short", "long", "bob", "bun", "curly", "crop"] as const;
export type AvatarHair = (typeof AVATAR_HAIRS)[number];

export const AVATAR_SKINS = ["#F7DCC8", "#F2CDB0", "#E3B38F", "#C68E68", "#8E5E42"] as const;
export const AVATAR_HAIR_COLORS = ["#1F1D2B", "#3A2A22", "#6B3F2A", "#9A98A3"] as const;

export const TONE_COLORS: Record<AvatarTone, { bg: string; ink: string }> = {
  red: { bg: "#FDE4E2", ink: "#E8352C" },
  blue: { bg: "#E2EAFB", ink: "#2A62D9" },
  yellow: { bg: "#FFF4C2", ink: "#FFD23F" },
  green: { bg: "#DDF1E6", ink: "#1E8C5A" },
  navy: { bg: "#E4E7F0", ink: "#16224A" },
};

/** [뒷머리, 앞머리] 경로. 뷰박스 120×120 */
export const HAIR_PATHS: Record<AvatarHair, [string, string]> = {
  short: ["", "M33 56 C30 30 44 17 61 17 C78 17 90 30 87 56 C86 47 82 41 76 38 C66 43 50 43 42 37 C37 42 34 48 33 56 Z"],
  long: [
    "M27 57 C25 28 42 15 60 15 C78 15 95 28 93 57 L95 106 L25 106 Z",
    "M60 21 C44 21 31 31 30 51 C29.5 61 30.5 69 33 77 C37 59 45 44 60 37 C75 44 83 59 87 77 C89.5 69 90.5 61 90 51 C89 31 76 21 60 21 Z",
  ],
  bob: [
    "M29 55 C27 28 43 15 60 15 C77 15 93 28 91 55 L91 77 Q91 87 81 87 L39 87 Q29 87 29 77 Z",
    "M31 73 C27 41 40 21 60 21 C80 21 93 41 89 73 C87 63 85 55 83 48 Q60 52 37 48 C35 55 33 63 31 73 Z",
  ],
  bun: ["M48 15 a12 12 0 1 1 24 0 a12 12 0 1 1 -24 0 Z", "M34 54 C31 31 45 19 60 19 C75 19 89 31 86 54 C82 43 73 36 60 36 C47 36 38 43 34 54 Z"],
  curly: [
    "M25 37 a13 13 0 1 1 26 0 a13 13 0 1 1 -26 0 Z M39 25 a13 13 0 1 1 26 0 a13 13 0 1 1 -26 0 Z M56 25 a13 13 0 1 1 26 0 a13 13 0 1 1 -26 0 Z M70 37 a13 13 0 1 1 26 0 a13 13 0 1 1 -26 0 Z M21 53 a10 10 0 1 1 20 0 a10 10 0 1 1 -20 0 Z M79 53 a10 10 0 1 1 20 0 a10 10 0 1 1 -20 0 Z",
    "M35 51 C35 34 47 27 60 27 C73 27 85 34 85 51 C82 45 79 41 75 40 C72 44 66 44 63 40 C60 44 54 44 51 40 C48 44 42 44 40 41 C37 44 36 47 35 51 Z",
  ],
  crop: ["", "M35 51 C34 31 46 23 60 23 C74 23 86 31 85 51 C81 40 73 34 60 34 C47 34 39 40 35 51 Z"],
};

export interface AvatarConfig {
  tone: AvatarTone;
  skin: string;
  hair: AvatarHair;
  hairColor: string;
  glasses: boolean;
}

export const DEFAULT_AVATAR: AvatarConfig = { tone: "blue", skin: "#F2CDB0", hair: "short", hairColor: "#1F1D2B", glasses: false };

export function sanitizeAvatar(v: unknown): AvatarConfig {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return {
    tone: (AVATAR_TONES as readonly string[]).includes(o.tone as string) ? (o.tone as AvatarTone) : DEFAULT_AVATAR.tone,
    skin: (AVATAR_SKINS as readonly string[]).includes(o.skin as string) ? (o.skin as string) : DEFAULT_AVATAR.skin,
    hair: (AVATAR_HAIRS as readonly string[]).includes(o.hair as string) ? (o.hair as AvatarHair) : DEFAULT_AVATAR.hair,
    hairColor: (AVATAR_HAIR_COLORS as readonly string[]).includes(o.hairColor as string) ? (o.hairColor as string) : DEFAULT_AVATAR.hairColor,
    glasses: o.glasses === true,
  };
}
