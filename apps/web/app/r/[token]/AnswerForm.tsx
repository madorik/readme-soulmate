"use client";

import { emptySection, type CardData, type GiftsData, type Locale, type PartialCard, type Section } from "@readme/core";
import Link from "next/link";
import { useActionState, useState } from "react";
import { submitAnswer, type AnswerState } from "@/app/actions/request";
import { DateSpecPicker } from "@/components/editors/DatesEditor";
import { CultureEditor } from "@/components/editors/CultureEditor";
import { FavoritesEditor } from "@/components/editors/FavoritesEditor";
import { LifeEditor } from "@/components/editors/LifeEditor";
import { SafetyEditor } from "@/components/editors/SafetyEditor";
import { SizesEditor } from "@/components/editors/SizesEditor";
import { TasteEditor } from "@/components/editors/TasteEditor";
import { CircleOption, TextField, joinList, splitList, useT } from "@/components/editors/shared";
import { DrawnCheck, Icon } from "@/components/marks";
import { AnswerDone } from "@/components/AnswerDone";
import { Mascot } from "@/components/Mascot";
import { SectionIcon } from "@/components/SectionIcon";
import { summarize } from "@/lib/summary";

type Mode = "ok" | "fix" | "new" | "none";
const INITIAL: AnswerState = { sent: false, savedMine: false, error: null };

function GiftsLite({ value, onChange, locale }: { value: GiftsData; onChange: (v: GiftsData) => void; locale: Locale }) {
  const t = useT(locale);
  const [skip, setSkip] = useState(joinList(value.skip));
  return (
    <div className="flex flex-col gap-5">
      <TextField label={t("gift.flowers")} value={value.flowers} onChange={(flowers) => onChange({ ...value, flowers })} placeholder={t("gift.flowersPlaceholder")} />
      <div className="flex flex-col gap-1">
        <span className="text-[14px] font-bold">{t("gift.giftCard")}</span>
        <div className="flex flex-wrap gap-2">
          <CircleOption large label={t("gift.giftCardYes")} on={value.giftCard === "yes"} onToggle={() => onChange({ ...value, giftCard: value.giftCard === "yes" ? null : "yes" })} />
          <CircleOption large color="ink" label={t("gift.giftCardNo")} on={value.giftCard === "no"} onToggle={() => onChange({ ...value, giftCard: value.giftCard === "no" ? null : "no" })} />
        </div>
      </div>
      <TextField label={t("gift.skip")} value={skip} onChange={(v) => { setSkip(v); onChange({ ...value, skip: splitList(v) }); }} placeholder={t("gift.skipPlaceholder")} />
    </div>
  );
}

export function AnswerForm({
  locale,
  token,
  from,
  message,
  sections,
  prefill,
  mine,
  signedIn,
}: {
  locale: Locale;
  token: string;
  from: string;
  message: string;
  sections: Section[];
  /** 물어본 사람이 이미 알고 있는 값(그 사람 기록에서) */
  prefill: PartialCard;
  /** 로그인하고 답할 때 내 리드미 값(물어본 사람이 모르는 항목의 처음 값) */
  mine: PartialCard;
  signedIn: boolean;
}) {
  const t = useT(locale);
  const [answers, setAnswers] = useState<PartialCard>(() => Object.fromEntries(sections.map((s) => [s, prefill[s] ?? mine[s] ?? emptySection(s)])) as PartialCard);
  const [modes, setModes] = useState<Record<string, Mode | null>>(() => Object.fromEntries(sections.map((s) => [s, prefill[s] ? null : "new"])));
  const [consent, setConsent] = useState(false);
  const [saveMine, setSaveMine] = useState(true);
  const [step, setStep] = useState(0);
  const [state, action, pending] = useActionState(submitAnswer, INITIAL);

  if (state.sent) {
    const sent = sections.filter((x) => modes[x] != null);
    // 답한 뒤: 나도 그 사람에게 물어보기(로그인 안 했으면 로그인부터)
    const askBack = `/request?name=${encodeURIComponent(from)}`;
    return (
      <AnswerDone
        title={t("answer.sent.title")}
        body={t("answer.sentShort", { from })}
        topics={sent}
        labels={{ sentTitle: t("answer.sentTopics", { from }), topic: (x) => t(`request.topic.${x}` as "request.topic.dates"), perksTitle: t("answer.perksTitle") }}
        perks={
          signedIn
            ? []
            : [
                { icon: "pencil", text: t("answer.perk.edit") },
                { icon: "people", text: t("answer.perk.see") },
                { icon: "bell", text: t("answer.perk.remind") },
              ]
        }
      >
        <Link href={signedIn ? askBack : `/?next=${encodeURIComponent(askBack)}`} className="btn-primary w-full">
          {t("answer.askBack")}
        </Link>
        {state.savedMine ? (
          <Link href="/me" className="flex min-h-11 items-center justify-center text-[14px] font-bold">
            {t("answer.openApp")}
          </Link>
        ) : null}
      </AnswerDone>
    );
  }

  const set = <S extends Section>(s: S, v: CardData[S]) => {
    setAnswers((a) => ({ ...a, [s]: v }));
    if (modes[s] === "none") setModes((m) => ({ ...m, [s]: "new" }));
  };
  const answered = sections.filter((s) => modes[s] != null);
  const payload = Object.fromEntries(answered.map((s) => [s, modes[s] === "none" ? emptySection(s) : modes[s] === "ok" ? prefill[s] : answers[s]]));
  const needsConsent = answered.includes("safety");
  // 한 화면에 한 항목씩. 마지막 화면(sections.length)은 이름·동의·보내기
  const total = sections.length + 1;
  const last = step === sections.length;
  const go = (n: number) => {
    setStep(Math.max(0, Math.min(sections.length, n)));
    window.scrollTo({ top: 0 });
  };
  const s = last ? null : sections[step]!;

  return (
    <form
      action={action}
      className="flex flex-1 flex-col"
      onKeyDown={(e) => {
        // 마지막 화면 전에는 엔터로 보내지지 않게
        if (e.key === "Enter" && !last && (e.target as HTMLElement).tagName === "INPUT") e.preventDefault();
      }}
    >
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="data" value={JSON.stringify(payload)} />
      <input type="hidden" name="consent" value={consent ? "1" : "0"} />
      <input type="hidden" name="saveMine" value={signedIn && saveMine ? "1" : "0"} />

      {/* 진행: 뒤로 · 칸 막대 · 몇 번째 */}
      <div className="sticky top-0 z-20 flex items-center gap-3 bg-bg px-3 pb-2 pt-2" style={{ top: "var(--sat)" }}>
        <button type="button" onClick={() => go(step - 1)} disabled={step === 0} aria-label={t("common.back")} className="flex h-11 w-11 shrink-0 items-center justify-center disabled:opacity-0">
          <Icon name="back" size={22} />
        </button>
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-sky" : "bg-rule"}`} />
          ))}
        </div>
        <span className="num w-11 shrink-0 text-center text-[13px] !font-bold text-muted">
          {step + 1}/{total}
        </span>
      </div>

      {step === 0 ? (
        <div className="flex items-start gap-3 px-5 pt-3">
          <Mascot size={58} />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="headline text-[23px]">{t("answer.title", { from, n: sections.length })}</h1>
            {message ? <p className="rounded-2xl rounded-tl-md bg-white px-4 py-3 text-[15px] leading-[1.55] shadow-[0_0_0_1px_var(--color-rule)]">{message}</p> : null}
            {signedIn ? null : (
              // 앱을 쓰는 사람이 로그인 안 된 브라우저에서 열었으면: 로그인하고 답하면 내 리드미 값이 미리 채워지고, 물어본 사람 목록에 내 얼굴로 보인다
              <Link href={`/?next=${encodeURIComponent(`/r/${token}`)}`} className="flex min-h-10 items-center self-start text-[14px] font-bold text-accent">
                {t("answer.signInFirst")}
              </Link>
            )}
          </div>
        </div>
      ) : null}

      {s ? (
        <section key={s} className="card mx-4 mt-4 flex flex-col gap-4 px-5 pb-5 pt-5">
          <div className="flex items-center gap-3">
            <SectionIcon section={s} size={44} />
            <h2 className="flex-1 text-[19px] font-bold tracking-[-0.02em]">{t(`request.topic.${s}` as "request.topic.dates")}</h2>
          </div>
          {prefill[s] ? (
            <div className="flex flex-col gap-3 rounded-2xl bg-fill px-4 py-4">
              <span className="text-[13px] text-muted">{t("answer.prefilled", { from })}</span>
              <span className={`text-[20px] font-bold leading-[1.4] tracking-[-0.02em] ${modes[s] === "fix" ? "text-muted line-through decoration-red decoration-2" : ""}`}>
                {summarize(s, prefill[s], locale, t) || t("answer.empty")}
              </span>
              <div className="flex gap-2">
                {(["ok", "fix"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={modes[s] === m}
                    onClick={() => {
                      setModes((x) => ({ ...x, [s]: m }));
                      // 맞으면 바로 다음 항목으로
                      if (m === "ok") go(step + 1);
                    }}
                    className={`h-12 flex-1 rounded-full text-[16px] font-bold ${modes[s] === m ? "grad" : "bg-white shadow-[inset_0_0_0_1.5px_var(--color-edge)]"}`}
                  >
                    {t(m === "ok" ? "answer.right" : "answer.fix")}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {modes[s] === "fix" || modes[s] === "new" ? (
            <div className="flex flex-col gap-4">
              {s === "dates" ? (
                <DateSpecPicker large year="birth" value={answers.dates?.birthday ?? null} onChange={(birthday) => set("dates", { birthday, anniversaries: answers.dates?.anniversaries ?? [] })} locale={locale} />
              ) : null}
              {s === "safety" ? <SafetyEditor large value={answers.safety ?? emptySection("safety")} onChange={(v) => set("safety", v)} locale={locale} /> : null}
              {s === "taste" ? <TasteEditor large value={answers.taste ?? emptySection("taste")} onChange={(v) => set("taste", v)} locale={locale} /> : null}
              {s === "sizes" ? <SizesEditor value={answers.sizes ?? emptySection("sizes")} onChange={(v) => set("sizes", v)} locale={locale} /> : null}
              {s === "gifts" ? <GiftsLite value={answers.gifts ?? emptySection("gifts")} onChange={(v) => set("gifts", v)} locale={locale} /> : null}
              {s === "favorites" ? <FavoritesEditor value={answers.favorites ?? emptySection("favorites")} onChange={(v) => set("favorites", v)} locale={locale} /> : null}
              {s === "culture" ? <CultureEditor value={answers.culture ?? emptySection("culture")} onChange={(v) => set("culture", v)} locale={locale} /> : null}
              {s === "life" ? <LifeEditor value={answers.life ?? emptySection("life")} onChange={(v) => set("life", v)} locale={locale} /> : null}
            </div>
          ) : null}
          {!prefill[s] ? (
            <button
              type="button"
              aria-pressed={modes[s] === "none"}
              onClick={() => {
                const none = modes[s] !== "none";
                setModes((x) => ({ ...x, [s]: none ? "none" : "new" }));
                if (none) go(step + 1);
              }}
              className={`pill self-start ${modes[s] === "none" ? "grad !shadow-none" : ""}`}
            >
              {t("answer.none")}
            </button>
          ) : null}
        </section>
      ) : (
        <section className="card mx-4 mt-4 flex flex-col gap-4 px-5 pb-5 pt-5">
          <div className="flex items-center gap-3">
            <Mascot size={44} />
            <h2 className="text-[19px] font-bold tracking-[-0.02em]">{t("answer.almost")}</h2>
          </div>
          {signedIn ? (
            <button type="button" aria-pressed={saveMine} onClick={() => setSaveMine(!saveMine)} className="flex items-start gap-3 text-left">
              <DrawnCheck on={saveMine} />
              <span className="text-[14px] leading-[1.5] text-ink-2">{t("answer.saveMine")}</span>
            </button>
          ) : null}
          {needsConsent ? (
            <button type="button" aria-pressed={consent} onClick={() => setConsent(!consent)} className="flex items-start gap-3 text-left">
              <DrawnCheck on={consent} />
              <span className="text-[14px] leading-[1.5] text-ink-2">{t("answer.consent", { from })}</span>
            </button>
          ) : null}
          <span className="text-[13px] leading-[1.5] text-muted">{t("answer.footer", { from })}</span>
        </section>
      )}

      <div className="bottom-bar mt-auto flex flex-col gap-2 bg-bg px-4 pt-4">
        {state.error ? (
          <p role="alert" className="px-1 text-[14px] text-red">
            {t(state.error === "consent" ? "answer.needConsent" : state.error === "closed" ? "accept.expired" : state.error === "self" ? "answer.self" : "common.error")}
          </p>
        ) : null}
        {last ? (
          <button disabled={pending || !answered.length || (needsConsent && !consent)} className="btn-primary h-[58px] w-full text-[17px]">
            {t("answer.send")}
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                // 건너뛰면 이 항목은 보내지 않는다
                setModes((x) => ({ ...x, [s!]: prefill[s!] ? null : x[s!] === "none" ? "none" : null }));
                go(step + 1);
              }}
              className="btn-soft !h-[56px] w-[34%] shrink-0"
            >
              {t("answer.skip")}
            </button>
            <button type="button" onClick={() => go(step + 1)} className="btn-primary !h-[56px] flex-1 text-[17px]">
              {t("answer.next")}
            </button>
          </div>
        )}
      </div>
    </form>
  );
}
