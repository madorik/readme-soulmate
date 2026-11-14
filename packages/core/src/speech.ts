import { ALLERGENS, DISLIKES, type CatalogItem } from "./catalog";

// "말로 할게요": 음성 인식 결과 문장에서 알레르기·못 먹는 것 항목을 찾는다.
// 이름(한·영)과 흔한 다른 말을 같이 본다. 확실하지 않으면 동그라미만 쳐 두고 사람이 고친다.

const ALIASES: Record<string, string[]> = {
  shrimp: ["새우", "shrimp", "prawn"],
  crab: ["게", "꽃게", "대게", "crab"],
  peanut: ["땅콩", "peanut"],
  milk: ["우유", "유제품", "milk", "dairy", "lactose"],
  egg: ["달걀", "계란", "egg"],
  wheat: ["밀가루", "밀", "wheat", "gluten"],
  soy: ["대두", "콩", "soy"],
  peach: ["복숭아", "peach"],
  tree_nut: ["견과", "견과류", "tree nut", "nuts"],
  walnut: ["호두", "walnut"],
  pine_nut: ["잣", "pine nut"],
  buckwheat: ["메밀", "buckwheat"],
  shellfish: ["조개", "갑각류", "shellfish"],
  fish: ["생선", "fish"],
  mackerel: ["고등어", "mackerel"],
  squid: ["오징어", "squid"],
  sesame: ["참깨", "깨", "sesame"],
  tomato: ["토마토", "tomato"],
  pork: ["돼지고기", "pork"],
  beef: ["소고기", "쇠고기", "beef"],
  chicken: ["닭고기", "chicken"],
  sulfite: ["아황산", "sulfite"],
  cilantro: ["고수", "cilantro", "coriander"],
  cucumber: ["오이", "cucumber"],
  raw: ["날것", "회", "생선회", "raw fish", "sashimi", "sushi"],
  offal: ["내장", "곱창", "막창", "offal", "tripe"],
  eggplant: ["가지", "eggplant", "aubergine"],
  oyster: ["굴", "oyster"],
  lamb: ["양고기", "lamb", "mutton"],
  mint_choco: ["민트초코", "민초", "mint chocolate", "mint choc"],
  mushroom: ["버섯", "mushroom"],
  olive: ["올리브", "olive"],
  raw_onion: ["생양파", "raw onion"],
  seafood: ["해산물", "seafood"],
};

const ALLERGY_WORDS = /알레르기|알러지|알르레기|두드러기|allerg|anaphyla/i;

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 한글은 앞뒤에 다른 한글 이름이 붙어 다른 말이 되는 경우(예: "게"가 "게임")를 막기 위해 짧은 말은 단어 경계로 본다 */
function mentions(text: string, alias: string): boolean {
  const a = escape(alias.toLowerCase());
  if (/^[a-z ]+$/.test(alias)) return new RegExp(`\\b${a}s?\\b`, "i").test(text);
  if (alias.length <= 1) return new RegExp(`(^|[\\s,./·와과랑이나도])${a}($|[\\s,./·와과랑이나도는을를이가요도])`).test(text);
  return text.includes(alias);
}

function find(list: CatalogItem[], text: string): string[] {
  return list.filter((i) => (ALIASES[i.code] ?? [i.label.ko, i.label.en]).some((alias) => mentions(text, alias))).map((i) => i.code);
}

export interface FoodSpeech {
  allergens: string[];
  dislikes: string[];
}

/**
 * 알레르기 사전에 있는 말은, 문장에 "알레르기"가 있거나 못 먹는 것 사전에 없으면 알레르기로 본다(놓치는 것보다 동그라미가 하나 더 쳐지는 게 안전하다).
 * 나머지는 못 먹는 것으로 본다.
 */
export function parseFoodSpeech(input: string): FoodSpeech {
  const text = input.toLowerCase().replace(/\s+/g, " ").trim();
  if (!text) return { allergens: [], dislikes: [] };
  const allergyMentioned = ALLERGY_WORDS.test(text);
  const allergenHits = find(ALLERGENS, text);
  const dislikeHits = find(DISLIKES, text);
  const allergens = allergenHits.filter((c) => allergyMentioned || !dislikeHits.includes(c));
  const dislikes = dislikeHits.filter((c) => !allergens.includes(c));
  return { allergens, dislikes };
}
