"use client";

import {
  AVATAR_BG_FILLS,
  AVATAR_BGS,
  AVATAR_BODIES,
  AVATAR_CLOTHS,
  AVATAR_FACES,
  AVATAR_GLASSES,
  AVATAR_HAIR_COLORS,
  AVATAR_HAIRS,
  AVATAR_ITEMS,
  AVATAR_SKINS,
  type AvatarConfig,
  type Locale,
} from "@readme/core";
import { useState } from "react";
import { AvatarArt, avatarBackground } from "../Avatar";
import { Heart, Sparkle, SKY_STAR, Squiggle, Star, Tape, type TapeColor } from "../diary";
import { useT } from "./shared";

type Tab = "hair" | "face" | "body" | "item" | "glasses" | "color";
const TABS: Tab[] = ["hair", "face", "body", "item", "glasses", "color"];
const TAB_KEY = { hair: "avatar.hair", face: "avatar.face", body: "avatar.body", item: "avatar.item", glasses: "avatar.glasses", color: "avatar.colors" } as const;

const CLOTH_LABELS = {
  ko: ["흰색", "남색", "망고", "잎", "분홍", "하늘", "보라", "주황", "빨강", "회색", "베이지", "갈색"],
  en: ["White", "Navy", "Mango", "Leaf", "Pink", "Sky", "Violet", "Orange", "Red", "Gray", "Beige", "Brown"],
};
const HAIR_COLOR_LABELS = {
  ko: ["검정", "갈색", "회색", "밝은 갈색", "흰머리", "금발", "적갈색", "분홍", "파랑"],
  en: ["Black", "Brown", "Gray", "Light brown", "White", "Blonde", "Auburn", "Pink", "Blue"],
};
const SKIN_LABELS = { ko: ["하양", "아주 밝게", "밝게", "중간", "진하게", "아주 진하게"], en: ["White", "Very light", "Light", "Medium", "Tan", "Deep"] };

const any = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]!;

function Swatch({ fill, on, label, onPick }: { fill: string; on: boolean; label: string; onPick: () => void }) {
  return (
    <button type="button" aria-pressed={on} aria-label={label} onClick={onPick} className="flex h-11 w-11 items-center justify-center">
      <span
        className="h-9 w-9 rounded-full transition-shadow"
        style={{ background: fill, boxShadow: on ? "inset 0 0 0 1.5px rgba(31,35,64,0.14), 0 0 0 3px var(--color-paper), 0 0 0 5px var(--color-ink)" : "inset 0 0 0 1.5px rgba(31,35,64,0.14)" }}
      />
    </button>
  );
}

/** 캐릭터 만들기: 큰 미리보기(아무거나·색깔) → between(이름 칸 등) → 머리·옷·소품·안경·색깔 탭과 고르기 칸 */
export function AvatarBuilder({ value, onChange, locale, between, tape = "pink" }: { value: AvatarConfig; onChange: (v: AvatarConfig) => void; locale: Locale; between?: React.ReactNode; tape?: TapeColor }) {
  const t = useT(locale);
  const [tab, setTab] = useState<Tab>("hair");
  const set = (patch: Partial<AvatarConfig>) => onChange({ ...value, ...patch });
  const shuffle = () =>
    onChange({
      hair: any(AVATAR_HAIRS),
      face: any(AVATAR_FACES),
      body: any(AVATAR_BODIES),
      item: any(AVATAR_ITEMS),
      glasses: any(AVATAR_GLASSES),
      bg: any(AVATAR_BGS),
      cloth: any(AVATAR_CLOTHS),
      hairColor: any(AVATAR_HAIR_COLORS),
      skin: any(AVATAR_SKINS),
    });

  const options: { key: Exclude<Tab, "color">; list: readonly string[] } | null =
    tab === "hair"
      ? { key: "hair", list: AVATAR_HAIRS }
      : tab === "face"
        ? { key: "face", list: AVATAR_FACES }
        : tab === "body"
          ? { key: "body", list: AVATAR_BODIES }
          : tab === "item"
            ? { key: "item", list: AVATAR_ITEMS }
            : tab === "glasses"
              ? { key: "glasses", list: AVATAR_GLASSES }
              : null;

  return (
    <div className="flex flex-col">
      <section className="relative">
      <div className="relative -rotate-[0.5deg] bg-white px-2.5 pb-[18px] pt-2.5 shadow-[0_1px_2px_rgb(31_35_64/0.12),0_12px_24px_-14px_rgb(31_35_64/0.5)]">
      <div className="relative flex h-[264px] items-end justify-center overflow-hidden" style={{ background: avatarBackground(value) }}>
        <span aria-hidden="true" className="absolute left-[22px] top-[22px] h-16 w-16 rounded-full bg-white/45" />
        <span aria-hidden="true" className="absolute right-10 top-12 h-[22px] w-[22px] rounded-full bg-white/45" />
        <AvatarArt config={value} size={244} />
        <button
          type="button"
          onClick={shuffle}
          className="absolute bottom-2.5 left-2.5 flex h-11 items-center gap-1.5 rounded-full bg-white pl-[11px] pr-[15px] text-[17px] shadow-[inset_0_0_0_1.5px_var(--color-ink)] active:scale-95"
        >
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="4" width="16" height="16" rx="4" />
            <circle cx="9" cy="9" r="1.3" fill="currentColor" />
            <circle cx="15" cy="15" r="1.3" fill="currentColor" />
            <circle cx="15" cy="9" r="1.3" fill="currentColor" />
            <circle cx="9" cy="15" r="1.3" fill="currentColor" />
          </svg>
          {t("avatar.shuffle")}
        </button>
        <button
          type="button"
          aria-label={t("avatar.palette")}
          aria-pressed={tab === "color"}
          onClick={() => setTab("color")}
          className={`absolute bottom-2.5 right-2.5 flex h-12 w-12 items-center justify-center rounded-full shadow-[inset_0_0_0_1.5px_var(--color-ink)] active:scale-95 ${tab === "color" ? "bg-sky" : "bg-white"}`}
        >
          <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4A4.6 4.6 0 0 0 21 9.8C21 6 17 3 12 3z" />
            <circle cx="7.5" cy="11" r="1.2" fill="currentColor" />
            <circle cx="10" cy="7" r="1.2" fill="currentColor" />
            <circle cx="15" cy="7" r="1.2" fill="currentColor" />
          </svg>
        </button>
      </div>
      <Tape color={tape} w={96} h={24} rotate={-3} alpha={tape === "pink" ? 0.6 : 0.62} className="-top-2.5 left-1/2 -ml-12" />
      </div>
      <Heart size={26} rotate={16} className="-right-[9px] top-[130px]" />
      <Star size={20} rotate={-12} color={SKY_STAR} className="-left-[9px] top-[70px]" />
      <Squiggle w={54} width={2.4} className="-bottom-1 left-10" />
      <Sparkle size={18} className="-top-3.5 right-[22px]" />
      </section>

      {between}

      {/* 여섯 칸: 좁은 화면에서 영어(Clothes·Glasses)도 칸을 넘지 않게 13px, 380px부터 14.5px */}
      <div role="tablist" aria-label={t("avatar.parts")} className="mt-5 grid grid-cols-[repeat(6,minmax(0,1fr))] border-b-[1.5px] border-dashed border-rule-strong">
        {TABS.map((k) => {
          const on = tab === k;
          return (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(k)}
              className={`relative h-12 whitespace-nowrap text-[19px] ${on ? "text-ink" : "text-muted"}`}
            >
              {t(TAB_KEY[k])}
              <span aria-hidden="true" className={`absolute inset-x-[22%] -bottom-px h-1 rounded-full ${on ? "bg-sky" : "bg-transparent"}`} />
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="min-h-[252px] pt-3.5">
        {options ? (
          // 두 줄(여섯 개)이 넘으면 두 줄로 두고 옆으로 넘겨 본다. 다음 칸이 살짝 보이게 3.3칸 폭
          <div className={options.list.length > 6 ? "-mx-4 snap-x overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : ""}>
            <div className={options.list.length > 6 ? "grid auto-cols-[calc((100%-30px)/3.3)] grid-flow-col grid-rows-2 gap-2.5" : "grid grid-cols-3 gap-2.5"}>
              {options.list.map((id) => {
                const on = value[options.key] === id;
                const label = t(`avatar.${options.key}.${id}` as "avatar.hair.bob");
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={on}
                    aria-label={label}
                    onClick={() => set({ [options.key]: id } as Partial<AvatarConfig>)}
                    className={`flex h-[116px] snap-start flex-col items-center justify-end gap-0.5 overflow-hidden rounded-[14px] pb-1.5 transition-colors ${on ? "bg-sky-soft shadow-[inset_0_0_0_2px_var(--color-ink)]" : "bg-white shadow-[inset_0_0_0_1.5px_var(--color-rule-strong)]"}`}
                  >
                    <AvatarArt config={{ ...value, [options.key]: id } as AvatarConfig} size={80} />
                    <span className={`text-[15px] leading-[1.2] ${on ? "text-ink" : "text-muted"}`}>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 pt-1">
            <div className="flex flex-col gap-1.5">
              <span className="text-[19px]">{t("avatar.bg")}</span>
              <div className="flex flex-wrap gap-1">
                {AVATAR_BGS.map((bg) => {
                  const [a, b] = AVATAR_BG_FILLS[bg];
                  return <Swatch key={bg} fill={a === b ? a : `linear-gradient(140deg, ${a}, ${b})`} on={value.bg === bg} label={t(`avatar.bg.${bg}` as "avatar.bg.sky")} onPick={() => set({ bg })} />;
                })}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[19px]">{t("avatar.cloth")}</span>
              <div className="flex flex-wrap gap-1">
                {AVATAR_CLOTHS.map((c, i) => (
                  <Swatch key={c} fill={c} on={value.cloth === c} label={CLOTH_LABELS[locale][i]!} onPick={() => set({ cloth: c })} />
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[19px]">{t("avatar.hairColor")}</span>
              <div className="flex flex-wrap gap-1">
                {AVATAR_HAIR_COLORS.map((c, i) => (
                  <Swatch key={c} fill={c} on={value.hairColor === c} label={HAIR_COLOR_LABELS[locale][i]!} onPick={() => set({ hairColor: c })} />
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[19px]">{t("avatar.skin")}</span>
              <div className="flex flex-wrap gap-1">
                {AVATAR_SKINS.map((c, i) => (
                  <Swatch key={c} fill={c} on={value.skin === c} label={SKIN_LABELS[locale][i]!} onPick={() => set({ skin: c })} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
