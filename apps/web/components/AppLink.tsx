import Link from "next/link";
import type { ComponentProps } from "react";

/**
 * 앱 안 화면으로 가는 링크. 화면에 보인다고 미리 받지 않는다(prefetch 기본 꺼짐).
 * 앱 화면은 모두 로그인 뒤 서버에서 그려서(동적), 링크 하나를 미리 받을 때마다 서버 함수가 한 번 돈다.
 * 화면 하나에 링크가 열 개쯤 있어 한 번 열 때 함수가 열 번 넘게 돌았다(Vercel Hobby의 Active CPU 4시간 한도, 2026-11-21).
 * 누르면 그때 받고, 마우스를 올리면 Next가 알아서 미리 받는다. 하단 탭 막대(components/chrome.tsx)만 prefetch를 직접 켠다.
 */
export default function AppLink({ prefetch = false, ...props }: ComponentProps<typeof Link>) {
  return <Link prefetch={prefetch} {...props} />;
}
