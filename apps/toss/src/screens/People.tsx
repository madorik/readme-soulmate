import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/marks";
import { SectionIcon } from "@/components/SectionIcon";
import type { THome } from "@/lib/toss-api";
import { useLoad } from "../load";
import { useNav } from "../nav";
import { Failed, Loading, Page, TabBar } from "../ui";

// 사람들: 즐겨찾기 먼저, 그다음 더한 순서. 한 줄에 얼굴·이름·적어 둔 항목 아이콘

export function People() {
  const { data, error, reload } = useLoad<THome>("home");
  const { push } = useNav();
  const people = data ? [...data.people].sort((a, b) => Number(b.favorite) - Number(a.favorite)) : [];
  return (
    <Page tabs>
      <div className="flex items-center justify-between px-5 pb-3 pt-1">
        <h1 className="headline text-[24px]">사람들</h1>
        {people.length ? (
          <button type="button" onClick={() => push({ name: "newPerson" })} className="pill">
            <Icon name="personAdd" size={18} strokeWidth={2} />
            더하기
          </button>
        ) : null}
      </div>
      {error ? <Failed onRetry={reload} /> : !data ? <Loading /> : null}
      {data && people.length ? (
        <ul className="card mx-4 flex flex-col px-4 py-1">
          {people.map((p) => (
            <li key={p.id} className="border-t border-rule first:border-t-0">
              <button type="button" onClick={() => push({ name: "person", id: p.id })} className="flex min-h-[68px] w-full items-center gap-3 text-left">
                <Avatar config={p.avatar} size={46} label={p.name} />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-[16px] font-bold">{p.name}</span>
                  {p.filled.length ? (
                    <span aria-hidden="true" className="flex gap-1">
                      {p.filled.slice(0, 5).map((s) => (
                        <SectionIcon key={s} section={s} size={22} />
                      ))}
                    </span>
                  ) : null}
                </span>
                <Icon name="chevron" size={18} strokeWidth={1.6} className="text-muted" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {data && !people.length ? (
        <div className="flex flex-col gap-4 px-4">
          <button type="button" onClick={() => push({ name: "newPerson" })} className="btn-primary">
            <Icon name="personAdd" size={20} strokeWidth={2} />
            사람 더하기
          </button>
        </div>
      ) : null}
      <div className="h-6" />
      <TabBar />
    </Page>
  );
}
