import Link from "next/link";
import { Icon } from "@/components/marks";
import type { T } from "@/lib/i18n";

export function StepHeader({ step, back, skip, t, title, body }: { step: 1 | 2 | 3; back?: string; skip?: string; t: T; title: string; body: string }) {
  return (
    <>
      <div className="flex min-h-11 items-center justify-between px-3">
        {back ? (
          <Link href={back} aria-label={t("common.back")} className="flex h-11 w-11 items-center justify-center">
            <Icon name="back" size={24} />
          </Link>
        ) : (
          <span className="w-11" />
        )}
        <span className="num text-[15px] !font-bold" aria-label={t("onb.step", { n: step })}>
          {t("onb.step", { n: step })}
        </span>
        {skip ? (
          <Link href={skip} className="flex min-h-11 items-center px-3 text-[14px] font-bold text-muted">
            {step === 1 ? t("common.skip") : t("common.later")}
          </Link>
        ) : (
          <span className="w-11" />
        )}
      </div>
      <div className="flex flex-col gap-1.5 px-6 pt-3">
        <h1 className="headline text-[28px]">{title}</h1>
        <p className="text-[14px] leading-[1.5] text-muted">{body}</p>
      </div>
    </>
  );
}
