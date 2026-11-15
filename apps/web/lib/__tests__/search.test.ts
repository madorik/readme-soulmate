import assert from "node:assert/strict";
import { test } from "node:test";
import { matchesPerson } from "../search";

test("사람 찾기: 이름·태그 어디든, 띄어쓰기·대소문자 없이", () => {
  assert.equal(matchesPerson("과장", "김민수", "김 과장님"), true);
  assert.equal(matchesPerson("김과장", "김민수", "김 과장님"), true);
  assert.equal(matchesPerson("민수", "김민수", ""), true);
  assert.equal(matchesPerson("mom", "Mom", null), true);
  assert.equal(matchesPerson("사장", "김민수", "김 과장님"), false);
  assert.equal(matchesPerson("  ", "누구든"), true);
});

test("사람 찾기: 초성만 적어도 찾는다", () => {
  assert.equal(matchesPerson("ㄱㄱㅈ", "김 과장님"), true);
  assert.equal(matchesPerson("ㄷㅉ", "단짝"), true);
  assert.equal(matchesPerson("ㅇㅁ", "단짝"), false);
});
