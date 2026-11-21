import { realCodes, ALLERGENS, DISLIKES, METALS, PATTERNS, SPICY_LEVELS, formatSpec, labelOf, monthName, weekdayLong } from "@readme/core";
import Link from "next/link";
import { SeeAnswers } from "@/components/SeeAnswers";
import { Suspense } from "react";
import { Avatar } from "@/components/Avatar";
import { TopBar } from "@/components/chrome";
import { GiftPicksBody } from "@/components/GiftPicksView";
import { HandCircle, Heart, SKY_STAR, Squiggle, Star, Tape } from "@/components/diary";
import { HintsPeek } from "@/components/HintsPeek";
import { Icon } from "@/components/marks";
import { PicksContent, PicksPending } from "@/components/PicksContent";
import { PicksStage } from "@/components/PicksStage";
import type { PersonReminderProps } from "@/lib/pages/person-reminder.data";
import { makeT } from "@/lib/t";

function Hint({ label, children, sub }: { label: string; children: React.ReactNode; sub?: string }) {
  return (
    <div className="row">
      <span className="w-[76px] shrink-0 pt-[3px] text-[16px] text-muted">{label}</span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[20px] leading-[1.4]">{children}</span>
        {sub ? <span className="text-[16px] text-muted">{sub}</span> : null}
      </span>
    </div>
  );
}

export function PersonReminderView({ locale, contactId, avatar, card, name, spec, next, event, notes, picksOn, skip, again, eventKnown, remindOnDay, answered, picks }: PersonReminderProps) {
  const t = makeT(locale);
  const { gifts, safety, taste, sizes } = card;
  const { favorites: fav, life } = card;
  const favHint = [fav?.idol, fav?.character, fav?.team, fav?.animal].filter(Boolean).join(t("common.and"));
  const styleHint = [...(fav?.patterns ?? []).map((c) => labelOf(PATTERNS, c, locale)), ...(fav?.metals ?? []).map((c) => labelOf(METALS, c, locale))].join(t("common.and"));

  const meal = [
    ...realCodes(safety?.allergens).map((c) => `${labelOf(ALLERGENS, c, locale)} ${t("person.allergy")}`),
    ...realCodes(safety?.dislikes).map((c) => labelOf(DISLIKES, c, locale)),
  ];
  const hasHints = !!(favHint || styleHint || taste?.dessert || life?.hobbies.length || fav?.flowers || fav?.scent || fav?.places?.length || gifts?.wishlist.length || gifts?.skip.length || meal.length || taste?.spicy != null || notes.length || sizes?.shoe);

  // 컨닝페이퍼 단추: 앱 아이콘 + 한 줄. 누르면 오른쪽에서 힌트가 나온다. 가격대 칩 바로 위 오른쪽에 둔다
  const peek = (
    <HintsPeek label={t("reminder.peek")} title={t("reminder.hints", { name })} closeLabel={t("common.close")}>
      {!hasHints ? <p className="row text-[18px] leading-[1.5] text-muted">{t("reminder.noHints", { name })}</p> : null}
      {life?.hobbies.length ? <Hint label={t("life.hobbies")}>{life.hobbies.join(t("common.and"))}</Hint> : null}
      {favHint ? <Hint label={t("fav.people")}>{favHint}</Hint> : null}
      {gifts?.wishlist.length ? <Hint label={t("reminder.wish")}>{gifts.wishlist.map((w) => w.title).join(t("common.and"))}</Hint> : null}
      {fav?.flowers ? <Hint label={t("reminder.flowers")}>{fav.flowers}</Hint> : null}
      {fav?.scent ? <Hint label={t("reminder.scent")}>{fav.scent}</Hint> : null}
      {fav?.places?.length ? <Hint label={t("fav.places")}>{fav.places.join(t("common.and"))}</Hint> : null}
      {sizes?.shoe ? <Hint label={t("size.shoe")}>{sizes.shoe}mm</Hint> : null}
      {styleHint ? <Hint label={t("fav.style")}>{styleHint}</Hint> : null}
      {taste?.dessert ? <Hint label={t("fav.dessert")}>{taste.dessert}</Hint> : null}
      {gifts?.skip.length ? (
        <Hint label={t("reminder.skip")}>
          <span className="text-muted line-through decoration-red decoration-2">{gifts.skip.join(t("common.and"))}</span>
        </Hint>
      ) : null}
      {meal.length || taste?.spicy != null ? (
        <Hint label={t("reminder.meal")}>
          {[...meal, ...(taste?.spicy != null ? [`${t("taste.spicy")} ${SPICY_LEVELS[taste.spicy]?.[locale]}`] : [])].join(t("common.and"))}
        </Hint>
      ) : null}
      {notes.length ? (
        <Hint label={t("reminder.pastNotes")}>
          {notes
            .slice(0, 3)
            .map((n) => (n.label ? `${n.label} ${n.body}` : n.body))
            .join(" / ")}
        </Hint>
      ) : null}
    </HintsPeek>
  );

  return (
    <>
      {/* 답이 온 사람의 선물 고르기로 곧장 왔으면(홈 연말 카드) 그 답장 알림은 읽은 것으로 */}
      {answered ? <SeeAnswers contactId={contactId} /> : null}
      <TopBar back={`/people/${contactId}`} label={t("common.back")} right={
          <div className="flex items-center gap-1">
            {peek}
            <Link href="/privacy#reminders" aria-label={t("privacy.reminders")} className="flex h-11 w-11 items-center justify-center">
              <Icon name="bell" />
            </Link>
          </div>
        }
      />

      {eventKnown && next && spec ? (
        <div className="relative flex items-center gap-4 pb-0 pl-[30px] pr-6 pt-2.5">
          <span className="num relative flex w-28 shrink-0 items-center justify-center text-[104px] !leading-[0.9] tracking-[-0.02em]">
            <HandCircle w={138} h={118} stroke={1.5} className="left-1/2 top-1/2 -ml-[69px] -mt-[59px]" />
            {next.date.d}
          </span>
          <div className="flex min-w-0 flex-1 flex-col pt-1.5">
            <span className="text-[23px] leading-[1.25]">
              {monthName(next.date.m, locale, true)} {weekdayLong(next.date, locale)}
            </span>
            {spec.calendar === "lunar" ? <span className="text-[16px] text-muted">{formatSpec(spec, locale)}</span> : null}
          </div>
          <Avatar config={avatar} size={56} label={t("avatar.of", { name })} />
          <Star size={22} rotate={14} className="-top-1.5 right-[30px]" />
        </div>
      ) : null}

      {/* 홈·달력·알림에서 챙길 날(생일·기념일·크리스마스)을 짚어 열었을 때만 그 날을 제목으로. 사람 화면의 '선물 고르기'처럼 날을 정하지 않고 열면 생일이라고 단정하지 않는다 */}
      {eventKnown ? (
        <>
          <h1 className="relative mx-6 mt-[22px] text-[31px] font-normal leading-[1.35]">{next ? (next.daysUntil === 0 ? t("reminder.today", { event }) : t("reminder.left", { event, n: next.daysUntil })) : event}</h1>
          {next && next.daysUntil > 0 && remindOnDay ? <p className="mx-6 mt-1 text-[16px] text-muted">{t("reminder.again")}</p> : null}
        </>
      ) : (
        <div className="relative mx-6 mt-3 flex items-center gap-3.5">
          <Avatar config={avatar} size={56} label={t("avatar.of", { name })} />
          <h1 className="min-w-0 text-[31px] font-normal leading-[1.35]">{t("reminder.giftFor", { name })}</h1>
        </div>
      )}

      {picksOn ? (
        <section id="picks" aria-labelledby="picks-title" className="card relative mx-4 mt-7 flex scroll-mt-2 flex-col pb-4 pt-7">
          <Tape color="mango" w={108} h={26} rotate={-3} alpha={0.62} className="-top-[13px] left-1/2 -ml-[54px]" />
          <Tape color="mint" className="-bottom-1 -right-2.5" />
          <Heart size={26} rotate={16} className="-right-[9px] top-[70px]" />
          <Star size={20} rotate={-12} color={SKY_STAR} className="-left-2 top-[330px]" />
          <Squiggle w={54} width={2.4} className="-bottom-2 left-[30px]" />
          {/* 아래(채워지면) 무엇을 보고 골랐는지 풀어 쓴 한두 문장. 오른쪽 위 다시 고르기 단추 자리는 float라 첫 두 줄만 비켜 가고 아래 줄은 전체 폭을 쓴다 */}
          {/* 다 고르면 제목 줄 오른쪽 끝은 다시 고르기 단추(.picks-again-slot이 그 자리를 비워 둔다) */}
          <div className="flow-root min-h-10 px-[18px]">
            <span aria-hidden="true" className="picks-again-slot float-right h-10 w-28" />
            <h2 id="picks-title" className="text-[24px] font-normal leading-[1.35]">
              <span className="picks-t-done">{t("picks.titleFor", { name })}</span>
              <span className="picks-t-busy">{t("picks.titleBusy", { name })}</span>
            </h2>
          </div>
          {/* 고르는 동안은 꼬마 마법사 장면, 다 고르면 번쩍임 뒤에 선물이 나온다. 다시 고르면 key가 바뀌어 장면을 다시 보인다 */}
          <PicksStage key={skip.join(",")} lines={[1, 2, 3, 4].map((n) => t(`picks.loading.${n}` as "picks.loading.1", { name }))} shout={t("picks.shout")}>
            <Suspense fallback={<PicksPending />}>
              <PicksContent>
                <GiftPicksBody picks={picks} locale={locale} again={again} pad="px-[18px]" />
              </PicksContent>
            </Suspense>
          </PicksStage>
        </section>
      ) : null}

      <div className="page-end mt-6" />
    </>
  );
}
