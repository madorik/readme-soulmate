// 통계 기간(한국 날짜): ?range=1|7|30|90 또는 ?from=&to=(시작·끝 포함, 최대 366일)와 바로 앞 같은 길이의 기간. 서버 전용 아님(시험에서 바로)

export interface Period {
  from: string;
  to: string;
  days: number;
  /** 이전 같은 길이의 기간 */
  prevFrom: string;
  prevTo: string;
}

export const DAY = 86_400_000;
export const ymd = (t: number) => new Date(t + 9 * 3600_000).toISOString().slice(0, 10);
/** 한국 날짜 00:00의 순간 */
export const kstStart = (d: string) => new Date(`${d}T00:00:00+09:00`).getTime();

export function todayKst(now = Date.now()): string {
  return ymd(now);
}

export function parsePeriod(sp: { from?: string; to?: string; range?: string }, today = todayKst()): Period {
  const ok = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(kstStart(v));
  let from: string;
  let to: string;
  if (ok(sp.from) && ok(sp.to)) {
    from = sp.from! <= sp.to! ? sp.from! : sp.to!;
    to = sp.from! <= sp.to! ? sp.to! : sp.from!;
    if (to > today) to = today;
    if (from > to) from = to;
  } else {
    const n = [1, 7, 30, 90].includes(Number(sp.range)) ? Number(sp.range) : 30;
    to = today;
    from = ymd(kstStart(today) - (n - 1) * DAY);
  }
  let days = Math.round((kstStart(to) - kstStart(from)) / DAY) + 1;
  if (days > 366) {
    from = ymd(kstStart(to) - 365 * DAY);
    days = 366;
  }
  const prevTo = ymd(kstStart(from) - DAY);
  const prevFrom = ymd(kstStart(prevTo) - (days - 1) * DAY);
  return { from, to, days, prevFrom, prevTo };
}
