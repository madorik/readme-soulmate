import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { MAX_LISTEN_MS, NO_SPEECH_MS, SILENCE_MS, startListenGuard, type StopReason } from "../listen-guard";

// 시간은 가짜로 흘린다(tick). 실제로 기다리지 않는다
beforeEach(() => mock.timers.enable({ apis: ["setTimeout"] }));
afterEach(() => mock.timers.reset());

function make() {
  const stops: StopReason[] = [];
  const g = startListenGuard({ onStop: (r) => stops.push(r) });
  return { g, stops };
}

test("기준값: 말한 뒤 1.8초, 아무 말 없으면 8초, 한 번에 60초", () => {
  assert.equal(SILENCE_MS, 1800);
  assert.equal(NO_SPEECH_MS, 8000);
  assert.equal(MAX_LISTEN_MS, 60_000);
});

test("말소리가 들어온 뒤 새 결과가 1.8초 없으면 멈춘다(한 번만)", () => {
  const { g, stops } = make();
  g.heard("엄마는");
  mock.timers.tick(SILENCE_MS - 1);
  assert.deepEqual(stops, []);
  mock.timers.tick(1);
  assert.deepEqual(stops, ["silence"]);
  // 멈춘 뒤에는 더 알리지 않는다
  g.heard("엄마는 수국을");
  mock.timers.tick(MAX_LISTEN_MS);
  assert.deepEqual(stops, ["silence"]);
});

test("새 결과가 들어올 때마다 1.8초를 다시 센다", () => {
  const { g, stops } = make();
  g.heard("엄마는");
  mock.timers.tick(1500);
  g.heard("엄마는 수국을");
  mock.timers.tick(1500);
  g.heard("엄마는 수국을 좋아해");
  mock.timers.tick(1500);
  assert.deepEqual(stops, [], "말이 이어지는 동안은 멈추지 않는다");
  mock.timers.tick(300);
  assert.deepEqual(stops, ["silence"]);
});

test("같은 글이 다시 오거나 빈 글은 새 말소리가 아니다(기다리는 시간을 늘리지 않는다)", () => {
  const { g, stops } = make();
  g.heard("엄마는");
  mock.timers.tick(1000);
  g.heard("엄마는");
  g.heard("   ");
  mock.timers.tick(800);
  assert.deepEqual(stops, ["silence"]);
});

test("시작하고 8초 동안 아무 말이 없으면 멈춘다", () => {
  const { g, stops } = make();
  mock.timers.tick(NO_SPEECH_MS - 1);
  assert.deepEqual(stops, []);
  mock.timers.tick(1);
  assert.deepEqual(stops, ["no-speech"]);
  g.heard("뒤늦은 말");
  mock.timers.tick(MAX_LISTEN_MS);
  assert.deepEqual(stops, ["no-speech"]);
});

test("빈 결과만 오면 아직 말이 없는 것이라 8초 뒤에 멈춘다", () => {
  const { g, stops } = make();
  mock.timers.tick(5000);
  g.heard("");
  mock.timers.tick(2999);
  assert.deepEqual(stops, []);
  mock.timers.tick(1);
  assert.deepEqual(stops, ["no-speech"]);
});

test("말이 한 번 들어오면 8초 규칙은 끝나고 1.8초 규칙으로 바뀐다", () => {
  const { g, stops } = make();
  mock.timers.tick(7000);
  g.heard("아빠는 낚시를");
  mock.timers.tick(1799);
  assert.deepEqual(stops, []);
  mock.timers.tick(1);
  assert.deepEqual(stops, ["silence"]);
});

test("말이 끊이지 않아도 한 번에 60초까지만 듣는다", () => {
  const { g, stops } = make();
  for (let s = 1; s <= 70; s++) {
    g.heard(`말 ${s}`);
    mock.timers.tick(1000);
  }
  assert.deepEqual(stops, ["max"]);
});

test("dispose하면 타이머가 모두 꺼져 아무것도 알리지 않는다(직접 멈추거나 화면을 떠날 때)", () => {
  const a = make();
  a.g.heard("엄마는");
  a.g.dispose();
  mock.timers.tick(MAX_LISTEN_MS * 2);
  assert.deepEqual(a.stops, []);

  const b = make();
  b.g.dispose();
  mock.timers.tick(MAX_LISTEN_MS * 2);
  assert.deepEqual(b.stops, []);
});

test("기준값을 바꿔 쓸 수 있다", () => {
  const stops: StopReason[] = [];
  const g = startListenGuard({ onStop: (r) => stops.push(r), silenceMs: 500, noSpeechMs: 900, maxMs: 2000 });
  mock.timers.tick(900);
  assert.deepEqual(stops, ["no-speech"]);
  const h = startListenGuard({ onStop: (r) => stops.push(r), silenceMs: 500, noSpeechMs: 900, maxMs: 2000 });
  h.heard("말");
  mock.timers.tick(500);
  assert.deepEqual(stops, ["no-speech", "silence"]);
  g.dispose();
});
