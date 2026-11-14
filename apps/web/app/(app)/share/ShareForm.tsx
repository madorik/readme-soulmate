"use client";

import { RELATIONS, RELATION_PRESETS, SECTIONS, type Locale, type Relation, type Section } from "@readme/core";
import { useActionState, useState } from "react";
import { createShareInvite, type InviteState } from "@/app/actions/share";
import { CheckRow, CircleOption, useT } from "@/components/editors/shared";
import { Icon } from "@/components/marks";
import { ShareButtons } from "@/components/ShareButtons";

const INITIAL: InviteState = { url: null, code: null, text: "", error: null };

export function ShareForm({ locale }: { locale: Locale }) {
  const t = useT(locale);
  const [relation, setRelation] = useState<Relation>("family");
  const [sections, setSections] = useState<Section[]>(RELATION_PRESETS.family);
  const [state, action, pending] = useActionState(createShareInvite, INITIAL);

  if (state.url) {
    return (
      <div className="flex flex-1 flex-col px-6 pt-6">
        <p className="text-[15px] leading-[1.6]">{t("share.security")}</p>
        <div className="mt-6 flex flex-col gap-1 border-y border-rule py-4">
          <span className="text-[13px] text-muted">{t("share.code", { code: "" }).trim()}</span>
          <span className="num text-[44px] tracking-[0.12em]" aria-label={state.code ?? ""}>
            {state.code}
          </span>
        </div>
        <div className="mt-auto pt-8">
          <ShareButtons locale={locale} url={state.url} text={state.text} />
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-1 flex-col">
      <input type="hidden" name="relation" value={relation} />
      <input type="hidden" name="sections" value={JSON.stringify(sections)} />
      <div className="flex flex-col gap-1 px-6 pt-5">
        <span className="text-[15px] font-bold">{t("share.relation")}</span>
        <div role="radiogroup" aria-label={t("share.relation")} className="flex flex-wrap gap-x-5">
          {RELATIONS.map((r) => (
            <CircleOption
              key={r.code}
              label={r.label[locale]}
              on={relation === r.code}
              onToggle={() => {
                setRelation(r.code);
                setSections(RELATION_PRESETS[r.code]);
              }}
              textClass="!text-[18px] !font-bold px-1"
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col px-6 pt-5">
        <div className="flex items-baseline justify-between pb-2">
          <span className="text-[15px] font-bold">{t("share.what")}</span>
          <span className="text-[13px] text-muted">{t("share.count", { n: sections.length })}</span>
        </div>
        {SECTIONS.map((s) => (
          <CheckRow
            key={s}
            on={sections.includes(s)}
            onToggle={() => setSections(sections.includes(s) ? sections.filter((x) => x !== s) : SECTIONS.filter((x) => x === s || sections.includes(x)))}
            label={t(`section.${s}` as "section.safety")}
            sub={t(`section.${s}.sub` as "section.safety.sub")}
          />
        ))}
        <div className="border-t border-rule" />
      </div>
      <div className="flex items-start gap-2.5 px-6 pt-4">
        <Icon name="lock" size={17} className="mt-0.5 shrink-0" />
        <span className="text-[13.5px] leading-[1.55] text-ink-2">{t("share.security")}</span>
      </div>
      {state.error ? (
        <p role="alert" className="px-6 pt-3 text-[13.5px] text-red">
          {t(state.error === "pickOne" ? "share.pickOne" : "common.error")}
        </p>
      ) : null}
      <div className="mt-auto px-6 pt-8">
        <button disabled={pending || !sections.length} className="btn-primary w-full">
          {t("share.make")}
        </button>
      </div>
    </form>
  );
}
