import "server-only";
import { aiConfigured } from "@/lib/ai";
import { folderName, listFolders, requireSession } from "@/lib/data";
import { makeT } from "@/lib/t";
import type { PersonNewData } from "./person-new.data";
import type { PageInput } from "./routes";

/** 직접 적어 두기: 처음 넣을 폴더 목록 */
export async function loadPersonNew({ searchParams: sp }: PageInput): Promise<PersonNewData> {
  const s = await requireSession();
  const t = makeT(s.profile.locale);
  const folders = await s.tx((q) => listFolders(q, s.user.id));
  return { locale: s.profile.locale, folders: folders.map((f) => ({ id: f.id, name: folderName(f, t) })), error: sp.error ?? null, name: sp.name ?? null, ai: aiConfigured() };
}
