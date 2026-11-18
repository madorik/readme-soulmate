import { PersonProfileView } from "@/components/pages/PersonProfileView";
import { loadPersonProfile } from "@/lib/pages/person-profile";

// 사람 프로필: 그 사람의 얼굴과 부르는 말을 내가 꾸민다(내 프로필 고치기와 같은 화면)
export default async function PersonProfile({ params }: { params: Promise<{ id: string }> }) {
  return <PersonProfileView {...await loadPersonProfile({ params: await params, searchParams: {} })} />;
}
