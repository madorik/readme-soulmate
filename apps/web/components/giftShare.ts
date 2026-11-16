"use client";

import { useSyncExternalStore } from "react";

// 선물 힌트 화면: 아래 단추 줄(가족과 같이 준비·선물 완료)이 위의 '이런 선물은 어때요'(나중에 채워진다)를 알도록 잇는 작은 저장소.
// 카드 주소·보낼 말, 지금 보고 있는 가격대와 그 선물 이름들

export interface GiftShareState {
  url: string | null;
  text: string;
  band: string | null;
  items: string[];
}

const EMPTY: GiftShareState = { url: null, text: "", band: null, items: [] };
let state: GiftShareState = EMPTY;
const subs = new Set<() => void>();

export function setGiftShare(next: Partial<GiftShareState> | null): void {
  state = next ? { ...state, ...next } : EMPTY;
  subs.forEach((f) => f());
}

export function useGiftShare(): GiftShareState {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => {
        subs.delete(f);
      };
    },
    () => state,
    () => EMPTY,
  );
}
