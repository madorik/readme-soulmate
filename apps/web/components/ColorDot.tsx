// 좋아하는 색 동그라미. 하양은 테두리를 두르고, 고르면 바깥에 강조 테두리와 안에 체크(밝은 색엔 남색, 짙은 색엔 흰색)

function isLight(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 165;
}

export function ColorDot({ hex, size = 44, on = false }: { hex: string; size?: number; on?: boolean }) {
  const white = hex.toUpperCase() === "#FFFFFF";
  const light = isLight(hex);
  const rings = [white ? "inset 0 0 0 2px #1F2340" : light ? "inset 0 0 0 1px rgba(31,35,64,0.12)" : "", on ? "0 0 0 3px #fff, 0 0 0 5.5px var(--color-accent)" : ""].filter(Boolean);
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full transition-shadow"
      style={{ width: size, height: size, background: hex, boxShadow: rings.length ? rings.join(", ") : undefined }}
    >
      {on ? (
        <svg width={Math.round(size * 0.42)} height={Math.round(size * 0.42)} viewBox="0 0 24 24" fill="none" stroke={light ? "#1F2340" : "#FFFFFF"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      ) : null}
    </span>
  );
}
