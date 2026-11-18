"use client";

import { SECTIONS, SECTIONS_BY_IMPORTANCE, type AvatarConfig, type Locale, type Section } from "@readme/core";
import { useActionState, useState } from "react";
import { createRequest, type InviteState } from "@/app/actions/request";
import { useT } from "@/components/editors/shared";
import { Avatar } from "@/components/Avatar";
import { CheckGlyph, Icon } from "@/components/marks";
import { Mascot } from "@/components/Mascot";
import { SectionIcon } from "@/components/SectionIcon";
import { TagChip } from "@/components/PersonRow";
import { LinkField, ShareButtons } from "@/components/ShareButtons";
import { matchesPerson } from "@/lib/search";

const INITIAL: InviteState = { url: null, text: "", error: null };

export interface AskPerson {
  id: string;
  name: string;
  /** 내가 붙인 태그(부르는 말). 이름과 같거나 없으면 "" */
  tag: string;
  /** 부르는 이름(태그가 있으면 태그) */
  label: string;
  avatar: AvatarConfig | null;
  /** 아직 안 적힌 항목(고르면 이걸 먼저 묻는다) */
  missing: Section[];
}

type Who = { kind: "person"; person: AskPerson } | { kind: "new"; name: string };

/**
 * 누구에게: 주소록 사람을 이름·태그로 찾아 고르면 그 사람에게 묻고 답은 그 사람 기록에 들어간다(내 기록에 적힌 값은 서버가 미리 채워 보낸다).
 * 없는 사람이면 적은 이름으로 새로. fixed(사람 화면에서 왔을 때)면 그 사람으로 정해져 있다
 */
export function RequestForm({ locale, people, fixed, initialName, defaults }: { locale: Locale; people: AskPerson[]; fixed: string | null; initialName: string; defaults: Section[] }) {
  const t = useT(locale);
  const topicsFor = (p: AskPerson | null) => (p && p.missing.length ? p.missing : defaults);
  const fixedPerson = fixed ? (people.find((p) => p.id === fixed) ?? null) : null;
  const [who, setWho] = useState<Who | null>(fixedPerson ? { kind: "person", person: fixedPerson } : initialName ? { kind: "new", name: initialName } : null);
  const [query, setQuery] = useState("");
  const [topics, setTopics] = useState<Section[]>(topicsFor(fixedPerson));
  const [message, setMessage] = useState("");
  const [state, action, pending] = useActionState(createRequest, INITIAL);
  const name = who ? (who.kind === "person" ? who.person.label : who.name) : "";
  const q = query.replace(/\s+/g, " ").trim();
  const matches = (q ? people.filter((p) => matchesPerson(q, p.name, p.tag)) : people).slice(0, 12);
  const exact = people.some((p) => [p.name, p.tag, p.label].some((x) => x && x.replace(/\s+/g, "") === q.replace(/\s+/g, "")));
  const choose = (p: AskPerson) => {
    setWho({ kind: "person", person: p });
    setTopics(topicsFor(p));
  };
  const chooseNew = () => {
    setWho({ kind: "new", name: q.slice(0, 40) });
    setTopics(defaults);
  };
  // 이름 칸에서 엔터: 하나만 걸렸으면 그 사람, 아니면 지금 적은 이름으로 새로(아래 '새로' 칩과 같다). 한글 조합 중 엔터는 글자를 끝내는 것뿐
  const onNameKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || e.nativeEvent.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    if (matches.length === 1) choose(matches[0]!);
    else if (q && !exact) chooseNew();
    else {
      const same = matches.find((p) => [p.name, p.tag, p.label].some((x) => x && x.replace(/\s+/g, "") === q.replace(/\s+/g, "")));
      if (same) choose(same);
    }
  };
  const shareText = message.trim() ? `${state.text}\n${message.trim()}` : state.text;

  const topicLabel = (x: Section) => t(`request.topic.${x}` as "request.topic.dates");

  // 링크가 만들어지면: 누구에게·무엇을 묻는지와 보낼 메시지를 보여 주고, 아래에서 보낸다
  if (state.url) {
    return (
      <div className="flex flex-1 flex-col">
        <section className="grad-hero relative mx-4 mt-4 flex flex-col items-center overflow-hidden rounded-3xl px-5 pb-6 pt-6 text-center">
          <span aria-hidden="true" className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/25" />
          <Mascot size={84} />
          <h2 className="headline relative pt-3 text-[22px]">{t("request.ready", { name: name.trim() })}</h2>
          <ul className="relative flex flex-wrap justify-center gap-1.5 pt-3.5">
            {SECTIONS_BY_IMPORTANCE.filter((x) => topics.includes(x)).map((x) => (
              <li key={x} className="flex items-center gap-1.5 rounded-full bg-white/85 py-1 pl-1 pr-3 text-[13px] font-bold">
                <SectionIcon section={x} size={22} />
                {topicLabel(x)}
              </li>
            ))}
          </ul>
        </section>
        <section className="card mx-4 mt-3 flex flex-col gap-2.5 px-5 py-5">
          <h3 className="text-[13.5px] font-bold text-muted">{t("request.message")}</h3>
          <p className="whitespace-pre-line rounded-2xl rounded-tl-md bg-sky-soft px-4 py-3 text-[15px] leading-[1.55]">{shareText}</p>
          <LinkField url={state.url} label={t("common.copyLink")} />
        </section>
        <div className="bottom-bar mt-auto bg-bg px-4 pt-4">
          <ShareButtons locale={locale} url={state.url} text={shareText} sendLabel={t("request.send")} />
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-1 flex-col">
      <input type="hidden" name="sections" value={JSON.stringify(topics)} />
      {who?.kind === "person" ? <input type="hidden" name="to" value={who.person.id} /> : null}
      <input type="hidden" name="name" value={name} />

      {fixed ? null : (
        <section className="card mx-4 mt-4 flex flex-col gap-3 px-5 py-5">
          <label htmlFor="request-who" className="text-[15px] font-bold">
            {t("request.who")}
          </label>
          {who ? (
            <div className="flex items-center gap-1.5">
              <span className="chip-on flex h-12 min-w-0 items-center gap-2 rounded-full pl-1.5 pr-4 text-[16px] font-bold">
                {who.kind === "person" ? (
                  <Avatar config={who.person.avatar} size={36} label={who.person.label} />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white">
                    <Icon name="personAdd" size={18} strokeWidth={2} />
                  </span>
                )}
                <span className="truncate">{name}</span>
                {who.kind === "new" ? <TagChip>{t("voice.newPerson")}</TagChip> : null}
              </span>
              <button
                type="button"
                aria-label={t("request.whoAgain")}
                onClick={() => {
                  setWho(null);
                  setQuery("");
                  setTopics(defaults);
                }}
                className="flex h-11 w-11 shrink-0 items-center justify-center text-muted"
              >
                <Icon name="close" size={18} strokeWidth={2} />
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="pointer-events-none absolute left-[14px] top-[15px] text-muted">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-4-4" />
                </svg>
                <input
                  id="request-who"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onNameKey}
                  maxLength={40}
                  enterKeyHint="go"
                  placeholder={t("people.search")}
                  className="field !pl-[42px] [&::-webkit-search-cancel-button]:appearance-none"
                />
              </div>
              {matches.length || (q && !exact) ? (
                <div className="flex flex-wrap gap-1.5">
                  {matches.map((p) => (
                    <button key={p.id} type="button" onClick={() => choose(p)} className="flex h-11 items-center gap-1.5 rounded-full bg-white pl-1 pr-3.5 text-[14.5px] font-bold shadow-[inset_0_0_0_1.5px_var(--color-edge)]">
                      <Avatar config={p.avatar} size={34} label={p.label} />
                      {p.label}
                    </button>
                  ))}
                  {q && !exact ? (
                    <button type="button" onClick={chooseNew} className="flex h-11 items-center gap-1.5 rounded-full pl-3 pr-3.5 text-[14.5px] font-bold text-accent ring-[1.5px] ring-inset ring-mango-edge">
                      <Icon name="personAdd" size={17} strokeWidth={2} />
                      {q}
                      <TagChip>{t("voice.newPerson")}</TagChip>
                    </button>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </section>
      )}

      <section className={`card mx-4 flex flex-col gap-3 px-4 py-5 ${fixed ? "mt-4" : "mt-3"}`}>
        <div className="flex items-baseline justify-between px-1">
          <h2 className="text-[15px] font-bold">{t("request.topics")}</h2>
          <span className="num text-[13px] !font-bold text-muted">{topics.length}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {SECTIONS_BY_IMPORTANCE.map((x) => {
            const on = topics.includes(x);
            return (
              <button
                key={x}
                type="button"
                aria-pressed={on}
                onClick={() => setTopics(on ? topics.filter((y) => y !== x) : SECTIONS.filter((y) => y === x || topics.includes(y)))}
                className={`relative flex min-h-[60px] items-center gap-2.5 rounded-2xl py-2.5 pl-2.5 pr-3 text-left transition-shadow ${on ? "bg-sky-soft shadow-[inset_0_0_0_2px_var(--color-sky)]" : "bg-fill"}`}
              >
                <SectionIcon section={x} size={36} />
                <span className={`min-w-0 flex-1 text-[14px] leading-[1.3] ${on ? "font-bold" : "font-semibold text-ink-2"}`}>{topicLabel(x)}</span>
                {on ? (
                  <span aria-hidden="true" className="absolute right-1.5 top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-sky text-ink">
                    <CheckGlyph size={11} />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card mx-4 mt-3 flex flex-col gap-2.5 px-5 py-5">
        <label htmlFor="request-message" className="text-[15px] font-bold">
          {t("request.message")}
        </label>
        <textarea id="request-message" name="message" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={300} className="field resize-none leading-[1.55]" />
      </section>

      <div className="bottom-bar mt-auto flex flex-col gap-2 bg-bg px-4 pt-4">
        {state.error ? (
          <p role="alert" className="px-1 text-[13.5px] text-red">
            {t(state.error === "pickOne" ? "request.pickOne" : name.trim() ? "common.error" : "request.needName")}
          </p>
        ) : null}
        <button disabled={pending || !topics.length || !name.trim()} className="btn-primary w-full">
          {t("request.make")}
        </button>
      </div>
    </form>
  );
}
