import "server-only";
import { SECTIONS, type Diner } from "@readme/core";
import { displayName, listPeople, readCard, type Person, type Session } from "./data";
import { makeT } from "./i18n";

// 같이 고르기: 주소에 고른 사람(with=연락처id,...)과 나도 같이(me=1)를 싣고 다닌다

export interface PlanPick {
  people: Person[];
  includeMe: boolean;
  diners: Diner[];
  /** 고른 상태를 그대로 다음 화면에 넘길 쿼리 */
  query: string;
}

/** 고르기 모드인 '사람들' 화면으로 돌아가는 주소 */
export function pickBack(query: string): string {
  return `/people${query ? `${query}&pick=1` : "?pick=1"}`;
}

export function planQuery(ids: string[], includeMe: boolean): string {
  const q = new URLSearchParams();
  if (ids.length) q.set("with", ids.join(","));
  q.set("me", includeMe ? "1" : "0");
  const s = q.toString();
  return s ? `?${s}` : "";
}

export async function resolvePick(s: Session, sp: { with?: string; me?: string }): Promise<PlanPick> {
  const t = makeT(s.profile.locale);
  const ids = (sp.with ?? "").split(",").filter(Boolean);
  const all = await listPeople(s);
  const people = ids.map((id) => all.find((p) => p.contactId === id)).filter((p): p is Person => !!p);
  const includeMe = sp.me !== "0";
  const diners: Diner[] = people.map((p) => ({ key: p.contactId, name: displayName(p), card: p.card, sections: SECTIONS }));
  if (includeMe) {
    const { card } = await s.tx((q) => readCard(q, s.user.id));
    diners.unshift({ key: "me", name: t("plan.me"), card, sections: SECTIONS });
  }
  return { people, includeMe, diners, query: planQuery(people.map((p) => p.contactId), includeMe) };
}
