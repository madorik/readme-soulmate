import { formatMonthDay, parseYmd, SECTIONS } from "@readme/core";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addNote, deleteNote, removeContact, setNickname } from "@/app/actions/people";
import { Avatar } from "@/components/Avatar";
import { CardView } from "@/components/CardView";
import { DateTiles } from "@/components/DateTiles";
import { TopBar } from "@/components/chrome";
import { Icon } from "@/components/marks";
import { TagChip } from "@/components/PersonRow";
import { displayName, groupName, listGroups, listNotes, listPeople, listShares, requireSession, todayFor } from "@/lib/data";
import { makeT } from "@/lib/i18n";
import { summarize } from "@/lib/summary";
import { PersonOrganize } from "./PersonOrganize";
import { ShareControl } from "./ShareControl";

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
  const notes = p.kind === "pending" ? [] : await s.tx((q) => listNotes(q, s.user.id, p.contactId));
  const updated = p.updatedAt ? parseYmd(p.updatedAt.slice(0, 10)) : null;
  const askHref = `/request?to=${encodeURIComponent(p.contactId)}`;
  const mine = p.kind === "mine";
  const mineEmpty = mine && !SECTIONS.some((x) => p.card[x]);
  // 내가 이 사람에게 내 리드미를 보여 주는지(앱을 쓰는 사람만)
  const myShare = p.kind === "member" && p.personId ? ((await s.tx((q) => listShares(q, s.user.id))).find((x) => x.viewerId === p.personId) ?? null) : null;
  const groups = await s.tx((q) => listGroups(q, s.user.id));

  return (
    <>
      <TopBar
        back={back}
        label={t("common.back")}
        right={
          mine ? (
            <a href="#mine" className="flex min-h-11 items-center px-3 text-[14.5px] font-bold">
              {t("me.edit")}
            </a>
          ) : p.kind !== "pending" ? (
            <Link href={askHref} className="flex min-h-11 items-center px-3 text-[14.5px] font-bold">
              {t("person.askMore")}
            </Link>
          ) : undefined
        }
      />

      <div className="flex items-center gap-[18px] px-6 pt-3">
        <Avatar config={p.avatar} size={84} label={t("avatar.of", { name: p.name || name })} />
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="truncate text-[32px] font-bold leading-[1.15] tracking-[-0.03em]">{p.name || name}</h1>
          {p.nickname && p.nickname !== p.name ? (
            <span className="flex">
              <TagChip large>{p.nickname}</TagChip>
            </span>
          ) : null}
          {mine ? (
            <span className="text-[12.5px] text-muted">{t("person.mineNote")}</span>
          ) : p.kind === "guest" ? (
            <span className="text-[12.5px] text-muted">{t("person.guestNote")}</span>
          ) : updated && p.kind === "member" ? (
            <span className="text-[12.5px] text-muted">{t("person.updated", { date: formatMonthDay(updated, locale) })}</span>
          ) : null}
        </div>
      </div>

      <PersonOrganize
        contactId={p.contactId}
        favorite={p.favorite}
        groupId={p.groupId}
        groups={groups.map((g) => ({ id: g.id, name: groupName(g, t) }))}
        labels={{
          favorite: t("person.favorite"),
          group: t("group.label"),
          none: t("group.none"),
          newOption: t("group.newOption"),
          namePlaceholder: t("group.namePlaceholder"),
          create: t("group.create"),
          error: t("common.error"),
        }}
      />

      {p.kind === "member" && p.personId ? (
        <ShareControl
          locale={locale}
          personId={p.personId}
          name={name}
          initialOn={!!myShare && !myShare.revoked}
          initialSections={myShare?.sections ?? []}
          neverShared={!myShare}
        />
      ) : null}

      {p.kind === "pending" && p.pending ? (
        <section className="flex flex-col gap-3 px-6 pt-8">
          <p className="text-[15px] leading-[1.6]">
            {p.pending.state === "canceled" ? t("accept.canceled") : p.pending.state === "expired" ? t("accept.expired") : t("home.waiting")}
          </p>
          <Link href={`/request?name=${encodeURIComponent(p.nickname)}`} className="btn-primary">
            {t("home.ask")}
          </Link>
        </section>
      ) : p.revoked ? (
        <p className="px-6 pt-8 text-[15px] leading-[1.6] text-muted">{t("person.notShared", { name })}</p>
      ) : mineEmpty ? (
        <p className="px-6 pt-8 text-[15px] leading-[1.6] text-muted">{t("person.mineEmpty")}</p>
      ) : (
        <>
          {p.sections.includes("dates") ? <DateTiles dates={p.card.dates} today={today} locale={locale} t={t} /> : null}
          <CardView card={p.card} sections={p.sections} name={name} locale={locale} t={t} mine={mine} />
        </>
      )}

      {mine ? (
        <section id="mine" className="flex flex-col px-6 pt-8">
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
      ) : null}

      {p.kind !== "pending" ? (
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
      ) : null}

      <details className="mx-6 mt-8">
        <summary className="flex min-h-11 cursor-pointer list-none items-center text-[14px] font-bold text-muted">{t("person.relation")}</summary>
        <form action={setNickname} className="flex gap-2 pb-2">
          <input type="hidden" name="contactId" value={p.contactId} />
          <input name="nickname" defaultValue={p.nickname} maxLength={40} placeholder={t("person.relationPlaceholder")} aria-label={t("person.relation")} className="field" />
          <button className="btn-primary !h-12 shrink-0 px-5">{t("common.save")}</button>
        </form>
        <form action={removeContact} className="pt-2">
          <input type="hidden" name="contactId" value={p.contactId} />
          <button className="flex min-h-11 items-center text-[14px] font-bold text-red">{t("common.delete")}</button>
        </form>
      </details>

      {mine ? (
        <div className="sticky bottom-0 mt-auto bg-white px-6 pt-4" style={{ paddingBottom: "max(var(--sab), 16px)" }}>
          <Link href={`/people/${p.contactId}/reminder`} className="btn-primary w-full">
            {t("person.pickGift")}
          </Link>
        </div>
      ) : p.kind !== "pending" && !p.revoked ? (
        <div className="sticky bottom-0 mt-auto grid grid-cols-2 gap-2.5 bg-white px-6 pt-4" style={{ paddingBottom: "max(var(--sab), 16px)" }}>
          <Link href={askHref} className="btn-outline">
            {t("person.askMore")}
          </Link>
          <Link href={`/people/${p.contactId}/reminder`} className="btn-primary">
            {t("person.pickGift")}
          </Link>
        </div>
      ) : (
        <div className="h-8" />
      )}
    </>
  );
}
