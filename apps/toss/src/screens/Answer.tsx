import type { Section } from "@readme/core";
import { useCallback, useEffect, useState } from "react";
import type { AnswerState } from "@/app/actions/request";
import { AnswerDone } from "@/components/AnswerDone";
import { AnswerForm } from "@/components/AnswerForm";
import { useT } from "@/components/editors/shared";
import type { TAskOpen } from "@/lib/toss-api";
import { api, publicApi } from "../api";
import { useNav } from "../nav";
import { Failed, Loading, Page } from "../ui";

// 물어보기에 답하기: 토스 공유 링크(intoss://remember-you/r?ask=…)로 열린다. 로그인 없이 답하고, 답은 물어본 사람의 기록에 들어간다.
// 답하는 화면은 웹과 같은 것(components/AnswerForm)을 쓰고, 보내기와 보낸 뒤 화면만 토스판 것으로 바꾼다

export function Answer({ token }: { token: string }) {
  const { reset, navigate } = useNav();
  const t = useT("ko");
  const [data, setData] = useState<TAskOpen | null>(null);
  const [error, setError] = useState(false);
  const [n, setN] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    setError(false);
    publicApi<TAskOpen>(`r/${encodeURIComponent(token)}`)
      .then((d) => alive && setData(d))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [token, n]);

  const submit = useCallback(
    async (_: AnswerState, form: FormData): Promise<AnswerState> => {
      try {
        const r = await publicApi<{ sent?: boolean; error?: AnswerState["error"] }>(`r/${encodeURIComponent(token)}`, {
          data: JSON.parse(String(form.get("data") ?? "{}")),
          consent: form.get("consent") === "1",
        });
        return r.sent ? { sent: true, savedMine: false, error: null } : { sent: false, savedMine: false, error: r.error ?? "common" };
      } catch {
        return { sent: false, savedMine: false, error: "common" };
      }
    },
    [token],
  );

  if (error) return <Page><Failed onRetry={() => setN((v) => v + 1)} /></Page>;
  if (!data) return <Page><Loading /></Page>;

  // 나도 물어보기: 물어본 사람을 내 사람으로 더하고 바로 그 사람에게 물어보기(이때 토스 로그인)
  const askBack = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { id } = await api<{ id: string }>("people", { json: { name: data.from } });
      reset(["/home", `/people/${id}`, `/request?to=${id}`]);
    } catch {
      reset(["/home"]);
    }
  };

  if (data.state !== "active") {
    const key = data.state === "expired" ? "accept.expired" : data.state === "canceled" ? "accept.canceled" : data.state === "used" ? "accept.used" : "accept.notFound";
    return (
      <Page>
        <p className="px-6 pt-8 text-[28px] leading-[1.4]">{t(key)}</p>
        <div className="px-4 pt-8">
          <button type="button" onClick={() => navigate("/home")} className="btn-outline btn-outline-lift w-full">
            기억해유 시작하기
          </button>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <AnswerForm
        locale="ko"
        token={token}
        from={data.from}
        message={data.message}
        sections={data.sections}
        prefill={data.prefill}
        mine={{}}
        signedIn={false}
        submit={submit}
        embedded={{
          done: (sent: Section[]) => (
            <AnswerDone
              title={t("answer.sent.title")}
              body={t("answer.sentShort", { from: data.from })}
              topics={sent}
              labels={{ sentTitle: t("answer.sentTopics", { from: data.from }), topic: (x) => t(`request.topic.${x}` as "request.topic.dates"), perksTitle: t("answer.perksTitle") }}
              perks={[
                { icon: "pencil", text: t("answer.perk.edit") },
                { icon: "people", text: t("answer.perk.see") },
                { icon: "bell", text: t("answer.perk.remind") },
              ]}
            >
              <button type="button" onClick={() => void askBack()} disabled={busy} className="btn-primary w-full">
                {t("answer.askBack")}
              </button>
            </AnswerDone>
          ),
        }}
      />
    </Page>
  );
}
