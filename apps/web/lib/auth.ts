import "server-only";
import { APP_ID } from "@readme/core";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { anonymous } from "better-auth/plugins/anonymous";
import { oneTimeToken } from "better-auth/plugins/one-time-token";
import { pool } from "./db";
import { PRODUCTION_ORIGINS, SITE_URL } from "./site";

// 로그인: 구글·애플(키가 있을 때만) + 데모(익명 계정). 이메일 로그인은 없다.
// 앱(웹뷰)에서는 구글이 웹뷰 로그인을 막아서, 시스템 브라우저로 로그인한 뒤 원타임 토큰으로 웹뷰에 세션을 넘긴다(app/auth/app).

export const PROVIDERS = {
  google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  apple: !!(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET),
};

function create() {
  return betterAuth({
    baseURL: SITE_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: pool(),
    trustedOrigins: [...new Set([SITE_URL, ...PRODUCTION_ORIGINS]), "https://appleid.apple.com", `${APP_ID}://`],
    session: {
      // 앱을 오래 열어 두는 서비스라 길게(90일), 하루에 한 번 늘린다
      expiresIn: 60 * 60 * 24 * 90,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    socialProviders: {
      ...(PROVIDERS.google ? { google: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET!, prompt: "select_account" as const } } : {}),
      ...(PROVIDERS.apple
        ? { apple: { clientId: process.env.APPLE_CLIENT_ID!, clientSecret: process.env.APPLE_CLIENT_SECRET!, appBundleIdentifier: process.env.APPLE_APP_BUNDLE_ID ?? APP_ID } }
        : {}),
    },
    account: { accountLinking: { enabled: true, trustedProviders: ["google", "apple"] } },
    plugins: [
      // 데모 계정. 나중에 구글·애플로 로그인하면 데모 계정은 지워진다(데모 데이터는 샘플이라 옮기지 않는다)
      anonymous({ emailDomainName: "demo.readme.invalid", generateName: () => "" }),
      // 시스템 브라우저 → 앱 웹뷰 세션 넘기기(3분 안에 한 번만)
      oneTimeToken({ expiresIn: 3 }),
      nextCookies(),
    ],
  });
}

type Auth = ReturnType<typeof create>;
const globalForAuth = globalThis as unknown as { __readmeAuth?: Auth };

export function getAuth(): Auth {
  if (!globalForAuth.__readmeAuth) globalForAuth.__readmeAuth = create();
  return globalForAuth.__readmeAuth;
}
