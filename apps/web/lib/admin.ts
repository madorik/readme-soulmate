// 앱 안에서 '관리자'로 들어갈 수 있는 계정. 환경변수 ADMIN_EMAILS(쉼표로 여럿, 대소문자 무시)에 적은 이메일로 로그인한 사람.
// 저장소가 공개라서 이메일은 코드에 적지 않는다. 로봇 계정이 아니도록 이메일 확인이 끝난 계정(구글·Apple 로그인)만 인정한다.

export interface AdminCandidate {
  email?: string | null;
  emailVerified?: boolean;
  isAnonymous?: boolean;
}

/** 환경변수 값("a@x.com, B@y.com")을 소문자 이메일 목록으로 */
export function adminEmails(env: string | undefined = process.env.ADMIN_EMAILS): string[] {
  return (env ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** 이 계정이 관리자인가: 데모(익명)·이메일 미확인 계정은 아니다 */
export function isAdminAccount(user: AdminCandidate | null | undefined, env: string | undefined = process.env.ADMIN_EMAILS): boolean {
  if (!user || user.isAnonymous || user.emailVerified !== true || !user.email) return false;
  return adminEmails(env).includes(user.email.trim().toLowerCase());
}
