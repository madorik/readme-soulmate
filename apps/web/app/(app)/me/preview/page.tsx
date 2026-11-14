import { SECTIONS } from "@readme/core";
import { Avatar } from "@/components/Avatar";
import { CardView } from "@/components/CardView";
import { DateTiles } from "@/components/DateTiles";
import { TopBar } from "@/components/chrome";
import { readCard, requireSession, todayFor } from "@/lib/data";
import { makeT } from "@/lib/i18n";

// 내 리드미 미리보기: 받는 사람 화면에 보이는 모습(보여 줄 항목은 사람마다 고른다)
export default async function MePreview() {
  const s = await requireSession();
  const { locale } = s.profile;
  const t = makeT(locale);
  const { card } = await s.tx((q) => readCard(q, s.user.id));
  const name = s.profile.displayName;
  return (
    <div className="flex flex-1 flex-col pb-8">
      <TopBar back="/me" label={t("common.back")} />
      <h1 className="headline px-6 pt-1 text-[24px]">{t("me.preview")}</h1>
      <div className="flex items-center gap-[18px] px-6 pt-5">
        <Avatar config={s.profile.avatar} size={72} label={t("avatar.of", { name })} />
        <span className="truncate text-[28px] font-bold tracking-[-0.03em]">{name}</span>
      </div>
      <DateTiles dates={card.dates} today={todayFor(s.profile)} locale={locale} t={t} />
      <CardView card={card} sections={[...SECTIONS]} name={name} locale={locale} t={t} />
    </div>
  );
}
