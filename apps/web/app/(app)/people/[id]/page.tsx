import { formatMonthDay, parseYmd, SECTIONS_BY_IMPORTANCE } from "@readme/core";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelInvite } from "@/app/actions/request";
import { Avatar } from "@/components/Avatar";
import { TopBar } from "@/components/chrome";
import { Icon } from "@/components/marks";
import { SectionBody } from "@/components/SectionBody";
import { SectionIcon } from "@/components/SectionIcon";
import { aiConfigured } from "@/lib/ai";
import { displayName, folderViews, listFolders, listNotes, listPeople, requireSession, todayFor, unreadAnswers } from "@/lib/data";
import { SeeAnswers } from "@/components/SeeAnswers";
import { makeT } from "@/lib/i18n";
import { FavoriteStar } from "./FavoriteStar";
import { NotesButton } from "./NotesButton";
import { PersonFolders } from "./PersonFolders";
import { QuickNote } from "./QuickNote";
import { TagEditor } from "./TagEditor";

export default async function PersonPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ back?: string }> }) {
  const { id } = await params;
  // 고르기 중이나 폴더에서 들어왔으면 뒤로 갈 때 거기로(/people?pick=1&with=…, /people/folder/…). 사람들 화면 주소만 받는다
  const sp = await searchParams;
  const backParam = sp.back ?? "";
  const back = /^\/people(\/folder\/[0-9a-f-]{36})?(\?[\w=&,%.-]*)?$/.test(backParam) ? backParam : "/people";
  const s = await requireSession();
  const { locale } = s.profile;
  const t = makeT(locale);
  const people = await listPeople(s);
  const p = people.find((x) => x.contactId === id);
  if (!p) notFound();
  const name = displayName(p);
  const today = todayFor(s.profile);
  const [notes, folders, answered] = await Promise.all([
    s.tx((q) => listNotes(q, s.user.id, p.contactId)),
    s.tx((q) => listFolders(q, s.user.id)),
    s.tx((q) => unreadAnswers(q, s.user.id, p.contactId)),
  ]);
  const waiting = p.asking?.state === "active" ? p.asking : null;
  // 적어 둔 항목만(중요한 순서)
  const filled = SECTIONS_BY_IMPORTANCE.map((section) => ({ section, body: SectionBody({ section, card: p.card, today, locale, t }) })).filter((x) => x.body != null);

  return (
    <>
      {answered.length ? <SeeAnswers contactId={p.contactId} /> : null}
      <TopBar
        back={back}
        label={t("common.back")}
        right={
          <div className="flex items-center gap-2 pr-1.5">
            {/* 나만 보는 메모: 누르면 아래에서 올라오는 시트에서 보고 적는다. 위 줄에 두어 이름 자리를 넓게 */}
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
            <FavoriteStar contactId={p.contactId} initial={p.favorite} label={t("person.favorite")} />
          </div>
        }
      />

      <div className="flex items-start gap-[18px] px-6 pt-3">
        {/* 얼굴을 누르면 내 프로필처럼 그 사람의 얼굴·부르는 말을 꾸민다 */}
        <Link href={`/people/${p.contactId}/profile`} className="shrink-0 rounded-full">
          <Avatar config={p.avatar} size={84} label={t("avatar.of", { name: p.name || name })} />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1">
          <div className="flex items-center gap-0.5">
            <h1 className="min-w-0 truncate text-[32px] font-bold leading-[1.15] tracking-[-0.03em]">{p.name || name}</h1>
            <Link href={`/people/${p.contactId}/profile`} aria-label={t("me.face")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted active:bg-fill">
              <Icon name="pencil" size={18} strokeWidth={2} />
            </Link>
          </div>
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
          {/* 든 폴더(여러 개) + 폴더 고르기 */}
          <div className="pt-1">
            <PersonFolders
              contactId={p.contactId}
              name={name}
              folders={folderViews(folders, people, t)}
              mine={p.folderIds}
              labels={{
                put: t("folder.put"),
                title: t("folder.of", { name: "{name}" }),
                done: t("folder.done"),
                newFolder: t("folder.new"),
                namePlaceholder: t("folder.namePlaceholder"),
                create: t("folder.create"),
                count: t("folder.count", { n: "{n}" }),
                close: t("common.close"),
                error: t("common.error"),
              }}
            />
          </div>
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
            limit: t("voice.limit"),
            nothing: t("person.quickNothing"),
            aiOff: t("voice.aiOff"),
          }}
        />
      ) : null}

      {/* 기억해 둔 것: 적어 둔 항목만 미리 보기. 연필(수정)을 누르면 모든 항목을 고치는 화면, 항목을 누르면 그 항목이 펼쳐진 채로 */}
      <section aria-labelledby="mine-title" className="mx-4 mt-4 flex flex-col">
        <div className="flex min-h-11 items-center justify-between pl-2">
          <h2 id="mine-title" className="section-title">
            {t("person.mineList")}
          </h2>
          <Link href={`/people/${p.contactId}/edit`} aria-label={t("me.edit")} className="flex h-11 w-11 items-center justify-center rounded-full text-ink-2 active:bg-fill">
            <Icon name="pencil" size={19} strokeWidth={2} />
          </Link>
        </div>
        {filled.length ? (
          <ul className="card mt-1 flex flex-col px-[18px]">
            {filled.map(({ section, body }) => (
              <li key={section} className="border-t border-rule first:border-t-0">
                <Link href={`/people/${p.contactId}/edit?open=${section}`} className="flex min-h-[56px] items-center gap-3 pb-1 pt-3">
                  <SectionIcon section={section} size={36} />
                  <span className={`min-w-0 flex-1 text-[16px] font-bold tracking-[-0.02em] ${section === "safety" ? "text-red" : ""}`}>{t(`section.${section}` as "section.safety")}</span>
                  <Icon name="chevron" size={17} className="shrink-0 text-muted" />
                </Link>
                <div className="pb-3.5">{body}</div>
              </li>
            ))}
          </ul>
        ) : (
          <Link href={`/people/${p.contactId}/edit`} className="card mt-1 flex min-h-[72px] items-center justify-center gap-1.5 text-[15px] font-bold text-accent">
            <Icon name="plus" size={17} strokeWidth={2.4} />
            {t("person.write")}
          </Link>
        )}
      </section>

      <div className="h-6" />
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
