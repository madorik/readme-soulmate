import { useState } from "react";
import { api } from "../api";
import { useNav } from "../nav";
import { BottomBar, Page } from "../ui";

// 사람 더하기: 부를 이름만 받고 바로 그 사람 화면으로

export function NewPerson() {
  const { replace, bump } = useNav();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const ok = name.trim().length > 0;

  const submit = async () => {
    if (!ok || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const { id } = await api<{ id: string }>("people", { json: { name } });
      bump();
      replace({ name: "person", id });
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  return (
    <Page>
      <form
        className="flex flex-1 flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="flex flex-col gap-3 px-5 pt-2">
          <label htmlFor="person-name" className="headline text-[22px]">
            누구를 기억해 둘까요?
          </label>
          <input
            id="person-name"
            className="field"
            value={name}
            maxLength={40}
            autoFocus
            enterKeyHint="done"
            placeholder="엄마, 지수, 김 팀장님"
            onChange={(e) => setName(e.target.value)}
          />
          {failed ? <p role="alert" className="text-[13.5px] text-red">저장하지 못했어요. 다시 눌러 주세요</p> : null}
        </div>
        <BottomBar>
          <button type="submit" disabled={!ok || busy} className="btn-primary w-full">
            {busy ? "더하는 중…" : "더하기"}
          </button>
        </BottomBar>
      </form>
    </Page>
  );
}
