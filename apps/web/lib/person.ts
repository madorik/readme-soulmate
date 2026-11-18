// 사람 이름(서버·화면이 같이 쓴다. 서버 전용 모듈을 들이지 않는다)
import type { Person } from "./data";

/** 부를 이름: 내가 정한 부르는 말이 있으면 그것, 없으면 그 사람 이름 */
export function displayName(p: Pick<Person, "name" | "nickname">): string {
  return p.nickname || p.name;
}
