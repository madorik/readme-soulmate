import { formatDayFull } from "@readme/core";
import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/marks";
import type { TEvent, THome } from "@/lib/toss-api";
import { api } from "../api";
import { askNotificationAgreement } from "../bridge";
import { useLoad } from "../load";
import { useNav } from "../nav";
import { Failed, Loading, Page, TabBar } from "../ui";

// 홈: 가장 가까운 챙길 날을 크게, 그 뒤 60일 안의 날들. 사람이 없으면 사람 더하기·말로 적기.
// 챙길 날이 있고 토스 알림을 아직 안 켰으면 '생일 알림 받기'(누르면 토스 알림 동의)

export function Home() {
  const { data, error, reload } = useLoad<THome>("home");
  const { push, bump } = useNav();
  const [asking, setAsking] = useState(false);
  if (error) return <Shell><Failed onRetry={reload} /></Shell>;
  if (!data) return <Shell><Loading /></Shell>;
  const face = (id: string) => data.people.find((p) => p.id === id);
  const [next, ...rest] = data.events;
  const sameDay = next ? data.events.filter((e) => e.daysUntil === next.daysUntil) : [];
  const later = rest.filter((e) => e.daysUntil !== next?.daysUntil);
  const reminder = data.reminder;
  const turnOn = async () => {
    if (!reminder || asking) return;
    setAsking(true);
    if (await askNotificationAgreement(reminder.template)) {
      await api("reminder", { json: { on: true } }).catch(() => null);
      bump();
    }
    setAsking(false);
  };

  return (
    <Shell>
      <section aria-label="다가오는 날" className="card mx-4 flex flex-col px-5 pt-[18px]">
        {next ? (
          <>
            <div className="flex items-end gap-2.5 pt-1">
              {next.daysUntil === 0 ? (
                <span className="text-[56px] font-light leading-[0.9] tracking-[-0.04em]">오늘</span>
              ) : (
                <span className="num text-[104px] font-extralight leading-[0.82] tracking-[-0.04em]">{next.daysUntil}</span>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-1 pb-0.5">
                {next.daysUntil > 0 ? <span className="text-[12px] font-bold tracking-[0.04em] text-accent">일 남았어요</span> : null}
                <span className="flex flex-col text-[21px] font-bold leading-[1.25] tracking-[-0.02em]">
                  {sameDay.slice(0, 2).map((e) => (
                    <span key={`${e.contactId}-${e.kind}-${e.title}`}>{e.title}</span>
                  ))}
                  {sameDay.length > 2 ? <span className="text-[15px] text-ink-2">외 {sameDay.length - 2}명</span> : null}
                </span>
              </div>
              <span aria-hidden="true" className="pb-1">
                <Avatar config={face(next.contactId)?.avatar ?? null} size={56} label={face(next.contactId)?.name ?? ""} />
              </span>
            </div>
            <span className="flex items-center gap-1.5 pt-3.5 text-[14px] font-bold">
              <Icon name="calendar" size={16} strokeWidth={2} className="shrink-0 text-accent" />
              {formatDayFull(next.date, "ko")}
            </span>
            <button type="button" onClick={() => push({ name: "gifts", id: next.contactId })} className="mt-[18px] flex min-h-[52px] items-center justify-between border-t border-rule text-left text-[14.5px] font-medium">
              {sameDay.length > 1 ? `${face(next.contactId)?.name ?? ""} 선물 고르기` : "선물 고르기"}
              <Icon name="chevron" size={18} strokeWidth={1.6} className="text-muted" />
            </button>
          </>
        ) : (
          <div className="flex flex-col gap-4 pb-5 pt-1">
            <span className="text-[21px] font-bold leading-[1.3] tracking-[-0.02em]">{data.people.length ? "60일 안에 챙길 날이 없어요" : "기억해 둘 사람을 더해 볼까요?"}</span>
            {data.people.length ? null : (
              <button type="button" onClick={() => push({ name: "newPerson" })} className="btn-primary">
                <Icon name="personAdd" size={20} strokeWidth={2} />
                사람 더하기
              </button>
            )}
          </div>
        )}
      </section>

      {reminder && !reminder.on && data.events.length ? (
        <button type="button" onClick={() => void turnOn()} disabled={asking} className="card mx-4 mt-3 flex min-h-[60px] items-center gap-3 px-5 text-left">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-soft text-accent">
            <Icon name="bell" size={18} strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1 text-[15px] font-bold">생일 알림 받기</span>
          <Icon name="chevron" size={18} strokeWidth={1.6} className="text-muted" />
        </button>
      ) : null}

      {later.length ? (
        <section aria-label="그다음 챙길 날" className="card mx-4 mt-3 flex flex-col px-5 py-1.5">
          {later.slice(0, 8).map((e) => (
            <EventRow key={`${e.contactId}-${e.kind}-${e.title}`} e={e} avatar={face(e.contactId)?.avatar ?? null} onOpen={() => push({ name: "person", id: e.contactId })} />
          ))}
        </section>
      ) : null}

      {data.people.length ? (
        <section aria-label="사람들" className="mx-4 mt-6 flex flex-col gap-3">
          <h2 className="section-title px-1">사람들</h2>
          <ul className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {data.people.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => push({ name: "person", id: p.id })} className="flex w-[68px] flex-col items-center gap-1.5">
                  <Avatar config={p.avatar} size={56} label={p.name} />
                  <span className="w-full truncate text-center text-[13px] font-medium">{p.name}</span>
                </button>
              </li>
            ))}
            <li>
              <button type="button" onClick={() => push({ name: "newPerson" })} className="flex w-[68px] flex-col items-center gap-1.5">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-muted ring-1 ring-rule">
                  <Icon name="plus" size={24} />
                </span>
                <span className="text-[13px] font-medium text-muted">더하기</span>
              </button>
            </li>
          </ul>
        </section>
      ) : null}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <Page tabs>
      <div className="flex flex-col pb-6">{children}</div>
      <TabBar />
    </Page>
  );
}

function EventRow({ e, avatar, onOpen }: { e: TEvent; avatar: THome["people"][number]["avatar"]; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="flex min-h-[60px] items-center gap-3 border-t border-rule text-left first:border-t-0">
      <Avatar config={avatar} size={36} label={e.title} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-bold">{e.title}</span>
        <span className="text-[13px] text-muted">{formatDayFull(e.date, "ko")}</span>
      </span>
      <span className={`num shrink-0 text-[15px] !font-bold ${e.daysUntil <= 7 ? "text-red" : "text-ink-2"}`}>D-{e.daysUntil}</span>
    </button>
  );
}
