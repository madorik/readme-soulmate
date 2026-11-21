// 메모 사진 준비(브라우저에서만): 고른 사진을 서버에 보내기 전에 여기서 걸러 내고 줄인다.
//  ① 형식(JPG·PNG·WebP)과 원본 크기 ② 열어 보기(깨진 파일·이름만 사진인 파일) ③ 가로·세로(너무 작거나 너무 긴 것) ④ 내용이 거의 없는 사진(빈 화면·한 색)
//  ⑤ 긴 변 1600px로 줄여 JPEG 파일로 다시 만든다: 위치·촬영 정보(EXIF)는 이때 사라지고, 서버가 받는 모양(core checkJpegBytes)과 같은 검사를 한 번 더 거친다
import { IMAGE_LONG_SIDE, IMAGE_MAX_RATIO, IMAGE_MIN_SIDE, checkJpegBytes } from "@readme/core";

/** 원본 한 장의 크기 위쪽 한도 */
export const PICK_MAX_BYTES = 20 * 1024 * 1024;

export type PrepProblem = "type" | "big" | "unreadable" | "small" | "ratio" | "blank" | "heavy";

/** 서버에 보낼 줄인 JPEG 파일(blob)과 크기 */
export type Prepared = { ok: true; blob: Blob; width: number; height: number } | { ok: false; problem: PrepProblem };

const TYPES = ["image/jpeg", "image/png", "image/webp"];
const EXT = /\.(jpe?g|png|webp)$/i;
/** 글자가 없는 사진을 가려내는 기준: 작게 줄인 사진에서 바탕색(가운데 밝기)과 조금이라도 다른 점이 이 비율보다 적으면 내용이 거의 없는 사진.
 * 큰 화면에 글이 몇 줄뿐인 메모도 줄이면 연한 점이 되므로 기준을 아주 낮게 둔다(한 색이거나 빈 화면만 걸린다) */
const INK_MIN = 0.0005;
const INK_DELTA = 12;
const BLANK_SAMPLE = 256;
const QUALITIES = [0.85, 0.75, 0.65, 0.55];

type Source = { width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; close: () => void };

/** 사진을 연다(회전 정보를 반영). 못 열면 null */
async function open(file: File): Promise<Source | null> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { width: bmp.width, height: bmp.height, draw: (ctx, w, h) => ctx.drawImage(bmp, 0, 0, w, h), close: () => bmp.close() };
  } catch {
    // createImageBitmap이 없거나 옵션을 못 받는 브라우저
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight, draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h), close: () => URL.revokeObjectURL(url) });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

/** 내용이 거의 없는 사진인가: 작게 줄여서 바탕색(가운데 밝기)과 확 다른 점이 얼마나 되는지 본다 */
function isBlank(src: Source): boolean {
  const scale = BLANK_SAMPLE / Math.max(src.width, src.height);
  const w = Math.max(1, Math.round(src.width * scale));
  const h = Math.max(1, Math.round(src.height * scale));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  src.draw(ctx, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;
  const lum = new Uint8Array(w * h);
  const hist = new Array<number>(256).fill(0);
  for (let i = 0; i < lum.length; i++) {
    const v = Math.round(0.299 * px[i * 4]! + 0.587 * px[i * 4 + 1]! + 0.114 * px[i * 4 + 2]!);
    lum[i] = v;
    hist[v]!++;
  }
  let acc = 0;
  let median = 0;
  for (let v = 0; v < 256; v++) {
    acc += hist[v]!;
    if (acc >= lum.length / 2) {
      median = v;
      break;
    }
  }
  let ink = 0;
  for (const v of lum) if (Math.abs(v - median) > INK_DELTA) ink++;
  return ink / lum.length < INK_MIN;
}

/** 긴 변을 longSide로 줄여 JPEG로 만든다(화질을 낮춰 가며 크기 한도 안으로). 서버가 받는 모양이 아니면 null */
async function encode(src: Source, longSide: number): Promise<{ blob: Blob; width: number; height: number } | null> {
  const scale = Math.min(1, longSide / Math.max(src.width, src.height));
  const w = Math.max(1, Math.round(src.width * scale));
  const h = Math.max(1, Math.round(src.height * scale));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  // 투명한 PNG는 흰 바탕에(JPEG에는 투명이 없다)
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  src.draw(ctx, w, h);
  for (const q of QUALITIES) {
    const blob = await new Promise<Blob | null>((resolve) => c.toBlob(resolve, "image/jpeg", q));
    if (!blob) return null;
    // 서버가 받는 모양과 같은 검사(크기·JPEG 표시·가로세로)
    const r = checkJpegBytes(new Uint8Array(await blob.arrayBuffer()));
    if (r.ok) return { blob, width: r.width, height: r.height };
    if (r.problem !== "size") return null;
  }
  return null;
}

export async function prepareImage(file: File): Promise<Prepared> {
  const type = file.type || "";
  if (!(TYPES.includes(type) || (!type && EXT.test(file.name)))) return { ok: false, problem: "type" };
  if (file.size > PICK_MAX_BYTES) return { ok: false, problem: "big" };
  const src = await open(file);
  if (!src) return { ok: false, problem: "unreadable" };
  try {
    const short = Math.min(src.width, src.height);
    const long = Math.max(src.width, src.height);
    if (short < IMAGE_MIN_SIDE) return { ok: false, problem: "small" };
    if (long / short > IMAGE_MAX_RATIO) return { ok: false, problem: "ratio" };
    if (isBlank(src)) return { ok: false, problem: "blank" };
    // 너무 무거우면 한 번 더 작게
    for (const side of [IMAGE_LONG_SIDE, Math.round(IMAGE_LONG_SIDE * 0.75)]) {
      const out = await encode(src, side);
      if (out) return { ok: true, ...out };
    }
    return { ok: false, problem: "heavy" };
  } finally {
    src.close();
  }
}
