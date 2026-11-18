import { useState } from "react";
import { Icon } from "@/components/marks";
import { api, API_BASE, forgetToken } from "../api";
import { openExternal } from "../bridge";
import { useNav } from "../nav";
import { Page, TabBar } from "../ui";

// 설정: 약관·처리방침(기기 브라우저로), 문의 메일, 기록 모두 지우기

const SUPPORT_EMAIL = "watalabs.help@gmail.com";

export function Settings() {
  const { go, bump } = useNav();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);

  const wipe = async () => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await api("account", { method: "DELETE" });
      await forgetToken();
      setDone(true);
      setConfirm(false);
      bump();
    } catch {
      setFailed(true);
    }
    setBusy(false);
  };

  const row = (label: string, onClick: () => void, icon: "external" | "chevron" = "external") => (
    <button type="button" onClick={onClick} className="flex min-h-[56px] w-full items-center justify-between border-t border-rule text-left text-[15px] font-medium first:border-t-0">
      {label}
      <Icon name={icon} size={17} className="text-muted" />
    </button>
  );

  return (
    <Page tabs>
      <h1 className="headline px-5 pb-3 pt-1 text-[24px]">설정</h1>
      <section className="card mx-4 flex flex-col px-5">
        {row("개인정보 처리방침", () => void openExternal(`${API_BASE}/privacy-policy?lang=ko`))}
        {row("이용약관", () => void openExternal(`${API_BASE}/terms?lang=ko`))}
        <div className="flex min-h-[56px] items-center justify-between gap-3 border-t border-rule">
          <span className="text-[15px] font-medium">문의</span>
          <span className="select-all text-[14px] text-ink-2">{SUPPORT_EMAIL}</span>
        </div>
      </section>

      <section className="card mx-4 mt-3 flex flex-col px-5 py-1">
        {done ? (
          <p role="status" className="flex min-h-[56px] items-center gap-1.5 text-[15px] font-medium text-ok">
            <Icon name="check" size={16} strokeWidth={2.4} />
            기록을 모두 지웠어요
          </p>
        ) : confirm ? (
          <div className="flex flex-col gap-3 py-3">
            <p className="text-[15px] font-bold">사람들과 기록, 메모를 모두 지울까요?</p>
            <p className="text-[13.5px] leading-[1.5] text-muted">지운 기록은 되살릴 수 없어요.</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button type="button" onClick={() => setConfirm(false)} className="btn-soft">
                그대로 두기
              </button>
              <button type="button" onClick={() => void wipe()} disabled={busy} className="btn-soft !text-red">
                {busy ? "지우는 중…" : "모두 지우기"}
              </button>
            </div>
            {failed ? <p role="alert" className="text-[13.5px] text-red">지우지 못했어요. 다시 눌러 주세요</p> : null}
          </div>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className="flex min-h-[56px] items-center text-left text-[15px] font-medium text-red">
            기록 모두 지우기
          </button>
        )}
      </section>
      {done ? (
        <div className="px-4 pt-4">
          <button type="button" onClick={() => go("home")} className="btn-outline w-full">
            처음으로
          </button>
        </div>
      ) : null}
      <div className="h-6" />
      <TabBar />
    </Page>
  );
}
