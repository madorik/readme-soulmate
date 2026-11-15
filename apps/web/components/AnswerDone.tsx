import { SECTIONS_BY_IMPORTANCE, type Section } from "@readme/core";
import { Icon } from "./marks";
import { Mascot } from "./Mascot";
import { SectionIcon } from "./SectionIcon";

type IconName = Parameters<typeof Icon>[0]["name"];

/**
 * 물어보기에 답한 뒤 화면: 축하 머리 · 보낸 항목 타일 · 리드미를 쓰면 되는 것(로그인 안 한 사람만) · 아래 고정 버튼(children)
 */
export function AnswerDone({
  title,
  body,
  topics,
  labels,
  perks,
  alert,
  children,
}: {
  title: string;
  body: string;
  topics: Section[];
  labels: { sentTitle: string; topic: (s: Section) => string; perksTitle: string };
  /** 리드미를 쓰면 되는 것. 로그인한 사람에게는 비운다 */
  perks: { icon: IconName; text: string }[];
  alert?: string;
  children: React.ReactNode;
}) {
  const shown = SECTIONS_BY_IMPORTANCE.filter((s) => topics.includes(s));
  return (
    <div className="flex flex-1 flex-col">
      <section className="grad-hero relative mx-4 mt-3 flex flex-col items-center overflow-hidden rounded-3xl px-6 pb-7 pt-8 text-center">
        <span aria-hidden="true" className="absolute -right-12 -top-14 h-44 w-44 rounded-full bg-white/25" />
        <span aria-hidden="true" className="absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-white/20" />
        <Mascot size={96} />
        <h1 className="headline relative pt-4 text-[28px]">{title}</h1>
        <p className="relative pt-2 text-[15.5px] leading-[1.6] text-ink-2">{body}</p>
      </section>

      {shown.length ? (
        <section className="card mx-4 mt-3 flex flex-col gap-3 px-4 py-5">
          <h2 className="px-1 text-[15px] font-bold">{labels.sentTitle}</h2>
          <ul className="grid grid-cols-2 gap-2">
            {shown.map((s) => (
              <li key={s} className="relative flex min-h-[56px] items-center gap-2.5 rounded-2xl bg-fill py-2 pl-2.5 pr-3">
                <SectionIcon section={s} size={34} />
                <span className="min-w-0 flex-1 text-[14px] font-bold leading-[1.3]">{labels.topic(s)}</span>
                <span aria-hidden="true" className="absolute right-1.5 top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-sky text-ink">
                  <Icon name="check" size={11} strokeWidth={3} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {perks.length ? (
        <section className="card mx-4 mt-3 flex flex-col px-5 pb-2 pt-5">
          <h2 className="pb-1 text-[15px] font-bold">{labels.perksTitle}</h2>
          <ul className="flex flex-col">
            {perks.map((p) => (
              <li key={p.text} className="flex min-h-[52px] items-center gap-3 border-t border-rule first:border-t-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-soft text-accent">
                  <Icon name={p.icon} size={18} strokeWidth={2} />
                </span>
                <span className="text-[15px] font-semibold">{p.text}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="bottom-bar mt-auto flex flex-col gap-2 bg-bg px-4 pt-4">
        {alert ? (
          <p role="alert" className="px-1 text-[14px] text-red">
            {alert}
          </p>
        ) : null}
        {children}
      </div>
    </div>
  );
}
