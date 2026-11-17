"use client";

import { useEffect } from "react";
import { seeAnswers } from "@/app/actions/people";

/** 사람 화면을 실제로 열었을 때만(미리 불러오기로는 안 돈다) 이 사람의 답장 알림을 읽은 것으로 */
export function SeeAnswers({ contactId }: { contactId: string }) {
  useEffect(() => {
    void seeAnswers(contactId).catch(() => {});
  }, [contactId]);
  return null;
}
