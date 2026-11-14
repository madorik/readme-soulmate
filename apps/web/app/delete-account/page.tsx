import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { legalLocale, SUPPORT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = { title: "계정 삭제 · Delete Account" };

// Google Play '계정 삭제 URL'로 등록하는 페이지: 앱 안에서 지우는 법, 앱 없이 요청하는 법, 일부만 지우는 법(#partial, 데이터 삭제 URL), 지워지는 것과 남는 것
export default async function DeleteAccount({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const locale = await legalLocale((await searchParams).lang);
  const mail = <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(locale === "ko" ? "리드미 계정 삭제 요청" : "README account deletion")}`}>{SUPPORT_EMAIL}</a>;
  if (locale === "en") {
    return (
      <LegalPage locale="en" path="/delete-account" title="Delete your README account">
        <h2>In the app</h2>
        <ol>
          <li>Open README and sign in.</li>
          <li>
            Go to the <b>Sharing</b> tab and scroll to the bottom.
          </li>
          <li>
            Tap <b>Delete account</b>, then <b>Delete everything</b>.
          </li>
        </ol>

        <h2>Without the app</h2>
        <p>
          Email {mail} from the email address of your Google or Apple account with the subject &ldquo;README account deletion&rdquo;. We delete the account within 7 days and reply when it&rsquo;s done.
        </p>

        <h2 id="partial">Delete some data and keep your account</h2>
        <ul>
          <li>
            <b>My README</b>: open an item to clear it, or remove wishlist items and dates one by one.
          </li>
          <li>
            <b>People</b>: open a person and tap × next to a private note to delete it.
          </li>
          <li>
            On the same screen, open <b>What you call them</b> and tap <b>Delete</b> to remove that person and all your notes about them.
          </li>
          <li>
            <b>Sharing</b>: tap <b>Stop</b> next to someone and they can no longer see your README.
          </li>
        </ul>
        <p>These take effect right away, and database backups roll off within 7 days. To delete something specific without the app, email {mail}.</p>

        <h2>What gets deleted with your account</h2>
        <ul>
          <li>Your account and sign-in information</li>
          <li>Your README (favorites, allergies, sizes, gifts, dates) and avatar</li>
          <li>Everyone you shared with or received from, your private notes, links, notifications and settings</li>
        </ul>
        <p>Deletion is immediate and can&rsquo;t be undone. People you shared with can no longer see your README. Database backups roll off within 7 days.</p>

        <h2>What stays</h2>
        <p>
          Nothing about you stays with us. If you answered someone&rsquo;s request without the app, that answer stays with the person who asked; email us to have it removed.
        </p>
      </LegalPage>
    );
  }
  return (
    <LegalPage locale="ko" path="/delete-account" title="리드미 계정 삭제">
      <h2>앱에서 지우기</h2>
      <ol>
        <li>리드미를 열고 로그인합니다.</li>
        <li>
          아래 <b>공유 관리</b> 탭에서 맨 아래로 내립니다.
        </li>
        <li>
          <b>계정 삭제</b>를 누르고 <b>모두 지우기</b>를 누릅니다.
        </li>
      </ol>

      <h2>앱 없이 요청하기</h2>
      <p>가입한 Google·Apple 계정의 이메일로 {mail}에 &lsquo;리드미 계정 삭제 요청&rsquo;이라고 보내 주세요. 7일 안에 지우고 끝나면 답장합니다.</p>

      <h2 id="partial">계정은 두고 일부만 지우기</h2>
      <ul>
        <li>
          <b>내 리드미</b>: 항목을 열어 내용을 비우거나, 위시리스트와 기념일을 하나씩 지웁니다.
        </li>
        <li>
          <b>사람들</b>: 사람을 열고 나만 보는 메모 옆 ×를 누르면 그 메모가 지워집니다.
        </li>
        <li>
          같은 화면 아래 <b>부르는 말</b>을 펼쳐 <b>지우기</b>를 누르면 그 사람과 그 사람에 대한 메모가 모두 지워집니다.
        </li>
        <li>
          <b>공유 관리</b>: 사람 옆 <b>끊기</b>를 누르면 그 사람은 더는 내 리드미를 볼 수 없습니다.
        </li>
      </ul>
      <p>바로 지워지며 데이터베이스 백업에서도 7일 안에 사라집니다. 앱 없이 특정 정보만 지우고 싶으면 {mail}로 알려 주세요.</p>

      <h2>계정을 지우면 지워지는 것</h2>
      <ul>
        <li>계정과 로그인 정보</li>
        <li>내 리드미(취향, 알레르기, 사이즈, 선물, 기념일)와 아바타</li>
        <li>주고받은 사람들, 나만 보는 메모, 링크, 알림, 설정</li>
      </ul>
      <p>바로 지워지며 되돌릴 수 없습니다. 내 리드미를 받은 사람들도 더는 볼 수 없습니다. 데이터베이스 백업에서도 7일 안에 사라집니다.</p>

      <h2>남는 것</h2>
      <p>운영자에게 남는 내 정보는 없습니다. 앱 없이 다른 사람의 요청에 답했다면 그 답은 요청한 사람에게 남으니, 지우고 싶으면 메일로 알려 주세요.</p>
    </LegalPage>
  );
}
