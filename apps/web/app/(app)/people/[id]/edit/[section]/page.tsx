import { PersonEditSectionView } from "@/components/pages/PersonEditSectionView";
import { loadPersonEditSection } from "@/lib/pages/person-edit-section";

// 사람 기록의 항목 하나 고치기(내 리드미 편집과 같은 편집기). 답받은 항목도 고친다
export default async function EditPersonSection({ params }: { params: Promise<{ id: string; section: string }> }) {
  return <PersonEditSectionView {...await loadPersonEditSection({ params: await params, searchParams: {} })} />;
}
