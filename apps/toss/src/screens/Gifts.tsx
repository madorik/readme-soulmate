import { useEffect, useState } from "react";
import { Icon } from "@/components/marks";
import type { TGifts } from "@/lib/toss-api";
import { openExternal } from "../bridge";
import { useLoad } from "../load";
import { AiBadge, Failed, Page } from "../ui";

// 선물 고르기: 기록을 보고 AI가 고른 선물(가격대별). 누르면 쿠팡 검색을 기기 브라우저로 연다(파트너스 링크는 쓰지 않는다)

export function Gifts({ id }: { id: string }) {
  const [skip, setSkip] = useState<string[]>([]);
  const { data, error, reload } = useLoad<TGifts>(`people/${id}/gifts${skip.length ? `?skip=${skip.join(",")}` : ""}`);
  const [band, setBand] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => setLoading(!data), [data]);
  useEffect(() => setBand(0), [data]);

  const again = () => {
    if (!data) return;
    setLoading(true);
    setSkip((s) => [...new Set([...s, ...data.groups.flatMap((g) => g.items.map((i) => i.id))])].slice(-60));
  };

  const group = data?.groups[band];
  return (
    <Page>
      <div className="flex items-center justify-between gap-2 px-6 pt-1">
        <div className="flex items-center gap-2">
          <h1 className="headline text-[22px]">선물 고르기</h1>
          <AiBadge>AI 추천</AiBadge>
        </div>
        {data?.groups.length ? (
          <button type="button" onClick={again} disabled={loading} className="flex h-10 items-center gap-1 rounded-full px-3 text-[13.5px] font-bold text-accent active:bg-sky-soft disabled:opacity-50">
            <Icon name="undo" size={16} strokeWidth={2.1} />
            다시 고르기
          </button>
        ) : null}
      </div>
      {error ? <Failed onRetry={reload} /> : null}
      {!error && (loading || !data) ? (
        <div role="status" className="flex flex-col gap-3 px-4 pt-4">
          <p className="px-2 text-[14.5px] text-ink-2">기록을 보고 고르는 중…</p>
          {[0, 1, 2].map((n) => (
            <div key={n} className="h-[104px] animate-pulse rounded-[24px] bg-white" />
          ))}
        </div>
      ) : null}
      {!error && !loading && data ? (
        data.groups.length ? (
          <>
            {data.note ? <p className="px-6 pt-2 text-[14.5px] leading-[1.6] text-ink-2">{data.note}</p> : null}
            {data.groups.length > 1 ? (
              <div role="tablist" aria-label="가격대" className="flex gap-2 overflow-x-auto px-4 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {data.groups.map((g, i) => (
                  <button key={g.label} type="button" role="tab" aria-selected={i === band} aria-pressed={i === band} onClick={() => setBand(i)} className="chip shrink-0">
                    {g.label}
                  </button>
                ))}
              </div>
            ) : null}
            <ul className="mx-4 mt-3 flex flex-col gap-2.5">
              {group?.items.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => void openExternal(item.search)} className="card flex w-full items-start gap-3.5 p-4 text-left">
                    <span className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-rule">
                      {item.image ? <img src={item.image} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-contain" /> : <Icon name="gift" size={28} className="text-accent" />}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex items-center gap-1">
                        <span className="min-w-0 truncate text-[15.5px] font-bold">{item.name}</span>
                        <Icon name="external" size={14} className="shrink-0 text-muted" />
                      </span>
                      {item.basis.length ? (
                        <span className="flex flex-wrap gap-1">
                          {item.basis.map((w) => (
                            <span key={w} className="rounded-md bg-fill px-1.5 py-px text-[11.5px] font-bold text-ink-2">
                              {w}
                            </span>
                          ))}
                        </span>
                      ) : null}
                      <span className="text-[13.5px] leading-[1.5] text-ink-2">{item.reason}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="px-6 pt-6 text-[15px] text-ink-2">기록이 더 있으면 골라 드릴게요</p>
        )
      ) : null}
    </Page>
  );
}
