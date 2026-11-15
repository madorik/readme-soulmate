import type { T } from "@/lib/i18n";
import { CakeMark } from "./EventArt";
import { Icon } from "./marks";
import { Mascot } from "./Mascot";

// 로그인 화면 그림: 망고 해 위에 리디가 떠 있고, 둘레에 기억해 둔 쪽지들이 차례로 붙는다(내용은 데모 샘플과 같은 이야기)

const INK = "#1F2340";

/** 수국 한 송이(작은 꽃잎 다섯 장) */
function Hydrangea({ size = 18 }: { size?: number }) {
  const petals = [0, 72, 144, 216, 288].map((deg) => {
    const r = (deg * Math.PI) / 180;
    return { cx: 9 + 4.1 * Math.sin(r), cy: 9 - 4.1 * Math.cos(r) };
  });
  return (
    <svg viewBox="0 0 18 18" width={size} height={size} aria-hidden="true" className="block shrink-0">
      {petals.map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r="3.3" fill="#C9D6FF" stroke={INK} strokeWidth="1.2" />
      ))}
      <circle cx="9" cy="9" r="2" fill="#FFC23D" stroke={INK} strokeWidth="1.1" />
    </svg>
  );
}

function Sparkle({ size, color, className = "", delay }: { size: number; color: string; className?: string; delay: string }) {
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} aria-hidden="true" className={`login-pop absolute ${className}`} style={{ animationDelay: delay }}>
      <path d="M6 0C6.5 4 8 5.5 12 6 8 6.5 6.5 8 6 12 5.5 8 4 6.5 0 6 4 5.5 5.5 4 6 0Z" fill={color} />
    </svg>
  );
}

/** 쪽지 한 장: 흰 종이 + 위에 반투명 망고 테이프. tilt만큼 기울어 붙는다 */
function Note({ tilt, delay, className, children }: { tilt: string; delay: string; className: string; children: React.ReactNode }) {
  return (
    <div className={`login-note ${className}`} style={{ "--tilt": tilt, animationDelay: delay } as React.CSSProperties}>
      <span className="absolute -top-[7px] left-1/2 h-[14px] w-[40px] -translate-x-1/2 -rotate-3 rounded-[2px] bg-[rgba(255,194,61,0.55)]" />
      {children}
    </div>
  );
}

export function LoginHero({ t }: { t: T }) {
  return (
    <div aria-hidden="true" className="relative mx-auto h-[318px] w-full max-w-[340px] select-none">
      {/* 쪽지들이 도는 점선 궤도와 망고 해(화면의 망고 덩어리는 이것 하나) */}
      <svg viewBox="0 0 280 280" className="login-fade absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2" style={{ animationDelay: "0.1s" }}>
        <circle cx="140" cy="140" r="138" fill="none" stroke="#CDD1DC" strokeWidth="1.5" strokeDasharray="1 7" strokeLinecap="round" />
      </svg>
      <div className="absolute left-1/2 top-1/2 h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2">
        <div className="login-sun grad-hero h-full w-full rounded-full shadow-[inset_0_-10px_30px_rgba(224,154,18,0.18)]" />
      </div>

      {/* 리디: 살짝 떠서 천천히 오르내리고, 아래 그림자가 같이 줄었다 늘었다 한다 */}
      <span className="login-shadow absolute left-1/2 top-[calc(50%+50px)] h-[10px] w-[68px] rounded-[50%] bg-[rgba(143,90,0,0.16)]" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[58%]">
        <div className="login-pop" style={{ animationDelay: "0.15s" }}>
          <div className="login-bob">
            <Mascot size={122} />
          </div>
        </div>
      </div>

      <Note tilt="-7deg" delay="0.4s" className="left-0 top-[14px] flex items-center gap-2">
        <CakeMark size={30} />
        <span className="whitespace-nowrap text-[13.5px] font-bold">{t("start.example")}</span>
        <span className="grad num rounded-full px-2 py-[4px] text-[12px] font-bold">D-7</span>
      </Note>

      <Note tilt="6deg" delay="0.58s" className="right-0 top-[86px]">
        <span className="block text-[11px] font-medium text-muted">{t("login.noteFriend")}</span>
        <span className="mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-[13.5px] font-bold text-red">
          <Icon name="alert" size={15} strokeWidth={2.1} />
          {t("login.noteAllergy")}
        </span>
      </Note>

      <Note tilt="-3deg" delay="0.76s" className="bottom-[8px] left-[5%]">
        <span className="block text-[11px] font-medium text-muted">{t("login.noteMom")}</span>
        <span className="mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-[13.5px] font-bold">
          <Hydrangea size={17} />
          {t("login.noteFlower")}
        </span>
      </Note>

      <Sparkle size={16} color="#FFC23D" delay="0.9s" className="right-[16%] top-[30px]" />
      <Sparkle size={10} color={INK} delay="1s" className="bottom-[46px] right-[9%]" />
      <Sparkle size={9} color="#FFC23D" delay="1.05s" className="left-[9%] top-[118px]" />
    </div>
  );
}
