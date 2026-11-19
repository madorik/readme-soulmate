import { type AvatarConfig, sanitizeAvatar } from "@readme/core";
import type { T } from "@/lib/i18n";
import { Avatar } from "./Avatar";
import { Heart, Sparkle, Star } from "./diary";
import { Icon } from "./marks";

// 로그인 그림: 망고 해 앞에 컨닝페이퍼 한 장(꼭 기억할 것 세 줄, 데모 샘플 사람들과 같은 이야기), 옆에서 눈 둘이 흘끔 본다(앱 아이콘과 같은 눈)

const INK = "#1F2340";
// 데모 샘플(lib/demo.ts)과 같은 얼굴
const MOM = sanitizeAvatar({ hair: "perm", face: "round", body: "cardigan", item: "earrings", bg: "rose", cloth: "#E7D3B0", hairColor: "#5A4334", skin: "#FFF1E6" });
const BESTIE = sanitizeAvatar({ hair: "pony", face: "oval", body: "zip", item: "cap", bg: "water", cloth: "#34B36A", hairColor: "#D9A15B" });
const WIFE = sanitizeAvatar({ hair: "wave", face: "vline", body: "turtle", item: "necklace", bg: "sky", cloth: "#FF9DB0", hairColor: "#1F2340" });

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
      <Avatar config={face} size={30} label={who} />
      <span className="flex min-w-0 flex-col">
        <span className="text-[13px] leading-[1.1] text-muted">{who}</span>
        <span className="text-[16px] leading-[1.2]">{children}</span>
      </span>
    </div>
  );
}

export function LoginHero({ t }: { t: T }) {
  return (
    <div aria-hidden="true" className="relative mx-auto h-[300px] w-full max-w-[342px] select-none">
      {/* 망고 해(화면의 망고 덩어리는 이것 하나): 남색 테두리 + 안쪽 아래 그림자 */}
      <div className="absolute right-[4px] top-[14px] h-[228px] w-[228px]">
        <div
          className="login-sun h-full w-full rounded-full border-2 border-ink shadow-[inset_0_-10px_24px_rgba(224,154,18,0.25)]"
          style={{ background: "radial-gradient(circle at 36% 30%, #FFE08A 0%, #FFC23D 100%)" }}
        />
      </div>

      {/* 컨닝페이퍼: 종이색 + 망고로 접힌 귀퉁이 */}
      {/* 종이 높이는 글 길이를 따른다(영어는 두 줄이 되기도). 선 굵기는 늘어나도 그대로 */}
      <div className="login-paper right-0 top-[22px] w-[206px]" style={{ "--tilt": "5deg", animationDelay: "0.35s" } as React.CSSProperties}>
        <svg viewBox="0 0 206 190" preserveAspectRatio="none" className="absolute inset-0 h-full w-full drop-shadow-[0_12px_16px_rgba(31,35,64,0.2)]">
          <path d="M14 2 H174 L204 32 V176 Q204 188 192 188 H14 Q2 188 2 176 V14 Q2 2 14 2 Z" fill="#FFFDF7" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <path d="M174 2 V21.5 Q174 32 184.5 32 H204 Z" fill="#FFC23D" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="relative flex flex-col pb-3 pl-4 pr-3.5 pt-3.5">
          <span className="flex items-center gap-1 text-[16px] text-accent">
            <Heart size={15} inline />
            {t("login.paperTitle")}
          </span>
          <div className="mt-1 flex flex-col">
            <Row face={MOM} who={t("login.noteMom")} first>
              {t("login.noteFlower")}
            </Row>
            <Row face={BESTIE} who={t("login.noteFriend")}>
              <span className="flex items-center gap-[3px] text-red">
                <Icon name="alert" size={14} strokeWidth={2.3} className="shrink-0" />
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

      {/* 낙서: 별·하트·반짝이 */}
      <Star size={22} rotate={-12} className="login-fade left-[104px] top-[46px]" />
      <Heart size={24} rotate={-14} className="login-fade bottom-[38px] left-[14px]" />
      <Sparkle size={18} className="login-fade bottom-5 right-3" />
    </div>
  );
}

/** 시작·로그인 화면 제목: *별표* 사이 낱말에 형광펜(컨닝페이퍼) */
export function HeroHeadline({ text, className = "" }: { text: string; className?: string }) {
  const parts = text.split("*");
  return (
    <h1 className={`hero-rise headline whitespace-pre-line text-[34px] leading-[1.25] ${className}`} style={{ animationDelay: "0.2s" }}>
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
