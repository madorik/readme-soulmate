import { NextResponse } from "next/server";
import { displayName, listNotes, listPeople, listShares, readCard, getSession } from "@/lib/data";

// 내 정보 내려받기: 내 리드미, 내가 쓴 메모, 내가 보여 준 사람, 내 주소록(이름만, 내가 직접 적어 둔 사람은 적은 내용까지)
export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });
  const [{ card }, shares, people] = await Promise.all([s.tx((q) => readCard(q, s.user.id)), s.tx((q) => listShares(q, s.user.id)), listPeople(s)]);
  const notes = await Promise.all(people.filter((p) => p.kind !== "pending").map(async (p) => ({ person: displayName(p), notes: await s.tx((q) => listNotes(q, s.user.id, p.contactId)) })));
  const data = {
    exportedAt: new Date().toISOString(),
    profile: { name: s.profile.displayName, email: s.user.email, locale: s.profile.locale, timeZone: s.profile.timeZone, avatar: s.profile.avatar, reminderOffsets: s.profile.reminderOffsets },
    myReadme: card,
    sharedWith: shares.map((x) => ({ name: x.name, relation: x.relation, sections: x.sections, stopped: x.revoked })),
    people: people.map((p) => ({ name: displayName(p), kind: p.kind, ...(p.kind === "mine" ? { written: p.card } : {}) })),
    myNotes: notes.filter((n) => n.notes.length),
  };
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="readme-${new Date().toISOString().slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  });
}
