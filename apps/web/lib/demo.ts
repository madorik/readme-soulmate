import "server-only";
import { addDays, hashToken, randomCode, randomToken, sanitizeSection, solarToLunar, type DateSpec, type Locale, type PartialCard, type YMD } from "@readme/core";
import { aad, seal } from "./crypto";
import { sealContactSections, sealGuestSections, writeSection } from "./data";
import { asSystem, asUser } from "./db";

// 데모 계정에 넣는 샘플: 테스터·스토어 심사자가 로그인 없이 바로 눌러 볼 수 있게.
// 날짜는 오늘 기준으로 계산해서(음력 생신 7일 전 등) 언제 열어도 홈에 "다가오는 날"이 보인다.

function lunarSpec(day: YMD): DateSpec {
  const l = solarToLunar(day);
  return l ? { calendar: "lunar", month: l.m, day: l.d, leap: l.leap } : { calendar: "solar", month: day.m, day: day.d };
}

function solarSpec(day: YMD): DateSpec {
  return { calendar: "solar", month: day.m, day: day.d };
}

/** 그 날(day)에 만 n세(또는 n주년)가 되도록 연도를 붙인다. 음력이면 음력 연도 */
function turning(spec: DateSpec, day: YMD, n: number): DateSpec {
  const year = spec.calendar === "lunar" ? (solarToLunar(day)?.y ?? day.y) : day.y;
  return { ...spec, year: year - n };
}

interface Sample {
  nickname: string;
  name: string;
  card: PartialCard;
  note?: { label: string; body: string };
  /** 앱을 안 쓰는 사람이라 내가 직접 적어 둔 카드 */
  mine?: boolean;
}

function samples(locale: Locale, today: YMD): { me: { name: string; card: PartialCard }; people: Sample[] } {
  const ko = locale === "ko";
  return {
    me: {
      name: ko ? "데모" : "Demo",
      card: {
        safety: sanitizeSection("safety", { allergens: ["peach"], dislikes: ["cucumber"] }),
        taste: sanitizeSection("taste", { likes: ko ? ["떡볶이", "파스타"] : ["Tacos", "Pasta"], spicy: 2, drinks: ko ? "라떼" : "Latte" }),
        dates: sanitizeSection("dates", { birthday: turning(solarSpec(addDays(today, 64)), addDays(today, 64), 35) }),
        favorites: sanitizeSection("favorites", { seasons: ["autumn"], musicGenres: ["indie"], movie: ko ? "어바웃 타임" : "About Time" }),
      },
    },
    people: [
      {
        nickname: ko ? "엄마" : "Mom",
        name: ko ? "엄마" : "Mom",
        card: {
          // 올해 음력 생신에 만 70세: 홈에 "엄마 칠순"
          dates: sanitizeSection("dates", { birthday: turning(lunarSpec(addDays(today, 7)), addDays(today, 7), 70) }),
          safety: sanitizeSection("safety", { dislikes: ["raw"] }),
          taste: sanitizeSection("taste", { spicy: 1, alcohol: { level: "little", kinds: ["makgeolli"] } }),
          favorites: sanitizeSection("favorites", { musicGenres: ["trot"], shows: ko ? "인간극장" : "Antiques Roadshow", seasons: ["autumn"], metals: ["gold"] }),
          sizes: sanitizeSection("sizes", { shoe: 240 }),
          gifts: sanitizeSection("gifts", {
            loves: ko ? ["걷기", "트로트"] : ["Walking", "Gardening"],
            flowers: ko ? "카네이션보다 수국" : "Hydrangeas over roses",
            giftCard: "yes",
            skip: ko ? ["스카프"] : ["Scarves"],
          }),
        },
        note: { label: ko ? "작년 생신" : "Last bday", body: ko ? "홍삼 세트 드렸음" : "Gave a tea set" },
      },
      {
        nickname: ko ? "아내" : "Wife",
        name: ko ? "지수" : "Jisu",
        card: {
          dates: sanitizeSection("dates", {
            birthday: turning(solarSpec(addDays(today, 20)), addDays(today, 20), 33),
            anniversaries: [{ label: ko ? "결혼기념일" : "Wedding anniversary", spec: turning(solarSpec(addDays(today, 120)), addDays(today, 120), 6) }],
          }),
          safety: sanitizeSection("safety", { allergens: ["shrimp", "crab"], allergyNote: ko ? "국물에 들어간 것도 안 돼요. 해물탕집은 피해 주세요." : "Not even in broth. Please skip seafood stew places.", dislikes: ["cilantro"] }),
          taste: sanitizeSection("taste", {
            likes: ko ? ["마라탕", "연어 초밥", "크림 파스타"] : ["Mala hot pot", "Salmon sushi", "Cream pasta"],
            spicy: 3,
            drinks: ko ? "아메리카노" : "Americano",
            alcohol: { level: "some", kinds: ["wine", "highball"] },
          }),
          sizes: sanitizeSection("sizes", { top: "55", bottom: "26", shoe: 235, ring: 11 }),
          gifts: sanitizeSection("gifts", {
            colors: ["sage", "cream", "burgundy"],
            scent: ko ? "우디, 너무 달지 않은 향" : "Woody, not too sweet",
            flowers: ko ? "튤립" : "Tulips",
            giftCard: "yes",
            wishlist: [{ title: ko ? "캠핑용 접이식 의자" : "Folding camp chair", url: "" }, { title: ko ? "원데이 도자기 클래스" : "One-day pottery class", url: "" }],
            skip: ko ? ["텀블러", "머그컵", "향초"] : ["Tumblers", "Mugs", "Candles"],
            brands: ko ? ["이솝", "무인양품"] : ["Aesop", "Muji"],
          }),
          favorites: sanitizeSection("favorites", {
            patterns: ["stripe", "solid"],
            styles: ["minimal"],
            metals: ["silver"],
            idol: ko ? "아이유" : "IU",
            character: ko ? "망그러진 곰" : "Snoopy",
            movieGenres: ["romance", "animation"],
            drama: ko ? "나의 아저씨" : "My Mister",
            musicGenres: ["ballad", "indie"],
            song: ko ? "밤편지" : "Through the Night",
            seasons: ["spring"],
            dessert: ko ? "바스크 치즈케이크" : "Basque cheesecake",
            travel: ko ? "교토" : "Kyoto",
          }),
        },
        note: { label: ko ? "10월 2일" : "Oct 2", body: ko ? "소품샵에서 라탄 바구니 예쁘다고 함" : "Liked a rattan basket at a gift shop" },
      },
      {
        nickname: ko ? "아빠" : "Dad",
        name: ko ? "아빠" : "Dad",
        mine: true,
        card: {
          dates: sanitizeSection("dates", { birthday: turning(lunarSpec(addDays(today, 28)), addDays(today, 28), 72) }),
          safety: sanitizeSection("safety", { dislikes: ["offal"] }),
          taste: sanitizeSection("taste", { spicy: 2, alcohol: { level: "lots", kinds: ["soju", "makgeolli"] } }),
          gifts: sanitizeSection("gifts", { loves: ko ? ["등산", "막걸리"] : ["Hiking", "Craft beer"] }),
          sizes: sanitizeSection("sizes", { top: "100", shoe: 265 }),
        },
      },
      {
        nickname: ko ? "단짝" : "Bestie",
        name: ko ? "준호" : "Junho",
        card: {
          dates: sanitizeSection("dates", { birthday: turning(solarSpec(addDays(today, 93)), addDays(today, 93), 34) }),
          safety: sanitizeSection("safety", { allergens: ["peanut"] }),
          taste: sanitizeSection("taste", { likes: ko ? ["곱창", "평양냉면"] : ["BBQ", "Cold noodles"], spicy: 4, alcohol: { level: "lots", kinds: ["beer"] } }),
          favorites: sanitizeSection("favorites", { team: ko ? "LG 트윈스" : "LA Dodgers", movieGenres: ["action", "sf"], musicGenres: ["hiphop"] }),
        },
      },
    ],
  };
}

/** 데모 계정 채우기(한 번만). 사람들은 "앱 없이 답한 리드미"나 "내가 적어 둔 리드미"로 넣는다(다른 계정이 필요 없게) */
export async function seedDemo(uid: string, locale: Locale, today: YMD): Promise<void> {
  const data = samples(locale, today);
  const done = await asSystem(async (q) => {
    const row = await q.one<{ is_demo: boolean }>("select is_demo from profiles where id = $1 for update", [uid]);
    if (!row || row.is_demo) return true;
    await q(
      `update profiles set is_demo = true, display_name = $2, avatar = $3, onboarded_at = coalesce(onboarded_at, now()), system_locale = $4 where id = $1`,
      [uid, data.me.name, JSON.stringify({ tone: "blue", skin: "#F2CDB0", hair: "short", hairColor: "#1F1D2B", glasses: true }), locale],
    );
    for (const p of data.people) {
      if (p.mine) {
        const c = await q.one<{ id: string }>(`insert into contacts (user_id, nickname) values ($1, $2) returning id`, [uid, p.nickname]);
        await q(`insert into contact_cards (contact_id, author_id, sections) values ($1, $2, $3)`, [c!.id, uid, JSON.stringify(sealContactSections(uid, c!.id, p.card))]);
        continue;
      }
      const token = randomToken();
      const invite = await q.one<{ id: string }>(
        `insert into invites (kind, inviter_id, sections, recipient_name, token_hash, code, expires_at, used_at)
         values ('request', $1, $2, $3, $4, $5, now() + interval '7 days', now()) returning id`,
        [uid, Object.keys(p.card), p.nickname, await hashToken(token), randomCode()],
      );
      const card = await q.one<{ id: string }>(
        `insert into guest_cards (invite_id, requester_id, display_name, sections, consent_health_at) values ($1, $2, $3, $4, now()) returning id`,
        [invite!.id, uid, p.name, JSON.stringify(sealGuestSections(invite!.id, p.card))],
      );
      const contact = await q.one<{ id: string }>(
        `insert into contacts (user_id, guest_card_id, request_invite_id, nickname) values ($1, $2, $3, $4) returning id`,
        [uid, card!.id, invite!.id, p.nickname],
      );
      if (p.note) {
        await q(`insert into notes (author_id, contact_id, label, payload) values ($1, $2, $3, $4)`, [
          uid,
          contact!.id,
          p.note.label,
          JSON.stringify(seal({ body: p.note.body }, aad.note(uid, contact!.id))),
        ]);
      }
    }
    return false;
  });
  if (done) return;
  await asUser(uid, async (q) => {
    for (const [section, value] of Object.entries(data.me.card)) await writeSection(q, uid, section as keyof PartialCard, value);
  });
}
