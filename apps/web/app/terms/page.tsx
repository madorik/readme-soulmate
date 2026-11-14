import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { CEO, legalLocale, OPERATOR, SUPPORT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = { title: "이용약관 · Terms of Use" };

export default async function Terms({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const locale = await legalLocale((await searchParams).lang);
  const mail = <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;
  if (locale === "en") {
    return (
      <LegalPage locale="en" path="/terms" title="Terms of Use">
        <p>
          These terms apply to README – Soulmate Cheat Sheet (&ldquo;README&rdquo;), run by {OPERATOR.en} (owner: {CEO.en}). By signing up or using README, you agree to them.
        </p>

        <h2>1. The service</h2>
        <p>
          README lets you write your own favorites, foods you can&rsquo;t eat, sizes and dates, share them only with people you choose, ask someone to fill in theirs, and get birthday and anniversary
          reminders. README is free. We may add, change or stop features, and will announce major changes in advance.
        </p>

        <h2>2. Accounts</h2>
        <ul>
          <li>Sign in with Google or Apple. You are responsible for your account and device.</li>
          <li>Demo accounts are for trying the app and are deleted after 7 days.</li>
          <li>You must be 14 or older to use README.</li>
        </ul>

        <h2>3. What you write and share</h2>
        <ul>
          <li>What you write belongs to you. We use it only to run README as described in the <Link href="/privacy-policy?lang=en">Privacy Policy</Link>.</li>
          <li>Only share links with people you trust. Anyone who opens a link you sent can see the sections you chose until you stop sharing.</li>
          <li>
            You can write down what you know about someone who doesn&rsquo;t use the app, for your own reference only. It is never sent to them or anyone else. Don&rsquo;t write things they wouldn&rsquo;t
            want recorded, and delete it if they ask. Requests are sent to the person, and only they can answer.
          </li>
        </ul>

        <h2>4. Not medical advice</h2>
        <p>
          Allergy and food information on README is what people wrote themselves. It may be incomplete or out of date and is not medical advice. Always check with the person (and staff at restaurants)
          before serving food, especially when an allergy is serious.
        </p>

        <h2>5. Not allowed</h2>
        <ul>
          <li>Using someone else&rsquo;s account, or trying to see information that wasn&rsquo;t shared with you</li>
          <li>Harassing others, or using README for spam, ads or illegal purposes</li>
          <li>Interfering with the service (automated mass access, attacks, reverse engineering for abuse)</li>
        </ul>
        <p>If you break these rules, we may limit or delete your account.</p>

        <h2>6. Leaving</h2>
        <p>
          You can delete your account at any time in the app (Sharing &gt; Delete account). See <Link href="/delete-account?lang=en">Delete Account</Link> for details.
        </p>

        <h2>7. Liability</h2>
        <p>
          We work to keep README running and your data safe, but we&rsquo;re not liable for losses caused by outages beyond our control, by information users wrote, or by how you or the people you share with
          use it, except where the law says otherwise.
        </p>

        <h2>8. Law and contact</h2>
        <p>These terms are governed by the laws of the Republic of Korea. Questions: {mail}</p>
      </LegalPage>
    );
  }
  return (
    <LegalPage locale="ko" path="/terms" title="이용약관">
      <p>
        이 약관은 {OPERATOR.ko}(대표 {CEO.ko}, 이하 &lsquo;운영자&rsquo;)가 운영하는 리드미 - 소울메이트 컨닝페이퍼(이하 &lsquo;리드미&rsquo;)를 쓰는 조건을 정합니다. 가입하거나 리드미를 쓰면 이 약관에
        동의한 것으로 봅니다.
      </p>

      <h2>1. 서비스</h2>
      <p>
        리드미는 내 취향·못 먹는 음식·사이즈·기념일을 직접 적어 내가 고른 사람에게만 보여 주고, 다른 사람에게 적어 달라고 부탁하고, 생일·기념일을 알려 주는 서비스입니다. 리드미는 무료입니다. 운영자는
        기능을 더하거나 바꾸거나 멈출 수 있으며, 큰 변경은 미리 알립니다.
      </p>

      <h2>2. 계정</h2>
      <ul>
        <li>Google 또는 Apple로 로그인합니다. 계정과 기기 관리는 본인 책임입니다.</li>
        <li>데모 계정은 둘러보기용이며 7일 뒤 지워집니다.</li>
        <li>만 14세 이상만 쓸 수 있습니다.</li>
      </ul>

      <h2>3. 내가 적고 나누는 정보</h2>
      <ul>
        <li>
          내가 적은 정보는 나의 것입니다. 운영자는 <Link href="/privacy-policy?lang=ko">개인정보 처리방침</Link>에 적은 대로 리드미를 운영하는 데만 씁니다.
        </li>
        <li>링크는 믿는 사람에게만 보내 주세요. 내가 보낸 링크를 연 사람은 보내기를 끊을 때까지 내가 고른 항목을 볼 수 있습니다.</li>
        <li>
          앱을 안 쓰는 사람에 대해 아는 것을 나만 보는 용도로 직접 적어 둘 수 있습니다. 그 사람이나 다른 누구에게도 보내지지 않습니다. 그 사람이 원하지 않을 내용은 적지 말고, 지워 달라고 하면
          지워 주세요. 부탁하기는 그 사람에게 보내지고, 답은 그 사람만 할 수 있습니다.
        </li>
      </ul>

      <h2>4. 의료 정보가 아닙니다</h2>
      <p>
        리드미의 알레르기·음식 정보는 본인이 적은 내용이라 빠졌거나 오래됐을 수 있으며, 의료적 판단이 아닙니다. 음식을 준비하거나 식당을 고를 때는, 특히 알레르기가 심하면 꼭 본인(그리고 식당)에게 다시
        확인하세요.
      </p>

      <h2>5. 하면 안 되는 일</h2>
      <ul>
        <li>다른 사람의 계정을 쓰거나, 나에게 공유되지 않은 정보를 보려는 시도</li>
        <li>다른 사람을 괴롭히거나, 스팸·광고·불법적인 목적으로 쓰는 일</li>
        <li>서비스 운영을 방해하는 일(자동화된 대량 접속, 공격, 악용을 위한 역설계)</li>
      </ul>
      <p>이를 어기면 운영자는 이용을 제한하거나 계정을 삭제할 수 있습니다.</p>

      <h2>6. 탈퇴</h2>
      <p>
        앱에서 언제든 계정을 삭제할 수 있습니다(공유 관리 &gt; 계정 삭제). 자세한 내용은 <Link href="/delete-account?lang=ko">계정 삭제 안내</Link>를 보세요.
      </p>

      <h2>7. 책임의 한계</h2>
      <p>
        운영자는 리드미를 안정적으로 운영하고 정보를 안전하게 지키려고 노력합니다. 다만 법이 달리 정한 경우를 빼고, 운영자가 막을 수 없는 장애, 이용자가 적은 정보의 내용, 이용자와 공유받은 사람이 그
        정보를 쓴 방식으로 생긴 손해에는 책임지지 않습니다.
      </p>

      <h2>8. 준거법과 문의</h2>
      <p>이 약관은 대한민국 법을 따릅니다. 문의: {mail}</p>
    </LegalPage>
  );
}
