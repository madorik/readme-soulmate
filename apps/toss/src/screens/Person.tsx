import { SECTIONS_BY_IMPORTANCE, type Section } from "@readme/core";
import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { useT } from "@/components/editors/shared";
import { Icon } from "@/components/marks";
import { SectionBody } from "@/components/SectionBody";
import { SectionIcon } from "@/components/SectionIcon";
import type { TPersonDetail } from "@/lib/toss-api";
import { api } from "../api";
import { useLoad } from "../load";
import { useNav } from "../nav";
import { BottomBar, Failed, Loading, Page } from "../ui";

type Detail = TPersonDetail & { notes: { id: string; label: string; body: string; createdAt: string }[] };

// 사람 한 명: 얼굴·이름, 말로 적기, 적어 둔 항목(눌러서 고치기), 아직 안 적은 항목, 메모, 선물 고르기

export function Person({ id }: { id: string }) {
  const { data, error, reload } = useLoad<Detail>(`people/${id}`);
  const { push, back, bump } = useNav();
  const t = useT("ko");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  if (error) return <Page><Failed onRetry={reload} /></Page>;
  if (!data) return <Page><Loading /></Page>;
  const p = data.person;
  const bodies = SECTIONS_BY_IMPORTANCE.map((section) => ({ section, body: SectionBody({ section, card: p.card, today: data.today, locale: "ko", t }) }));
  const filled = bodies.filter((x) => x.body != null);
  const empty = bodies.filter((x) => x.body == null).map((x) => x.section);
  const edit = (section: Section) => push({ name: "edit", id, section });

  const rename = async () => {
    const name = (renaming ?? "").trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      await api(`people/${id}`, { method: "PUT", json: { name } });
      bump();
      setRenaming(null);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api(`people/${id}`, { method: "DELETE" });
      bump();
      back();
    } catch {
      setBusy(false);
    }
  };

  return (
    <Page>
      <div className="flex items-center gap-[18px] px-6 pt-1">
        <Avatar config={p.avatar} size={72} label={p.name} />
        {renaming == null ? (
          <div className="flex min-w-0 flex-1 items-center gap-0.5">
            <h1 className="min-w-0 truncate text-[30px] font-bold leading-[1.15] tracking-[-0.03em]">{p.name}</h1>
            <button type="button" onClick={() => setRenaming(p.name)} aria-label="이름 바꾸기" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted active:bg-fill">
              <Icon name="pencil" size={18} strokeWidth={2} />
            </button>
          </div>
        ) : (
          <form
            className="flex min-w-0 flex-1 items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void rename();
            }}
          >
            <input aria-label="부를 이름" className="field min-w-0 flex-1" value={renaming} maxLength={40} autoFocus onChange={(e) => setRenaming(e.target.value)} />
            <button type="submit" disabled={!renaming.trim() || busy} className="flex min-h-11 shrink-0 items-center px-2 text-[15px] font-bold text-accent">
              저장
            </button>
          </form>
        )}
      </div>

      <button type="button" onClick={() => push({ name: "voice", about: id })} className="mx-4 mt-5 flex min-h-[56px] items-center gap-3 rounded-2xl bg-white px-4 text-left ring-1 ring-rule">
        <Icon name="mic" size={20} strokeWidth={2} className="shrink-0 text-accent" />
        <span className="min-w-0 flex-1 truncate text-[15px] text-muted">{p.name}에 대해 말로 적기</span>
      </button>

      {filled.length ? (
        <section aria-labelledby="mine-title" className="mx-4 mt-5 flex flex-col">
          <h2 id="mine-title" className="section-title px-2 pb-2">
            기억해 둔 것
          </h2>
          <ul className="card flex flex-col px-[18px]">
            {filled.map(({ section, body }) => (
              <li key={section} className="border-t border-rule first:border-t-0">
                <button type="button" onClick={() => edit(section)} className="flex min-h-[56px] w-full items-center gap-3 pb-1 pt-3 text-left">
                  <SectionIcon section={section} size={36} />
                  <span className={`min-w-0 flex-1 text-[16px] font-bold tracking-[-0.02em] ${section === "safety" ? "text-red" : ""}`}>{t(`section.${section}` as "section.safety")}</span>
                  <Icon name="chevron" size={17} className="shrink-0 text-muted" />
                </button>
                <div className="pb-3.5">{body}</div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {empty.length ? (
        <section aria-labelledby="more-title" className="mx-4 mt-5 flex flex-col">
          <h2 id="more-title" className="section-title px-2 pb-2">
            {filled.length ? "더 적어 두기" : "적어 두기"}
          </h2>
          <ul className="card flex flex-col px-[18px]">
            {empty.map((section) => (
              <li key={section} className="border-t border-rule first:border-t-0">
                <button type="button" onClick={() => edit(section)} className="flex min-h-[56px] w-full items-center gap-3 text-left">
                  <SectionIcon section={section} size={32} />
                  <span className="min-w-0 flex-1 text-[15px] font-medium text-ink-2">{t(`section.${section}` as "section.safety")}</span>
                  <Icon name="plus" size={18} strokeWidth={2} className="shrink-0 text-muted" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.notes.length ? (
        <section aria-labelledby="notes-title" className="mx-4 mt-5 flex flex-col">
          <h2 id="notes-title" className="section-title px-2 pb-2">
            메모
          </h2>
          <ul className="card flex flex-col px-[18px]">
            {data.notes.map((n) => (
              <li key={n.id} className="flex flex-col gap-1 border-t border-rule py-3.5 first:border-t-0">
                {n.label ? <span className="text-[12.5px] font-bold text-accent">{n.label}</span> : null}
                <span className="text-[15px] leading-[1.55]">{n.body}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex justify-center pt-6">
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-[14px] text-ink-2">{p.name}의 기록을 모두 지울까요?</span>
            <button type="button" onClick={() => void remove()} disabled={busy} className="flex min-h-11 items-center px-2 text-[14px] font-bold text-red">
              지우기
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="flex min-h-11 items-center px-2 text-[14px] font-medium text-muted">
              그대로 두기
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="flex min-h-11 items-center px-3 text-[13.5px] font-medium text-muted underline underline-offset-2">
            이 사람 지우기
          </button>
        )}
      </div>

      <div className="h-4" />
      <BottomBar>
        <button type="button" onClick={() => push({ name: "gifts", id })} className="btn-primary w-full">
          <Icon name="gift" size={20} strokeWidth={2} />
          선물 고르기
        </button>
      </BottomBar>
    </Page>
  );
}
