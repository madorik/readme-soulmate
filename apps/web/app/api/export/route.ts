import { NextResponse } from "next/server";
import { displayName, listFolders, listNotes, listPeople, readCard, getSession } from "@/lib/data";

// 내 정보 내려받기: 내 리드미, 내 사람들(이름·폴더·즐겨찾기·기록, 항목별로 받은 답이면 받은 때), 내가 쓴 메모
export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });
  const [{ card }, people, folders] = await Promise.all([
    s.tx((q) => readCard(q, s.user.id)),
    listPeople(s),
    s.tx((q) => listFolders(q, s.user.id)),
  ]);
  // 기본 폴더는 코드(family·work·partner·friends), 직접 만든 폴더는 이름
  const foldersOf = (ids: string[]) => folders.filter((f) => ids.includes(f.id)).map((f) => f.builtin ?? f.name);
  const notes = await Promise.all(people.map(async (p) => ({ person: displayName(p), notes: await s.tx((q) => listNotes(q, s.user.id, p.contactId)) })));
  const data = {
    exportedAt: new Date().toISOString(),
    profile: { name: s.profile.displayName, email: s.user.email, locale: s.profile.locale, timeZone: s.profile.timeZone, avatar: s.profile.avatar, reminderOffsets: s.profile.reminderOffsets },
    aboutMe: card,
    people: people.map((p) => ({ name: displayName(p), folders: foldersOf(p.folderIds), favorite: p.favorite, record: p.card, answered: p.answered })),
    folders: folders.filter((f) => !f.builtin).map((f) => ({ name: f.name, icon: f.icon, color: f.color })),
    myNotes: notes.filter((n) => n.notes.length),
  };
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="remember-you-${new Date().toISOString().slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  });
}
