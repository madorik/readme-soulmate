import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "./api";
import { useNav } from "./nav";

/** 화면 데이터 읽기. 저장한 뒤(nav.bump) 다시 읽는다 */
export function useLoad<T>(path: string | null): { data: T | null; error: string | null; reload: () => void } {
  const { version } = useNav();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!path) return;
    let alive = true;
    setError(null);
    api<T>(path)
      .then((d) => alive && setData(d))
      .catch((e: unknown) => alive && setError(e instanceof ApiError ? e.code : "failed"));
    return () => {
      alive = false;
    };
  }, [path, version, n]);
  const reload = useCallback(() => setN((v) => v + 1), []);
  return { data, error, reload };
}
