import { addDays, diffDays, lunarToSolar, sameYmd, weekday, ymdKey, type YMD } from "./calendar";
import type { Label } from "./locale";

// 달력에 보이는 날: 한국의 공휴일(대체공휴일·연휴 포함)과 챙기는 날(쉬는 날은 아니다).
// 양력 날짜는 고정, 설날·추석·부처님오신날은 음력(calendar.ts의 lunarToSolar, 2050년까지)에서 구한다.
// 대체공휴일은 2021년 이후 기준(공휴일에 관한 법률 제3조):
//  - 설날·추석 연휴: 일요일이나 다른 공휴일과 겹치면 연휴 다음 첫 평일(토요일과 겹치는 건 해당 없음)
//  - 삼일절·어린이날·광복절·개천절·한글날·부처님오신날·성탄절: 토요일·일요일이나 다른 공휴일과 겹치면 그다음 첫 평일
//  - 신정·현충일은 대체공휴일이 없다
// 임시공휴일·선거일은 날짜를 미리 계산할 수 없어 아는 것만 SPECIAL에 적는다(새로 정해지면 여기에 더한다).

export type CalendarDayKind = "holiday" | "substitute" | "observance";

export interface CalendarDay {
  date: YMD;
  /** newYear·seollal·chuseok·substitute… (같은 날 여럿일 수 있다) */
  id: string;
  /** 목록에 쓰는 이름 */
  name: Label;
  /** 달력 칸 안에 쓰는 짧은 이름(한국어 네 글자 안팎) */
  short: Label;
  kind: CalendarDayKind;
  /** 쉬는 날(공휴일·대체공휴일) */
  off: boolean;
}

type Sub = "none" | "sun" | "satSun";

interface Base {
  id: string;
  name: Label;
  short: Label;
  sub: Sub;
}

const label = (ko: string, en: string): Label => ({ ko, en });

const NEW_YEAR = { id: "newYear", name: label("신정", "New Year's Day"), short: label("신정", "New Year"), sub: "none" as Sub };
const MAR1 = { id: "mar1", name: label("삼일절", "Independence Movement Day"), short: label("삼일절", "Mar 1st"), sub: "satSun" as Sub };
const CHILDREN = { id: "childrensDay", name: label("어린이날", "Children's Day"), short: label("어린이날", "Children"), sub: "satSun" as Sub };
const MEMORIAL = { id: "memorial", name: label("현충일", "Memorial Day"), short: label("현충일", "Memorial"), sub: "none" as Sub };
const LIBERATION = { id: "liberation", name: label("광복절", "Liberation Day"), short: label("광복절", "Aug 15"), sub: "satSun" as Sub };
const FOUNDATION = { id: "foundation", name: label("개천절", "National Foundation Day"), short: label("개천절", "Oct 3"), sub: "satSun" as Sub };
const HANGUL = { id: "hangul", name: label("한글날", "Hangul Day"), short: label("한글날", "Hangul"), sub: "satSun" as Sub };
const CHRISTMAS = { id: "christmas", name: label("크리스마스(성탄절)", "Christmas Day"), short: label("성탄절", "Xmas"), sub: "satSun" as Sub };
const BUDDHA = { id: "buddha", name: label("부처님오신날", "Buddha's Birthday"), short: label("부처님", "Buddha"), sub: "satSun" as Sub };
const SEOLLAL = { id: "seollal", name: label("설날", "Seollal (Lunar New Year)"), short: label("설날", "Seollal"), sub: "sun" as Sub };
const SEOLLAL_AROUND = { id: "seollalAround", name: label("설날 연휴", "Seollal holiday"), short: label("설 연휴", "Seollal"), sub: "sun" as Sub };
const CHUSEOK = { id: "chuseok", name: label("추석", "Chuseok"), short: label("추석", "Chuseok"), sub: "sun" as Sub };
const CHUSEOK_AROUND = { id: "chuseokAround", name: label("추석 연휴", "Chuseok holiday"), short: label("추석 연휴", "Chuseok"), sub: "sun" as Sub };

const FIXED: (Base & { m: number; d: number })[] = [
  { ...NEW_YEAR, m: 1, d: 1 },
  { ...MAR1, m: 3, d: 1 },
  { ...CHILDREN, m: 5, d: 5 },
  { ...MEMORIAL, m: 6, d: 6 },
  { ...LIBERATION, m: 8, d: 15 },
  { ...FOUNDATION, m: 10, d: 3 },
  { ...HANGUL, m: 10, d: 9 },
  { ...CHRISTMAS, m: 12, d: 25 },
];

/** 날짜를 미리 계산할 수 없는 공휴일(임시공휴일·선거일). 대체공휴일은 없다 */
const SPECIAL: { y: number; m: number; d: number; id: string; name: Label; short: Label }[] = [
  { y: 2025, m: 1, d: 27, id: "temporary", name: label("임시공휴일", "Temporary holiday"), short: label("임시휴일", "Day off") },
  { y: 2025, m: 6, d: 3, id: "election", name: label("대통령 선거일", "Presidential election day"), short: label("선거일", "Election") },
  { y: 2026, m: 6, d: 3, id: "election", name: label("지방선거일", "Local election day"), short: label("선거일", "Election") },
  { y: 2028, m: 4, d: 12, id: "election", name: label("국회의원 선거일", "National Assembly election day"), short: label("선거일", "Election") },
];

/** 쉬는 날은 아니지만 챙기는 날. 홈의 명절·챙기는 날(holidays.ts)과 같은 날들 + 크리스마스 이브·근로자의 날 */
const OBSERVANCES: (Omit<Base, "sub"> & { m: number; d: number })[] = [
  { id: "valentine", name: label("발렌타인데이", "Valentine's Day"), short: label("발렌타인", "Valentine"), m: 2, d: 14 },
  { id: "whiteDay", name: label("화이트데이", "White Day"), short: label("화이트", "White Day"), m: 3, d: 14 },
  { id: "laborDay", name: label("근로자의 날", "Labor Day"), short: label("근로자", "Labor Day"), m: 5, d: 1 },
  { id: "parentsDay", name: label("어버이날", "Parents' Day"), short: label("어버이날", "Parents"), m: 5, d: 8 },
  { id: "teachersDay", name: label("스승의 날", "Teachers' Day"), short: label("스승의날", "Teachers"), m: 5, d: 15 },
  { id: "pepero", name: label("빼빼로데이", "Pepero Day"), short: label("빼빼로", "Pepero"), m: 11, d: 11 },
  { id: "christmasEve", name: label("크리스마스 이브", "Christmas Eve"), short: label("이브", "Xmas Eve"), m: 12, d: 24 },
];

interface Entry extends Base {
  date: YMD;
}

interface Group {
  entries: Entry[];
  sub: Sub;
  /** 대체공휴일 이름에 붙일 기준 이름 */
  name: Label;
}

const cache = new Map<number, CalendarDay[]>();

/** 한 해의 공휴일(대체공휴일 포함)과 챙기는 날, 날짜 순. 음력은 2050년까지(그 뒤 해는 양력 날짜만) */
export function calendarDays(year: number): CalendarDay[] {
  const hit = cache.get(year);
  if (hit) return hit;
  const groups: Group[] = [];
  const single = (date: YMD, b: Base) => groups.push({ entries: [{ ...b, date }], sub: b.sub, name: b.name });
  for (const f of FIXED) single({ y: year, m: f.m, d: f.d }, f);
  const buddha = lunarToSolar(year, 4, 8);
  if (buddha) single(buddha, BUDDHA);
  // 설날·추석은 앞뒤 하루씩 3일이 한 덩이(대체공휴일도 한 덩이에 하루)
  for (const [lunarMonth, main, around] of [[1, SEOLLAL, SEOLLAL_AROUND] as const, [8, CHUSEOK, CHUSEOK_AROUND] as const]) {
    const day = lunarToSolar(year, lunarMonth, 1 + (lunarMonth === 8 ? 14 : 0));
    if (!day) continue;
    groups.push({
      entries: [
        { ...around, date: addDays(day, -1) },
        { ...main, date: day },
        { ...around, date: addDays(day, 1) },
      ],
      sub: "sun",
      name: main.name,
    });
  }
  const specials = SPECIAL.filter((s) => s.y === year).map((s) => ({ date: { y: s.y, m: s.m, d: s.d }, id: s.id, name: s.name, short: s.short, sub: "none" as Sub }));
  for (const s of specials) groups.push({ entries: [s], sub: "none", name: s.name });

  const dateKey = (d: YMD) => ymdKey(d);
  const taken = new Set(groups.flatMap((g) => g.entries.map((e) => dateKey(e.date))));
  // 날짜마다 공휴일이 몇 개인가(둘 이상이면 겹친 날)
  const owners = new Map<string, number>();
  for (const g of groups) for (const e of g.entries) owners.set(dateKey(e.date), (owners.get(dateKey(e.date)) ?? 0) + 1);

  // 대체공휴일: 시작 날짜 순으로 보며, 두 공휴일이 같은 날에 겹치면 그 날의 대체공휴일은 하루만
  const ordered = [...groups].sort((a, b) => diffDays(b.entries[0]!.date, a.entries[0]!.date));
  const compensated = new Set<string>();
  const out: CalendarDay[] = [];
  for (const g of ordered) {
    for (const e of g.entries) out.push({ date: e.date, id: e.id, name: e.name, short: e.short, kind: "holiday", off: true });
    if (g.sub === "none") continue;
    const weekend = g.entries.some((e) => {
      const wd = weekday(e.date);
      return wd === 0 || (wd === 6 && g.sub === "satSun");
    });
    // 다른 공휴일과 겹친 날(같은 날짜를 가진 공휴일이 둘 이상): 그 날 하나에 대체공휴일 하나
    const overlap = g.entries.some((e) => (owners.get(dateKey(e.date)) ?? 0) > 1 && !compensated.has(dateKey(e.date)));
    if (!weekend && !overlap) continue;
    for (const e of g.entries) if ((owners.get(dateKey(e.date)) ?? 0) > 1) compensated.add(dateKey(e.date));
    let d = addDays(g.entries[g.entries.length - 1]!.date, 1);
    // 일요일이나 이미 쉬는 날은 건너뛴다(토요일 광복절 → 일요일을 건너 월요일)
    while (weekday(d) === 0 || taken.has(dateKey(d))) d = addDays(d, 1);
    taken.add(dateKey(d));
    out.push({
      date: d,
      id: "substitute",
      name: label(`대체공휴일(${g.name.ko})`, `Substitute holiday (${g.name.en})`),
      short: label("대체휴일", "Day off"),
      kind: "substitute",
      off: true,
    });
  }
  for (const o of OBSERVANCES) out.push({ date: { y: year, m: o.m, d: o.d }, id: o.id, name: o.name, short: o.short, kind: "observance", off: false });
  out.sort((a, b) => diffDays(b.date, a.date) || Number(b.off) - Number(a.off));
  cache.set(year, out);
  return out;
}

/** 그 날의 공휴일·챙기는 날(없으면 빈 목록). 쉬는 날이 먼저 */
export function daysOn(date: YMD): CalendarDay[] {
  return calendarDays(date.y).filter((x) => sameYmd(x.date, date));
}

/** 그 날이 공휴일(대체공휴일 포함)인가 */
export function isPublicHoliday(date: YMD): boolean {
  return daysOn(date).some((x) => x.off);
}

export interface HolidayRun {
  start: YMD;
  end: YMD;
  days: number;
  /** "추석 연휴" 같은 이름(연휴 안의 공휴일 이름으로) */
  title: Label;
}

/**
 * from~to 사이에 걸친 연휴: 토·일·공휴일이 사흘 이상 이어지고 그 안에 공휴일이 하나라도 있는 덩이.
 * 연휴 앞뒤로 이어진 주말까지 한 덩이로 센다(추석 연휴 + 일요일). 이름은 설날·추석이 있으면 그것, 아니면 첫 공휴일
 */
export function holidayRuns(from: YMD, to: YMD): HolidayRun[] {
  const lo = addDays(from, -10);
  const hi = addDays(to, 10);
  const total = diffDays(lo, hi);
  const off = (d: YMD) => weekday(d) === 0 || weekday(d) === 6 || isPublicHoliday(d);
  const runs: HolidayRun[] = [];
  let i = 0;
  while (i <= total) {
    if (!off(addDays(lo, i))) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 <= total && off(addDays(lo, j + 1))) j++;
    const start = addDays(lo, i);
    const end = addDays(lo, j);
    const days = j - i + 1;
    const holidays = Array.from({ length: days }, (_, k) => daysOn(addDays(start, k)).filter((x) => x.off)).flat();
    // 덩이 양끝이 우리가 본 범위(lo·hi) 가장자리라 잘렸을 수 있는 것은 건너뛴다
    const cut = i === 0 || j === total;
    if (days >= 3 && holidays.length && !cut && diffDays(end, from) <= 0 && diffDays(start, to) >= 0) {
      const main = holidays.find((h) => h.id === "seollal" || h.id === "chuseok") ?? holidays.find((h) => h.kind === "holiday") ?? holidays[0]!;
      const base = main.kind === "substitute" ? (holidays.find((h) => h.kind === "holiday") ?? main) : main;
      runs.push({ start, end, days, title: label(`${base.name.ko.replace(/\(.*\)$/, "")} 연휴`, `${base.name.en.replace(/ \(.*\)$/, "")} holiday`) });
    }
    i = j + 1;
  }
  return runs;
}
