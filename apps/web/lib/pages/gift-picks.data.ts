// 이런 선물은 어때요(선물 힌트·여러 사람 선물 화면이 같이 쓰는 조각)의 데이터 모양. lib/pages/gift-picks.ts가 만들고 components/GiftPicksView가 그린다.
// 토스 미니앱 번들도 읽으므로 타입만 둔다(서버 전용 코드를 들이지 않는다)

/** 쿠팡 상품 하나(lib/gift-core CoupangProduct와 같은 모양) */
export interface GiftPickProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  /** 파트너스 링크(link.coupang.com) */
  url: string;
  rocket: boolean;
}

/** 상품 방식: 찾을 말 하나와 '왜', 쿠팡 상품 줄(lib/gifts GiftPick과 같은 모양) */
export interface GiftPickData {
  keyword: string;
  reason: string;
  basis?: string[];
  products: GiftPickProduct[];
  /** 더 보기: 쿠팡 검색 화면 */
  more: string;
}

/** 고른 선물. 하나도 못 고르면 null(힌트 단추 줄만 보인다) */
export type GiftPicksData =
  | {
      /** 목록 방식(쿠팡 API 키가 없을 때): 가격대 칩 + 파트너스 링크 목록 */
      kind: "links";
      /** 가격대마다 고른 것(basis는 뻔한 말을 뺀 것) */
      bands: { band: string; items: { id: string; title: string; reason: string; url: string; image: string; basis: string[]; badge?: "pick" | "top" }[] }[];
      initial: string;
      /** 무엇을 보고 골랐는지 한두 문장 */
      note: string;
      /** 다시 고르기에 실어 보낼 '지금까지 보인 것'(skip) */
      next: string;
      /** 가족에게 보낼 카드(선물 힌트 화면에서만) */
      share: { url: string; text: string } | null;
      source: "reminder" | "plan";
    }
  | { kind: "products"; picks: GiftPickData[] };
