import { PersonEditView } from "@/components/pages/PersonEditView";
import { loadPersonEdit } from "@/lib/pages/person-edit";
import { firstParams } from "@/lib/pages/routes";

// 사람 정보 수정: 모든 항목을 한 목록에. 누르면 그 자리에서 펼쳐 고치고 바로 저장된다(나에 대한 기록과 같은 모양)
export default async function EditPerson({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <PersonEditView {...await loadPersonEdit({ params: await params, searchParams: firstParams(await searchParams) })} />;
}
