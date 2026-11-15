import type { CaptureLine } from "@/app/actions/capture";

export interface CaptureBadgeLabels {
  same: string;
  gone: string;
  changed: string;
  removed: string;
}

/** AI로 적은 한 줄 옆 작은 표: 바꿨어요·지웠어요·이미 알고 있어요·이미 없어요(새로 더한 건 표 없음) */
export function CaptureBadge({ line, labels }: { line: CaptureLine; labels: CaptureBadgeLabels }) {
  const text = line.same ? (line.op === "remove" ? labels.gone : labels.same) : line.op === "replace" ? labels.changed : line.op === "remove" ? labels.removed : null;
  if (!text) return null;
  const tone = line.same ? "bg-fill text-muted" : line.op === "remove" ? "bg-red-soft text-red" : "chip-on";
  return <span className={`shrink-0 rounded-full px-2 py-[1px] text-[11.5px] font-bold ${tone}`}>{text}</span>;
}

/** 지운 값은 줄을 그어 보인다 */
export const struck = (line: CaptureLine) => (line.op === "remove" && !line.same ? "text-muted line-through decoration-2" : "");
