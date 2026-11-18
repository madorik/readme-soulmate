"use client";

import type { Locale } from "@readme/core";
import { useEffect, useState } from "react";
import { createTossLinkCode } from "@/app/actions/account";
import { useT } from "@/components/editors/shared";
import { Icon } from "@/components/marks";

// 설정 > 토스에서 쓰기: 누르면 10분짜리 연결 코드. 토스 미니앱 시작 화면 '기존 계정 연결'에 넣으면 이 계정으로 들어간다
export function TossLinkCode({ locale }: { locale: Locale }) {
  const t = useT(locale);
  const [code, setCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (!code) return;
    const tick = () => setLeft(Math.max(0, Math.ceil((Date.parse(code.expiresAt) - Date.now()) / 60_000)));
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, [code]);

  const make = async () => {
    if (busy) return;
    setBusy(true);
    try {
      setCode(await createTossLinkCode());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col border-t border-rule">
      <button type="button" onClick={() => void make()} disabled={busy} className="flex min-h-16 items-center justify-between text-left text-[15.5px] font-bold">
        {t("toss.use")}
        <Icon name={code ? "check" : "chevron"} size={17} className="text-muted" />
      </button>
      {code ? (
        <div className="flex items-center justify-between gap-3 pb-4">
          <span className="num select-all text-[26px] font-bold tracking-[0.12em]" data-testid="toss-link-code">
            {left > 0 ? code.code : "—"}
          </span>
          <span className="text-[13px] text-muted">{left > 0 ? t("toss.minutesLeft", { n: left }) : t("toss.expired")}</span>
        </div>
      ) : null}
    </div>
  );
}
