import { TopBar } from "@/components/chrome";
import { makeT } from "@/lib/t";
import { useState } from "react";
import { linkAccount } from "../api";
import { useNav } from "../nav";

// 기존 계정 연결: 앱(또는 웹) 설정 > 토스에서 쓰기에 나오는 코드를 넣으면 그 계정으로 들어간다
const ERRORS: Record<string, string> = {
  code: "코드가 맞지 않거나 시간이 지났어요. 앱에서 새 코드를 받아 주세요",
  toss_has_data: "이 토스 계정에 이미 적어 둔 기록이 있어요. 설정 > 기록 모두 지우기 뒤 다시 연결해 주세요",
};

export function LinkAccount() {
  const t = makeT("ko");
  const { reset } = useNav();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, "");

  const link = async () => {
    if (busy || clean.length < 8) return;
    setBusy(true);
    setError(null);
    const r = await linkAccount(clean);
    if (r.ok) reset(["/home"]);
    else {
      setError(r.error ?? "failed");
      setBusy(false);
    }
  };

  return (
    <main className="screen">
      <TopBar close="/start" label={t("common.close")} />
      <h1 className="headline px-6 pt-1 text-[28px]">기존 계정 연결</h1>
      <form
        className="flex flex-1 flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          void link();
        }}
      >
        <div className="card mx-4 mt-5 flex flex-col gap-3 px-5 py-5">
          <label htmlFor="link-code" className="text-[15px] font-bold">
            연결 코드
          </label>
          <input
            id="link-code"
            className="field num text-center !text-[24px] tracking-[0.2em]"
            value={code}
            maxLength={12}
            autoCapitalize="characters"
            autoComplete="one-time-code"
            placeholder="ABCD-1234"
            onChange={(e) => setCode(e.target.value)}
          />
          {error ? (
            <p role="alert" className="text-[13.5px] leading-[1.5] text-red">
              {ERRORS[error] ?? t("common.error")}
            </p>
          ) : null}
        </div>
        <div className="bottom-bar mt-auto bg-bg px-4 pt-4">
          <button disabled={busy || clean.length < 8} className="btn-primary w-full">
            연결하기
          </button>
        </div>
      </form>
    </main>
  );
}
