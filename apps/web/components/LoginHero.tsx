import { type AvatarConfig, sanitizeAvatar } from "@readme/core";
import type { T } from "@/lib/i18n";
import { Avatar } from "./Avatar";
import { Icon } from "./marks";

// 로그인 그림: 망고 해 앞에 컨닝페이퍼 한 장(꼭 기억할 것 세 줄, 데모 샘플 사람들과 같은 이야기), 옆에서 눈 둘이 흘끔 본다(앱 아이콘과 같은 눈)

const INK = "#1F2340";
// 데모 샘플(lib/demo.ts)과 같은 얼굴
const MOM = sanitizeAvatar({ hair: "perm", face: "round", body: "cardigan", item: "earrings", bg: "rose", cloth: "#E7D3B0", hairColor: "#5A4334", skin: "#FFF1E6" });
const BESTIE = sanitizeAvatar({ hair: "pony", face: "oval", body: "zip", item: "cap", bg: "water", cloth: "#34B36A", hairColor: "#D9A15B" });
const WIFE = sanitizeAvatar({ hair: "wave", face: "vline", body: "turtle", item: "necklace", bg: "sky", cloth: "#FF9DB0", hairColor: "#1F2340" });

function Sparkle({ size, color, className = "", delay }: { size: number; color: string; className?: string; delay: string }) {
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} aria-hidden="true" className={`login-pop absolute ${className}`} style={{ animationDelay: delay }}>
      <path d="M6 0C6.5 4 8 5.5 12 6 8 6.5 6.5 8 6 12 5.5 8 4 6.5 0 6 4 5.5 5.5 4 6 0Z" fill={color} />
    </svg>
  );
}

/** 오른쪽을 흘끔 보는 눈 둘: 반쯤 내린 눈꺼풀, 아래로 쏠린 눈동자, 발그레한 볼 */
function PeekingEyes() {
  return (
    <svg viewBox="0 0 140 100" width="132" height="94" className="login-blink block">
      <path d="M14 46 A24 29 0 1 0 62 46 A24 29 0 1 0 14 46 Z M72 46 A24 29 0 1 0 120 46 A24 29 0 1 0 72 46 Z" fill="#FFFFFF" stroke={INK} strokeWidth="4" />
      <path d="M34.5 52 A13 13 0 1 0 60.5 52 A13 13 0 1 0 34.5 52 Z M92.5 52 A13 13 0 1 0 118.5 52 A13 13 0 1 0 92.5 52 Z" fill={INK} />
      <path d="M46.8 47.5 A4.2 4.2 0 1 0 55.2 47.5 A4.2 4.2 0 1 0 46.8 47.5 Z M104.8 47.5 A4.2 4.2 0 1 0 113.2 47.5 A4.2 4.2 0 1 0 104.8 47.5 Z" fill="#FFFFFF" />
      <path d="M14.5 40 A24 29 0 0 1 61.5 40 Q38 46 14.5 40 Z M72.5 40 A24 29 0 0 1 119.5 40 Q96 46 72.5 40 Z" fill="#FFE08A" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M20 88 A10 5 0 1 0 40 88 A10 5 0 1 0 20 88 Z M94 88 A10 5 0 1 0 114 88 A10 5 0 1 0 94 88 Z" fill="#FF9DB0" fillOpacity="0.8" />
    </svg>
  );
}

function Row({ face, who, children, first }: { face: AvatarConfig; who: string; children: React.ReactNode; first?: boolean }) {
  return (
    <div className={`flex items-center gap-[9px] py-2 ${first ? "" : "border-t-[1.5px] border-dashed border-rule"}`}>
      <Avatar config={face} size={28} label={who} />
      <span className="flex min-w-0 flex-col">
        <span className="text-[11px] font-medium text-muted">{who}</span>
        <span className="text-[13.5px] font-bold leading-[1.3]">{children}</span>
      </span>
    </div>
  );
}

export function LoginHero({ t }: { t: T }) {
  return (
    <div aria-hidden="true" className="relative mx-auto h-[290px] w-full max-w-[340px] select-none">
      {/* 망고 해(화면의 망고 덩어리는 이것 하나) */}
      <div className="absolute right-[4px] top-[14px] h-[228px] w-[228px]">
        <div className="login-sun grad-hero h-full w-full rounded-full shadow-[inset_0_-10px_30px_rgba(224,154,18,0.18)]" />
      </div>

      {/* 컨닝페이퍼: 흰 종이 + 망고로 접힌 귀퉁이 */}
      {/* 종이 높이는 글 길이를 따른다(영어는 두 줄이 되기도). 선 굵기는 늘어나도 그대로 */}
      <div className="login-paper right-0 top-[22px] w-[196px]" style={{ "--tilt": "5deg", animationDelay: "0.35s" } as React.CSSProperties}>
        <svg viewBox="0 0 196 200" preserveAspectRatio="none" className="absolute inset-0 h-full w-full drop-shadow-[0_12px_18px_rgba(31,35,64,0.16)]">
          <path d="M14 2 H166 L194 30 V186 Q194 198 182 198 H14 Q2 198 2 186 V14 Q2 2 14 2 Z" fill="#FFFFFF" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <path d="M166 2 V19.4 Q166 30 176.6 30 H194 Z" fill="#FFC23D" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="relative flex flex-col px-4 pb-3 pr-5 pt-4">
          <span className="flex items-center gap-1 text-[12px] font-bold text-accent">
            <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
              <path d="M12 20.5 C6 16.3 3 12.8 3.6 9.3 C4.2 6 8.4 4.9 12 8.3 C15.6 4.9 19.8 6 20.4 9.3 C21 12.8 18 16.3 12 20.5 Z" fill="#FF7A8A" />
            </svg>
            {t("login.paperTitle")}
          </span>
          <div className="mt-1.5 flex flex-col">
            <Row face={MOM} who={t("login.noteMom")} first>
              {t("login.noteFlower")}
            </Row>
            <Row face={BESTIE} who={t("login.noteFriend")}>
              <span className="flex items-center gap-1 text-red">
                <Icon name="alert" size={14} strokeWidth={2.2} className="shrink-0" />
                {t("login.noteAllergy")}
              </span>
            </Row>
            <Row face={WIFE} who={t("login.noteWife")}>
              {t("login.noteCake")}
            </Row>
          </div>
        </div>
      </div>

      {/* 오른쪽 컨닝페이퍼를 흘끔 보는 눈 */}
      <div className="login-pop absolute left-0 top-[96px]" style={{ animationDelay: "0.15s" }}>
        <PeekingEyes />
      </div>

      <Sparkle size={16} color="#FFC23D" delay="0.9s" className="left-[104px] top-[58px]" />
      <Sparkle size={10} color={INK} delay="1s" className="bottom-[22px] left-[24px]" />
      <Sparkle size={9} color="#FFC23D" delay="1.05s" className="bottom-[34px] right-[2px]" />
    </div>
  );
}

/** 시작·로그인 화면 제목: *별표* 사이 낱말에 형광펜(컨닝페이퍼) */
export function HeroHeadline({ text, className = "" }: { text: string; className?: string }) {
  const parts = text.split("*");
  return (
    <h1 className={`hero-rise headline whitespace-pre-line text-[30px] ${className}`} style={{ animationDelay: "0.2s" }}>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <span key={i} className="hl">
            {p}
          </span>
        ) : (
          p
        ),
      )}
    </h1>
  );
}
