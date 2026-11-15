import assert from "node:assert/strict";
import { test } from "node:test";
import { insertMention, mentionAt, mentionLabel, resolveMentions, type MentionPerson } from "../mention";

const PEOPLE: MentionPerson[] = [
  { id: "wife", name: "김지수", tag: "와이프" },
  { id: "mom", name: "엄마", tag: "" },
  { id: "boss", name: "김민수", tag: "김 과장님" },
];

test("@부름: 커서 앞의 '@낱말'만 찾는다", () => {
  assert.deepEqual(mentionAt("@와", 2), { start: 0, query: "와" });
  assert.deepEqual(mentionAt("오늘 @", 4), { start: 3, query: "" });
  assert.deepEqual(mentionAt("오늘 @ㅇㅍ", 6), { start: 3, query: "ㅇㅍ" });
  assert.equal(mentionAt("@와이프 바닐라", 8), null);
  assert.equal(mentionAt("mail@x", 6), null);
  assert.equal(mentionAt("그냥 글", 4), null);
});

test("@부름: 고르면 '@부름 '으로 바꾸고 커서는 그 뒤", () => {
  assert.deepEqual(insertMention("@와 좋아해", 0, 2, "와이프"), { text: "@와이프 좋아해", caret: 5 });
  assert.deepEqual(insertMention("오늘 @", 3, 4, "엄마"), { text: "오늘 @엄마 ", caret: 7 });
  assert.equal(mentionLabel({ name: "김지수", tag: "와이프" }), "와이프");
  assert.equal(mentionLabel({ name: "엄마", tag: "" }), "엄마");
});

test("@부름: 고른 사람은 그 사람으로, @는 뗀다(띄어쓰기 있는 태그도)", () => {
  const r = resolveMentions("@김 과장님 커피는 아이스 @와이프 바닐라라떼", PEOPLE, [
    { id: "boss", label: "김 과장님" },
    { id: "wife", label: "와이프" },
  ]);
  assert.equal(r.text, "김 과장님 커피는 아이스 와이프 바닐라라떼");
  assert.deepEqual(new Set(r.ids), new Set(["boss", "wife"]));
});

test("@부름: 직접 적어도 이름·태그로 찾고, 조사가 붙어도 된다", () => {
  assert.deepEqual(resolveMentions("@와이프는 바닐라라떼를 좋아해", PEOPLE), { text: "와이프는 바닐라라떼를 좋아해", ids: ["wife"] });
  assert.deepEqual(resolveMentions("@엄마한테 수국", PEOPLE), { text: "엄마한테 수국", ids: ["mom"] });
  assert.deepEqual(resolveMentions("@김지수 생일 3월", PEOPLE).ids, ["wife"]);
  assert.deepEqual(resolveMentions("@김과장님 아메리카노", PEOPLE).ids, ["boss"]);
});

test("@부름: 모르는 사람·지워진 고르기는 @만 떼고 넘긴다", () => {
  assert.deepEqual(resolveMentions("@처제 고양이 좋아함", PEOPLE), { text: "처제 고양이 좋아함", ids: [] });
  assert.deepEqual(resolveMentions("바닐라라떼", PEOPLE, [{ id: "wife", label: "와이프" }]), { text: "바닐라라떼", ids: [] });
  assert.deepEqual(resolveMentions("@와이프 라떼", PEOPLE, [{ id: "someone-else", label: "와이프" }]).ids, ["wife"]);
});
