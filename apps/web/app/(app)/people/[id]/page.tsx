import { formatMonthDay, isSection, parseYmd, SECTIONS_BY_IMPORTANCE } from "@readme/core";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addNote, deleteNote, removeContact } from "@/app/actions/people";
import { cancelInvite } from "@/app/actions/request";
import { Avatar } from "@/components/Avatar";
import { TopBar } from "@/components/chrome";
import { Icon } from "@/components/marks";
import { SectionBody } from "@/components/SectionBody";
import { aiConfigured } from "@/lib/ai";
import { displayName, groupName, listGroups, listNotes, listPeople, requireSession, todayFor } from "@/lib/data";
import { makeT } from "@/lib/i18n";
import { FavoriteHeart } from "./FavoriteHeart";
import { PersonOrganize } from "./PersonOrganize";
import { PersonRecord } from "./PersonRecord";
import { QuickNote } from "./QuickNote";
import { TagEditor } from "./TagEditor";

export default async function PersonPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ back?: string; open?: string }> }) {
  const { id } = await params;
  // 고르기 중에 들어왔으면 뒤로 갈 때 고르던 상태(/people?pick=1&with=…)로 돌아간다. 사람들 화면 주소만 받는다
  const sp = await searchParams;
  const backParam = sp.back ?? "";
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
  const waiting = p.asking?.state === "active" ? p.asking : null;

  return (
    <>
      <TopBar
        back={back}
        label={t("common.back")}
        right={
          <div className="flex items-center pr-1.5">
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

      {aiConfigured() ? (
        <QuickNote
          contactId={p.contactId}
          labels={{
            placeholder: t("person.quickPlaceholder", { name }),
            save: t("voice.save"),
            same: t("voice.same"),
            gone: t("voice.gone"),
            changed: t("voice.changed"),
            removed: t("voice.removed"),
            undo: t("voice.undo"),
            undone: t("voice.undone"),
            failed: t("voice.failed"),
            nothing: t("person.quickNothing"),
            aiOff: t("voice.aiOff"),
          }}
        />
      ) : null}

      {/* 기억해 둔 것: 항목마다 적어 둔 게 바로 보이고, 누르면 그 자리에서 고친다 */}
      <PersonRecord
        contactId={p.contactId}
        card={p.card}
        locale={locale}
        rows={SECTIONS_BY_IMPORTANCE.map((section) => ({
          section,
          title: t(`section.${section}` as "section.safety"),
          body: SectionBody({ section, card: p.card, today, locale, t }),
        }))}
        labels={{ edit: t("me.edit"), close: t("me.close"), write: t("person.write"), done: t("person.editDone") }}
        initialOpen={isSection(sp.open) ? sp.open : null}
      />

      <section id="notes" className="card mx-4 mt-3 flex flex-col px-[18px] pb-3 pt-4">
        <h2 className="flex items-center gap-[7px] text-[16px] font-bold tracking-[-0.02em]">
          <Icon name="lock" size={15} strokeWidth={2.2} />
          {t("person.notes")}
        </h2>
        {notes.length ? (
          <ul className="mt-1.5 flex flex-col">
            {notes.map((n) => (
              <li key={n.id} className="flex items-start gap-2 border-b border-rule py-2.5 text-[15px] leading-[1.5]">
                <span className="min-w-0 flex-1 whitespace-pre-line">{n.body}</span>
                <span className="shrink-0 pt-[2px] text-[12.5px] text-muted">{n.label || formatMonthDay(parseYmd(n.createdAt.slice(0, 10)) ?? today, locale)}</span>
                <form action={deleteNote} className="-my-1.5 -mr-2 shrink-0">
                  <input type="hidden" name="contactId" value={p.contactId} />
                  <input type="hidden" name="noteId" value={n.id} />
                  <button aria-label={t("common.delete")} className="flex h-9 w-9 items-center justify-center text-muted">
                    <Icon name="close" size={15} />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : null}
        <form action={addNote} className="mt-2.5 flex items-end gap-1.5">
          <input type="hidden" name="contactId" value={p.contactId} />
          <textarea
            name="body"
            required
            maxLength={1000}
            rows={1}
            placeholder={t("person.noteBodyPlaceholder")}
            aria-label={t("person.noteBody")}
            className="field max-h-40 flex-1 resize-none [field-sizing:content]"
          />
          <button className="flex h-12 shrink-0 items-center px-2.5 text-[14.5px] font-bold">{t("person.addNote")}</button>
        </form>
      </section>

      <details className="mx-6 mt-6">
        <summary className="flex min-h-11 cursor-pointer list-none items-center text-[14px] font-bold text-muted">{t("person.remove")}</summary>
        <form action={removeContact}>
          <input type="hidden" name="contactId" value={p.contactId} />
          <button className="flex min-h-11 items-center text-[14px] font-bold text-red">{t("common.delete")}</button>
        </form>
      </details>

      {/* 항목을 고치는 동안은 아래 버튼 줄을 숨기고, 그 자리를 화면 끝 여백으로 */}
      <div className="page-end show-while-editing" />
      <div className="bottom-bar hide-while-editing mt-auto grid grid-cols-2 gap-2.5 bg-bg px-6 pt-4">
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
