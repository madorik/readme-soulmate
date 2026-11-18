import assert from "node:assert/strict";
import { test } from "node:test";
import { findByRelation, sameRelation } from "../index";

test("부름말: 같은 사람을 가리키는 말끼리 같다(한국어·영어, 띄어쓰기·대소문자 무시)", () => {
  const same: [string, string][] = [
    ["와이프", "아내"],
    ["집사람", "wife"],
    ["Wife ", "와이프"],
    ["남편", "신랑"],
    ["husband", "남편"],
    ["엄마", "어머니"],
    ["Mom", "엄마"],
    ["아빠", "아버지"],
    ["dad", "아빠"],
    ["여자친구", "여친"],
    ["여자 친구", "girlfriend"],
    ["남친", "남자친구"],
    ["아들", "son"],
    ["딸", "따님"],
    ["장모님", "장모"],
    ["장인어른", "장인"],
    ["mother-in-law", "장모"],
    ["mother in law", "시어머니"],
    ["시어머님", "시어머니"],
    ["외할머니", "외조모"],
    ["친할아버지", "친조부"],
    ["할머니", "grandma"],
    ["형", "형님"],
    ["형", "older brother"],
    ["누나", "누님"],
    ["동생", "남동생"],
    ["동생", "여동생"],
  ];
  for (const [a, b] of same) {
    assert.equal(sameRelation(a, b), true, `${a} = ${b}`);
    assert.equal(sameRelation(b, a), true, `${b} = ${a}`);
  }
});

test("부름말: 다른 사람은 합치지 않는다(아내와 남편, 외가와 친가, 장모와 시어머니, 이름이 다른 사람)", () => {
  const different: [string, string][] = [
    ["아내", "남편"],
    ["엄마", "아빠"],
    ["외할머니", "친할머니"],
    ["할머니", "외할머니"], // 어느 쪽 할머니인지 모르니 합치지 않는다
    ["장모", "시어머니"],
    ["남동생", "여동생"],
    ["형", "오빠"],
    ["언니", "누나"],
    ["아들", "딸"],
    ["여친", "남친"],
    ["민수", "철수"],
    ["김 과장님", "이 과장님"],
    ["민수님", "민수"],
    ["엄마", "엄마친구"],
    ["", "엄마"],
    ["엄마", " "],
    ["님", "엄마"],
  ];
  for (const [a, b] of different) assert.equal(sameRelation(a, b), false, `${a} ≠ ${b}`);
});

test("부름말: 배우자는 아내도 남편도 가리키고, 이름은 글자가 같을 때만 같다", () => {
  assert.equal(sameRelation("배우자", "아내"), true);
  assert.equal(sameRelation("spouse", "남편"), true);
  assert.equal(sameRelation("김민수", "김민수"), true);
  assert.equal(sameRelation("김 민수", "김민수"), true);
  assert.equal(sameRelation("Jay", "jay"), true);
  assert.equal(sameRelation("김민수", "김민서"), false);
});

test("부름말로 사람 찾기: 하나일 때만 합치고, 둘 이상이면 누구인지 몰라 찾지 않는다", () => {
  const people = [
    { id: "1", nickname: "아내", name: "지수" },
    { id: "2", nickname: "장모님", name: "" },
    { id: "3", nickname: "어머님", name: "시어머니" },
    { id: "4", nickname: "", name: "김 과장" },
  ];
  const names = (p: { nickname: string; name: string }) => [p.nickname, p.name].filter(Boolean);
  assert.equal(findByRelation(people, "와이프", names)?.id, "1");
  assert.equal(findByRelation(people, "장모", names)?.id, "2");
  assert.equal(findByRelation(people, "시어머니", names)?.id, "3");
  assert.equal(findByRelation(people, "김과장", names)?.id, "4");
  assert.equal(findByRelation(people, "mother-in-law", names), null); // 장모(2)·시어머니(3) 둘 다 맞아서
  assert.equal(findByRelation(people, "처제", names), null);
  assert.equal(findByRelation(people, "이 과장", names), null);
});
