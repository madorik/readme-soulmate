import type { Locale } from "@readme/core";
import { useEffect, useState } from "react";
import { loadValue, saveValue } from "../bridge";
import { AiBadge } from "../ui";

// 생성형 AI 고지(앱인토스 정책): 말로 적기를 처음 열 때 한 번
const KEY = "ry_ai_notice";

export function AiNotice(_: { locale: Locale }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    void loadValue(KEY).then((v) => setShow(v !== "1"));
  }, []);
  if (!show) return null;
  return (
    <div className="mx-4 mb-2 flex flex-col gap-3 rounded-2xl bg-sky-soft px-4 py-3.5">
      <p className="flex items-start gap-2 text-[14px] leading-[1.55] text-ink-2">
        <AiBadge />
        <span>말로 적기와 선물 추천은 AI가 만들어요. 틀릴 수 있으니 결과를 확인해 주세요.</span>
      </p>
      <button
        type="button"
        onClick={() => {
          setShow(false);
          void saveValue(KEY, "1");
        }}
        className="self-end px-1 text-[17px] text-accent"
      >
        확인
      </button>
    </div>
  );
}
