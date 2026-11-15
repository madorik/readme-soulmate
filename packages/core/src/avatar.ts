// 아바타(시안 v3, 맹고색): 굵은 남색 선 + 흰 얼굴 + 점 눈. 머리·옷·소품·안경을 골라 조립하고, 색은 배경·옷·머리에만 쓴다.
// 웹 컴포넌트(components/Avatar.tsx)가 이 경로로 200×200 SVG를 그린다.

export const AVATAR_HAIRS = ["bob", "short", "long", "bun", "curly", "bangs"] as const;
export type AvatarHair = (typeof AVATAR_HAIRS)[number];

export const AVATAR_BODIES = ["shirt", "hoodie", "tee", "knit"] as const;
export type AvatarBody = (typeof AVATAR_BODIES)[number];

export const AVATAR_ITEMS = ["none", "headphones", "flower", "pencil", "heart", "ribbon"] as const;
export type AvatarItem = (typeof AVATAR_ITEMS)[number];

export const AVATAR_GLASSES = ["none", "round", "square", "sun"] as const;
export type AvatarGlasses = (typeof AVATAR_GLASSES)[number];

/** 배경: 망고·잎·귤 그라데이션 셋 + 단색 셋. [시작, 끝]. 키는 저장된 값이라 이름(sky…)은 그대로 둔다 */
export const AVATAR_BGS = ["sky", "water", "lilac", "pale", "gray", "white"] as const;
export type AvatarBg = (typeof AVATAR_BGS)[number];
export const AVATAR_BG_FILLS: Record<AvatarBg, [string, string]> = {
  sky: ["#FFF6DD", "#FFE08A"],
  water: ["#EAFBEF", "#C9F0D6"],
  lilac: ["#FFF3E6", "#FFD9B3"],
  pale: ["#FFF4D6", "#FFF4D6"],
  gray: ["#F1F2F7", "#F1F2F7"],
  white: ["#FFFFFF", "#FFFFFF"],
};

export const AVATAR_CLOTHS = ["#FFFFFF", "#1F2340", "#FFC23D", "#34B36A", "#FF9DB0"] as const;
export const AVATAR_HAIR_COLORS = ["#1F2340", "#5A4334", "#A3A8BC", "#D9A15B"] as const;

export const AVATAR_INK = "#1F2340";

export interface AvatarConfig {
  hair: AvatarHair;
  body: AvatarBody;
  item: AvatarItem;
  glasses: AvatarGlasses;
  bg: AvatarBg;
  cloth: string;
  hairColor: string;
}

export const DEFAULT_AVATAR: AvatarConfig = { hair: "short", body: "shirt", item: "none", glasses: "none", bg: "sky", cloth: "#FFFFFF", hairColor: "#1F2340" };

const NONE = "";

/** [뒷머리, 앞머리]. 뷰박스 200×200 */
export const HAIR_PATHS: Record<AvatarHair, [string, string]> = {
  bob: [
    "M62 128 C48 124 46 108 54 100 C44 90 50 72 62 68 C62 52 78 42 94 44 C106 36 128 42 134 56 C150 60 156 80 146 92 C156 104 150 124 136 126 C130 134 116 134 112 126 L88 126 C84 134 68 134 62 128 Z",
    "M68 96 C64 74 78 58 98 58 C118 56 134 70 132 92 C124 88 116 80 112 72 C104 82 86 90 68 96 Z",
  ],
  short: [NONE, "M67 98 C63 70 80 50 102 50 C124 50 139 70 133 98 C129 88 125 80 118 75 C104 81 86 80 76 73 C72 81 69 89 67 98 Z"],
  long: [
    "M60 168 C56 140 58 110 62 84 C64 58 80 44 100 44 C120 44 136 58 138 84 C142 110 144 140 140 168 C128 172 118 168 114 160 L86 160 C82 168 72 172 60 168 Z",
    "M67 100 C64 72 80 54 100 54 C120 54 136 72 133 100 C126 86 116 70 101 64 C88 70 74 84 67 100 Z",
  ],
  bun: [
    "M100 20 C110 20 118 28 118 38 C118 48 110 55 100 55 C90 55 82 48 82 38 C82 28 90 20 100 20 Z",
    "M67 96 C64 70 80 54 100 54 C120 54 136 70 133 96 C128 82 116 70 100 70 C84 70 72 82 67 96 Z",
  ],
  curly: [
    NONE,
    "M66 100 C58 96 58 84 64 80 C58 72 64 60 74 60 C74 50 86 44 94 50 C98 40 112 40 116 48 C124 42 136 50 134 60 C144 62 146 76 138 82 C144 88 142 98 134 100 C130 90 124 82 118 80 C110 86 92 86 82 80 C76 84 70 92 66 100 Z",
  ],
  bangs: [
    "M62 132 C58 104 58 80 64 66 C70 52 84 44 100 44 C116 44 130 52 136 66 C142 80 142 104 138 132 C126 136 118 134 114 130 L86 130 C82 134 74 136 62 132 Z",
    "M67 92 C66 70 80 54 100 54 C120 54 134 70 133 92 C120 87 80 87 67 92 Z",
  ],
};

const ARMS = "M64 182 C66 188 66 194 65 200 M136 182 C134 188 134 194 135 200";
export const BODY_OUTLINE = "M36 200 C38 172 56 156 88 151 L112 151 C144 156 162 172 164 200 Z";

/** 옷: fill(옷 색 면) · white(흰 면) · line(선) */
export const BODY_PATHS: Record<AvatarBody, { fill: string; white: string; line: string }> = {
  shirt: { fill: "M90 149 L80 163 L97 168 L100 155 Z M110 149 L120 163 L103 168 L100 155 Z", white: NONE, line: `M100 166 V200 ${ARMS}` },
  hoodie: { fill: "M74 160 C70 140 90 134 100 144 C110 134 130 140 126 160 C116 153 108 151 100 151 C92 151 84 153 74 160 Z", white: NONE, line: `M93 162 V180 M107 162 V180 ${ARMS}` },
  tee: { fill: NONE, white: "M88 151 C91 162 109 162 112 151 Z", line: ARMS },
  knit: { fill: NONE, white: "M88 151 C91 160 109 160 112 151 Z", line: `M46 176 H154 M41 190 H159 ${ARMS}` },
};

/** 안경: [채운 면, 선] */
export const GLASSES_PATHS: Record<AvatarGlasses, [string, string]> = {
  none: [NONE, NONE],
  round: [NONE, "M78 101 A10 10 0 1 0 98 101 A10 10 0 1 0 78 101 Z M102 101 A10 10 0 1 0 122 101 A10 10 0 1 0 102 101 Z M98 100 Q100 97 102 100 M78 99 L69 96 M122 99 L131 96"],
  square: [NONE, "M77 93 H98 V108 H77 Z M102 93 H123 V108 H102 Z M98 99 H102 M77 98 L69 96 M123 98 L131 96"],
  sun: [
    "M76 94 H98 V101 C98 107 94 111 87 111 C80 111 76 106 76 100 Z M102 94 H124 V100 C124 106 120 111 113 111 C106 111 102 107 102 101 Z",
    "M98 97 H102 M76 97 L69 95 M124 97 L131 95",
  ],
};

/** 소품: a(색 면, 색은 color) · b(분홍 면) · w(흰 면) · l(선). 그리는 순서도 a → b → w → l */
export const ITEM_PATHS: Record<AvatarItem, { a: string; color: string; b: string; w: string; l: string }> = {
  none: { a: NONE, color: "#FFFFFF", b: NONE, w: NONE, l: NONE },
  headphones: {
    a: "M56 88 H68 V114 H56 Q51 114 51 109 V93 Q51 88 56 88 Z M132 88 H144 Q149 88 149 93 V109 Q149 114 144 114 H132 Z",
    color: "#FFC23D",
    b: NONE,
    w: NONE,
    l: "M60 88 C56 40 144 40 140 88",
  },
  flower: {
    a: NONE,
    color: "#FFFFFF",
    b: "M126 52 A6 6 0 1 1 125.99 52 Z M134.6 58.2 A6 6 0 1 1 134.59 58.2 Z M131.3 68.3 A6 6 0 1 1 131.29 68.3 Z M120.7 68.3 A6 6 0 1 1 120.69 68.3 Z M117.4 58.2 A6 6 0 1 1 117.39 58.2 Z",
    w: "M126 62.5 A4.5 4.5 0 1 1 125.99 62.5 Z",
    l: NONE,
  },
  pencil: {
    a: "M126.8 85.6 L147.3 57.8 L153.7 62.6 L133.2 90.4 Z",
    color: "#FFE08A",
    b: "M126.8 85.6 L133.2 90.4 L130 94.6 L123.6 89.8 Z",
    w: "M147.3 57.8 L158 49 L153.7 62.6 Z",
    l: NONE,
  },
  heart: {
    a: "M140 28 H176 Q186 28 186 38 V58 Q186 68 176 68 H158 L146 77 L149 68 H140 Q130 68 130 58 V38 Q130 28 140 28 Z",
    color: "#FFFFFF",
    b: "M158 56 C149 50 147 43 151 40 C154 38 158 40 158 43 C158 40 162 38 165 40 C169 43 167 50 158 56 Z",
    w: NONE,
    l: NONE,
  },
  ribbon: { a: NONE, color: "#FFFFFF", b: "M80 56 L64 46 L66 66 Z M80 56 L96 46 L94 66 Z M80 50 A6 6 0 1 1 79.99 50 Z", w: NONE, l: NONE },
};

const pick = <T extends string>(list: readonly T[], v: unknown): T | null => ((list as readonly string[]).includes(v as string) ? (v as T) : null);

// 예전(시안 v2) 아바타 값 → 새 값. 저장된 값은 그대로 두고 읽을 때 바꾼다
const OLD_TONE_BG: Record<string, AvatarBg> = { blue: "sky", green: "water", red: "lilac", yellow: "pale", navy: "gray" };
const OLD_TONE_CLOTH: Record<string, string> = { blue: "#1F2340", navy: "#1F2340", red: "#FF9DB0", green: "#34B36A", yellow: "#FFC23D" };
const OLD_HAIR: Record<string, AvatarHair> = { crop: "short" };
// 하늘색 시절(v3 하늘) 옷·머리색도 맹고색으로
const OLD_CLOTH: Record<string, string> = { "#22304A": "#1F2340", "#8CC8FF": "#FFC23D", "#BFE0FF": "#FFC23D" };
const OLD_HAIR_COLOR: Record<string, string> = { "#1F1D2B": "#1F2340", "#3A2A22": "#5A4334", "#6B3F2A": "#5A4334", "#9A98A3": "#A3A8BC", "#22304A": "#1F2340", "#A9B2C2": "#A3A8BC" };

export function sanitizeAvatar(v: unknown): AvatarConfig {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const tone = typeof o.tone === "string" ? o.tone : "";
  return {
    hair: pick(AVATAR_HAIRS, o.hair) ?? OLD_HAIR[o.hair as string] ?? DEFAULT_AVATAR.hair,
    body: pick(AVATAR_BODIES, o.body) ?? DEFAULT_AVATAR.body,
    item: pick(AVATAR_ITEMS, o.item) ?? DEFAULT_AVATAR.item,
    glasses: pick(AVATAR_GLASSES, o.glasses) ?? (o.glasses === true ? "round" : DEFAULT_AVATAR.glasses),
    bg: pick(AVATAR_BGS, o.bg) ?? OLD_TONE_BG[tone] ?? DEFAULT_AVATAR.bg,
    cloth: pick(AVATAR_CLOTHS, o.cloth) ?? OLD_CLOTH[o.cloth as string] ?? OLD_TONE_CLOTH[tone] ?? DEFAULT_AVATAR.cloth,
    hairColor: pick(AVATAR_HAIR_COLORS, o.hairColor) ?? OLD_HAIR_COLOR[o.hairColor as string] ?? DEFAULT_AVATAR.hairColor,
  };
}
