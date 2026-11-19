import { LegalLinks, Wordmark } from "@/components/chrome";
import { Squiggle, Star, SKY_STAR } from "@/components/diary";
import { HeroHeadline, LoginHero } from "@/components/LoginHero";
import { makeT } from "@/lib/t";
import { useState } from "react";
import { startAccount } from "../api";
import { useNav } from "../nav";

// 시작 화면(앱 첫 화면과 같은 모양). 토스 안에서는 구글·애플 로그인을 쓸 수 없어서:
// 시작하기 = 이 토스 계정으로 새로(처음 화면부터), 기존 계정 연결 = 앱 설정 > 토스에서 쓰기 코드로 쓰던 계정에 잇기
export function Start() {
  const t = makeT("ko");
  const { reset, push } = useNav();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const start = async () => {
    setBusy(true);
    setFailed(false);
    if (await startAccount()) reset(["/home"]);
    else {
      setFailed(true);
      setBusy(false);
    }
  };

  return (
    <main className="screen">
      <div className="flex items-center pl-5 pr-2">
        <Wordmark size={35} locale="ko" />
      </div>
      <div className="flex flex-1 items-center px-6 py-4 [@media(max-height:860px)]:py-2 [@media(max-height:860px)]:[zoom:0.9] [@media(max-height:720px)]:[zoom:0.78]">
        <LoginHero t={t} />
      </div>
      <section className="relative flex flex-col gap-3 px-6">
        <HeroHeadline text={t("start.headline")} />
        <p className="hero-rise whitespace-pre-line text-[20px] leading-[1.5] text-muted" style={{ animationDelay: "0.3s" }}>
          {t("start.body")}
        </p>
        <Star size={22} rotate={12} color={SKY_STAR} className="right-[34px] top-[22px]" />
        <Squiggle w={58} className="right-9 top-[84px]" />
      </section>
      <div className="px-6 pt-7">
        <div className="flex flex-col gap-2.5">
          <button type="button" disabled={busy} onClick={() => void start()} className="btn-primary">
            시작하기
          </button>
          <button type="button" disabled={busy} onClick={() => push("/link")} className="btn-outline btn-outline-lift !text-[20px]">
            기존 계정 연결
          </button>
          {failed ? (
            <p role="alert" className="text-center text-[17px] text-red">
              {t("common.error")}
            </p>
          ) : null}
        </div>
        <LegalLinks locale="ko" t={t} />
      </div>
    </main>
  );
}
