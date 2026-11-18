import { SECTIONS_BY_IMPORTANCE } from "@readme/core";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { TabBar } from "@/components/chrome";
import { Icon } from "@/components/marks";
import { SectionBody } from "@/components/SectionBody";
import { SectionIcon } from "@/components/SectionIcon";
import type { MeData } from "@/lib/pages/types";
import { makeT } from "@/lib/t";

// 나: 적어 둔 것을 미리보기로(사람 화면과 같은 모양). 고치기는 /me/edit에서 항목을 펼쳐서
export function MeView({ locale, name, avatar, card, today, ai }: MeData) {
  const t = makeT(locale);
  // 적어 둔 항목만(중요한 순서)
  const filled = SECTIONS_BY_IMPORTANCE.map((section) => ({ section, body: SectionBody({ section, card, today, locale, t }) })).filter((x) => x.body != null);

  return (
    <>
      <div className="flex items-center gap-4 pb-3 pl-5 pr-4 pt-5">
        <Link href="/me/avatar" className="shrink-0 rounded-full">
          <Avatar config={avatar} size={82} label={t("avatar.of", { name })} />
        </Link>
        <div className="flex min-w-0 items-center gap-0.5">
          <h1 className="truncate text-[30px] font-bold leading-[1.15] tracking-[-0.03em]">{name}</h1>
          <Link href="/me/avatar" aria-label={t("me.face")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted active:bg-fill">
            <Icon name="pencil" size={18} strokeWidth={2} />
          </Link>
        </div>
      </div>

      <section aria-labelledby="me-title" className="mx-4 mt-2 flex flex-col">
        <div className="flex min-h-11 items-center justify-between pl-2">
          <h2 id="me-title" className="section-title">
            {t("me.title")}
          </h2>
          <Link href="/me/edit" aria-label={t("me.edit")} className="flex h-11 w-11 items-center justify-center rounded-full text-ink-2 active:bg-fill">
            <Icon name="pencil" size={19} strokeWidth={2} />
          </Link>
        </div>
        {filled.length ? (
          <ul className="card mt-1 flex flex-col px-[18px]">
            {filled.map(({ section, body }) => (
              <li key={section} className="border-t border-rule first:border-t-0">
                <Link href={`/me/edit?open=${section}`} className="flex min-h-[56px] items-center gap-3 pb-1 pt-3">
                  <SectionIcon section={section} size={36} />
                  <span className={`min-w-0 flex-1 text-[16px] font-bold tracking-[-0.02em] ${section === "safety" ? "text-red" : ""}`}>{t(`section.${section}`)}</span>
                  <Icon name="chevron" size={17} className="shrink-0 text-muted" />
                </Link>
                <div className="pb-3.5">{body}</div>
              </li>
            ))}
          </ul>
        ) : (
          <Link href="/me/edit" className="card mt-1 flex min-h-[72px] items-center justify-center gap-1.5 text-[15px] font-bold text-accent">
            <Icon name="plus" size={17} strokeWidth={2.4} />
            {t("person.write")}
          </Link>
        )}
      </section>

      <div className="h-8" />
      <TabBar active="me" t={t} voice={ai} />
    </>
  );
}
