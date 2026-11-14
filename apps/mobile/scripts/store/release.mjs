// 앱 빌드 올리기(Play). node apps/mobile/scripts/store/release.mjs <aab | 버전 코드> [트랙=alpha] [출시 메모(한국어)] [출시 메모(영어)]
// alpha = 비공개 테스트(Closed testing - Alpha), internal = 내부 테스트. 이미 올린 빌드를 다른 트랙에 낼 때는 AAB 대신 버전 코드를 준다.
// 앱이 아직 한 번도 공개되지 않았으면 Play가 'draft' 출시만 받으므로 그때는 초안으로 만든다(콘솔에서 '검토를 위해 전송').
// R8 mapping.txt도 같이 올린다(충돌 기록을 원래 이름으로).
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { play, withEdit } from "./play.mjs";

const [build, track = "alpha", notes = "", notesEn = ""] = process.argv.slice(2);
if (!build) {
  console.error("usage: release.mjs <aab | versionCode> [track=alpha] [notes]");
  process.exit(1);
}
const isCode = /^\d+$/.test(build);
const MAPPING = fileURLToPath(new URL("../../android/app/build/outputs/mapping/release/mapping.txt", import.meta.url));

async function commit(status) {
  return withEdit(async (e) => {
    let code = build;
    if (!isCode) {
      const bundle = await play("POST", `${e}/bundles`, readFileSync(build), { upload: true, contentType: "application/octet-stream" });
      console.log("bundle", bundle.versionCode, bundle.sha256);
      code = String(bundle.versionCode);
      if (existsSync(MAPPING)) {
        await play("POST", `${e}/apks/${code}/deobfuscationFiles/proguard`, readFileSync(MAPPING), { upload: true, contentType: "application/octet-stream" });
        console.log("mapping", MAPPING);
      }
    }
    const releaseNotes = [notes ? { language: "ko-KR", text: notes } : null, notesEn ? { language: "en-US", text: notesEn } : null].filter(Boolean);
    await play("PUT", `${e}/tracks/${track}`, { track, releases: [{ versionCodes: [code], status, ...(releaseNotes.length ? { releaseNotes } : {}) }] });
    console.log(track, code, status);
  });
}

try {
  console.log("commit", (await commit("completed")).commit);
} catch (err) {
  if (!/draft/i.test(String(err))) throw err;
  console.log("앱이 아직 초안 상태라 초안 출시로 만든다");
  console.log("commit", (await commit("draft")).commit);
}
