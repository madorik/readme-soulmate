import { hashToken, sanitizeSections, translate } from "@readme/core";
import Link from "next/link";
import { claimAnswer } from "@/app/actions/request";
import { Wordmark } from "@/components/chrome";
import { getSession, openPrefill } from "@/lib/data";
import { makeT, requestLocale } from "@/lib/i18n";
import { asSystem } from "@/lib/db";
import { AnswerForm } from "./AnswerForm";

type Row = {
  invite_id: string | null;
  state: "active" | "expired" | "used" | "canceled" | "not_found";
  inviter_name: string | null;
  recipient_name: string | null;
  sections: string[] | null;
  prefill: unknown;
  message: string | null;
  guest_card_id: string | null;
};

export default async function AnswerPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ claim?: string }> }) {
  const [{ token: raw }, sp] = await Promise.all([params, searchParams]);
  const token = decodeURIComponent(raw);
  const session = await getSession();
  const locale = await requestLocale(session?.profile.locale);
  const t = makeT(locale);
  const hash = await hashToken(token);
  // 로그인 없이 여는 화면이라 시스템 권한으로 읽는다. 토큰 해시가 맞는 요청 한 줄만 돌아온다
  const row = ((await asSystem((q) => q.one<Row>("select * from request_for_answer($1)", [hash]))) ?? { state: "not_found" }) as Row;
  const from = row.inviter_name || translate(locale, "app.name");

  const header = (
    <div className="flex items-center justify-between px-6">
      <Wordmark size={26} />
      <span className="text-[13px] font-bold text-muted">{t("answer.noInstall")}</span>
    </div>
  );

  if (row.state === "active") {
    const { card, unsure } = openPrefill(hash, row.prefill);
    return (
      <main className="screen">
        {header}
        <AnswerForm
          locale={locale}
          token={token}
          from={from}
          message={row.message ?? ""}
          sections={sanitizeSections(row.sections).sort((a, b) => Number(!card[a]) - Number(!card[b]))}
          prefill={card}
          unsure={unsure}
          signedIn={!!session}
        />
      </main>
    );
  }

  // 이미 답한 링크: 답한 사람이 가입해서 자기 리드미로 가져갈 수 있다
  if (row.state === "used" && row.guest_card_id) {
    return (
      <main className="screen">
        {header}
        <div className="flex flex-1 flex-col px-6 pt-10">
          <h1 className="headline text-[30px]">{t("answer.sent.title")}</h1>
          <p className="pt-3 text-[16px] leading-[1.6]">{t("answer.sent.body", { from })}</p>
          {sp.claim === "failed" ? (
            <p role="alert" className="pt-3 text-[14px] text-red">
              {t("accept.used")}
            </p>
          ) : null}
          <div className="mt-auto pt-10">
            {session ? (
              <form action={claimAnswer}>
                <input type="hidden" name="token" value={token} />
                <button className="btn-primary w-full">{t("answer.claim")}</button>
              </form>
            ) : (
              <Link href={`/?next=${encodeURIComponent(`/r/${token}/claim`)}`} className="btn-primary">
                {t("answer.claim")}
              </Link>
            )}
          </div>
        </div>
      </main>
    );
  }

  const key = row.state === "expired" ? "accept.expired" : row.state === "canceled" ? "accept.canceled" : row.state === "used" ? "accept.used" : "accept.notFound";
  return (
    <main className="screen">
      {header}
      <p className="headline px-6 pt-10 text-[24px]">{t(key)}</p>
    </main>
  );
}
