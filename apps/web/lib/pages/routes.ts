// 화면 데이터 읽기(lib/pages/*.ts)가 받는 것: 주소 값(params)과 쿼리(searchParams). 페이지(app/…/page.tsx)가 Next가 준 값을 이 모양으로 넘긴다

export type PageInput = { params: Record<string, string>; searchParams: Record<string, string | undefined> };

/** Next 페이지가 받은 searchParams(값이 배열일 수도 있다)를 한 값씩으로 */
export function firstParams(sp: Record<string, string | string[] | undefined>): Record<string, string | undefined> {
  return Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
}
