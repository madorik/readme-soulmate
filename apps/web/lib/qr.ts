import QRCode from "qrcode";

/** QR 한 개를 그리는 데 필요한 것: 한 변의 칸 수와 켜진 칸을 모두 이은 SVG 경로(한 칸이 1×1) */
export interface QrShape {
  size: number;
  d: string;
}

/** 글(주소)을 QR 모양으로. 서버에서 만들어 화면에는 경로만 넘긴다(브라우저에 QR 라이브러리를 싣지 않는다) */
export function qrShape(text: string): QrShape {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: "M" });
  const n = modules.size;
  let d = "";
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (modules.data[y * n + x]) d += `M${x} ${y}h1v1h-1z`;
    }
  }
  return { size: n, d };
}
