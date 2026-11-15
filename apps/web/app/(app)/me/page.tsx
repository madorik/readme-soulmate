import { SECTIONS_BY_IMPORTANCE, isSection } from "@readme/core";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { TabBar } from "@/components/chrome";
import { readCard, requireSession } from "@/lib/data";
import { makeT } from "@/lib/i18n";
import { MyReadmeList } from "./MyReadmeList";
import { aiConfigured } from "@/lib/ai";

export default async function Me({ searchParams }: { searchParams: Promise<{ open?: string }> }) {
  const { open } = await searchParams;
  const s = await requireSession();
  const { locale } = s.profile;
  const t = makeT(locale);
  const { card } = await s.tx((q) => readCard(q, s.user.id));
  const name = s.profile.displayName;
  return (
    <>
      {/* 프로필 영역은 위에 고정: 항목을 펼쳐 고치는 동안에도 보인다 */}
      <div className="sticky z-30 flex h-[var(--me-head)] items-center gap-4 bg-bg pb-3 pl-5 pr-4 pt-5" style={{ top: "var(--sat)" }}>
        <Link href="/me/avatar" className="shrink-0 rounded-full">
          <Avatar config={s.profile.avatar} size={82} label={t("avatar.of", { name })} />
        </Link>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="truncate text-[30px] font-bold leading-[1.15] tracking-[-0.03em]">{name}</h1>
          <Link href="/me/avatar" className="self-start text-[14px] font-bold text-muted underline decoration-[1.5px] underline-offset-[5px]">
            {t("me.face")}
          </Link>
        </div>
      </div>

      {/* 고치기는 화면을 옮기지 않고 그 항목 아래에 펼친다 */}
      <MyReadmeList
        rows={SECTIONS_BY_IMPORTANCE.map((section) => ({
          section,
          title: t(`section.${section}` as "section.safety"),
          sub: t(`section.${section}.sub` as "section.safety.sub"),
        }))}
        card={card}
        locale={locale}
        labels={{ edit: t("me.edit"), close: t("me.close") }}
        initialOpen={isSection(open) ? open : null}
      />

      <div className="h-8" />
      <TabBar active="me" t={t} voice={aiConfigured()} />
    </>
  );
}
