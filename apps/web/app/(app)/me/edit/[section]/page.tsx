import { MeEditSectionView } from "@/components/pages/MeEditSectionView";
import { loadMeEditSection } from "@/lib/pages/me";

export default async function EditSection({ params }: { params: Promise<{ section: string }> }) {
  return <MeEditSectionView {...await loadMeEditSection({ params: await params, searchParams: {} })} />;
}
