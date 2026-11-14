import Link from "next/link";
import { Icon } from "@/components/marks";
import { Mascot } from "@/components/Mascot";
import type { T } from "@/lib/i18n";

/** 온보딩 윗부분: 하늘 그라데이션 위에 뒤로·나중에, 진행 막대(웃는 손잡이), 제목과 리디. 아래 흰 시트(OnboardingSheet)가 살짝 겹친다 */
export function StepHeader({ step, back, skip, t, title, body }: { step: 1 | 2 | 3; back?: string; skip?: string; t: T; title: string; body: string }) {
  const pct = `${(step / 3) * 100}%`;
  return (
    <div className="grad-hero relative overflow-hidden pb-10" style={{ paddingTop: "max(var(--sat), 12px)" }}>
      <span aria-hidden="true" className="absolute -right-16 top-10 h-60 w-60 rounded-full bg-white/25" />
      <div className="relative flex min-h-11 items-center justify-between px-2">
        {back ? (
          <Link href={back} aria-label={t("common.back")} className="flex h-11 w-11 items-center justify-center">
            <Icon name="back" size={24} strokeWidth={2} />
          </Link>
        ) : (
          <span className="w-11" />
        )}
        {skip ? (
          <Link href={skip} className="flex min-h-11 items-center px-3 text-[14px] font-bold text-ink-2">
            {step === 1 ? t("common.skip") : t("common.later")}
          </Link>
        ) : (
          <span className="w-11" />
        )}
      </div>
      <div className="relative flex items-center gap-3 px-6 pt-2">
        <div role="progressbar" aria-label={t("onb.step", { n: step })} aria-valuemin={1} aria-valuemax={3} aria-valuenow={step} className="relative h-2 flex-1 rounded-full bg-white/55">
          <div className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ width: pct }} />
          <svg aria-hidden="true" width="26" height="26" viewBox="0 0 30 30" className="absolute -top-[9px]" style={{ left: `calc(${pct} - 13px)` }}>
            <circle cx="15" cy="15" r="13" fill="#FFFFFF" stroke="#22304A" strokeWidth="2" />
            <circle cx="11" cy="13.5" r="1.7" fill="#22304A" />
            <circle cx="19" cy="13.5" r="1.7" fill="#22304A" />
            <path d="M11.5 18 Q15 21 18.5 18" fill="none" stroke="#22304A" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
        <span aria-hidden="true" className="num text-[14px] !font-bold">
          {t("onb.step", { n: step })}
        </span>
      </div>
      <div className="relative flex items-end gap-2 px-6 pt-5">
        <div className="flex flex-1 flex-col gap-2 pb-1">
          <h1 className="headline text-[27px]">{title}</h1>
          <p className="text-[14px] leading-[1.55] text-ink-2">{body}</p>
        </div>
        <Mascot size={step === 1 ? 88 : 116} bubble="question" />
      </div>
    </div>
  );
}
