"use client";

import { SECTIONS, emptySection, type CardData, type DateSpec, type Locale, type PartialCard, type Section } from "@readme/core";
import { useActionState, useState } from "react";
import { createRequest } from "@/app/actions/request";
import type { InviteState } from "@/app/actions/share";
import { DateSpecPicker } from "@/components/editors/DatesEditor";
import { SafetyEditor } from "@/components/editors/SafetyEditor";
import { SizesEditor } from "@/components/editors/SizesEditor";
import { CircleOption, TextField, joinList, splitList, useT } from "@/components/editors/shared";
import { Icon } from "@/components/marks";
import { ShareButtons } from "@/components/ShareButtons";

const INITIAL: InviteState = { url: null, code: null, text: "", error: null };

export function RequestForm({ locale, name: initialName, topics: initialTopics }: { locale: Locale; name: string; topics: Section[] }) {
  const t = useT(locale);
  const [name, setName] = useState(initialName);
  const [topics, setTopics] = useState<Section[]>(initialTopics);
  const [prefill, setPrefill] = useState<PartialCard>({});
  const [unsure, setUnsure] = useState<Section[]>([]);
  const [open, setOpen] = useState<Section | null>(null);
  const [text, setText] = useState({ likes: "", loves: "" });
  const [message, setMessage] = useState(t("request.messageDefault"));
  const [state, action, pending] = useActionState(createRequest, INITIAL);

  if (state.url) {
    return (
      <div className="flex flex-1 flex-col px-6 pt-6">
        <p className="text-[15px] leading-[1.6]">{t("request.footer")}</p>
        <div className="mt-auto pt-8">
          <ShareButtons locale={locale} url={state.url} text={`${state.text}\n${message}`} kakaoLabel={t("request.send")} />
        </div>
      </div>
    );
  }

  const put = <S extends Section>(s: S, v: CardData[S]) => setPrefill((p) => ({ ...p, [s]: v }));
  const known = (s: Section) => !!prefill[s];

  return (
    <form action={action} className="flex flex-1 flex-col">
      <input type="hidden" name="sections" value={JSON.stringify(topics)} />
      <input type="hidden" name="prefill" value={JSON.stringify(Object.fromEntries(Object.entries(prefill).filter(([k]) => topics.includes(k as Section))))} />
      <input type="hidden" name="unsure" value={JSON.stringify(unsure)} />

      <div className="flex flex-col gap-2 px-6 pt-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[15px] font-bold">{t("request.who")}</span>
          <input name="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} placeholder={t("request.namePlaceholder")} className="field" />
        </label>
        <span className="text-[12.5px] text-muted">{t("request.whoSub")}</span>
      </div>

      <div className="flex flex-col gap-0.5 px-6 pt-5">
        <span className="text-[15px] font-bold">{t("request.topics")}</span>
        <div className="flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <CircleOption
              key={s}
              label={t(`request.topic.${s}` as "request.topic.dates")}
              on={topics.includes(s)}
              onToggle={() => setTopics(topics.includes(s) ? topics.filter((x) => x !== s) : SECTIONS.filter((x) => x === s || topics.includes(x)))}
              textClass="!text-[15.5px]"
            />
          ))}
        </div>
      </div>

      {topics.length ? (
        <div className="flex flex-col px-6 pt-4">
          <span className="text-[15px] font-bold">{t("request.prefill")}</span>
          <span className="pb-2.5 pt-[3px] text-[12.5px] text-muted">{t("request.prefillSub")}</span>
          {topics
            .filter((s) => s !== "favorites")
            .map((s) => (
            <div key={s} className="border-t border-rule">
              <button type="button" aria-expanded={open === s} onClick={() => setOpen(open === s ? null : s)} className="flex min-h-12 w-full items-center gap-2.5 text-left">
                <span className="w-[120px] shrink-0 text-[13.5px] text-muted">{t(`request.topic.${s}` as "request.topic.dates")}</span>
                <span className={`flex-1 text-[15px] ${known(s) ? "font-bold" : "font-semibold text-muted"}`}>{known(s) ? t("common.saved") : t("answer.empty")}</span>
                {unsure.includes(s) ? <span className="hl text-[12.5px] font-bold">{t("request.unsure")}</span> : null}
                <Icon name="chevron" size={18} className={`text-muted transition-transform ${open === s ? "rotate-90" : ""}`} />
              </button>
              {open === s ? (
                <div className="flex flex-col gap-3 pb-4">
                  {s === "dates" ? (
                    <DateSpecPicker
                      year="birth"
                      value={prefill.dates?.birthday ?? null}
                      onChange={(spec: DateSpec) => put("dates", { birthday: spec, anniversaries: [] })}
                      locale={locale}
                      preview={false}
                    />
                  ) : null}
                  {s === "safety" ? (
                    <SafetyEditor value={prefill.safety ?? emptySection("safety")} onChange={(v) => put("safety", v)} locale={locale} showVoice={false} showNote={false} />
                  ) : null}
                  {s === "taste" ? (
                    <TextField
                      label={t("taste.likes")}
                      value={text.likes}
                      onChange={(v) => {
                        setText({ ...text, likes: v });
                        put("taste", { ...emptySection("taste"), likes: splitList(v) });
                      }}
                      placeholder={t("taste.likesPlaceholder")}
                    />
                  ) : null}
                  {s === "sizes" ? <SizesEditor value={prefill.sizes ?? emptySection("sizes")} onChange={(v) => put("sizes", v)} locale={locale} /> : null}
                  {s === "gifts" ? (
                    <TextField
                      label={t("gift.loves")}
                      value={text.loves || joinList(prefill.gifts?.loves ?? [])}
                      onChange={(v) => {
                        setText({ ...text, loves: v });
                        put("gifts", { ...emptySection("gifts"), loves: splitList(v) });
                      }}
                      placeholder={t("gift.lovesPlaceholder")}
                    />
                  ) : null}
                  <CircleOption
                    label={t("request.unsure")}
                    color="ink"
                    on={unsure.includes(s)}
                    onToggle={() => setUnsure(unsure.includes(s) ? unsure.filter((x) => x !== s) : [...unsure, s])}
                    textClass="self-start !text-[14.5px]"
                  />
                </div>
              ) : null}
            </div>
          ))}
          <div className="border-t border-rule" />
        </div>
      ) : null}

      <label className="flex flex-col gap-2 px-6 pt-5">
        <span className="text-[15px] font-bold">{t("request.message")}</span>
        <textarea name="message" value={message} onChange={(e) => setMessage(e.target.value)} rows={2} maxLength={300} className="field resize-none leading-[1.55]" />
      </label>

      {state.error ? (
        <p role="alert" className="px-6 pt-3 text-[13.5px] text-red">
          {t(state.error === "pickOne" ? "request.pickOne" : name.trim() ? "common.error" : "request.needName")}
        </p>
      ) : null}

      <div className="mt-auto flex flex-col gap-2.5 px-6 pt-8">
        <span className="text-[12.5px] leading-[1.5] text-muted">{t("request.footer")}</span>
        <button disabled={pending || !topics.length || !name.trim()} className="btn-primary w-full">
          {t("request.make")}
        </button>
      </div>
    </form>
  );
}
