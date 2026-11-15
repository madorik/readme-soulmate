// 아바타(시안 v3, 맹고색): 굵은 남색 선 + 점 눈. 머리·얼굴형·옷·소품·안경을 골라 조립하고, 색은 배경·옷·머리·피부에 쓴다.
// 웹 컴포넌트(components/Avatar.tsx)가 이 경로로 200×200 SVG를 그린다.

export const AVATAR_HAIRS = ["bob", "short", "side", "buzz", "long", "wave", "bangs", "bun", "pony", "twin", "curly", "perm", "bald"] as const;
export type AvatarHair = (typeof AVATAR_HAIRS)[number];

export const AVATAR_FACES = ["oval", "round", "long", "square", "vline"] as const;
export type AvatarFace = (typeof AVATAR_FACES)[number];

export const AVATAR_BODIES = ["shirt", "hoodie", "tee", "knit", "suit", "cardigan", "turtle", "zip"] as const;
export type AvatarBody = (typeof AVATAR_BODIES)[number];

export const AVATAR_ITEMS = ["none", "cap", "beanie", "headphones", "earrings", "necklace", "bowtie", "mustache", "flower", "ribbon", "hearts", "pencil", "heart"] as const;
export type AvatarItem = (typeof AVATAR_ITEMS)[number];

export const AVATAR_GLASSES = ["none", "round", "square", "sun"] as const;
export type AvatarGlasses = (typeof AVATAR_GLASSES)[number];

/** 배경: 망고·잎·귤 그라데이션 셋 + 단색 셋. [시작, 끝]. 키는 저장된 값이라 이름(sky…)은 그대로 둔다 */
export const AVATAR_BGS = ["sky", "water", "lilac", "rose", "ocean", "violet", "pale", "peach", "gray", "white"] as const;
export type AvatarBg = (typeof AVATAR_BGS)[number];
export const AVATAR_BG_FILLS: Record<AvatarBg, [string, string]> = {
  sky: ["#FFF6DD", "#FFE08A"],
  water: ["#EAFBEF", "#C9F0D6"],
  lilac: ["#FFF3E6", "#FFD9B3"],
  rose: ["#FFEFF3", "#FFCCD8"],
  ocean: ["#EAF4FF", "#C6DDFF"],
  violet: ["#F4EFFF", "#DCD0FF"],
  pale: ["#FFF4D6", "#FFF4D6"],
  peach: ["#FFE9DC", "#FFE9DC"],
  gray: ["#F1F2F7", "#F1F2F7"],
  white: ["#FFFFFF", "#FFFFFF"],
};

export const AVATAR_CLOTHS = ["#FFFFFF", "#1F2340", "#FFC23D", "#34B36A", "#FF9DB0", "#6CB4D9", "#7C8CF8", "#FF7A5A", "#C8283A", "#A3A8BC", "#E7D3B0", "#8B5E3C"] as const;
export const AVATAR_HAIR_COLORS = ["#1F2340", "#5A4334", "#A3A8BC", "#D9A15B", "#FFFFFF", "#F2D16B", "#A8553A", "#FF9DB0", "#7C8CF8"] as const;
/** 피부: 흰 얼굴(처음 모습)부터 진한 갈색까지 */
export const AVATAR_SKINS = ["#FFFFFF", "#FFF1E6", "#F8DCC3", "#E8B88F", "#C68B5E", "#8D5A3B"] as const;

export const AVATAR_INK = "#1F2340";

export interface AvatarConfig {
  hair: AvatarHair;
  face: AvatarFace;
  body: AvatarBody;
  item: AvatarItem;
  glasses: AvatarGlasses;
  bg: AvatarBg;
  cloth: string;
  hairColor: string;
  skin: string;
}

export const DEFAULT_AVATAR: AvatarConfig = { hair: "short", face: "oval", body: "shirt", item: "none", glasses: "none", bg: "sky", cloth: "#FFFFFF", hairColor: "#1F2340", skin: "#FFFFFF" };

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
  // 옆 가르마: 오른쪽 가르마에서 왼쪽으로 쓸어 넘긴 짧은 머리
  side: [NONE, "M67 100 C62 70 80 50 102 50 C124 50 140 68 133 94 C130 84 125 77 117 72 C112 85 92 93 67 100 Z"],
  // 스포츠머리: 머리에 붙은 짧은 머리
  buzz: [NONE, "M68 90 C66 68 82 56 100 56 C118 56 134 68 132 90 C126 80 114 75 100 75 C86 75 74 80 68 90 Z"],
  // 긴 웨이브
  wave: [
    "M60 170 C50 160 58 148 52 136 C46 122 56 110 52 98 C50 70 72 44 100 44 C128 44 150 70 148 98 C144 110 154 122 148 136 C142 148 150 160 140 170 C128 174 118 168 114 160 L86 160 C82 168 72 174 60 170 Z",
    "M67 100 C64 72 80 54 100 54 C120 54 136 72 133 100 C128 86 120 72 104 66 C96 78 82 90 67 100 Z",
  ],
  // 포니테일: 뒤로 묶어 오른쪽으로 내려온 꼬리
  pony: [
    "M126 66 C148 58 162 78 156 102 C152 120 142 132 132 138 C138 120 140 102 130 86 Z",
    "M67 96 C64 70 80 54 100 54 C120 54 136 70 133 96 C128 82 116 70 100 70 C84 70 72 82 67 96 Z",
  ],
  // 양갈래
  twin: [
    "M72 78 C52 78 44 100 48 122 C50 134 58 142 64 146 C62 128 64 112 72 98 Z M128 78 C148 78 156 100 152 122 C150 134 142 142 136 146 C138 128 136 112 128 98 Z",
    "M67 96 C64 70 80 54 100 54 C120 54 136 70 133 96 C126 84 112 72 100 66 C88 72 74 84 67 96 Z",
  ],
  // 뽀글 파마: 부풀린 뒷머리 + 뽀글 앞머리
  perm: [
    "M58 112 C48 108 46 94 54 88 C46 78 52 62 64 60 C64 46 80 38 92 44 C98 34 116 34 120 44 C134 38 148 48 144 62 C156 66 158 82 148 90 C156 98 152 112 142 114 C140 124 128 128 122 120 L78 120 C72 128 60 124 58 112 Z",
    "M68 92 C62 86 64 76 72 74 C70 64 80 58 88 62 C92 54 104 54 108 60 C116 54 128 60 126 70 C134 72 136 84 130 90 C126 82 118 78 112 80 C104 84 94 84 86 80 C78 80 72 86 68 92 Z",
  ],
  // 민머리: 귀 위 옆머리만
  bald: [NONE, "M68 99 C66 93 67 87 70 82 L73 99 Z M132 99 C134 93 133 87 130 82 L127 99 Z"],
};

/** 얼굴형: 얼굴 윤곽과, 귀를 얼굴 쪽으로 붙일 만큼(가는 얼굴일수록 안으로) */
export const FACE_SHAPES: Record<AvatarFace, { d: string; ear: number }> = {
  oval: { d: "M68 96 A32 36 0 1 0 132 96 A32 36 0 1 0 68 96 Z", ear: 0 },
  round: { d: "M66 97 A34 35 0 1 0 134 97 A34 35 0 1 0 66 97 Z", ear: -1 },
  long: { d: "M71 96 A29 38 0 1 0 129 96 A29 38 0 1 0 71 96 Z", ear: 2.5 },
  square: { d: "M68 84 C68 66 82 60 100 60 C118 60 132 66 132 84 V108 C132 124 120 132 100 132 C80 132 68 124 68 108 Z", ear: 0 },
  vline: { d: "M68 92 C68 72 82 60 100 60 C118 60 132 72 132 92 C132 112 116 133 100 133 C84 133 68 112 68 92 Z", ear: 0 },
};

const ARMS = "M64 182 C66 188 66 194 65 200 M136 182 C134 188 134 194 135 200";
export const BODY_OUTLINE = "M36 200 C38 172 56 156 88 151 L112 151 C144 156 162 172 164 200 Z";

/** 옷: fill(옷 색 면) · white(흰 면) · line(선) · band(선 없이 옷 선 색으로 칠한 면, 줄무늬 등) · tie(넥타이) */
export const BODY_PATHS: Record<AvatarBody, { fill: string; white: string; line: string; band?: string; tie?: string }> = {
  shirt: { fill: "M90 149 L80 163 L97 168 L100 155 Z M110 149 L120 163 L103 168 L100 155 Z", white: NONE, line: `M100 166 V200 ${ARMS}` },
  hoodie: { fill: "M74 160 C70 140 90 134 100 144 C110 134 130 140 126 160 C116 153 108 151 100 151 C92 151 84 153 74 160 Z", white: NONE, line: `M93 162 V180 M107 162 V180 ${ARMS}` },
  tee: { fill: NONE, white: "M88 151 C91 162 109 162 112 151 Z", line: ARMS },
  knit: { fill: NONE, white: "M88 151 C91 160 109 160 112 151 Z", line: `M46 176 H154 M41 190 H159 ${ARMS}` },
  suit: { fill: NONE, white: "M86 151 L100 174 L114 151 Z", line: `M86 151 L92 180 L100 174 L108 180 L114 151 ${ARMS}`, tie: "M97.6 156 H102.4 L104 170 L100 175 L96 170 Z" },
  cardigan: { fill: NONE, white: "M91 151 C93 158 107 158 109 151 L106 200 H94 Z", line: `M89 170 h0.01 M89 183 h0.01 M89 196 h0.01 ${ARMS}` },
  turtle: { fill: "M86 136 H114 V153 C106 156 94 156 86 153 Z", white: NONE, line: `M86 145 H114 ${ARMS}` },
  zip: { fill: "M84 147 L88 160 L100 163 L112 160 L116 147 C108 152 92 152 84 147 Z", white: NONE, line: `M100 163 V200 M97 170 H103 ${ARMS}` },
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
  // 야구 모자: 머리 위 둥근 모자 + 앞 챙
  cap: {
    a: "M66 82 C64 58 82 45 100 45 C118 45 136 58 134 82 C120 77 80 77 66 82 Z M62 84 C80 75 120 75 138 84 C141 88 137 93 132 91 C112 84 88 84 68 91 C63 93 59 88 62 84 Z",
    color: "#6CB4D9",
    b: NONE,
    w: "M100 41 A3.5 3.5 0 1 1 99.99 41 Z",
    l: NONE,
  },
  // 털모자: 망고 모자 + 분홍 밴드 + 흰 방울
  beanie: {
    a: "M66 80 C64 56 82 43 100 43 C118 43 136 56 134 80 Z",
    color: "#FFC23D",
    b: "M64 76 H136 Q140 76 140 82 V86 Q140 92 136 92 H64 Q60 92 60 86 V82 Q60 76 64 76 Z",
    w: "M100 30 A7 7 0 1 1 99.99 30 Z",
    l: NONE,
  },
  // 귀걸이: 귀 밑에 동그란 금색
  earrings: { a: "M59 114 A4 4 0 1 0 67 114 A4 4 0 1 0 59 114 Z M133 114 A4 4 0 1 0 141 114 A4 4 0 1 0 133 114 Z", color: "#FFC23D", b: NONE, w: NONE, l: "M63 107 V110 M137 107 V110" },
  // 목걸이: 가는 줄 + 망고 펜던트
  necklace: { a: "M100 159 L105 165 L100 171 L95 165 Z", color: "#FFC23D", b: NONE, w: NONE, l: "M89 151 C92 158 97 159 100 159 C103 159 108 158 111 151" },
  // 나비넥타이
  bowtie: { a: NONE, color: "#FFFFFF", b: "M100 157 L87 150 L87 164 Z M100 157 L113 150 L113 164 Z M97 154 H103 V160 H97 Z", w: NONE, l: NONE },
  // 하트: 머리 옆에 떠 있는 분홍 하트 둘
  hearts: { a: NONE, color: "#FFFFFF", b: "M152 57.9 C149.8 55.7 141 50.2 141 44.7 C141 38.8 147.6 36.6 152 41.8 C156.4 36.6 163 38.8 163 44.7 C163 50.2 154.2 55.7 152 57.9 Z M171 32.9 C169.7 31.6 164.5 28.3 164.5 25.1 C164.5 21.5 168.4 20.2 171 23.4 C173.6 20.2 177.5 21.5 177.5 25.1 C177.5 28.3 172.3 31.6 171 32.9 Z", w: NONE, l: NONE },
  // 콧수염
  mustache: { a: "M100 112 C94 106 84 108 81 115 C88 112 94 117 100 114.5 C106 117 112 112 119 115 C116 108 106 106 100 112 Z", color: "#1F2340", b: NONE, w: NONE, l: NONE },
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
    face: pick(AVATAR_FACES, o.face) ?? DEFAULT_AVATAR.face,
    body: pick(AVATAR_BODIES, o.body) ?? DEFAULT_AVATAR.body,
    item: pick(AVATAR_ITEMS, o.item) ?? DEFAULT_AVATAR.item,
    glasses: pick(AVATAR_GLASSES, o.glasses) ?? (o.glasses === true ? "round" : DEFAULT_AVATAR.glasses),
    bg: pick(AVATAR_BGS, o.bg) ?? OLD_TONE_BG[tone] ?? DEFAULT_AVATAR.bg,
    cloth: pick(AVATAR_CLOTHS, o.cloth) ?? OLD_CLOTH[o.cloth as string] ?? OLD_TONE_CLOTH[tone] ?? DEFAULT_AVATAR.cloth,
    hairColor: pick(AVATAR_HAIR_COLORS, o.hairColor) ?? OLD_HAIR_COLOR[o.hairColor as string] ?? DEFAULT_AVATAR.hairColor,
    skin: pick(AVATAR_SKINS, o.skin) ?? DEFAULT_AVATAR.skin,
  };
}
