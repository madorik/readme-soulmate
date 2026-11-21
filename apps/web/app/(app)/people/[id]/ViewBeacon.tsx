"use client";

import { useEffect } from "react";
import { noteView } from "@/app/actions/people";

/** 사람 화면이 실제로 열렸다고 알린다(하루에 한 번만 센다). 자주 보는 사람에게만 오늘의 질문을 하려고. 미리 불러오기에는 세지 않으려고 화면에서 부른다 */
export function ViewBeacon({ contactId }: { contactId: string }) {
  useEffect(() => {
    void noteView(contactId).catch(() => {});
  }, [contactId]);
  return null;
}
