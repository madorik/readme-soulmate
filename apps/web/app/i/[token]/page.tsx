import { RELATIONS, daysLeft, hashToken, normalizeCode, sanitizeAvatar, sanitizeSections, translate } from "@readme/core";
import Link from "next/link";
import { redirect } from "next/navigation";
import { acceptInvite } from "@/app/actions/share";
import { Avatar } from "@/components/Avatar";
import { Wordmark } from "@/components/chrome";
import { AuthButtons } from "@/components/AuthButtons";
import { Icon } from "@/components/marks";
import { PROVIDERS } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { getSession } from "@/lib/data";
import { makeT, requestLocale } from "@/lib/i18n";
import { SendBack } from "./SendBack";

type Preview = {
  kind: "share" | "request" | null;
  state: "active" | "expired" | "used" | "canceled" | "not_found";
  inviter_name: string | null;
  inviter_avatar: unknown;
  relation: string | null;
  sections: string[] | null;
  expires_at: string | Date | null;
  is_self: boolean;
};

export default async function InvitePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ token: raw }, sp] = await Promise.all([params, searchParams]);
  const token = decodeURIComponent(raw);
  const code = token.length <= 8 ? normalizeCode(token) : null;
  const session = await getSession();
  const locale = await requestLocale(session?.profile.locale);
  const t = makeT(locale);
  const tokenHash = code ? null : await hashToken(token);
  const p = ((await asUser(session?.user.id ?? null, (q) => q.one<Preview>("select * from invite_preview($1, $2)", [tokenHash, code]))) ?? { state: "not_found" }) as Preview;

  // 요청 링크를 잘못 열었으면 답하는 화면으로
  if (p.kind === "request" && !code) redirect(`/r/${encodeURIComponent(token)}`);

  // 코드로는 공유 초대만 연다(요청 답하기는 링크로만)
  const error = sp.error ?? (p.kind === "request" ? "not_found" : p.is_self ? "self" : p.state !== "active" ? p.state : null);
  const name = p.inviter_name || translate(locale, "app.name");
  const sections = sanitizeSections(p.sections);
  const relation = RELATIONS.find((r) => r.code === p.relation)?.label[locale];
  const here = `/i/${encodeURIComponent(token)}`;

  if (error) {
    const key = error === "expired" ? "accept.expired" : error === "used" ? "accept.used" : error === "canceled" ? "accept.canceled" : error === "self" ? "accept.self" : "accept.notFound";
    return (
      <main className="screen px-6">
        <div className="flex min-h-11 items-center">
          <Wordmark />
        </div>
        <p className="headline pt-10 text-[24px]">{t(key)}</p>
        <Link href={session ? "/home" : "/"} className="btn-primary mt-auto">
          {t("common.next")}
        </Link>
      </main>
    );
  }

  return (
    <main className="screen">
      <div className="flex items-center justify-between px-6">
        <Wordmark />
        <span className="flex items-center gap-1.5 text-[13px] font-bold text-muted">
          <Icon name="check" size={15} strokeWidth={2.8} className="text-ok" />
          {t("accept.linked")}
        </span>
      </div>

      <div className="flex flex-col gap-2.5 px-6 pt-4">
        <h1 className="headline whitespace-pre-line text-[30px]">{t("accept.title", { name })}</h1>
        <p className="text-[15px] leading-[1.6] text-muted">{t("accept.body", { name })}</p>
      </div>

      <div className="mx-6 mt-6 flex flex-col gap-3.5 rounded-2xl bg-fill px-5 pb-4 pt-5">
        <div className="flex items-center gap-3">
          <Avatar config={sanitizeAvatar(p.inviter_avatar)} size={54} label={t("avatar.of", { name })} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-[22px] font-bold tracking-[-0.03em]">{name}</span>
            {relation ? <span className="text-[13px] text-muted">{t("accept.relation", { relation })}</span> : null}
          </div>
          <span role="img" aria-label={t("accept.locked")}>
            <Icon name="lock" />
          </span>
        </div>
        <ul className="flex flex-col">
          {sections.map((s, i) => (
            <li key={s} className="flex min-h-10 items-center justify-between gap-3 border-t border-rule text-[14px] font-bold">
              <span>{t(`section.${s}` as "section.safety")}</span>
              <span aria-hidden="true" className="h-2.5 rounded-full bg-[#e4e6ee]" style={{ width: [74, 110, 64, 92, 84][i] }} />
            </li>
          ))}
        </ul>
      </div>

      {session ? (
        <form action={acceptInvite} className="mt-auto flex flex-col gap-4 px-6 pt-8">
          <input type="hidden" name="token" value={token} />
          {/* 내 사람들에 들어갈 때 붙일 태그(부르는 말). 안 적으면 이름만 */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[14px] font-bold">{t("accept.tag", { name })}</span>
            <input name="tag" maxLength={40} placeholder={t("accept.tagPlaceholder")} className="field" />
          </label>
          <SendBack locale={locale} name={name} />
          <button className="btn-primary">{t("accept.open")}</button>
          {p.expires_at ? <span className="text-center text-[12.5px] text-muted">{t("accept.expiresIn", { n: daysLeft(String(p.expires_at)) })}</span> : null}
        </form>
      ) : (
        <div className="mt-auto flex flex-col gap-2.5 px-6 pt-8">
          <AuthButtons locale={locale} next={here} google={PROVIDERS.google} apple={PROVIDERS.apple} showCode={false} />
          {p.expires_at ? <span className="text-center text-[12.5px] text-muted">{t("accept.expiresIn", { n: daysLeft(String(p.expires_at)) })}</span> : null}
        </div>
      )}
    </main>
  );
}
