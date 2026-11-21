import assert from "node:assert/strict";
import test from "node:test";
import { needsHonorific, translate } from "../i18n";

test("가족 호칭에는 '님'을 붙이지 않고 조사를 받침에 맞춘다", () => {
  assert.equal(translate("ko", "notif.answered", { name: "아빠" }), "아빠가 답장을 보냈어요");
  assert.equal(translate("ko", "notif.answered", { name: "아내" }), "아내가 답장을 보냈어요");
  assert.equal(translate("ko", "request.titleTo", { name: "엄마" }), "엄마에게 물어보기");
  assert.equal(translate("ko", "person.removeTitle", { name: "와이프" }), "와이프를 지울까요?");
});

test("이름에는 '님'을 붙인다, 이미 님·씨로 끝나면 중복하지 않는다", () => {
  assert.equal(translate("ko", "notif.answered", { name: "민수" }), "민수님이 답장을 보냈어요");
  assert.equal(translate("ko", "notif.answered", { name: "김 과장님" }), "김 과장님이 답장을 보냈어요");
  assert.equal(needsHonorific("지수씨"), false);
  assert.equal(needsHonorific("민수"), true);
  assert.equal(needsHonorific(" "), false);
});

test("영어 복수형: 1이면 단수", () => {
  assert.equal(translate("en", "person.daysLeft", { n: 1 }), "In 1 day");
  assert.equal(translate("en", "person.daysLeft", { n: 3 }), "In 3 days");
  assert.equal(translate("en", "folder.count", { n: 1 }), "1 person");
  assert.equal(translate("en", "people.summary", { n: 1, f: 1 }), "1 person · 1 favorite");
  assert.equal(translate("en", "people.summary", { n: 2, f: 0 }), "2 people · 0 favorites");
  assert.equal(translate("ko", "folder.count", { n: 1 }), "1명");
});
