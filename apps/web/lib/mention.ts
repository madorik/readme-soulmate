// 글로 적기의 @부름: '@와이프 바닐라라떼를 좋아해'처럼 누구 이야기인지 짚는다. 화면(고르기 목록)·서버(누구인지 확정)가 같이 쓴다.

export interface MentionPerson {
  id: string;
  /** 그 사람 이름(앱 사용자와 이어지지 않은 사람은 내가 적은 말) */
  name: string;
  /** 내가 붙인 태그(부르는 말). 이름과 같거나 없으면 "" */
  tag: string;
}

/** 부를 때 쓰는 말: 태그가 있으면 태그(와이프), 없으면 이름 */
export function mentionLabel(p: Pick<MentionPerson, "name" | "tag">): string {
  return (p.tag || p.name).trim();
}

/** 커서 바로 앞이 '@낱말'(띄어쓰기 없이)이면 그 자리와 찾는 말. 아니면 null */
export function mentionAt(text: string, caret: number): { start: number; query: string } | null {
  const m = /(^|[^\p{L}\p{N}_])@([^\s@]*)$/u.exec(text.slice(0, caret));
  if (!m) return null;
  return { start: caret - m[2]!.length - 1, query: m[2]! };
}

/** start(@ 자리)부터 caret까지를 '@부름 '으로 바꾼다. 바뀐 글과 새 커서 자리 */
export function insertMention(text: string, start: number, caret: number, label: string): { text: string; caret: number } {
  const before = text.slice(0, start);
  const after = text.slice(caret);
  const ins = `@${label}${after.startsWith(" ") ? "" : " "}`;
  return { text: before + ins + after, caret: before.length + ins.length + (after.startsWith(" ") ? 1 : 0) };
}

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "");
}

/** 부름 뒤에 붙어도 되는 조사 길이(와이프는, 엄마한테, 아빠께서) */
const PARTICLE_MAX = 3;

/**
 * 글 속의 @부름을 사람으로 바꾼다. 고른 것(picked)이 먼저, 그다음 직접 적은 @낱말을 이름·태그와 맞춘다(띄어쓰기·대소문자 무시, 뒤에 조사가 붙어도).
 * 돌려주는 글에서는 @를 뗀다(AI가 자연스럽게 읽게). 못 찾은 @낱말도 @만 뗀다
 */
export function resolveMentions(text: string, people: MentionPerson[], picked: { id: string; label: string }[] = []): { text: string; ids: string[] } {
  const known = new Set(people.map((p) => p.id));
  const ids: string[] = [];
  let out = text;
  for (const m of [...picked].filter((m) => known.has(m.id) && m.label).sort((a, b) => b.label.length - a.label.length)) {
    const token = `@${m.label}`;
    if (!out.includes(token)) continue;
    out = out.split(token).join(m.label);
    if (!ids.includes(m.id)) ids.push(m.id);
  }
  out = out.replace(/(^|[^\p{L}\p{N}_])@([^\s@]+)/gu, (_all, pre: string, word: string) => {
    const w = norm(word);
    let best: MentionPerson | null = null;
    let bestLen = 0;
    for (const p of people) {
      for (const label of [p.tag, p.name]) {
        const l = norm(label ?? "");
        if (l && w.startsWith(l) && w.length - l.length <= PARTICLE_MAX && l.length > bestLen) {
          best = p;
          bestLen = l.length;
        }
      }
    }
    if (best && !ids.includes(best.id)) ids.push(best.id);
    return pre + word;
  });
  return { text: out, ids };
}
