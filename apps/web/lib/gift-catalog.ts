// 선물 찾을 말 목록(쿠팡 파트너스 간편 링크, 2026-11-16 만듦). API 키가 없을 때 선물 추천은 이 안에서만 고른다.
// 링크는 쿠팡 검색 화면으로 간다(파트너스 링크는 가격 필터를 지워서, 가격대는 찾을 말을 그 가격대에 드는 것으로 골라 나눴다).
// 고치려면: 파트너스 > 링크 생성 > 간편 링크 만들기에 https://www.coupang.com/np/search?q=<찾을 말> 을 넣어 만든 링크로 바꾼다.

export const PRICE_BANDS = ["1", "3", "5", "10"] as const;
export type PriceBand = (typeof PRICE_BANDS)[number];

export interface CatalogGift {
  id: string;
  /** 쿠팡 찾을 말 = 화면에 보이는 이름 */
  q: string;
  band: PriceBand;
  /** 어울리는 나이(포함) */
  ages: [number, number];
  /** 기록에 이 말이 있으면 어울린다(취미·취향) */
  tags: string[];
  /** 파트너스 링크 */
  url: string;
  /** 든 알레르기(ALLERGENS 코드). 이 알레르기가 있는 사람에게는 고르지 않는다 */
  allergens: string[];
}

function g(id: string, q: string, band: PriceBand, ages: [number, number], tags: string[], url: string, allergens: string[] = []): CatalogGift {
  return { id, q, band, ages, tags, url, allergens };
}

export const GIFT_CATALOG: CatalogGift[] = [
  // 1만원대
  g("hand-cream", "핸드크림 선물세트", "1", [20, 80], ["향", "뷰티", "핸드크림"], "https://link.coupang.com/a/iIAbmVzoui"),
  g("lip-balm", "립밤 선물세트", "1", [20, 50], ["뷰티", "화장품"], "https://link.coupang.com/a/iIAbuVtCwK"),
  g("soap-flower", "비누꽃 꽃다발", "1", [20, 80], ["꽃", "장미", "튤립", "수국"], "https://link.coupang.com/a/iIAbDVv0rQ"),
  g("drip-bag", "드립백 커피 선물세트", "1", [20, 80], ["커피", "카페", "아메리카노", "라떼"], "https://link.coupang.com/a/iIAbOPfvTE"),
  g("tea-bag", "티백 선물세트", "1", [20, 80], ["차", "홍차", "녹차", "허브티"], "https://link.coupang.com/a/iIAbVphuRU"),
  g("cookie", "수제 쿠키 선물세트", "1", [20, 60], ["디저트", "간식", "쿠키", "빵"], "https://link.coupang.com/a/iIAb4zuUPQ", ["wheat", "milk", "egg"]),
  g("honey-stick", "꿀스틱 선물세트", "1", [40, 80], ["건강", "꿀", "차"], "https://link.coupang.com/a/iIAceet3Jc"),
  g("beer-glass", "맥주잔 세트", "1", [20, 60], ["맥주", "술", "하이볼"], "https://link.coupang.com/a/iIAcmdsX8u"),
  g("massage-roller", "마사지 롤러", "1", [20, 70], ["마사지", "운동", "피로", "헬스"], "https://link.coupang.com/a/iIAcwTJFeu"),
  g("camping-mug", "캠핑 머그컵", "1", [20, 60], ["캠핑", "차박", "글램핑"], "https://link.coupang.com/a/iIAcFXdejQ"),
  g("hiking-socks", "등산 양말 세트", "1", [30, 80], ["등산", "산행", "트레킹", "걷기"], "https://link.coupang.com/a/iIAcOMbgaq"),
  g("ball-marker", "골프 볼마커", "1", [30, 80], ["골프"], "https://link.coupang.com/a/iIAcWowMpw"),
  g("running-socks", "러닝 양말", "1", [20, 50], ["러닝", "달리기", "마라톤", "조깅"], "https://link.coupang.com/a/iIAc39SWzI"),
  g("foam-roller", "폼롤러", "1", [20, 60], ["요가", "필라테스", "스트레칭", "헬스", "운동"], "https://link.coupang.com/a/iIAddD4kIS"),
  g("bookmark", "금속 책갈피", "1", [20, 80], ["독서", "책", "소설", "시"], "https://link.coupang.com/a/iIAdkW58jQ"),
  g("puzzle", "직소퍼즐 1000피스", "1", [20, 70], ["퍼즐", "게임", "집콕"], "https://link.coupang.com/a/iIAds9tIho"),
  g("coloring", "어른 컬러링북", "1", [20, 80], ["그림", "색칠", "미술", "취미"], "https://link.coupang.com/a/iIAdAPep5g"),
  g("dog-treat", "강아지 간식 선물세트", "1", [20, 70], ["강아지", "반려견", "개"], "https://link.coupang.com/a/iIAdHYBRf2"),
  g("cat-toy", "고양이 장난감", "1", [20, 70], ["고양이", "반려묘", "냥이"], "https://link.coupang.com/a/iIAdSzAQjQ"),
  g("travel-pouch", "여행용 파우치 세트", "1", [20, 60], ["여행", "출장"], "https://link.coupang.com/a/iIAd2KIxI4"),
  g("candle", "향초 선물세트", "1", [20, 60], ["향", "캔들", "인테리어", "휴식"], "https://link.coupang.com/a/iIAecoOmAK"),
  g("socks", "양말 선물세트", "1", [20, 80], ["패션", "실용"], "https://link.coupang.com/a/iIAemBW2I8"),
  g("fishing-gloves", "낚시 장갑", "1", [30, 80], ["낚시", "바다"], "https://link.coupang.com/a/iIAewrFp7I"),
  g("photo-album", "포토앨범", "1", [20, 70], ["사진", "추억", "카메라"], "https://link.coupang.com/a/iIAeGp1aF2"),
  // 3만원대
  g("diffuser", "디퓨저 선물세트", "3", [20, 70], ["향", "인테리어", "집"], "https://link.coupang.com/a/iIAeP94zg4"),
  g("bouquet", "꽃다발", "3", [20, 80], ["꽃", "장미", "튤립", "수국", "프리지아"], "https://link.coupang.com/a/iIAeZkRbu8"),
  g("plant", "반려식물 화분", "3", [30, 80], ["식물", "원예", "정원", "화분", "가드닝"], "https://link.coupang.com/a/iIAe9W9uMe"),
  g("coffee-beans", "원두 커피 선물세트", "3", [20, 80], ["커피", "카페", "원두"], "https://link.coupang.com/a/iIAfhESoGO"),
  g("black-tea", "홍차 선물세트", "3", [20, 80], ["차", "홍차", "티"], "https://link.coupang.com/a/iIAfpUUeHI"),
  g("macaron", "마카롱 선물세트", "3", [20, 60], ["디저트", "마카롱", "간식"], "https://link.coupang.com/a/iIAfxniNAO", ["egg", "milk", "tree_nut"]),
  g("chocolate", "수제 초콜릿 선물세트", "3", [20, 60], ["초콜릿", "디저트", "간식"], "https://link.coupang.com/a/iIAfFj7XP2", ["milk", "tree_nut"]),
  g("nuts", "하루견과 선물세트", "3", [30, 80], ["건강", "견과", "간식"], "https://link.coupang.com/a/iIAfMSIa9k", ["peanut", "tree_nut", "walnut", "pine_nut"]),
  g("fruit", "과일 선물세트", "3", [30, 80], ["과일", "사과", "배", "샤인머스캣"], "https://link.coupang.com/a/iIAfU5qSGa", ["peach"]),
  g("wine-glass", "와인잔 세트", "3", [25, 70], ["와인", "술"], "https://link.coupang.com/a/iIAf2xOrLw"),
  g("heat-pad", "목 어깨 찜질기", "3", [40, 80], ["마사지", "어깨", "피로", "휴식", "건강"], "https://link.coupang.com/a/iIAgbhEarc"),
  g("radio", "효도 라디오", "3", [60, 80], ["트로트", "라디오", "음악", "부모님"], "https://link.coupang.com/a/iIAgmwhj4K"),
  g("lantern", "캠핑 랜턴", "3", [20, 60], ["캠핑", "차박", "낚시"], "https://link.coupang.com/a/iIAgwJZctg"),
  g("hiking-poles", "등산 스틱", "3", [30, 80], ["등산", "산행", "트레킹"], "https://link.coupang.com/a/iIAgGrj01s"),
  g("golf-balls", "골프공 선물세트", "3", [30, 80], ["골프"], "https://link.coupang.com/a/iIAgPNevLg"),
  g("running-belt", "러닝 벨트", "3", [20, 50], ["러닝", "달리기", "마라톤"], "https://link.coupang.com/a/iIAg0plTlk"),
  g("yoga-mat", "요가 매트", "3", [20, 60], ["요가", "필라테스", "스트레칭", "홈트"], "https://link.coupang.com/a/iIAg7KJmA8"),
  g("book-light", "북라이트", "3", [20, 70], ["독서", "책", "소설"], "https://link.coupang.com/a/iIAhgkXft6"),
  g("speaker", "블루투스 스피커", "3", [20, 70], ["음악", "노래", "캠핑", "힙합", "케이팝", "재즈"], "https://link.coupang.com/a/iIAhnIhyFw"),
  g("board-game", "보드게임", "3", [20, 50], ["게임", "보드게임", "파티"], "https://link.coupang.com/a/iIAhxJEucu"),
  g("knitting", "뜨개질 키트", "3", [20, 70], ["뜨개", "공예", "손뜨개", "만들기"], "https://link.coupang.com/a/iIAhFC98we"),
  g("baking", "베이킹 도구 세트", "3", [20, 50], ["베이킹", "빵", "요리", "디저트"], "https://link.coupang.com/a/iIAhN5IQTs"),
  g("neck-pillow", "여행용 목베개", "3", [20, 70], ["여행", "비행기", "출장"], "https://link.coupang.com/a/iIAhYzRF00"),
  g("mood-light", "무드등", "3", [20, 50], ["인테리어", "휴식", "집", "감성"], "https://link.coupang.com/a/iIAh8GcYPA"),
  g("blanket", "극세사 담요", "3", [20, 80], ["휴식", "집", "겨울", "캠핑"], "https://link.coupang.com/a/iIAih987Pw"),
  g("muffler", "머플러", "3", [20, 80], ["패션", "겨울", "옷"], "https://link.coupang.com/a/iIAirdEdKC"),
  g("necktie", "넥타이", "3", [25, 60], ["회사", "정장", "출근"], "https://link.coupang.com/a/iIAiAlEm7g"),
  g("mens-skincare", "남성 스킨케어 세트", "3", [20, 70], ["뷰티", "화장품", "스킨케어"], "https://link.coupang.com/a/iIAiKIidBk"),
  g("wireless-charger", "무선 충전기", "3", [20, 60], ["실용", "전자기기", "스마트폰"], "https://link.coupang.com/a/iIAiUMMJy0"),
  g("umbrella", "자동 장우산", "3", [20, 80], ["실용", "장마"], "https://link.coupang.com/a/iIAi3EKWAu"),
  g("slippers", "털 실내화", "3", [30, 80], ["집", "겨울", "휴식"], "https://link.coupang.com/a/iIAjdgGnRI"),
  // 5만원대
  g("perfume", "향수", "5", [20, 60], ["향", "향수", "우디", "플로럴", "시트러스", "머스크"], "https://link.coupang.com/a/iIAjmzLS6C"),
  g("preserved-flower", "프리저브드 플라워", "5", [20, 80], ["꽃", "장미", "인테리어"], "https://link.coupang.com/a/iIAjwNtLu8"),
  g("hand-drip", "핸드드립 세트", "5", [20, 60], ["커피", "홈카페", "원두"], "https://link.coupang.com/a/iIAjEBRQsK"),
  g("tea-set", "다기 세트", "5", [50, 80], ["차", "다도", "녹차"], "https://link.coupang.com/a/iIAjMIyr1g"),
  g("ginseng-stick", "홍삼 스틱 선물세트", "5", [40, 80], ["건강", "홍삼", "피로"], "https://link.coupang.com/a/iIAjVLadUG"),
  g("gulbi", "굴비 선물세트", "5", [50, 80], ["생선", "한식", "반찬"], "https://link.coupang.com/a/iIAj4yrEMC", ["fish"]),
  g("liquor", "전통주 선물세트", "5", [30, 80], ["막걸리", "전통주", "술", "소주"], "https://link.coupang.com/a/iIAkcvaLW8"),
  g("massage-cushion", "안마 쿠션", "5", [40, 80], ["마사지", "안마", "어깨", "허리", "휴식"], "https://link.coupang.com/a/iIAknerEd2"),
  g("massage-gun", "마사지건", "5", [20, 60], ["운동", "헬스", "러닝", "마사지", "골프"], "https://link.coupang.com/a/iIAkvjwxqe"),
  g("eye-massager", "온열 눈마사지기", "5", [30, 70], ["휴식", "피로", "눈", "독서"], "https://link.coupang.com/a/iIAkCPmOvA"),
  g("bp-monitor", "혈압계", "5", [60, 80], ["건강", "부모님"], "https://link.coupang.com/a/iIAkKpqxUq"),
  g("camp-chair", "캠핑 의자", "5", [20, 60], ["캠핑", "낚시", "차박", "피크닉"], "https://link.coupang.com/a/iIAkTjOWPI"),
  g("golf-pouch", "골프 파우치", "5", [30, 70], ["골프"], "https://link.coupang.com/a/iIAk0nbhPU"),
  g("tackle-box", "낚시 태클박스", "5", [30, 80], ["낚시"], "https://link.coupang.com/a/iIAk9yi1Dg"),
  g("book-stand", "독서대", "5", [20, 80], ["독서", "책", "공부"], "https://link.coupang.com/a/iIAliAFI16"),
  g("karaoke-mic", "블루투스 노래방 마이크", "5", [30, 80], ["노래", "트로트", "노래방", "음악"], "https://link.coupang.com/a/iIAlqzSlKS"),
  g("digital-frame", "디지털 액자", "5", [50, 80], ["사진", "추억", "손주", "부모님"], "https://link.coupang.com/a/iIAlxHC4LA"),
  g("lego", "레고", "5", [20, 50], ["레고", "조립", "장난감"], "https://link.coupang.com/a/iIAlF1ZW0q"),
  g("watercolor", "수채화 물감 세트", "5", [20, 70], ["그림", "미술", "수채화"], "https://link.coupang.com/a/iIAlNIKEg0"),
  g("card-wallet", "가죽 카드지갑", "5", [20, 60], ["패션", "지갑", "출근"], "https://link.coupang.com/a/iIAlX7aX9M"),
  g("silver-necklace", "실버 목걸이", "5", [20, 60], ["액세서리", "실버", "목걸이"], "https://link.coupang.com/a/iIAl6Qt1cO"),
  g("cosmetics", "화장품 선물세트", "5", [20, 60], ["뷰티", "화장품", "스킨케어"], "https://link.coupang.com/a/iIAmhDRGma"),
  g("electric-toothbrush", "전동칫솔", "5", [20, 70], ["실용", "건강"], "https://link.coupang.com/a/iIAmqBlF6G"),
  g("leather-gloves", "가죽 장갑", "5", [30, 80], ["겨울", "패션", "운전"], "https://link.coupang.com/a/iIAmz0gl1o"),
  g("pajamas", "잠옷 세트", "5", [20, 60], ["휴식", "집", "잠"], "https://link.coupang.com/a/iIAmId3VDg"),
  // 10만원대
  g("niche-perfume", "니치 향수", "10", [20, 60], ["향", "향수", "우디", "플로럴", "머스크"], "https://link.coupang.com/a/iIAmPoYLIa"),
  g("coffee-grinder", "전동 커피 그라인더", "10", [20, 60], ["커피", "홈카페", "원두"], "https://link.coupang.com/a/iIAmXw6mIK"),
  g("red-ginseng", "홍삼정 선물세트", "10", [50, 80], ["건강", "홍삼"], "https://link.coupang.com/a/iIAm7loKs0"),
  g("hanwoo", "한우 선물세트", "10", [30, 80], ["고기", "한우", "요리"], "https://link.coupang.com/a/iIAnfzcj4S", ["beef"]),
  g("neck-massager", "목 어깨 안마기", "10", [40, 80], ["마사지", "안마", "어깨", "목", "피로"], "https://link.coupang.com/a/iIAnnYjkfQ"),
  g("foot-spa", "족욕기", "10", [50, 80], ["건강", "휴식", "족욕"], "https://link.coupang.com/a/iIAnwV02jQ"),
  g("fire-pit", "캠핑 화로대", "10", [25, 60], ["캠핑", "불멍", "차박"], "https://link.coupang.com/a/iIAnGsqGR2"),
  g("hiking-shoes", "등산화", "10", [30, 80], ["등산", "산행", "트레킹"], "https://link.coupang.com/a/iIAnPn3TLE"),
  g("rangefinder", "골프 거리측정기", "10", [30, 70], ["골프"], "https://link.coupang.com/a/iIAnZZtSOO"),
  g("smartwatch", "스마트워치", "10", [20, 60], ["운동", "러닝", "헬스", "건강"], "https://link.coupang.com/a/iIAn7XW7pc"),
  g("e-reader", "전자책 리더기", "10", [20, 70], ["독서", "책", "소설", "웹소설"], "https://link.coupang.com/a/iIAohngNHM"),
  g("earbuds", "무선 이어폰", "10", [20, 50], ["음악", "출근", "운동", "힙합", "케이팝"], "https://link.coupang.com/a/iIAooyU1U4"),
  g("turntable", "LP 턴테이블", "10", [25, 60], ["음악", "LP", "재즈", "인디"], "https://link.coupang.com/a/iIAoyJ9oLk"),
  g("instant-camera", "즉석카메라", "10", [20, 40], ["사진", "카메라", "여행"], "https://link.coupang.com/a/iIAoGW6aY0"),
  g("carry-on", "기내용 캐리어", "10", [20, 60], ["여행", "출장"], "https://link.coupang.com/a/iIAoQx5WfI"),
  g("wallet", "가죽 지갑", "10", [20, 70], ["패션", "지갑"], "https://link.coupang.com/a/iIAoY1eQGO"),
  g("gold-earrings", "14K 귀걸이", "10", [20, 70], ["액세서리", "골드", "귀걸이"], "https://link.coupang.com/a/iIAo6XFmVw"),
  g("watch", "손목시계", "10", [20, 60], ["시계", "패션", "출근"], "https://link.coupang.com/a/iIApe5H5jM"),
  g("walking-shoes", "효도화", "10", [60, 80], ["걷기", "산책", "부모님"], "https://link.coupang.com/a/iIApnx35bg"),
];

export const CATALOG_BY_ID = new Map(GIFT_CATALOG.map((x) => [x.id, x]));
