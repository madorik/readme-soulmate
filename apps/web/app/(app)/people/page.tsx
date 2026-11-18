import { PeopleView } from "@/components/pages/PeopleView";
import { loadPeople } from "@/lib/pages/people";
import { firstParams } from "@/lib/pages/routes";

// 내 사람들: 폴더 칸 + 폴더 없는 사람(끌어서 폴더에 넣는다). 오른쪽 위에 사람 더하기(직접 적기)와 선택(사람을 골라 메뉴 고르기·선물 고르기)
export default async function People({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <PeopleView {...await loadPeople({ params: {}, searchParams: firstParams(await searchParams) })} />;
}
