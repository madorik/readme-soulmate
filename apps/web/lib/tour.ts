import "server-only";
import { aiConfigured } from "./ai";

// 가입 직후 직접 해 보는 체험: ① 말로·글로 적기(가운데 버튼이 여는 페이지) → ② 물어보기 → 홈. AI가 꺼져 말로 적기가 없으면 물어보기만.
// 어느 단계인지는 주소의 ?tour=가 알리고(있으면 체험 모드), 각 화면이 위에 안내와 건너뛰기를 붙인다

/** 체험의 첫 페이지 주소 */
export function tourStart(): string {
  return `${aiConfigured() ? "/voice" : "/request"}?tour=1`;
}

/** 체험이 몇 단계인지(말로 적기 + 물어보기, AI가 꺼지면 물어보기만) */
export function tourTotal(): number {
  return aiConfigured() ? 2 : 1;
}
