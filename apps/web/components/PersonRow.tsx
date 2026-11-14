import type { AvatarConfig } from "@readme/core";
import { Avatar } from "./Avatar";

// 사람 목록 한 줄(서버 목록과 고르기 화면이 같이 쓴다). 서버 전용 모듈을 들이지 않는다

/** 사람 목록 한 줄에 보일 것(서버에서 만들어 화면 컴포넌트에 넘긴다) */
export interface PersonRow {
  contactId: string;
  name: string;
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
}

/** 한 줄의 가운데·오른쪽(링크와 고르기 칸이 같이 쓴다) */
export function RowBody({ row, avatarLabel }: { row: PersonRow; avatarLabel: string }) {
  return (
    <>
      <Avatar config={row.avatar} size={36} label={avatarLabel} />
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="truncate text-[15px] font-medium">{row.name}</span>
        {row.sub ? <span className="truncate text-[11.5px] text-muted">{row.sub}</span> : null}
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

