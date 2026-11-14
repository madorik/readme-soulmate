// Play 스토어 등록정보(이름·설명·연락처)와 그래픽(아이콘·그래픽 이미지·휴대폰 스크린샷)을 올린다.
//   node apps/mobile/scripts/store/listing.mjs [--text-only]
// 그래픽은 apps/mobile/store/(make-assets.mjs, store-screens.mjs로 만든다). 문구를 바꾸면 STORE.md도 같이 고친다.
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { play, withEdit } from "./play.mjs";

const STORE = fileURLToPath(new URL("../../store/", import.meta.url));
const SITE = "https://readme.watalabs.com";
const EMAIL = "watalabs.help@gmail.com";

export const LISTINGS = {
  "ko-KR": {
    title: "리드미 - 소울메이트 컨닝페이퍼",
    shortDescription: "취향·알레르기·사이즈·생일까지, 내가 고른 사람만 보는 나의 컨닝페이퍼",
    fullDescription: `말 안 해도 아는 사이처럼.

엄마가 좋아하는 꽃, 아내가 못 먹는 해산물, 아빠의 음력 생신, 단짝의 신발 사이즈.
알고 있다고 생각했는데, 막상 필요할 때는 기억이 안 나죠.

리드미는 나에 대한 컨닝페이퍼예요. 내가 직접 적고, 내가 고른 사람만 봐요.

■ 내 리드미 적기
· 좋아하는 음식과 매운맛, 싫어하는 음식
· 알레르기와 못 먹는 음식: 받는 사람 화면에 빨간 동그라미로 크게
· 옷·신발 사이즈(영어로 보는 사람에게는 미국 사이즈로도)
· 받고 싶은 선물과 위시리스트
· 생일과 기념일(양력·음력)
· 나를 닮은 아바타

■ 내 리드미 보내기
링크 하나로 배우자·애인, 가족, 친구에게 보내요. 링크는 한 사람만 7일 안에 열 수 있고, 사람마다 무엇을 보여 줄지 고를 수 있어요. 언제든 보내기를 끊을 수 있어요.

■ 리드미 부탁하기
"아빠, 이거 맞는지만 확인해 줘요." 아는 건 미리 적어서 보내면, 받은 사람은 앱을 깔지 않아도 링크에서 '맞아요'만 누르면 돼요. 나중에 가입하면 그대로 자기 리드미가 돼요.

■ 챙길 날 알림
음력 생일도 올해 양력 날짜로 바꿔서 2주 전, 1주 전, 3일 전, 당일 가운데 고른 때에 알려 드려요. 선물 고를 때는 그 사람 리드미에서 힌트를 찾아 줘요.

■ 안전하게
· 공개 프로필과 검색이 없어요
· 알레르기·사이즈·메모는 암호화해서 저장해요
· 나만 보는 메모는 상대에게 보이지 않아요
· 앱 잠금(지문·얼굴)을 켤 수 있어요
· 언제든 내 정보를 내려받고 계정을 지울 수 있어요

로그인 없이 데모로 먼저 둘러볼 수 있어요.
기기 언어에 맞춰 한국어·영어로 보여요.`,
  },
  "en-US": {
    title: "README - Soulmate Cheat Sheet",
    shortDescription: "Favorites, allergies, sizes and birthdays, seen only by the people you pick.",
    fullDescription: `Know each other without a word.

Mom's favorite flowers, the seafood your partner can't eat, Dad's lunar birthday, your best friend's shoe size.
You think you remember, until the moment you need it.

README is a cheat sheet about you. You write it yourself, and only the people you pick can see it.

■ Write your README
· Foods you love, how spicy you like it, foods you dislike
· Allergies and foods you can't eat, circled in red so nobody misses them
· Clothing and shoe sizes (with US sizes for English readers)
· Gift ideas and wishlist
· Birthday and anniversaries (solar or lunar calendar)
· An avatar that looks like you

■ Share it
Send one link to your partner, family or friends. Each link opens for one person within 7 days, and you choose what each person can see. Stop sharing any time.

■ Ask someone to fill theirs in
Write what you already know and send it. They can just tap "That's right" on the web, no app needed. If they sign up later, it becomes their own README.

■ Never miss a date
Lunar birthdays are converted to this year's date, with reminders 2 weeks, 1 week, 3 days before or on the day, whichever you choose. When it's gift time, README pulls hints from their README.

■ Private by design
· No public profiles, no search
· Allergies, sizes and notes are encrypted
· Private notes stay private
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
