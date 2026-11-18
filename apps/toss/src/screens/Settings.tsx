import { useState } from "react";
import { Icon } from "@/components/marks";
import type { THome } from "@/lib/toss-api";
import { api, forgetToken } from "../api";
import { askNotificationAgreement } from "../bridge";
import { useLoad } from "../load";
import { useNav } from "../nav";
import { Page, TabBar } from "../ui";

// 설정: 생일 알림(토스 알림 동의), 약관·처리방침(토스 화면 안에서), 문의 메일, 기록 모두 지우기

const SUPPORT_EMAIL = "watalabs.help@gmail.com";

export function Settings() {
  const { go, push, bump } = useNav();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const { data } = useLoad<THome>("home");
  const reminder = data?.reminder ?? null;
  const [switching, setSwitching] = useState(false);

  const toggleReminder = async () => {
    if (!reminder || switching) return;
    setSwitching(true);
    const on = !reminder.on;
    if (!on || (await askNotificationAgreement(reminder.template))) {
      await api("reminder", { json: { on } }).catch(() => null);
      bump();
    }
    setSwitching(false);
  };

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

  const row = (label: string, onClick: () => void) => (
    <button type="button" onClick={onClick} className="flex min-h-[56px] w-full items-center justify-between border-t border-rule text-left text-[15px] font-medium first:border-t-0">
      {label}
      <Icon name="chevron" size={17} className="text-muted" />
    </button>
  );

  return (
    <Page tabs>
      <h1 className="headline px-5 pb-3 pt-1 text-[24px]">설정</h1>
      {reminder ? (
        <section className="card mx-4 mb-3 flex flex-col px-5">
          <button type="button" role="switch" aria-checked={reminder.on} onClick={() => void toggleReminder()} disabled={switching} className="flex min-h-[56px] w-full items-center justify-between text-left text-[15px] font-medium">
            생일·기념일 알림
            <span aria-hidden="true" className={`relative h-[30px] w-[50px] rounded-full transition-colors ${reminder.on ? "bg-sky" : "bg-rule"}`}>
              <span className={`absolute top-[3px] h-6 w-6 rounded-full bg-white shadow transition-[left] ${reminder.on ? "left-[23px]" : "left-[3px]"}`} />
            </span>
          </button>
        </section>
      ) : null}
      <section className="card mx-4 flex flex-col px-5">
        {row("개인정보 처리방침", () => push({ name: "legal", doc: "privacy" }))}
        {row("이용약관", () => push({ name: "legal", doc: "terms" }))}
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
