import { SECTIONS, SECTIONS_BY_IMPORTANCE, type Section } from "@readme/core";
import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { useT } from "@/components/editors/shared";
import { Icon } from "@/components/marks";
import { Mascot } from "@/components/Mascot";
import { SectionIcon } from "@/components/SectionIcon";
import { tossAskPath, type TAskCreated, type TPersonDetail } from "@/lib/toss-api";
import { api } from "../api";
import { APP_NAME, shareDeepLink } from "../bridge";
import { useLoad } from "../load";
import { useNav } from "../nav";
import { BottomBar, Failed, Loading, Page } from "../ui";

// 물어보기: 이 사람에게 물어볼 항목을 고르고(아직 안 적은 것 먼저) 토스 공유 링크로 보낸다.
// 받은 사람은 토스에서 열어 답하고(로그인 없이), 답은 이 사람 기록에 들어간다

const DEFAULTS: Section[] = ["dates", "safety", "gifts"];

type Sent = { created: TAskCreated; result: "shared" | "copied" | "failed" };

export function Ask({ id }: { id: string }) {
  const { data, error, reload } = useLoad<TPersonDetail>(`people/${id}`);
  const { back } = useNav();
  const t = useT("ko");
  const [picked, setPicked] = useState<Section[] | null>(null);
  const [message, setMessage] = useState("");
  const [from, setFrom] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [sent, setSent] = useState<Sent | null>(null);

  if (error) return <Page><Failed onRetry={reload} /></Page>;
  if (!data) return <Page><Loading /></Page>;
  const p = data.person;
  // 반려동물은 키우는 사람만 해당돼서 처음부터 고르지 않는다(웹 물어보기와 같다)
  const missing = SECTIONS.filter((s) => !p.card[s] && s !== "pets");
  const topics = picked ?? (missing.length ? missing : DEFAULTS);
  const needName = !data.me;
  const topicLabel = (s: Section) => t(`request.topic.${s}` as "request.topic.dates");
  const toggle = (s: Section) => setPicked(topics.includes(s) ? topics.filter((x) => x !== s) : [...topics, s]);
  const text = (c: TAskCreated) => (message.trim() ? `${c.text}\n${message.trim()}` : c.text);

  const share = async (created: TAskCreated) => {
    const result = await shareDeepLink(tossAskPath(APP_NAME, created.token), text(created));
    setSent({ created, result });
  };

  const send = async () => {
    if (busy || !topics.length || (needName && !from.trim())) return;
    setBusy(true);
    setFailed(false);
    try {
      const created = await api<TAskCreated>(`people/${id}/ask`, { json: { sections: topics, message: message.trim(), from: needName ? from.trim() : undefined } });
      await share(created);
    } catch {
      setFailed(true);
    }
    setBusy(false);
  };

  if (sent) {
    return (
      <Page>
        <section className="grad-hero relative mx-4 mt-2 flex flex-col items-center overflow-hidden rounded-3xl px-5 pb-6 pt-6 text-center">
          <span aria-hidden="true" className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/25" />
          <Mascot size={84} />
          <h1 className="headline relative pt-3 text-[22px]">{t("request.ready", { name: p.name })}</h1>
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
          <h2 className="text-[13.5px] font-bold text-muted">{t("request.message")}</h2>
          <p className="whitespace-pre-line rounded-2xl rounded-tl-md bg-sky-soft px-4 py-3 text-[15px] leading-[1.55]">{text(sent.created)}</p>
          {sent.result === "copied" ? (
            <p role="status" className="flex items-center gap-1.5 text-[14px] font-medium text-ok">
              <Icon name="check" size={15} strokeWidth={2.4} />
              {t("common.copied")}
            </p>
          ) : sent.result === "failed" ? (
            <p role="alert" className="text-[13.5px] text-red">
              공유하지 못했어요. 다시 눌러 주세요
            </p>
          ) : null}
        </section>
        <div className="h-6" />
        <BottomBar>
          <div className="grid grid-cols-2 gap-2.5">
            <button type="button" onClick={() => void share(sent.created)} className="btn-outline">
              <Icon name="share" size={18} strokeWidth={2} />
              다시 보내기
            </button>
            <button type="button" onClick={back} className="btn-primary">
              완료
            </button>
          </div>
        </BottomBar>
      </Page>
    );
  }

  return (
    <Page>
      <div className="flex items-center gap-3 px-6 pt-1">
        <Avatar config={p.avatar} size={48} label={p.name} />
        <h1 className="headline min-w-0 flex-1 text-[24px]">{t("request.titleTo", { name: p.name })}</h1>
      </div>

      <section aria-labelledby="ask-topics" className="card mx-4 mt-5 flex flex-col gap-3 px-5 py-5">
        <h2 id="ask-topics" className="text-[15px] font-bold">
          물어볼 것
        </h2>
        <div className="flex flex-wrap gap-2">
          {SECTIONS_BY_IMPORTANCE.map((s) => {
            const on = topics.includes(s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(s)}
                className={`flex h-11 items-center gap-1.5 rounded-full pl-1 pr-3.5 text-[14.5px] font-bold ${on ? "chip-on" : "bg-white shadow-[inset_0_0_0_1.5px_var(--color-edge)]"}`}
              >
                <SectionIcon section={s} size={32} />
                {topicLabel(s)}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card mx-4 mt-3 flex flex-col gap-4 px-5 py-5">
        {needName ? (
          <label className="flex flex-col gap-2">
            <span className="text-[15px] font-bold">보내는 사람</span>
            <input className="field" value={from} maxLength={20} placeholder="예: 민지" onChange={(e) => setFrom(e.target.value)} />
          </label>
        ) : null}
        <label className="flex flex-col gap-2">
          <span className="text-[15px] font-bold">{t("request.message")}</span>
          <textarea className="field min-h-[96px] resize-none leading-[1.6]" value={message} maxLength={300} onChange={(e) => setMessage(e.target.value)} />
        </label>
      </section>

      {failed ? (
        <p role="alert" className="px-6 pt-3 text-[13.5px] text-red">
          잠시 연결이 안 돼요. 다시 눌러 주세요
        </p>
      ) : null}
      <div className="h-6" />
      <BottomBar>
        <button type="button" onClick={() => void send()} disabled={busy || !topics.length || (needName && !from.trim())} className="btn-primary w-full">
          <Icon name="share" size={19} strokeWidth={2} />
          {busy ? "만드는 중…" : t("request.send")}
        </button>
      </BottomBar>
    </Page>
  );
}
