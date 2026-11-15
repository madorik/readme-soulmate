/** 작은 물방울(가운데 기억해 두기 버튼): 말로 적기 화면의 큰 물방울과 같은 유리 물방울을 작게. 천천히 출렁인다(움직임 줄이기면 멈춤) */
export function DropOrb({ size = 62 }: { size?: number }) {
  return (
    <span aria-hidden="true" className="relative block" style={{ width: size, height: size }}>
      <span
        className="drop-orb absolute inset-0 overflow-hidden"
        style={{
          borderRadius: "50%",
          background: "radial-gradient(circle at 50% 46%, rgba(255,255,255,0.55) 0%, rgba(214,240,255,0.45) 40%, rgba(140,200,240,0.75) 76%, rgba(70,145,215,0.95) 100%)",
          boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.8), inset 0 ${size * 0.08}px ${size * 0.14}px rgba(40,110,180,0.25), inset 0 -${size * 0.1}px ${size * 0.16}px rgba(255,255,255,0.8), 0 ${size * 0.12}px ${size * 0.2}px -${size * 0.1}px rgba(30,90,160,0.45)`,
        }}
      >
        <span className="absolute inset-0" style={{ background: "radial-gradient(ellipse 36% 24% at 66% 84%, rgba(255,255,255,0.95), rgba(255,255,255,0) 70%)" }} />
      </span>
      <span
        className="absolute"
        style={{
          left: size * 0.19,
          top: size * 0.13,
          width: size * 0.3,
          height: size * 0.16,
          borderRadius: "50%",
          background: "radial-gradient(ellipse at 50% 50%, #fff 0%, rgba(255,255,255,0.95) 30%, rgba(255,255,255,0) 62%)",
          transform: "rotate(-28deg)",
        }}
      />
      <span className="absolute rounded-full bg-white/90" style={{ left: size * 0.5, top: size * 0.12, width: size * 0.06, height: size * 0.06 }} />
    </span>
  );
}
