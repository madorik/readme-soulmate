import type { AvatarConfig } from "@readme/core";
import { Avatar } from "./Avatar";

// 사람 목록 한 줄(서버 목록과 고르기 화면이 같이 쓴다). 서버 전용 모듈을 들이지 않는다

/** 사람 목록 한 줄에 보일 것(서버에서 만들어 화면 컴포넌트에 넘긴다) */
export interface PersonRow {
  contactId: string;
  /** 그 사람 이름(직접 적은 사람·답 기다리는 칸은 내가 적은 말) */
  name: string;
  /** 내가 붙인 태그(부르는 말). 이름과 같거나 없으면 "" */
  tag: string;
  sub: string;
  avatar: AvatarConfig | null;
  /** 다음 생일 "11.21" */
  date: string;
  /** "7일 남음" 또는 "음력 10월 13일" */
  dateSub: string;
  /** 7일 안이면 붉게 */
  soon: boolean;
  /** 같이 고르기에서 고를 수 있는지(답 기다리는 칸·끊긴 사람은 못 고른다) */
  pickable: boolean;
  /** 앱을 쓰는 사람인데 내 리드미를 안 보여 주면 "공유 꺼짐" */
  shareNote: string;
}

/** 이름 옆 태그(내가 붙인 부르는 말) */
export function TagChip({ children, large = false }: { children: React.ReactNode; large?: boolean }) {
  return (
    <span className={`max-w-[9em] shrink-0 truncate rounded-md bg-fill font-medium text-ink-2 shadow-[inset_0_0_0_1px_var(--color-rule)] ${large ? "px-2 py-[3px] text-[13px]" : "px-1.5 py-px text-[11.5px]"}`}>
      {children}
    </span>
  );
}

/** 한 줄의 가운데·오른쪽(링크와 고르기 칸이 같이 쓴다) */
export function RowBody({ row, avatarLabel }: { row: PersonRow; avatarLabel: string }) {
  return (
    <>
      <Avatar config={row.avatar} size={36} label={avatarLabel} />
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[15px] font-medium">{row.name}</span>
          {row.tag ? <TagChip>{row.tag}</TagChip> : null}
        </span>
        {row.sub || row.shareNote ? <span className="truncate text-[11.5px] text-muted">{[row.sub, row.shareNote].filter(Boolean).join(" · ")}</span> : null}
      </span>
      {row.date ? (
        <span className="flex flex-col items-end gap-px">
          <span className="num text-[17px]">{row.date}</span>
          <span className={`text-[11px] ${row.soon ? "text-red" : "text-muted"}`}>{row.dateSub}</span>
        </span>
      ) : null}
    </>
  );
}

