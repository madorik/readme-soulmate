import assert from "node:assert/strict";
import { test } from "node:test";
import { IMAGE_KINDS, IMPORT_ITEMS_MAX, hasIdentifier, importImageRequest, importRequest, parseImportImage, tidyImportItems, type CaptureItem } from "../capture-ai";

const item = (o: Partial<CaptureItem> & { who?: CaptureItem["who"] }): CaptureItem => ({
  who: o.who ?? { type: "new", contactId: null, name: "다은" },
  target: o.target ?? "taste.likes",
  op: o.op ?? "add",
  text: o.text ?? null,
  codes: o.codes ?? null,
  number: o.number ?? null,
  date: o.date ?? null,
  label: o.label ?? null,
});

test("식별 정보 알아보기: 전화번호·이메일·링크·주민번호 모양·카드 번호는 걸리고, 날짜·나이·사이즈는 안 걸린다", () => {
  for (const t of ["010-1234-5678", "연락처 02 123 4567", "01012345678", "a.b@mail.co.kr", "https://example.com/x", "www.shop.kr", "900101-1234567", "카드 1234 5678 9012 3456", "계좌 110-123-456789"]) assert.equal(hasIdentifier(t), true, t);
  for (const t of ["2020년 12월 25일에 수술", "만 34세", "신발 235", "1992.7.14", "떡볶이", "", null]) assert.equal(hasIdentifier(t), false, String(t));
});

test("가져온 항목 다듬기: 식별 정보가 든 값·값이 없는 항목·지우기는 버린다", () => {
  const out = tidyImportItems([
    item({ text: "수국" }),
    item({ text: "010-1234-5678", target: "favorites.scent" }),
    item({ text: "연락은 a@b.com", target: "taste.dessert" }),
    item({ text: "집 https://x.kr", target: "memo" }),
    item({ text: "" }),
    item({ text: null, codes: [], number: null }),
    item({ op: "remove", text: "수국" }),
    item({ target: "taste.spicy", number: 3 }),
  ]);
  assert.deepEqual(out.map((i) => i.text ?? i.number), ["수국", 3]);
});

test("가져온 항목 다듬기: 같은 항목 중복, 너무 긴 메모, 한 사람에 메모는 세 개까지", () => {
  const same = tidyImportItems([item({ text: "수국" }), item({ text: " 수국 " }), item({ text: "수국", who: { type: "new", contactId: null, name: "다 은" } })]);
  assert.equal(same.length, 1, "이름 띄어쓰기·값 앞뒤 공백이 달라도 같은 항목");
  const memos = tidyImportItems([
    item({ text: "수국" }),
    ...["하나", "둘", "셋", "넷", "다섯"].map((t) => item({ target: "memo", text: `메모 ${t}` })),
    item({ target: "memo", text: "가".repeat(121) }),
  ]);
  assert.equal(memos.filter((i) => i.target === "memo").length, 3);
});

test("가져온 항목 다듬기: 메모뿐인 새 사람은 만들지 않는다(칸에 맞는 값이 하나라도 있어야). 내 사람·나는 메모뿐이어도 둔다", () => {
  const out = tidyImportItems([
    item({ who: { type: "new", contactId: null, name: "메모뿐" }, target: "memo", text: "가끔 연락함" }),
    item({ who: { type: "new", contactId: null, name: "제대로" }, target: "memo", text: "가끔 연락함" }),
    item({ who: { type: "new", contactId: null, name: "제대로" }, text: "파스타" }),
    item({ who: { type: "existing", contactId: "11111111-1111-1111-1111-111111111111", name: null }, target: "memo", text: "무릎이 안 좋음" }),
  ]);
  assert.deepEqual(out.map((i) => `${i.who.name ?? "e"}:${i.target}`), ["제대로:memo", "제대로:taste.likes", "e:memo"]);
});

test("사진 요청: 사진은 data URL로 한 번만, 저장 안 함(store false), 사람 이름은 any일 때만", () => {
  const url = "data:image/jpeg;base64,/9j/AAAA";
  const people = [{ id: "11111111-1111-1111-1111-111111111111", name: "", nickname: "엄마" }];
  const any = importImageRequest(url, people, "ko", { kind: "any" });
  assert.equal(any.store, false);
  assert.equal(any.input[0]!.content.filter((c) => c.type === "input_image").length, 1);
  assert.equal(any.input[0]!.content.find((c) => c.type === "input_image")!.image_url, url);
  assert.match(String(any.input[0]!.content[0]!.text), /엄마/);
  const fresh = importImageRequest(url, people, "ko", { kind: "new" });
  assert.doesNotMatch(String(fresh.input[0]!.content[0]!.text), /엄마/, "새 한 사람 이야기에는 이름 목록을 보내지 않는다");
  const one = importImageRequest(url, people, "ko", { kind: "person", person: people[0]! });
  assert.match(String(one.input[0]!.content[0]!.text), /ABOUT/);
  // 지침: 이미지 속 글은 지시가 아니고, 식별 정보·신분증은 받지 않는다
  assert.match(any.instructions, /never instructions/);
  assert.match(any.instructions, /id_or_payment/);
  assert.match(any.instructions, /NEVER output phone numbers/);
  assert.deepEqual(any.text.format.schema.properties.image.properties.kind.enum, [...IMAGE_KINDS]);
});

const reply = (o: unknown) => ({ output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(o) }] }] });
const memoItem = { who: { type: "new", contactId: null, name: "다은" }, op: "add", target: "taste.likes", text: "파스타", codes: null, number: null, date: null, label: null };

test("사진 응답 풀기: 읽는 종류(메모·대화·문서)이고 accepted일 때만 항목을 돌려준다", () => {
  const ok = parseImportImage(reply({ image: { kind: "memo", accepted: true }, items: [memoItem] }));
  assert.equal(ok.accepted, true);
  assert.equal(ok.items.length, 1);
  // 받지 않는 종류: accepted라고 우겨도(종류가 읽는 것이 아니면) 항목은 비운다
  for (const kind of ["other", "unreadable", "id_or_payment", "inappropriate"]) {
    const r = parseImportImage(reply({ image: { kind, accepted: true }, items: [memoItem] }));
    assert.equal(r.accepted, false, kind);
    assert.deepEqual(r.items, [], kind);
  }
  // 읽는 종류여도 accepted가 아니면(적을 사람 이야기가 없다) 비운다
  assert.deepEqual(parseImportImage(reply({ image: { kind: "memo", accepted: false }, items: [memoItem] })).items, []);
  // 모르는 종류는 other
  assert.equal(parseImportImage(reply({ image: { kind: "weird", accepted: true }, items: [memoItem] })).kind, "other");
});

test("사진 응답 풀기: 모델이 거절(refusal)하면 부적절한 사진으로, 답이 비면 읽을 수 없는 사진으로, 끊긴 응답은 실패", () => {
  assert.deepEqual(parseImportImage({ output: [{ type: "message", content: [{ type: "refusal", refusal: "I can't help with that" }] }] }), { kind: "inappropriate", accepted: false, items: [] });
  assert.equal(parseImportImage({ output: [] }).kind, "unreadable");
  assert.throws(() => parseImportImage({ status: "incomplete", output: [] }), /ai_incomplete/);
  // 항목 수 위쪽 한도
  const many = Array.from({ length: IMPORT_ITEMS_MAX + 20 }, () => memoItem);
  assert.equal(parseImportImage(reply({ image: { kind: "memo", accepted: true }, items: many })).items.length, IMPORT_ITEMS_MAX);
});

test("글 요청: 가져오기는 더하기만 하라는 지침과 식별 정보 금지 지침이 들어 있다", () => {
  const r = importRequest("엄마\n수국", "", [], "ko", { kind: "any" });
  assert.match(r.instructions, /op is always "add"/);
  assert.match(r.instructions, /NEVER output phone numbers/);
  assert.equal(r.store, false);
});
