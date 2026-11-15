import { formatMonthDay, isSection, parseYmd, SECTIONS_BY_IMPORTANCE } from "@readme/core";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelInvite } from "@/app/actions/request";
import { Avatar } from "@/components/Avatar";
import { TopBar } from "@/components/chrome";
import { Icon } from "@/components/marks";
import { SectionBody } from "@/components/SectionBody";
import { aiConfigured } from "@/lib/ai";
import { displayName, groupName, listGroups, listNotes, listPeople, requireSession, todayFor } from "@/lib/data";
import { makeT } from "@/lib/i18n";
import { FavoriteStar } from "./FavoriteStar";
import { NotesButton } from "./NotesButton";
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
          <div className="flex items-center gap-2 pr-1.5">
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
            <FavoriteStar contactId={p.contactId} initial={p.favorite} label={t("person.favorite")} />
          </div>
        }
      />

      <div className="flex items-center gap-[18px] px-6 pt-3">
        {/* 얼굴을 누르면 내 프로필처럼 그 사람의 얼굴·부르는 말을 꾸민다 */}
        <Link href={`/people/${p.contactId}/profile`} className="shrink-0 rounded-full">
          <Avatar config={p.avatar} size={84} label={t("avatar.of", { name: p.name || name })} />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="min-w-0 truncate text-[32px] font-bold leading-[1.15] tracking-[-0.03em]">{p.name || name}</h1>
          </div>
          <Link href={`/people/${p.contactId}/profile`} className="self-start text-[14px] font-bold text-muted underline decoration-[1.5px] underline-offset-[5px]">
            {t("me.face")}
          </Link>
          {/* 앱 사용자와 이어진 사람은 내가 단 태그도 이름 밑에서 바로 고친다 */}
          {p.personId ? (
            <TagEditor
              contactId={p.contactId}
              initial={p.nickname}
              nameIsTag={false}
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
          ) : null}
        </div>
        {/* 나만 보는 메모: 누르면 아래에서 올라오는 시트에서 보고 적는다 */}
        <div className="self-start pt-2">
          <NotesButton
            contactId={p.contactId}
            notes={notes.map((n) => ({ id: n.id, body: n.body, when: n.label || formatMonthDay(parseYmd(n.createdAt.slice(0, 10)) ?? today, locale) }))}
            labels={{
              button: t("person.memo"),
              title: t("person.notes"),
              add: t("person.addNote"),
              placeholder: t("person.noteBodyPlaceholder"),
              body: t("person.noteBody"),
              del: t("common.delete"),
              close: t("common.close"),
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
