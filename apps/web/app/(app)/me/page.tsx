import { SECTIONS } from "@readme/core";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { TabBar } from "@/components/chrome";
import { Icon } from "@/components/marks";
import { readCard, requireSession } from "@/lib/data";
import { makeT } from "@/lib/i18n";
import { summarize } from "@/lib/summary";

export default async function Me() {
  const s = await requireSession();
  const { locale } = s.profile;
  const t = makeT(locale);
  const { card } = await s.tx((q) => readCard(q, s.user.id));
  const name = s.profile.displayName;
  return (
    <>
      <div className="flex items-center gap-[18px] px-6 pt-4">
        <Avatar config={s.profile.avatar} size={84} label={t("avatar.of", { name })} />
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="truncate text-[30px] font-bold leading-[1.15] tracking-[-0.03em]">{name}</h1>
          <Link href="/me/avatar" className="text-[13.5px] font-bold text-muted underline underline-offset-4">
            {t("me.face")}
          </Link>
        </div>
        <Link href="/share" className="pill ml-auto shrink-0 !bg-ink !text-white !shadow-none">
          {t("me.send")}
        </Link>
      </div>

      <ul className="mx-6 mt-6 flex flex-col">
        {SECTIONS.map((section) => {
          const line = summarize(section, card[section], locale, t);
          return (
            <li key={section} className="border-t border-rule last:border-b">
              <Link href={`/me/edit/${section}`} className="flex min-h-[64px] items-center gap-3 py-2">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className={`text-[15.5px] font-bold ${section === "safety" ? "text-red" : ""}`}>{t(`section.${section}` as "section.safety")}</span>
                  <span className="truncate text-[13px] text-muted">{line || t("me.empty")}</span>
                </span>
                <span className="text-[13.5px] font-bold">{t("me.edit")}</span>
                <Icon name="chevron" size={18} className="text-muted" />
              </Link>
            </li>
          );
        })}
      </ul>

      {/* 받는 사람에게 보이는 모습은 따로(내 리드미에는 내 정보만) */}
      <div className="px-6 pt-6">
        <Link href="/me/preview" className="btn-outline">
          <Icon name="eye" size={18} />
          {t("me.previewButton")}
        </Link>
      </div>
      <div className="h-8" />
      <TabBar active="me" t={t} />
    </>
  );
}
