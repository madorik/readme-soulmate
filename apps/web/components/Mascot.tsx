// 마스코트 '리디': 접힌 쪽지(컨닝페이퍼) 한 장. 흰 몸 + 남색 선 + 점 눈. 오늘의 질문·요청하기·온보딩에서 말을 건다.

const INK = "#1F2340";

export function Mascot({ size = 48, bubble }: { size?: number; bubble?: "question" }) {
  const w = bubble ? 132 : 120;
  return (
    <svg aria-hidden="true" width={(size * w) / 130} height={size} viewBox={`0 0 ${w} 130`} className="block shrink-0">
      <path d="M24 72 C14 70 9 62 10 54" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M96 70 C106 66 110 58 108 50" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M46 106 V118 M74 106 V118" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M34 20 H78 L98 40 V98 Q98 110 86 110 H34 Q22 110 22 98 V32 Q22 20 34 20 Z" fill="#FFFFFF" stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
      <path d="M78 20 V34 Q78 40 84 40 H98 Z" fill="#FFE7A6" stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
      <path d="M38 86 H72 M38 96 H60" stroke="#E4E6EE" strokeWidth="4" strokeLinecap="round" />
      <circle cx="47" cy="58" r="4.8" fill={INK} />
      <circle cx="71" cy="58" r="4.8" fill={INK} />
      <ellipse cx="39" cy="68" rx="5.8" ry="3.4" fill="#FFBFCB" />
      <ellipse cx="79" cy="68" rx="5.8" ry="3.4" fill="#FFBFCB" />
      <path d="M54 66 Q59 71 64 66" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      {bubble ? (
        <>
          <path d="M102 4 h20 a6 6 0 0 1 6 6 v12 a6 6 0 0 1 -6 6 h-8 l-6 6 v-6 h-6 a6 6 0 0 1 -6 -6 v-12 a6 6 0 0 1 6 -6z" fill="#FFFFFF" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <path d="M107.5 13 a4 4 0 1 1 5.5 3.7 c-1 .4-1.5 1.2-1.5 2.2 M111.5 23.5 v.01" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
        </>
      ) : null}
    </svg>
  );
}
