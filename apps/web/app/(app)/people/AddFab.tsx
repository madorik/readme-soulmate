import Link from "next/link";
import { Icon } from "@/components/marks";

/**
 * 사람들 화면 오른쪽 아래 '직접 적기' 알약 버튼(망고).
 * 선택(고르기) 중에는 아래 메뉴·선물 막대와 겹치니 숨긴다: PeopleBoard가 그동안 <html data-people-picking>을 단다
 */
export function AddFab({ label }: { label: string }) {
  return (
    <Link
      href="/people/new"
      className="grad mb-3 flex h-[52px] items-center gap-1.5 rounded-full pl-4 pr-5 text-[15px] font-bold shadow-[0_4px_0_#e09a12] transition-transform active:scale-95 [html[data-people-picking]_&]:hidden"
    >
      <Icon name="personAdd" size={21} strokeWidth={2} />
      {label}
    </Link>
  );
}
