"use client";

import { AVATAR_HAIRS, AVATAR_HAIR_COLORS, AVATAR_SKINS, AVATAR_TONES, TONE_COLORS, type AvatarConfig, type Locale } from "@readme/core";
import { Avatar } from "../Avatar";
import { MarkerCircle } from "../marks";
import { useT } from "./shared";

function Swatch({ color, on, label, onPick }: { color: string; on: boolean; label: string; onPick: () => void }) {
  return (
    <button type="button" aria-pressed={on} aria-label={label} onClick={onPick} className="relative flex h-11 w-11 items-center justify-center">
      <span className="h-[30px] w-[30px] rounded-full" style={{ background: color, boxShadow: "inset 0 0 0 1.5px rgba(29,33,37,0.18)" }} />
      {on ? <MarkerCircle pad={[-1, -1]} width={2.4} /> : null}
    </button>
  );
}

const SKIN_LABELS = { ko: ["밝은 피부", "살구빛 피부", "황갈색 피부", "갈색 피부", "짙은 피부"], en: ["Light", "Peach", "Tan", "Brown", "Deep"] };
const HAIR_COLOR_LABELS = { ko: ["검정", "짙은 갈색", "갈색", "회색"], en: ["Black", "Dark brown", "Brown", "Gray"] };
const TONE_LABELS = { ko: { red: "빨강", blue: "파랑", yellow: "노랑", green: "초록", navy: "남색" }, en: { red: "Red", blue: "Blue", yellow: "Yellow", green: "Green", navy: "Navy" } };

export function AvatarBuilder({ value, onChange, locale }: { value: AvatarConfig; onChange: (v: AvatarConfig) => void; locale: Locale }) {
  const t = useT(locale);
  const set = (patch: Partial<AvatarConfig>) => onChange({ ...value, ...patch });
  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-2">
        <span className="text-[14px] font-bold">{t("avatar.hair")}</span>
        <div className="flex justify-between">
          {AVATAR_HAIRS.map((h) => {
            const label = t(`avatar.hair.${h}` as "avatar.hair.short");
            return (
              <button key={h} type="button" aria-pressed={value.hair === h} aria-label={label} onClick={() => set({ hair: h })} className="relative flex h-[50px] w-[50px] items-center justify-center">
                <Avatar config={{ ...value, hair: h }} size={44} label={label} />
                {value.hair === h ? <MarkerCircle pad={[4, 4]} width={2.6} /> : null}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-3.5 flex flex-col">
        <div className="flex min-h-14 items-center border-t border-rule">
          <span className="w-[72px] shrink-0 text-[14px] font-bold">{t("avatar.skin")}</span>
          <div className="flex gap-2">
            {AVATAR_SKINS.map((c, i) => (
              <Swatch key={c} color={c} on={value.skin === c} label={SKIN_LABELS[locale][i]!} onPick={() => set({ skin: c })} />
            ))}
          </div>
        </div>
        <div className="flex min-h-14 items-center border-t border-rule">
          <span className="w-[72px] shrink-0 text-[14px] font-bold">{t("avatar.hairColor")}</span>
          <div className="flex gap-2">
            {AVATAR_HAIR_COLORS.map((c, i) => (
              <Swatch key={c} color={c} on={value.hairColor === c} label={HAIR_COLOR_LABELS[locale][i]!} onPick={() => set({ hairColor: c })} />
            ))}
          </div>
        </div>
        <div className="flex min-h-14 items-center border-t border-rule">
          <span className="w-[72px] shrink-0 text-[14px] font-bold">{t("avatar.tone")}</span>
          <div className="flex gap-2">
            {AVATAR_TONES.map((tone) => (
              <Swatch key={tone} color={TONE_COLORS[tone].ink} on={value.tone === tone} label={TONE_LABELS[locale][tone]} onPick={() => set({ tone })} />
            ))}
          </div>
        </div>
        <label className="flex min-h-14 cursor-pointer items-center gap-3 border-y border-rule">
          <span className="w-[60px] shrink-0 text-[14px] font-bold">{t("avatar.glasses")}</span>
          <input type="checkbox" checked={value.glasses} onChange={(e) => set({ glasses: e.target.checked })} className="h-[22px] w-[22px] accent-[var(--color-ink)]" />
          <span className="text-[15px] font-semibold">{t("avatar.glassesOn")}</span>
        </label>
      </div>
    </div>
  );
}
