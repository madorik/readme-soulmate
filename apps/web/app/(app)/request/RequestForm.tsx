"use client";

import { SECTIONS, SECTIONS_BY_IMPORTANCE, type Locale, type Section } from "@readme/core";
import { useActionState, useState } from "react";
import { createRequest, type InviteState } from "@/app/actions/request";
import { useT } from "@/components/editors/shared";
import { CheckGlyph } from "@/components/marks";
import { Mascot } from "@/components/Mascot";
import { SectionIcon } from "@/components/SectionIcon";
import { LinkField, ShareButtons } from "@/components/ShareButtons";

const INITIAL: InviteState = { url: null, text: "", error: null };

/**
 * to: 주소록 사람에게 물어볼 때(이름은 고정, 내 기록에 적힌 값은 서버가 미리 채워 보낸다). 없으면 새 사람 이름을 적는다
 */
export function RequestForm({ locale, to, name: initialName, topics: initialTopics }: { locale: Locale; to: string | null; name: string; topics: Section[] }) {
  const t = useT(locale);
  const [name, setName] = useState(initialName);
  const [topics, setTopics] = useState<Section[]>(initialTopics);
  const [message, setMessage] = useState(t("request.messageDefault"));
  const [state, action, pending] = useActionState(createRequest, INITIAL);
  const quickNames = t("request.quickNames").split(",");

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
          <p className="whitespace-pre-line rounded-2xl rounded-tl-md bg-sky-soft px-4 py-3 text-[15px] leading-[1.55]">{`${state.text}\n${message}`}</p>
          <LinkField url={state.url} label={t("common.copyLink")} />
        </section>
        <div className="bottom-bar mt-auto bg-bg px-4 pt-4">
          <ShareButtons locale={locale} url={state.url} text={`${state.text}\n${message}`} sendLabel={t("request.send")} />
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-1 flex-col">
      <input type="hidden" name="sections" value={JSON.stringify(topics)} />
      {to ? <input type="hidden" name="to" value={to} /> : null}
      <input type="hidden" name="name" value={name} />

      {to ? null : (
        <section className="card mx-4 mt-4 flex flex-col gap-3 px-5 py-5">
          <label htmlFor="request-name" className="text-[15px] font-bold">
            {t("request.who")}
          </label>
          <input id="request-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} placeholder={t("request.namePlaceholder")} className="field" />
          <div className="flex flex-wrap gap-1.5">
            {quickNames.map((n) => (
              <button key={n} type="button" aria-pressed={name === n} onClick={() => setName(name === n ? "" : n)} className={`chip !min-h-9 !px-3.5 !text-[14px] ${name === n ? "chip-on" : ""}`}>
                {n}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className={`card mx-4 flex flex-col gap-3 px-4 py-5 ${to ? "mt-4" : "mt-3"}`}>
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
