import { SECTIONS_BY_IMPORTANCE } from "@readme/core";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { TabBar } from "@/components/chrome";
import { Icon } from "@/components/marks";
import { readCard, requireSession } from "@/lib/data";
import { makeT } from "@/lib/i18n";
import { summarize } from "@/lib/summary";
import { MyReadmeList } from "./MyReadmeList";

/** 미리보기·공유하기: 같은 테두리 동그라미(.pill과 같은 선) */
const ICON_BUTTON = "flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink shadow-[inset_0_0_0_1.5px_var(--color-edge)]";

export default async function Me() {
  const s = await requireSession();
  const { locale } = s.profile;
  const t = makeT(locale);
  const { card } = await s.tx((q) => readCard(q, s.user.id));
  const name = s.profile.displayName;
  return (
    <>
      <div className="flex items-center gap-4 pl-5 pr-4 pt-5">
        <Link href="/me/avatar" className="shrink-0 rounded-full">
          <Avatar config={s.profile.avatar} size={82} label={t("avatar.of", { name })} />
        </Link>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="truncate text-[30px] font-bold leading-[1.15] tracking-[-0.03em]">{name}</h1>
          <Link href="/me/avatar" className="self-start text-[14px] font-bold text-muted underline decoration-[1.5px] underline-offset-[5px]">
            {t("me.face")}
          </Link>
        </div>
        {/* 받는 사람에게 보이는 모습(미리보기)과 공유하기는 아이콘으로만 */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Link href="/me/preview" aria-label={t("me.previewButton")} className={ICON_BUTTON}>
            <Icon name="eye" size={20} strokeWidth={1.7} />
          </Link>
          <Link href="/share" aria-label={t("me.send")} className={ICON_BUTTON}>
            <Icon name="share" size={19} strokeWidth={1.7} />
          </Link>
        </div>
      </div>

      {/* 고치기는 화면을 옮기지 않고 그 항목 아래에 펼친다 */}
      <MyReadmeList
        rows={SECTIONS_BY_IMPORTANCE.map((section) => ({
          section,
          title: t(`section.${section}` as "section.safety"),
          sub: t(`section.${section}.sub` as "section.safety.sub"),
          line: summarize(section, card[section], locale, t),
        }))}
        card={card}
        locale={locale}
        labels={{ edit: t("me.edit"), close: t("me.close"), empty: t("me.empty") }}
      />

      <div className="h-8" />
      <TabBar active="me" t={t} />
    </>
  );
}
