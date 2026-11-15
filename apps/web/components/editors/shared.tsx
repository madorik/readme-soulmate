"use client";

import { NONE, translate, type Locale, type MessageKey, type Vars } from "@readme/core";
import { CheckGlyph, DrawnCheck } from "../marks";

export type TFn = (key: MessageKey, vars?: Vars) => string;

/** '없음'이 있는 고르기: 없음을 누르면 나머지를 지우고, 다른 것을 누르면 없음을 뺀다 */
export function toggleWithNone(list: readonly string[], code: string): string[] {
  if (code === NONE) return list.includes(NONE) ? [] : [NONE];
  const real = list.filter((c) => c !== NONE);
  return real.includes(code) ? real.filter((c) => c !== code) : [...real, code];
}

export function useT(locale: Locale): TFn {
  return (key, vars) => translate(locale, key, vars);
}

/** 눌러서 고르는 칩 하나. warn이면 켰을 때 분홍(알레르기) */
export function CircleOption({
  label,
  on,
  onToggle,
  color = "ink",
  large = false,
  textClass = "",
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
  color?: "red" | "ink" | "warn";
  large?: boolean;
  textClass?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      className={`chip ${color === "warn" ? "chip-warn" : ""} ${large ? "!min-h-12 !px-[18px] text-[16.5px]" : ""} ${textClass}`}
    >
      {on ? <CheckGlyph /> : null}
      {label}
    </button>
  );
}

/** 칩을 담는 줄(넘치면 다음 줄로) */
export const CHIP_ROW = "flex flex-wrap gap-2";

export function CheckRow({ on, onToggle, label, sub }: { on: boolean; onToggle: () => void; label: string; sub?: string }) {
  return (
    <button type="button" aria-pressed={on} onClick={onToggle} className="flex min-h-[58px] w-full items-center gap-3.5 border-t border-rule text-left first:border-t-0">
      <DrawnCheck on={on} />
      <span className="flex flex-col gap-0.5">
        <span className="text-[15.5px] font-bold">{label}</span>
        {sub ? <span className="text-[12.5px] text-muted">{sub}</span> : null}
      </span>
    </button>
  );
}

export function SectionHeading({ children, tone = "ink", right }: { children: React.ReactNode; tone?: "ink" | "red"; right?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className={`text-[16px] font-bold ${tone === "red" ? "text-red" : ""}`}>{children}</span>
      {right ? <span className="text-[12.5px] text-muted">{right}</span> : null}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  multiline = false,
  name,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "url";
  multiline?: boolean;
  name?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[14px] font-bold">{label}</span>
      {multiline ? (
        <textarea name={name} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2} className="field resize-none leading-[1.5]" />
      ) : (
        <input name={name} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} inputMode={inputMode} className="field" />
      )}
    </label>
  );
}

export function joinList(v: string[]): string {
  return v.join(", ");
}

export function splitList(v: string): string[] {
  return v
    .split(/[,\n、，]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
