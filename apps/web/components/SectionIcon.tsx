import type { Section } from "@readme/core";

// 내 리드미 항목 아이콘: 선 캐릭터와 같은 남색 굵은 선 + 색 채움, 연한 색 타일 위에
const INK = "#1F2340";
const MANGO = "#FFC23D";

const TILE: Record<Section, string> = {
  dates: "#FFF4D6",
  safety: "#FDE9EA",
  taste: "#FFF0E3",
  gifts: "#FFE8EE",
  sizes: "#E7F7EA",
  favorites: "#F1ECFF",
  culture: "#E9EDFF",
  life: "#E6F3FB",
};

const line = { stroke: INK, strokeWidth: 1.9, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

function Art({ section }: { section: Section }) {
  switch (section) {
    case "dates":
      // 촛불 하나 꽂힌 케이크
      return (
        <>
          <path d="M16 3.6c1.3 1.5 1.6 2.6 0 3.9-1.6-1.3-1.3-2.4 0-3.9z" fill={MANGO} {...line} strokeWidth={1.5} />
          <rect x="14.8" y="8" width="2.4" height="5" rx="1" fill="#FF9DB0" {...line} strokeWidth={1.5} />
          <path d="M7 15a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10H7z" fill="#FFFFFF" {...line} />
          <path d="M7 15a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2.2c-1.5 1.4-3 1.4-4.5 0-1.5 1.4-3 1.4-4.5 0-1.5 1.4-3 1.4-4.5 0-1.5 1.4-3 1.4-4.5 0z" fill={MANGO} {...line} />
          <path d="M4.5 25.5h23" {...line} />
        </>
      );
    case "safety":
      // 포크·나이프와 접시(못 먹는 음식·알레르기)
      return (
        <>
          <path d="M4.6 4v5.4c0 1.6 1.1 2.7 2.4 2.7s2.4-1.1 2.4-2.7V4M7 4v6.4M7 12.1V28" fill="none" {...line} strokeWidth={1.8} />
          <circle cx="16.5" cy="16" r="8.4" fill="#FFFFFF" {...line} />
          <circle cx="16.5" cy="16" r="5" fill="#FF8A96" {...line} strokeWidth={1.6} />
          <path d="M25.4 4c2.4 1.5 3 5.2 3 8.7h-3z" fill="#FFFFFF" {...line} strokeWidth={1.7} />
          <path d="M26.9 12.7V28" {...line} strokeWidth={1.8} />
        </>
      );
    case "taste":
      // 젓가락 걸친 밥그릇
      return (
        <>
          <path d="M18.5 11.5L27 4.5M21 12.5l7.2-5.4" {...line} />
          <path d="M8.5 15c.6-3.6 3.8-5.6 7.5-5.6s6.9 2 7.5 5.6" fill="#FFFFFF" {...line} />
          <path d="M5.5 15h21c0 5.7-4.7 9.8-10.5 9.8S5.5 20.7 5.5 15z" fill="#FF9F5A" {...line} />
          <path d="M12.5 24.6h7v2.4h-7z" fill="#FF9F5A" {...line} />
        </>
      );
    case "gifts":
      // 리본 맨 선물 상자
      return (
        <>
          <path d="M16 11.2c-3.4-.3-5.9-2.3-4.6-4.1 1.4-1.9 3.9.2 4.6 4.1zM16 11.2c3.4-.3 5.9-2.3 4.6-4.1-1.4-1.9-3.9.2-4.6 4.1z" fill={MANGO} {...line} strokeWidth={1.6} />
          <rect x="7" y="16" width="18" height="11" rx="1.5" fill="#FF9DB0" {...line} />
          <rect x="5" y="11.2" width="22" height="5" rx="1.5" fill="#FF9DB0" {...line} />
          <path d="M14.6 11.2h2.8V27h-2.8z" fill={MANGO} {...line} strokeWidth={1.6} />
        </>
      );
    case "sizes":
      // 티셔츠
      return (
        <>
          <path d="M11.5 5.5L6 8.2 3.6 13l4 2 1.4-1.8V27h14V13.2l1.4 1.8 4-2L26 8.2l-5.5-2.7c-.9 1.9-2.6 3-4.5 3s-3.6-1.1-4.5-3z" fill="#86D07F" {...line} />
          <path d="M12.5 19.5h7" {...line} stroke="#FFFFFF" strokeWidth={2} />
        </>
      );
    case "favorites":
      // 반짝이는 하트
      return (
        <>
          <path d="M16 26.5S5.5 20.2 5.5 13c0-3.4 2.5-5.8 5.5-5.8 2.2 0 4 1.3 5 3.2 1-1.9 2.8-3.2 5-3.2 3 0 5.5 2.4 5.5 5.8 0 7.2-10.5 13.5-10.5 13.5z" fill="#FF7A8A" {...line} />
          <path d="M25.3 2.8l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" fill={MANGO} {...line} strokeWidth={1.4} />
          <path d="M10 12.3c.4-1.2 1.3-1.9 2.4-2" stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" fill="none" />
        </>
      );
    case "culture":
      // 영화 슬레이트와 음표
      return (
        <>
          <path d="M4.5 13.5h17v11a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" fill="#7C8CF8" {...line} />
          <path d="M4.2 9.6l15.8-4.2.9 3.4-15.8 4.2z" fill="#FFFFFF" {...line} strokeWidth={1.7} />
          <path d="M8.6 8.4l1.6 3.1M13 7.2l1.6 3.1M17.4 6.1l1.4 3" stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
          <path d="M9 18.5h8" stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" />
          <path d="M25.5 11v8.6" {...line} />
          <path d="M25.5 11l3-1.2v2.6l-3 1.2" fill={MANGO} {...line} strokeWidth={1.5} />
          <ellipse cx="23.9" cy="20" rx="2.1" ry="1.7" fill={MANGO} {...line} strokeWidth={1.6} />
        </>
      );
    case "life":
      // 여행 가방
      return (
        <>
          <path d="M12.5 9.5V7a1.5 1.5 0 0 1 1.5-1.5h4A1.5 1.5 0 0 1 19.5 7v2.5" fill="none" {...line} />
          <rect x="5" y="9.5" width="22" height="15.5" rx="3" fill="#6CB4D9" {...line} />
          <path d="M11 9.5V25M21 9.5V25" {...line} />
          <circle cx="10" cy="27" r="1.3" fill={INK} />
          <circle cx="22" cy="27" r="1.3" fill={INK} />
        </>
      );
  }
}

export function SectionIcon({ section, size = 44 }: { section: Section; size?: number }) {
  return (
    <span aria-hidden="true" className="flex shrink-0 items-center justify-center rounded-[14px]" style={{ width: size, height: size, background: TILE[section] }}>
      <svg width={Math.round(size * 0.66)} height={Math.round(size * 0.66)} viewBox="0 0 32 32" fill="none">
        <Art section={section} />
      </svg>
    </span>
  );
}
