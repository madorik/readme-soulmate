import Link from "next/link";
import { Icon } from "@/components/marks";

/**
 * 사람들 화면 오른쪽 아래 '직접 적기' 버튼.
 * 선택(고르기) 중에는 아래 메뉴·선물 막대와 겹치니 숨긴다: PeopleBoard가 그동안 <html data-people-picking>을 단다
 */
export function AddFab({ label }: { label: string }) {
  return (
    <Link
      href="/people/new"
      aria-label={label}
      className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white shadow-[0_6px_18px_rgba(29,33,37,0.28)] transition-transform active:scale-95 [html[data-people-picking]_&]:hidden"
    >
      <Icon name="personAdd" size={24} strokeWidth={1.8} />
    </Link>
  );
}
