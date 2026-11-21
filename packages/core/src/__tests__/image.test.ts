import assert from "node:assert/strict";
import { test } from "node:test";
import { IMAGE_MAX_BYTES, checkJpegBytes, jpegSize } from "../index";

/** 열어 볼 수 없는 가짜 JPEG: 시작·틀 머리(SOF0)·알맹이 시작(SOS)·끝만 갖춘 바이트 */
function fakeJpeg(width: number, height: number, opts: { comps?: number; precision?: number; pad?: number; noEnd?: boolean } = {}): Uint8Array {
  const comps = opts.comps ?? 3;
  const sof = [0xff, 0xc0, 0x00, 8 + comps * 3, opts.precision ?? 8, height >> 8, height & 255, width >> 8, width & 255, comps, ...Array.from({ length: comps * 3 }, (_, i) => (i % 3 === 0 ? i / 3 + 1 : i % 3 === 1 ? 0x11 : 0))];
  const app0 = [0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00];
  const sos = [0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00];
  return Uint8Array.from([0xff, 0xd8, ...app0, ...sof, ...sos, ...Array.from({ length: opts.pad ?? 20 }, () => 0x55), ...(opts.noEnd ? [] : [0xff, 0xd9])]);
}

test("사진 가로·세로 읽기: SOF 머리에서, 깨진 것은 null", () => {
  assert.deepEqual(jpegSize(fakeJpeg(1200, 800)), { width: 1200, height: 800 });
  assert.deepEqual(jpegSize(fakeJpeg(640, 640, { comps: 1 })), { width: 640, height: 640 });
  assert.equal(jpegSize(Uint8Array.from([1, 2, 3, 4, 5])), null);
  assert.equal(jpegSize(fakeJpeg(10, 10, { precision: 12 })), null, "8비트만");
  assert.equal(jpegSize(fakeJpeg(0, 500)), null);
});

test("사진 한 장 확인: 이 앱이 줄여 만든 JPEG만 통과", () => {
  assert.deepEqual(checkJpegBytes(fakeJpeg(1200, 900)), { ok: true, bytes: fakeJpeg(1200, 900).length, width: 1200, height: 900 });
  // 이름만 사진인 다른 파일(PNG·글·실행 파일·PDF)은 JPEG 표시가 없어 깨진 것
  for (const bytes of [Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]), new TextEncoder().encode("hello world, not an image"), Uint8Array.from([0x4d, 0x5a, 0x90, 0, 3, 0, 0, 0]), new TextEncoder().encode("%PDF-1.4 fake")]) {
    assert.deepEqual(checkJpegBytes(bytes), { ok: false, problem: "broken" });
  }
  assert.deepEqual(checkJpegBytes(new Uint8Array(0)), { ok: false, problem: "broken" });
  // 끝이 잘린 파일
  assert.deepEqual(checkJpegBytes(fakeJpeg(1200, 900, { noEnd: true })), { ok: false, problem: "broken" });
});

test("사진 한 장 확인: 크기·해상도·비율 범위", () => {
  assert.deepEqual(checkJpegBytes(fakeJpeg(1200, 900, { pad: IMAGE_MAX_BYTES })), { ok: false, problem: "size" });
  assert.deepEqual(checkJpegBytes(fakeJpeg(200, 900)), { ok: false, problem: "small" });
  assert.deepEqual(checkJpegBytes(fakeJpeg(299, 299)), { ok: false, problem: "small" });
  assert.equal(checkJpegBytes(fakeJpeg(300, 300)).ok, true);
  assert.deepEqual(checkJpegBytes(fakeJpeg(2401, 1200)), { ok: false, problem: "large" });
  assert.deepEqual(checkJpegBytes(fakeJpeg(400, 1700)), { ok: false, problem: "ratio" });
  assert.equal(checkJpegBytes(fakeJpeg(500, 2000)).ok, true, "딱 네 배까지");
  assert.deepEqual(checkJpegBytes(fakeJpeg(500, 2001)), { ok: false, problem: "ratio" });
});
