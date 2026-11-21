import { ImportView } from "@/components/pages/ImportView";
import { loadImport } from "@/lib/pages/import";
import { firstParams } from "@/lib/pages/routes";

// 메모를 긴 글 그대로 읽는 AI 호출이라 서버 동작이 오래 걸릴 수 있다(조각을 동시에 읽는다)
export const maxDuration = 60;

export default async function Import({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <ImportView {...await loadImport({ params: {}, searchParams: firstParams(await searchParams) })} />;
}
