import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { legalLocale, SUPPORT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = { title: "고객 지원 · Support" };

// App Store '지원 URL'로 등록하는 페이지: 문의처와 자주 묻는 것(로그인, 데모, 알림, 내보내기·삭제)
export default async function Support({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const locale = await legalLocale((await searchParams).lang);
  const mail = <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(locale === "ko" ? "기억해유 문의" : "Remember You support")}`}>{SUPPORT_EMAIL}</a>;
  if (locale === "en") {
    return (
      <LegalPage locale="en" path="/support" title="Remember You support">
        <h2>Contact</h2>
        <p>Email {mail}. We usually reply within 2 business days.</p>

        <h2>Common questions</h2>
        <ul>
          <li>
            <b>Try without an account</b>: tap <b>Try the demo</b> on the first screen. Demo accounts are deleted automatically after 7 days.
          </li>
          <li>
            <b>Sign in</b>: use Apple or Google. We never receive your password.
          </li>
          <li>
            <b>Reminders</b>: allow notifications, then choose when to be reminded in <b>Settings</b> (2 weeks, 1 week, 3 days before, or on the day).
          </li>
          <li>
            <b>Download or delete your data</b>: <b>Settings</b> has export and account deletion. See also <Link href="/delete-account?lang=en">Delete your account</Link>.
          </li>
        </ul>

        <h2>Policies</h2>
        <p>
          <Link href="/privacy-policy?lang=en">Privacy policy</Link> · <Link href="/terms?lang=en">Terms of service</Link>
        </p>
      </LegalPage>
    );
  }
  return (
    <LegalPage locale="ko" path="/support" title="기억해유 고객 지원">
      <h2>문의</h2>
      <p>{mail}로 메일을 보내 주세요. 보통 영업일 2일 안에 답장드려요.</p>

      <h2>자주 묻는 것</h2>
      <ul>
        <li>
          <b>가입 없이 써 보기</b>: 첫 화면에서 <b>데모로 둘러보기</b>를 누르세요. 데모 계정은 7일 뒤 자동으로 지워져요.
        </li>
        <li>
          <b>로그인</b>: Apple 또는 Google로 로그인해요. 비밀번호는 받지 않아요.
        </li>
        <li>
          <b>생일 알림</b>: 알림을 허용한 뒤 <b>설정</b>에서 알림 받을 때(2주 전·1주 전·3일 전·당일)를 고를 수 있어요.
        </li>
        <li>
          <b>내 정보 내려받기·계정 삭제</b>: <b>설정</b>에서 할 수 있어요. <Link href="/delete-account?lang=ko">계정 삭제 안내</Link>도 참고해 주세요.
        </li>
      </ul>

      <h2>정책</h2>
      <p>
        <Link href="/privacy-policy?lang=ko">개인정보 처리방침</Link> · <Link href="/terms?lang=ko">이용약관</Link>
      </p>
    </LegalPage>
  );
}
