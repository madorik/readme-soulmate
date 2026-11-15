import { hashToken, sanitizeSections, translate } from "@readme/core";
import { Wordmark } from "@/components/chrome";
import { getSession, openPrefill, readCard } from "@/lib/data";
import { makeT, requestLocale } from "@/lib/i18n";
import { asSystem } from "@/lib/db";
import { ogMetadata, previewLocale } from "@/lib/og";
import { AnswerForm } from "./AnswerForm";

type Row = {
  state: "active" | "expired" | "used" | "canceled" | "not_found";
  inviter_name: string | null;
  sections: string[] | null;
  prefill: unknown;
  message: string | null;
};

/** 링크 미리보기: "○○님이 물어봐요" */
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const token = decodeURIComponent((await params).token);
  const locale = await requestLocale((await getSession())?.profile.locale);
  const hash = await hashToken(token);
  const row = await asSystem((q) => q.one<{ inviter_name: string | null }>("select inviter_name from request_for_answer($1)", [hash])).catch(() => null);
  const from = row?.inviter_name?.trim();
  const lang = previewLocale(locale, from);
  return ogMetadata(lang, from ? translate(lang, "og.requestTitle", { name: from }) : translate(lang, "request.title"));
}

// 물어보기에 답하는 화면(로그인 없이 열린다). 답은 물어본 사람의 기록에 들어간다(그 뒤로는 그 사람이 고친다)
export default async function AnswerPage({ params }: { params: Promise<{ token: string }> }) {
  const { token: raw } = await params;
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
      <Wordmark size={26} locale={locale} />
      <span className="text-[13px] font-bold text-muted">{t("answer.noInstall")}</span>
    </div>
  );

  if (row.state === "active") {
    const prefill = openPrefill(hash, row.prefill);
    const mine = session ? (await session.tx((q) => readCard(q, session.user.id))).card : {};
    return (
      <main className="screen !pb-0">
        {header}
        <AnswerForm
          locale={locale}
          token={token}
          from={from}
          message={row.message ?? ""}
          sections={sanitizeSections(row.sections).sort((a, b) => Number(!prefill[a]) - Number(!prefill[b]))}
          prefill={prefill}
          mine={mine}
          signedIn={!!session}
        />
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
