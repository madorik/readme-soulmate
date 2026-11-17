import assert from "node:assert/strict";
import { test } from "node:test";
import { startDictation, type NativeSpeech } from "../speech";

// 가짜 기기 플러그인: 받아 적은 말·멈춤을 흉내 낸다. stopFinal을 주면 stop()을 부른 뒤 그만큼 지나 최종 결과를 보낸다(안드로이드 onResults·iOS isFinal)
function fakePlugin(stopFinal?: { text: string; after: number }) {
  const fns: Record<string, ((d: { matches?: string[]; status?: string }) => void)[]> = {};
  let stops = 0;
  let removed = 0;
  const plugin: NativeSpeech = {
    available: async () => ({ available: true }),
    requestPermissions: async () => ({ speechRecognition: "granted" }),
    start: async () => undefined,
    stop: () => {
      stops += 1;
      if (stopFinal) setTimeout(() => emit("partialResults", { matches: [stopFinal.text] }), stopFinal.after);
      return new Promise<void>(() => {}); // 안드로이드처럼 답이 없다
    },
    addListener: async (event, fn) => {
      (fns[event] ??= []).push(fn);
      return {
        remove: async () => {
          removed += 1;
          fns[event] = (fns[event] ?? []).filter((f) => f !== fn);
        },
      };
    },
  };
  const emit = (event: string, d: { matches?: string[]; status?: string }) => (fns[event] ?? []).forEach((f) => f(d));
  return { plugin, emit, stops: () => stops, removed: () => removed };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const opts = { language: "ko-KR", quietMs: 120, maxMs: 600 };

test("받아쓰기: 말이 끝나 멈춘 뒤에 오는 최종 결과(문장 끝)까지 받아 적는다", async () => {
  const f = fakePlugin();
  const seen: string[] = [];
  let done: string | null = null;
  let settling = 0;
  await startDictation(f.plugin, { ...opts, onText: (t) => seen.push(t), onSettling: () => settling++, onDone: (t) => (done = t) });
  f.emit("partialResults", { matches: ["엄마는 수국을"] });
  f.emit("listeningState", { status: "stopped" }); // 안드로이드 onEndOfSpeech
  await wait(80);
  assert.equal(done, null, "멈춤만으로는 끝내지 않는다");
  f.emit("partialResults", { matches: ["엄마는 수국을 좋아하고 트로트를 즐겨 들어"] }); // onResults(최종)
  await wait(300);
  assert.equal(done, "엄마는 수국을 좋아하고 트로트를 즐겨 들어");
  assert.equal(settling, 1);
  assert.equal(f.removed(), 2, "끝나면 듣기를 뗀다");
  assert.deepEqual(seen, ["엄마는 수국을", "엄마는 수국을 좋아하고 트로트를 즐겨 들어"]);
});

test("받아쓰기: 멈춤을 누르면 stop()을 부르고, 그 뒤에 오는 최종 결과까지 기다린다(두 번 멈춰도 한 번만 끝난다)", async () => {
  const f = fakePlugin({ text: "아빠 생일에 등산화 사 드리기", after: 150 });
  const done: string[] = [];
  const d = await startDictation(f.plugin, { ...opts, onText: () => {}, onDone: (t) => done.push(t) });
  f.emit("partialResults", { matches: ["아빠 생일에 등산"] });
  d.stop();
  f.emit("listeningState", { status: "stopped" });
  d.stop();
  await wait(450);
  assert.deepEqual(done, ["아빠 생일에 등산화 사 드리기"]);
  assert.equal(f.stops(), 1);
});

test("받아쓰기: 최종 결과가 끝내 안 오면 길어야 maxMs 뒤에 받은 데까지로 끝내고, cancel은 끝내지 않고 버린다", async () => {
  const f = fakePlugin();
  let done: string | null = null;
  await startDictation(f.plugin, { ...opts, onText: () => {}, onDone: (t) => (done = t) });
  f.emit("partialResults", { matches: ["아내는 새우 알레르기"] });
  f.emit("listeningState", { status: "stopped" });
  await wait(400);
  assert.equal(done, null);
  await wait(400);
  assert.equal(done, "아내는 새우 알레르기");

  const g = fakePlugin();
  let gone: string | null = null;
  const d = await startDictation(g.plugin, { ...opts, onText: () => {}, onDone: (t) => (gone = t) });
  g.emit("partialResults", { matches: ["지우기"] });
  d.cancel();
  g.emit("listeningState", { status: "stopped" });
  await wait(700);
  assert.equal(gone, null);
  assert.equal(g.stops(), 1);
});

test("받아쓰기: 시작이 실패하면 듣기를 떼고 오류를 넘긴다", async () => {
  const f = fakePlugin();
  f.plugin.start = async () => {
    throw new Error("denied");
  };
  await assert.rejects(startDictation(f.plugin, { ...opts, onText: () => {}, onDone: () => {} }), /denied/);
  assert.equal(f.removed(), 2);
});
