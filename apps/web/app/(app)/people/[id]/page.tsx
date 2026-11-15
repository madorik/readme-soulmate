import { formatMonthDay, parseYmd, SECTIONS } from "@readme/core";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addNote, deleteNote, removeContact } from "@/app/actions/people";
import { cancelInvite } from "@/app/actions/request";
import { Avatar } from "@/components/Avatar";
import { CardView } from "@/components/CardView";
import { DateTiles } from "@/components/DateTiles";
import { TopBar } from "@/components/chrome";
import { Icon } from "@/components/marks";
import { displayName, groupName, listGroups, listNotes, listPeople, requireSession, todayFor } from "@/lib/data";
import { makeT } from "@/lib/i18n";
import { summarize } from "@/lib/summary";
import { FavoriteHeart } from "./FavoriteHeart";
import { PersonOrganize } from "./PersonOrganize";
import { TagEditor } from "./TagEditor";

export default async function PersonPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ back?: string }> }) {
  const { id } = await params;
  // 고르기 중에 들어왔으면 뒤로 갈 때 고르던 상태(/people?pick=1&with=…)로 돌아간다. 사람들 화면 주소만 받는다
  const backParam = (await searchParams).back ?? "";
  const back = /^\/people(\?[\w=&,%.-]*)?$/.test(backParam) ? backParam : "/people";
  const s = await requireSession();
  const { locale } = s.profile;
  const t = makeT(locale);
  const people = await listPeople(s);
  const p = people.find((x) => x.contactId === id);
  if (!p) notFound();
  const name = displayName(p);
  const today = todayFor(s.profile);
  const [notes, groups] = await Promise.all([s.tx((q) => listNotes(q, s.user.id, p.contactId)), s.tx((q) => listGroups(q, s.user.id))]);
  const empty = !SECTIONS.some((x) => p.card[x]);
  const waiting = p.asking?.state === "active" ? p.asking : null;

  return (
    <>
      <TopBar
        back={back}
        label={t("common.back")}
        right={
          // 오른쪽 위는 그룹과, 기록 목록으로 내려가는 '고치기'
          <div className="flex items-center gap-1 pr-1">
            <PersonOrganize
              contactId={p.contactId}
              groupId={p.groupId}
              groups={groups.map((g) => ({ id: g.id, name: groupName(g, t) }))}
              labels={{
                group: t("group.label"),
                none: t("group.none"),
                newOption: t("group.newOption"),
                namePlaceholder: t("group.namePlaceholder"),
                create: t("group.create"),
                error: t("common.error"),
              }}
            />
            <a href="#record" className="flex min-h-11 items-center px-2.5 text-[14.5px] font-bold">
              {t("me.edit")}
            </a>
          </div>
        }
      />

      <div className="flex items-center gap-[18px] px-6 pt-3">
        <Avatar config={p.avatar} size={84} label={t("avatar.of", { name: p.name || name })} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {/* 이름 줄 오른쪽 끝 하트 = 즐겨찾기 */}
          <div className="flex items-center gap-2">
            <h1 className="min-w-0 truncate text-[32px] font-bold leading-[1.15] tracking-[-0.03em]">{p.name || name}</h1>
            <FavoriteHeart contactId={p.contactId} initial={p.favorite} label={t("person.favorite")} />
          </div>
          {/* 태그: 이름 밑에서 바로 달고 고친다(앱 사용자와 이어지지 않은 사람은 태그가 이름) */}
          <TagEditor
            contactId={p.contactId}
            initial={p.nickname}
            nameIsTag={!p.personId}
            labels={{
              tag: t("person.relation"),
              add: t("person.addTag"),
              edit: t("common.edit"),
              rename: t("person.rename"),
              placeholder: t("person.relationPlaceholder"),
              save: t("common.save"),
              cancel: t("common.cancel"),
              error: t("common.error"),
            }}
          />
        </div>
      </div>

      {/* 물어보고 답을 기다리는 중: 아직 아무도 안 연 링크는 여기서 취소한다 */}
      {waiting ? (
        <div className="mx-6 mt-5 flex min-h-[52px] items-center gap-2.5 rounded-2xl bg-fill pl-4 pr-1.5">
          <Icon name="link" size={17} strokeWidth={2} className="shrink-0 text-accent" />
          <span className="min-w-0 flex-1 text-[14px] font-bold">{t("home.waiting")}</span>
          <form action={cancelInvite}>
            <input type="hidden" name="id" value={waiting.inviteId} />
            <input type="hidden" name="back" value={`/people/${p.contactId}`} />
            <button className="flex min-h-11 items-center px-2.5 text-[14px] font-bold text-red">{t("privacy.linkCancel")}</button>
          </form>
        </div>
      ) : null}

      {empty ? (
        <p className="px-6 pt-8 text-[15px] leading-[1.6] text-muted">{t("person.mineEmpty")}</p>
      ) : (
        <>
          {p.card.dates ? <DateTiles dates={p.card.dates} today={today} locale={locale} t={t} /> : null}
          <CardView card={p.card} sections={[...SECTIONS]} name={name} locale={locale} t={t} />
        </>
      )}

      {/* 내 기록: 항목마다 고치기 */}
      <section id="record" className="flex flex-col px-6 pt-8">
        <h2 className="section-title mb-1">{t("person.mineList")}</h2>
        <ul className="flex flex-col">
          {SECTIONS.map((section) => {
            const line = summarize(section, p.card[section], locale, t);
            return (
              <li key={section} className="border-t border-rule last:border-b">
                <Link href={`/people/${p.contactId}/edit/${section}`} className="flex min-h-[60px] items-center gap-3 py-2">
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={`text-[15px] font-bold ${section === "safety" ? "text-red" : ""}`}>{t(`section.${section}` as "section.safety")}</span>
                    {line ? <span className="truncate text-[13px] text-muted">{line}</span> : null}
                  </span>
                  <span className="text-[13.5px] font-bold">{line ? t("me.edit") : t("person.write")}</span>
                  <Icon name="chevron" size={18} className="text-muted" />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section id="notes" className="mx-4 mt-9 flex flex-col gap-2.5 rounded-2xl bg-fill px-5 pb-3 pt-[18px]">
          <h2 className="flex items-center gap-[7px] text-[15px] font-bold">
            <Icon name="lock" size={15} strokeWidth={2.2} />
            {t("person.notes")}
          </h2>
          {notes.map((n) => (
            <div key={n.id} className="flex items-start gap-3 text-[15px] leading-[1.5]">
              <span className="w-[70px] shrink-0 text-muted">{n.label || formatMonthDay(parseYmd(n.createdAt.slice(0, 10)) ?? today, locale)}</span>
              <span className="min-w-0 flex-1 whitespace-pre-line">{n.body}</span>
              <form action={deleteNote}>
                <input type="hidden" name="contactId" value={p.contactId} />
                <input type="hidden" name="noteId" value={n.id} />
                <button aria-label={t("common.delete")} className="flex h-7 w-7 items-center justify-center text-muted">
                  <Icon name="close" size={15} />
                </button>
              </form>
            </div>
          ))}
          <details className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-[14px] font-bold">
              <span className="text-[12.5px] font-normal text-muted">{t("person.notesHidden", { name })}</span>
              <span>{t("person.addNote")}</span>
            </summary>
            <form action={addNote} className="flex flex-col gap-2 pb-2">
              <input type="hidden" name="contactId" value={p.contactId} />
              <input name="label" maxLength={40} placeholder={t("person.noteWhenPlaceholder")} aria-label={t("person.noteWhen")} className="field !bg-white/70" />
              <textarea name="body" required maxLength={1000} rows={2} placeholder={t("person.noteBodyPlaceholder")} aria-label={t("person.noteBody")} className="field resize-none !bg-white/70" />
              <button className="btn-primary !h-12">{t("common.save")}</button>
            </form>
          </details>
        </section>

      <details className="mx-6 mt-8">
        <summary className="flex min-h-11 cursor-pointer list-none items-center text-[14px] font-bold text-muted">{t("person.remove")}</summary>
        <form action={removeContact}>
          <input type="hidden" name="contactId" value={p.contactId} />
          <button className="flex min-h-11 items-center text-[14px] font-bold text-red">{t("common.delete")}</button>
        </form>
      </details>

      <div className="bottom-bar mt-auto grid grid-cols-2 gap-2.5 bg-bg px-6 pt-4">
        <Link href={`/request?to=${encodeURIComponent(p.contactId)}`} className="btn-outline">
          {t("person.askMore")}
        </Link>
        <Link href={`/people/${p.contactId}/reminder`} className="btn-primary">
          {t("person.pickGift")}
        </Link>
      </div>
    </>
  );
}
