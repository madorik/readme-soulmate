"use client";

import { emptySection, type CardData, type GiftsData, type Locale, type PartialCard, type Section } from "@readme/core";
import Link from "next/link";
import { useActionState, useState } from "react";
import { submitAnswer, type AnswerState } from "@/app/actions/request";
import { DateSpecPicker } from "@/components/editors/DatesEditor";
import { FavoritesEditor } from "@/components/editors/FavoritesEditor";
import { SafetyEditor } from "@/components/editors/SafetyEditor";
import { SizesEditor } from "@/components/editors/SizesEditor";
import { TasteEditor } from "@/components/editors/TasteEditor";
import { CircleOption, TextField, joinList, splitList, useT } from "@/components/editors/shared";
import { DrawnCheck } from "@/components/marks";
import { summarize } from "@/lib/summary";

type Mode = "ok" | "fix" | "new" | "none";
const INITIAL: AnswerState = { sent: false, claimed: false, error: null };

function GiftsLite({ value, onChange, locale }: { value: GiftsData; onChange: (v: GiftsData) => void; locale: Locale }) {
  const t = useT(locale);
  const [loves, setLoves] = useState(joinList(value.loves));
  const [skip, setSkip] = useState(joinList(value.skip));
  return (
    <div className="flex flex-col gap-5">
      <TextField label={t("gift.loves")} value={loves} onChange={(v) => { setLoves(v); onChange({ ...value, loves: splitList(v) }); }} placeholder={t("gift.lovesPlaceholder")} />
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
  unsure,
  signedIn,
}: {
  locale: Locale;
  token: string;
  from: string;
  message: string;
  sections: Section[];
  prefill: PartialCard;
  unsure: Section[];
  signedIn: boolean;
}) {
  const t = useT(locale);
  const [answers, setAnswers] = useState<PartialCard>(() => Object.fromEntries(sections.map((s) => [s, prefill[s] ?? emptySection(s)])) as PartialCard);
  const [modes, setModes] = useState<Record<string, Mode | null>>(() => Object.fromEntries(sections.map((s) => [s, prefill[s] ? null : "new"])));
  const [consent, setConsent] = useState(false);
  const [state, action, pending] = useActionState(submitAnswer, INITIAL);

  if (state.sent) {
    return (
      <div className="flex flex-1 flex-col px-6 pt-10">
        <h1 className="headline text-[30px]">{t("answer.sent.title")}</h1>
        <p className="pt-3 text-[16px] leading-[1.6]">{state.claimed ? t("answer.claimed") : t("answer.sent.body", { from })}</p>
        <div className="mt-auto flex flex-col gap-2.5 pt-10">
          {state.claimed ? (
            <Link href="/me" className="btn-primary">
              {t("answer.openApp")}
            </Link>
          ) : (
            <Link href={`/?next=${encodeURIComponent(`/r/${token}/claim`)}`} className="btn-primary">
              {t("answer.claim")}
            </Link>
          )}
        </div>
      </div>
    );
  }

  const set = <S extends Section>(s: S, v: CardData[S]) => {
    setAnswers((a) => ({ ...a, [s]: v }));
    if (modes[s] === "none") setModes((m) => ({ ...m, [s]: "new" }));
  };
  const answered = sections.filter((s) => modes[s] != null);
  const payload = Object.fromEntries(answered.map((s) => [s, modes[s] === "none" ? emptySection(s) : modes[s] === "ok" ? prefill[s] : answers[s]]));
  const needsConsent = answered.includes("safety");

  return (
    <form action={action} className="flex flex-1 flex-col">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="data" value={JSON.stringify(payload)} />
      <input type="hidden" name="consent" value={consent ? "1" : "0"} />

      <div className="flex flex-col gap-3 px-6 pt-2">
        <h1 className="headline text-[26px]">{t("answer.title", { from, n: sections.length })}</h1>
        {message ? <p className="text-[16px] leading-[1.55]">“{message}”</p> : null}
        {signedIn ? <p className="text-[13.5px] text-muted">{t("answer.signedIn")}</p> : null}
      </div>

      <div className="mx-6 mt-4 flex flex-col">
        {sections.map((s) => {
          const mode = modes[s];
          const pre = prefill[s];
          const editing = mode === "fix" || mode === "new";
          return (
            <section key={s} className="flex flex-col gap-3 border-t border-rule py-4">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[14px] font-bold text-muted">{t(`request.topic.${s}` as "request.topic.dates")}</span>
                {pre && unsure.includes(s) ? <span className="hl text-[12.5px] font-bold">{t("request.unsure")}</span> : null}
              </div>
              {pre ? (
                <div className="flex flex-col gap-3">
                  <span className="text-[13px] text-muted">{t("answer.prefilled", { from })}</span>
                  <span className={`text-[21px] font-bold leading-[1.4] tracking-[-0.02em] ${mode === "fix" ? "text-muted line-through decoration-red decoration-2" : ""}`}>
                    {summarize(s, pre, locale, t) || t("answer.empty")}
                  </span>
                  <div className="flex gap-1.5">
                    {(["ok", "fix"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        aria-pressed={mode === m}
                        onClick={() => setModes((x) => ({ ...x, [s]: m }))}
                        className={`h-12 flex-1 rounded-full text-[16px] font-bold ${mode === m ? "grad" : "bg-white shadow-[inset_0_0_0_1.5px_var(--color-edge)]"}`}
                      >
                        {t(m === "ok" ? "answer.right" : "answer.fix")}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {editing ? (
                <div className="flex flex-col gap-4 pt-1">
                  {s === "dates" ? (
                    <DateSpecPicker large year="birth" value={answers.dates?.birthday ?? null} onChange={(birthday) => set("dates", { birthday, anniversaries: answers.dates?.anniversaries ?? [] })} locale={locale} />
                  ) : null}
                  {s === "safety" ? <SafetyEditor large value={answers.safety ?? emptySection("safety")} onChange={(v) => set("safety", v)} locale={locale} /> : null}
                  {s === "taste" ? <TasteEditor large value={answers.taste ?? emptySection("taste")} onChange={(v) => set("taste", v)} locale={locale} /> : null}
                  {s === "sizes" ? <SizesEditor value={answers.sizes ?? emptySection("sizes")} onChange={(v) => set("sizes", v)} locale={locale} /> : null}
                  {s === "gifts" ? <GiftsLite value={answers.gifts ?? emptySection("gifts")} onChange={(v) => set("gifts", v)} locale={locale} /> : null}
                  {s === "favorites" ? <FavoritesEditor value={answers.favorites ?? emptySection("favorites")} onChange={(v) => set("favorites", v)} locale={locale} /> : null}
                  {!pre ? (
                    <button type="button" onClick={() => setModes((x) => ({ ...x, [s]: "none" }))} aria-pressed={false} className="pill self-start">
                      {t("answer.none")}
                    </button>
                  ) : null}
                </div>
              ) : mode === "none" ? (
                <button type="button" onClick={() => setModes((x) => ({ ...x, [s]: "new" }))} className="pill grad self-start !shadow-none">
                  {t("answer.none")}
                </button>
              ) : null}
            </section>
          );
        })}
        <div className="border-t border-rule" />
      </div>

      <label className="flex flex-col gap-1.5 px-6 pt-5">
        <span className="text-[14px] font-bold">{t("answer.yourName")}</span>
        <input name="name" maxLength={40} placeholder={t("answer.yourNamePlaceholder")} className="field" />
      </label>

      {needsConsent ? (
        <button type="button" aria-pressed={consent} onClick={() => setConsent(!consent)} className="mx-6 mt-5 flex items-start gap-3 text-left">
          <DrawnCheck on={consent} />
          <span className="text-[14px] leading-[1.5] text-ink-2">{t("answer.consent")}</span>
        </button>
      ) : null}

      {state.error ? (
        <p role="alert" className="px-6 pt-3 text-[14px] text-red">
          {t(state.error === "consent" ? "answer.needConsent" : state.error === "closed" ? "accept.expired" : "common.error")}
        </p>
      ) : null}

      <div className="mt-auto flex flex-col gap-2.5 px-6 pt-8">
        <span className="text-center text-[13px] leading-[1.5] text-muted">{t("answer.footer", { from })}</span>
        <button disabled={pending || !answered.length || (needsConsent && !consent)} className="btn-primary h-[58px] text-[17px]">
          {t("answer.send")}
        </button>
      </div>
    </form>
  );
}
