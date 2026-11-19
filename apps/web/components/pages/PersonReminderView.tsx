import { realCodes, ALLERGENS, DISLIKES, METALS, PATTERNS, SPICY_LEVELS, formatSpec, labelOf, monthName, weekdayLong } from "@readme/core";
import Link from "next/link";
import { Suspense } from "react";
import { Avatar } from "@/components/Avatar";
import { TopBar } from "@/components/chrome";
import { GiftActions } from "@/components/GiftActions";
import { GiftPicksBody } from "@/components/GiftPicksView";
import { HintsPeek } from "@/components/HintsPeek";
import { Icon, MarkerCircle } from "@/components/marks";
import { PicksContent, PicksPending } from "@/components/PicksContent";
import { PicksStage } from "@/components/PicksStage";
import type { PersonReminderProps } from "@/lib/pages/person-reminder.data";
import { makeT } from "@/lib/t";

function Hint({ label, children, sub }: { label: string; children: React.ReactNode; sub?: string }) {
  return (
    <div className="row">
      <span className="w-[76px] shrink-0 pt-0.5 text-[13.5px] text-muted">{label}</span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[15.5px] font-medium leading-[1.45]">{children}</span>
        {sub ? <span className="text-[12.5px] text-muted">{sub}</span> : null}
      </span>
    </div>
  );
}

export function PersonReminderView({ locale, contactId, avatar, card, name, spec, next, event, notes, picksOn, skip, again, shareText, doneLabel, done, remindOnDay, picks }: PersonReminderProps) {
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

  // 컨닝페이퍼 힐끗 보기: 앱 아이콘 + 한 줄. 누르면 오른쪽에서 힌트가 나온다. 가격대 칩 바로 위 오른쪽에 둔다
  const peek = (
    <HintsPeek label={t("reminder.peek")} title={t("reminder.hints", { name })} closeLabel={t("common.close")}>
      {!hasHints ? <p className="row text-[14px] leading-[1.6] text-muted">{t("reminder.noHints", { name })}</p> : null}
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
      <TopBar back={`/people/${contactId}`} label={t("common.back")} right={<Link href="/privacy#reminders" aria-label={t("privacy.reminders")} className="flex h-11 w-11 items-center justify-center"><Icon name="bell" /></Link>} />

      {next && spec ? (
        <div className="flex items-center gap-[22px] pl-[34px] pr-6 pt-1.5">
          <span className="num relative text-[112px] font-extralight !leading-[0.9] tracking-[-0.04em] text-accent">
            {next.date.d}
            <MarkerCircle pad={[18, 12]} width={2.2} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <span className="text-[17px] font-bold">
              {monthName(next.date.m, locale, true)} {weekdayLong(next.date, locale)}
            </span>
            {spec.calendar === "lunar" ? <span className="text-[13.5px] text-muted">{formatSpec(spec, locale)}</span> : null}
          </div>
          <Avatar config={avatar} size={56} label={t("avatar.of", { name })} />
        </div>
      ) : null}

      <h1 className="headline mx-6 mt-6 text-[28px]">{next ? (next.daysUntil === 0 ? t("reminder.today", { event }) : t("reminder.left", { event, n: next.daysUntil })) : event}</h1>

      {/* 선물을 안 보이는 설정이면 힌트 단추는 여기(보이면 가격대 칩 바로 위 오른쪽) */}
      {!picksOn ? <div className="flex px-6 pt-4">{peek}</div> : null}

      {picksOn ? (
        <section id="picks" aria-labelledby="picks-title" className="relative flex scroll-mt-2 flex-col pt-7">
          {/* 아래(채워지면) 무엇을 보고 골랐는지 풀어 쓴 한두 문장. 오른쪽 위 다시 고르기 단추 자리는 float라 첫 두 줄만 비켜 가고 아래 줄은 전체 폭을 쓴다 */}
          {/* 고르는 동안엔 컨닝페이퍼 힐끗 보기가 제목 줄 오른쪽 끝에(.picks-peek-top), 다 고르면 그 자리는 다시 고르기 단추(.picks-again-slot) */}
          <div className="flow-root min-h-10 px-6">
            <span aria-hidden="true" className="picks-again-slot float-right h-10 w-28" />
            <span className="picks-peek-top float-right -mt-0.5">{peek}</span>
            <h2 id="picks-title" className="text-[17px] font-bold leading-[1.4] tracking-[-0.02em]">
              <span className="picks-t-done">{t("picks.titleFor", { name })}</span>
              <span className="picks-t-busy">{t("picks.titleBusy", { name })}</span>
            </h2>
          </div>
          {/* 고르는 동안은 꼬마 마법사 장면, 다 고르면 번쩍임 뒤에 선물이 나온다. 다시 고르면 key가 바뀌어 장면을 다시 보인다 */}
          <PicksStage key={skip.join(",")} lines={[1, 2, 3, 4].map((n) => t(`picks.loading.${n}` as "picks.loading.1", { name }))} shout={t("picks.shout")}>
            <Suspense fallback={<PicksPending />}>
              <PicksContent>
                <GiftPicksBody picks={picks} locale={locale} again={again} peek={peek} />
              </PicksContent>
            </Suspense>
          </PicksStage>
        </section>
      ) : null}

      <div className="h-6" />

      <div className="bottom-bar mt-auto flex flex-col gap-2.5 bg-bg px-6 pt-4">
        {next && next.daysUntil > 0 && remindOnDay ? <span className="text-[13px] text-muted">{t("reminder.again")}</span> : null}
        <GiftActions
          contactId={contactId}
          doneLabel={doneLabel}
          done={done}
          fallbackText={shareText}
          labels={{
            together: t("reminder.together"),
            shared: t("reminder.shared"),
            done: t("picks.done"),
            doneTitle: t("picks.doneTitle"),
            doneOwn: t("picks.doneOwn"),
            doneSave: t("picks.doneSave"),
            doneEdit: t("picks.doneEdit"),
            copyFailed: t("common.copyFailed"),
            close: t("common.close"),
          }}
        />
      </div>
    </>
  );
}
