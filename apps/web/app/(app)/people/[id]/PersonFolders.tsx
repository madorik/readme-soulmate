"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createFolder, setPersonFolders } from "@/app/actions/people";
import { FolderArt, FolderMini } from "@/components/FolderArt";
import { DrawnCheck, Icon } from "@/components/marks";
import { Sheet } from "@/components/Sheet";
import { FOLDER_COLORS, type FolderView } from "@/lib/folders";

interface Labels {
  /** "+" 버튼·시트 제목 */
  put: string;
  /** "{name} · 폴더" */
  title: string;
  done: string;
  newFolder: string;
  namePlaceholder: string;
  create: string;
  /** "{n}명" */
  count: string;
  close: string;
  error: string;
}

/**
 * 사람 화면 이름 밑: 그 사람이 든 폴더 칩(누르면 그 폴더) + "+"(폴더 고르기 시트).
 * 시트에서 체크한 폴더로 맞추고, 맨 끝에서 새 폴더를 바로 만들어 넣을 수 있다
 */
export function PersonFolders({ contactId, name, folders, mine, labels }: { contactId: string; name: string; folders: FolderView[]; mine: string[]; labels: Labels }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>(mine);
  const [making, setMaking] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, start] = useTransition();
  const [failed, setFailed] = useState(false);
  const inFolders = folders.filter((f) => mine.includes(f.id));
  const toggle = (id: string) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);

  function openSheet() {
    setPicked(mine);
    setMaking(false);
    setFailed(false);
    setOpen(true);
  }

  function make() {
    const n = newName.replace(/\s+/g, " ").trim();
    if (!n) return;
    start(async () => {
      const r = await createFolder({ name: n, icon: "star", color: FOLDER_COLORS[folders.length % FOLDER_COLORS.length] });
      if (!r) return setFailed(true);
      setPicked((p) => (p.includes(r.id) ? p : [...p, r.id]));
      setNewName("");
      setMaking(false);
      router.refresh();
    });
  }

  function save() {
    setFailed(false);
    start(async () => {
      const r = await setPersonFolders(contactId, picked);
      if (r.ok) setOpen(false);
      else setFailed(true);
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {inFolders.map((f) => (
          <Link
            key={f.id}
            href={`/people/folder/${f.id}`}
            // 보이는 칩은 34px, 누르는 자리는 위아래 5px씩 넓혀 44px(before)
            className="relative flex h-[34px] max-w-full items-center gap-1.5 rounded-full bg-paper pl-[9px] pr-3 text-[17px] shadow-[inset_0_0_0_1.5px_var(--color-edge)] before:absolute before:-inset-y-[5px] before:inset-x-0"
          >
            <FolderMini color={f.color} />
            <span className="truncate">{f.name}</span>
          </Link>
        ))}
        <button
          type="button"
          aria-label={labels.put}
          onClick={openSheet}
          // 보이는 동그라미는 34px, 누르는 자리는 44px(before)
          className="relative flex h-[34px] w-[34px] items-center justify-center rounded-full border-[1.8px] border-dashed border-ink text-ink before:absolute before:-inset-[5px]"
        >
          <Icon name="plus" size={16} strokeWidth={2.4} />
        </button>
      </div>

      {open ? (
        <Sheet
          id="person-folders"
          title={labels.title.replace("{name}", name)}
          closeLabel={labels.close}
          onClose={() => setOpen(false)}
          footer={
            <>
              {failed ? (
                <p role="alert" className="pb-1 text-[16px] text-red">
                  {labels.error}
                </p>
              ) : null}
              <button type="button" disabled={busy} onClick={save} className="btn-primary">
                {labels.done}
              </button>
            </>
          }
        >
          <ul className="flex flex-col px-6 pb-2">
            {folders.map((f) => {
              const on = picked.includes(f.id);
              return (
                <li key={f.id} className="border-t border-rule first:border-t-0">
                  <button type="button" aria-pressed={on} onClick={() => toggle(f.id)} className="flex min-h-[62px] w-full items-center gap-3.5 text-left">
                    <FolderArt icon={f.icon} color={f.color} size={40} />
                    <span className="min-w-0 flex-1 truncate text-[20px]">{f.name}</span>
                    <span className="text-[15px] text-muted">{labels.count.replace("{n}", String(f.memberIds.length))}</span>
                    <DrawnCheck on={on} />
                  </button>
                </li>
              );
            })}
            <li className="border-t border-rule first:border-t-0">
              {making ? (
                <form
                  className="flex gap-2 py-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    make();
                  }}
                >
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    maxLength={30}
                    autoFocus
                    placeholder={labels.namePlaceholder}
                    aria-label={labels.namePlaceholder}
                    className="field min-w-0 flex-1"
                  />
                  <button disabled={busy || !newName.trim()} className="btn-primary !min-h-12 shrink-0 px-5">
                    {labels.create}
                  </button>
                </form>
              ) : (
                <button type="button" onClick={() => setMaking(true)} className="flex min-h-[62px] w-full items-center gap-3.5 text-left text-accent">
                  <span className="flex h-[31px] w-10 items-center justify-center rounded-[9px] shadow-[inset_0_0_0_2px_var(--color-mango-edge)]">
                    <Icon name="plus" size={18} strokeWidth={2.4} />
                  </span>
                  <span className="text-[19px]">{labels.newFolder}</span>
                </button>
              )}
            </li>
          </ul>
        </Sheet>
      ) : null}
    </>
  );
}
