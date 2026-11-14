"use client";

import { anonymousClient, oneTimeTokenClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// 브라우저(웹뷰)에서 쓰는 로그인 클라이언트. 같은 사이트의 /api/auth 로 간다
export const authClient = createAuthClient({
  plugins: [anonymousClient(), oneTimeTokenClient()],
});
