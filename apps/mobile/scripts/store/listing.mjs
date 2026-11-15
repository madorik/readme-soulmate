// Play 스토어 등록정보(이름·설명·연락처)와 그래픽(아이콘·그래픽 이미지·휴대폰 스크린샷)을 올린다.
//   node apps/mobile/scripts/store/listing.mjs [--text-only]
// 그래픽은 apps/mobile/store/(make-assets.mjs, store-screens.mjs로 만든다). 문구를 바꾸면 STORE.md도 같이 고친다.
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { play, withEdit } from "./play.mjs";

const STORE = fileURLToPath(new URL("../../store/", import.meta.url));
const SITE = "https://remember-you.watalabs.com";
const EMAIL = "watalabs.help@gmail.com";

export const LISTINGS = {
  "ko-KR": {
    title: "기억해유",
    shortDescription: "소중한 사람의 작은 것까지 기억해 두고, 챙길 날을 잊지 않게",
    fullDescription: `말 안 해도 아는 사이처럼.

엄마가 좋아하는 꽃, 아내가 못 먹는 해산물, 아빠의 음력 생신, 단짝의 신발 사이즈.
알고 있다고 생각했는데, 막상 필요할 때는 기억이 안 나죠.
기억해유는 소중한 사람의 작은 것들을 대신 기억해 두는 앱이에요.

■ 말로 기억해 두기
"엄마는 해바라기 좋아해"처럼 말하면 엄마의 기록에 알아서 넣어 둬요. 처음 듣는 사람은 새로 만들고, 맞는 칸이 없으면 메모로 남겨요.

■ 사람마다 기억해 둔 것
알레르기와 못 먹는 음식, 좋아하는 음식과 매운맛, 옷·신발 사이즈, 선물 힌트, 좋아하는 것들, 생일과 기념일까지. 언제든 내가 고칠 수 있어요.

■ 모르는 건 살짝 물어보기
링크 하나만 보내면 앱이 없어도 답할 수 있어요. 아는 건 미리 적어 보내니 '맞아요'만 누르면 되고, 답장은 내 기록에 바로 들어와요.

■ 챙길 날을 잊지 않게
음력 생일도 올해 양력 날짜로 바꿔서, 2주 전·1주 전·3일 전·당일 가운데 고른 때에 알려 드려요. 선물 고를 때는 그 사람을 위한 힌트를 모아 보여 줘요.

■ 다 같이 먹을 메뉴
고른 사람들의 알레르기와 못 먹는 음식을 빼고, 다 같이 먹을 수 있는 메뉴를 골라 줘요.

■ 나만 보는 기록
· 내 사람들에 대한 기록과 메모는 나만 봐요
· 알레르기·사이즈·기념일·메모는 암호화해서 보관해요
· 앱 잠금(지문·얼굴)을 켤 수 있어요
· 언제든 내 정보를 내려받거나 계정을 지울 수 있어요

로그인 없이 '데모로 둘러보기'로 먼저 써 보세요.
기기 언어에 맞춰 한국어나 영어로 보여요.`,
  },
  "en-US": {
    title: "Remember You",
    shortDescription: "Remember the little things about the people you love, and never miss their day.",
    fullDescription: `Know each other without a word.

Mom's favorite flowers, the seafood your partner can't eat, Dad's lunar birthday, your best friend's shoe size.
You think you remember, until the moment you need it.
Remember You keeps the little things about the people you love, so you can care for them just right.

■ Just say it
Say something like "Mom loves sunflowers" and it goes straight into Mom's record. New people are added for you, and anything that doesn't fit a field is kept as a note.

■ What you remember about each person
Allergies and foods they can't eat, favorite foods and spice level, clothing and shoe sizes, gift hints, favorites, birthdays and anniversaries. Edit anything any time.

■ Not sure? Just ask
Send one link and they can answer on the web, no app needed. What you already know is filled in, so they just tap "That's right", and the reply lands in your records.

■ Never miss a special day
Lunar birthdays are converted to this year's date, with reminders 2 weeks, 1 week, 3 days before or on the day, whichever you choose. When it's gift time, you get hints for that person.

■ A menu everyone can enjoy
Pick people and get dishes that avoid everyone's allergies and foods they won't eat.

■ Only for you
· Your records and notes about people are visible only to you
· Allergies, sizes, dates and notes are encrypted
· Optional app lock (fingerprint or face)
· Download your data or delete your account any time

Try the demo first, no sign-in needed.
Shown in Korean or English to match your device.`,
  },
};

const textOnly = process.argv.includes("--text-only");
const png = (p) => readFileSync(`${STORE}${p}`);

const { commit } = await withEdit(async (e) => {
  await play("PUT", `${e}/details`, { defaultLanguage: "ko-KR", contactEmail: EMAIL, contactWebsite: SITE });
  for (const [language, l] of Object.entries(LISTINGS)) {
    for (const [k, v, max] of [
      ["title", l.title, 30],
      ["shortDescription", l.shortDescription, 80],
      ["fullDescription", l.fullDescription, 4000],
    ]) {
      if ([...v].length > max) throw new Error(`${language} ${k} ${[...v].length} > ${max}`);
    }
    await play("PUT", `${e}/listings/${language}`, { language, ...l });
    console.log("listing", language);
    if (textOnly) continue;
    const dir = language === "ko-KR" ? "ko" : "en";
    await play("POST", `${e}/listings/${language}/icon`, png("icon-512.png"), { upload: true, contentType: "image/png" });
    await play("DELETE", `${e}/listings/${language}/featureGraphic`).catch(() => {});
    await play("POST", `${e}/listings/${language}/featureGraphic`, png("feature-1024x500.png"), { upload: true, contentType: "image/png" });
    await play("DELETE", `${e}/listings/${language}/phoneScreenshots`).catch(() => {});
    for (const f of readdirSync(`${STORE}screens/${dir}`).filter((f) => f.endsWith(".png")).sort()) {
      await play("POST", `${e}/listings/${language}/phoneScreenshots`, png(`screens/${dir}/${f}`), { upload: true, contentType: "image/png" });
    }
    console.log("images", language);
  }
});
console.log("commit", commit);
