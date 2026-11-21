// 메모 사진 검증(서버가 받는 사진): 앱이 폰에서 줄여 JPEG로 다시 만든 것만 받는다. 순수 함수라 서버·브라우저·시험이 같이 쓴다.
// 사진을 열어 보지 않고 바이트로 확인한다: 크기 → JPEG 시작·끝 표시 → 프레임 머리(SOF)의 가로·세로 → 범위·비율.
// 이 앱이 만든 모양이 아닌 것(다른 형식·깨진 파일·터무니없이 큰 것)은 AI에 보내기 전에 여기서 걸린다.

/** 한 번에 올릴 수 있는 사진 수 */
export const IMAGE_MAX_COUNT = 3;
/** 한 장의 크기(줄인 JPEG, 바이트) */
export const IMAGE_MAX_BYTES = 900_000;
/** 가로·세로 중 짧은 변의 아래 한도(이보다 작으면 글을 읽을 수 없다) */
export const IMAGE_MIN_SIDE = 300;
/** 긴 변의 위쪽 한도 */
export const IMAGE_MAX_SIDE = 2400;
/** 긴 변 ÷ 짧은 변 위쪽 한도(아주 긴 화면은 한 화면씩 올리게) */
export const IMAGE_MAX_RATIO = 4;
/** 폰에서 줄일 때의 긴 변 */
export const IMAGE_LONG_SIDE = 1600;

export type ImageProblem = "size" | "small" | "large" | "ratio" | "broken";

export type ImageCheck = { ok: true; bytes: number; width: number; height: number } | { ok: false; problem: ImageProblem };

/** JPEG 바이트에서 가로·세로(SOF 머리). 틀을 못 읽으면 null */
export function jpegSize(b: Uint8Array): { width: number; height: number } | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 3 < b.length) {
    if (b[i] !== 0xff) return null;
    while (b[i] === 0xff && i < b.length - 1) i++; // 채움 바이트
    const marker = b[i]!;
    i++;
    // 알맹이(SOS)나 끝(EOI)까지 틀 머리가 없으면 깨진 파일
    if (marker === 0xd9 || marker === 0xda) return null;
    // 길이 없는 표시
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (i + 1 >= b.length) return null;
    const len = (b[i]! << 8) | b[i + 1]!;
    if (len < 2) return null;
    const sof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (sof) {
      if (i + 7 >= b.length || b[i + 2] !== 8) return null; // 정밀도 8비트만
      const height = (b[i + 3]! << 8) | b[i + 4]!;
      const width = (b[i + 5]! << 8) | b[i + 6]!;
      const comps = b[i + 7]!;
      if (!width || !height || (comps !== 1 && comps !== 3)) return null;
      return { width, height };
    }
    i += len;
  }
  return null;
}

/** 사진 한 장(JPEG 바이트)을 확인한다 */
export function checkJpegBytes(bytes: Uint8Array): ImageCheck {
  if (bytes.length > IMAGE_MAX_BYTES) return { ok: false, problem: "size" };
  // JPEG는 FFD8로 시작해 FFD9로 끝난다(끝이 잘린 파일은 깨진 것)
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) return { ok: false, problem: "broken" };
  const size = jpegSize(bytes);
  if (!size) return { ok: false, problem: "broken" };
  const short = Math.min(size.width, size.height);
  const long = Math.max(size.width, size.height);
  if (short < IMAGE_MIN_SIDE) return { ok: false, problem: "small" };
  if (long > IMAGE_MAX_SIDE) return { ok: false, problem: "large" };
  if (long / short > IMAGE_MAX_RATIO) return { ok: false, problem: "ratio" };
  return { ok: true, bytes: bytes.length, width: size.width, height: size.height };
}
