import { PersonNewView } from "@/components/pages/PersonNewView";
import { loadPersonNew } from "@/lib/pages/person-new";
import { firstParams } from "@/lib/pages/routes";

// 직접 적어 두기: 이름(부르는 말)만 받고 빈 카드를 만든다. 내용은 그 사람 화면에서 항목별로 적는다
export default async function NewPerson({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <PersonNewView {...await loadPersonNew({ params: {}, searchParams: firstParams(await searchParams) })} />;
}
