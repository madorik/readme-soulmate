import { ImageResponse } from "next/og";
import { CATALOG_BY_ID } from "@/lib/gift-catalog";
import { readGiftCard } from "@/lib/gifts";

// 카드 링크 미리보기(카카오톡·문자): 고른 선물 사진 여덟 장을 망고색 바탕에 모은다. 글은 미리보기 제목·설명으로 따로 간다

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Gift ideas";

const TILE = 240;
const GAP = 24;

async function dataUrl(src: string): Promise<string | null> {
  try {
    const res = await fetch(src, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/jpeg";
    if (!type.startsWith("image/")) return null;
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const c = readGiftCard(decodeURIComponent((await params).token));
  const srcs = (c?.ids ?? []).map((id) => CATALOG_BY_ID.get(id)?.image).filter((x): x is string => !!x);
  const images = (await Promise.all(srcs.slice(0, 12).map(dataUrl))).filter((x): x is string => !!x).slice(0, 8);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#FFF4D6" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: GAP, width: TILE * 4 + GAP * 3, justifyContent: "center" }}>
          {images.map((src, i) => (
            <div key={i} style={{ display: "flex", width: TILE, height: TILE, borderRadius: 32, background: "#FFFFFF", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 3px #FFC23D" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} width={TILE - 36} height={TILE - 36} style={{ objectFit: "contain" }} alt="" />
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
