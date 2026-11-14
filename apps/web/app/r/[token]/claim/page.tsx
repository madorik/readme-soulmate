import { redirect } from "next/navigation";
import { claimAnswer } from "@/app/actions/request";
import { Wordmark } from "@/components/chrome";
import { getSession } from "@/lib/data";
import { makeT } from "@/lib/i18n";

// 답한 뒤 가입하고 돌아온 곳: 한 번 더 눌러 가져온다(링크만 열어도 바뀌지 않게)
export default async function Claim({ params }: { params: Promise<{ token: string }> }) {
  const { token: raw } = await params;
  const token = decodeURIComponent(raw);
  const s = await getSession();
  if (!s) redirect(`/?next=${encodeURIComponent(`/r/${token}/claim`)}`);
  const t = makeT(s.profile.locale);
  return (
    <main className="screen px-6">
      <div className="flex min-h-11 items-center">
        <Wordmark />
      </div>
      <h1 className="headline pt-10 text-[28px]">{t("answer.claim")}</h1>
      <form action={claimAnswer} className="mt-auto">
        <input type="hidden" name="token" value={token} />
        <button className="btn-primary w-full">{t("answer.claim")}</button>
      </form>
    </main>
  );
}
