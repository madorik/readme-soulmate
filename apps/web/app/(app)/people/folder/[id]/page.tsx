import { FolderView } from "@/components/pages/FolderView";
import { loadFolder } from "@/lib/pages/folder";
import { firstParams } from "@/lib/pages/routes";

// 폴더 하나: 큰 폴더 그림(든 사람 얼굴이 빼꼼) · 이름 · 몇 명, 생일 가까운 순/이름순, 목록 끝에 사람 넣기.
// 아래에서 이 폴더 사람들로 바로 선물 고르기·메뉴 고르기
export default async function FolderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <FolderView {...await loadFolder({ params: await params, searchParams: firstParams(await searchParams) })} />;
}
