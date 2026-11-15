import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { CEO, legalLocale, OPERATOR, SUPPORT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = { title: "개인정보 처리방침 · Privacy Policy" };

// 「개인정보 보호법」 제30조 항목을 실제로 처리하는 대로 적는다(2026-11-14 코드 기준).
// 위탁: Vercel(호스팅), Supabase(DB, 서울), Google·Apple(로그인). 푸시(FCM)·분석 도구를 켜면 여기와 시행일(lib/legal.ts)을 같이 고친다.
export default async function PrivacyPolicy({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const locale = await legalLocale((await searchParams).lang);
  const mail = <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;
  if (locale === "en") {
    return (
      <LegalPage locale="en" path="/privacy-policy" title="Privacy Policy">
        <p>
          README – Soulmate Cheat Sheet (&ldquo;README&rdquo;) is run by {OPERATOR.en} (owner: {CEO.en}). README lets you write down your own favorites, foods you can&rsquo;t eat, sizes and dates, and show
          them only to people you choose. This policy explains what we handle and how.
        </p>

        <h2>1. What we collect</h2>
        <ul>
          <li>
            <b>Sign-in (Google or Apple)</b>: email address, name, profile photo URL and the account ID the provider gives us. We never receive your password. With Apple&rsquo;s &ldquo;Hide My Email&rdquo;
            we get Apple&rsquo;s relay address. <b>Demo accounts</b> have no email or name.
          </li>
          <li>
            <b>Your README</b>: the name you go by, your avatar, foods you like and dislike, <b>allergies and foods you can&rsquo;t eat (health information)</b>, clothing and shoe sizes, gift ideas and favorite
            brands, favorites (patterns, style, celebrities, characters, teams, movies, dramas, shows, music, seasons, desserts, places, animals, books), drinking preferences, date of birth (solar or lunar; the year is optional) and anniversaries.
          </li>
          <li>
            <b>Your people</b>: the people you add, nicknames and groups you give them, what you write down about them (favorites, allergies, sizes, gifts, dates), the answers they send when you ask them,
            and private notes you write about someone.
          </li>
          <li>
            <b>Answering someone&rsquo;s questions</b>: the answers you send are saved to the asker&rsquo;s record about you. Allergy answers are sent only if you agree on that screen. If you answer while signed in,
            the asker sees your name and avatar on that record, and you can choose to save the answers to your own README too.
          </li>
          <li>
            <b>Settings and device</b>: language, time zone, reminder timing, whether app lock is on, and the device language. If you allow notifications on a phone, reminders are
            scheduled on the device itself.
          </li>
          <li>
            <b>Created automatically</b>: sign-in cookies and access logs kept by our hosting provider (IP address, browser or device type, time).
          </li>
        </ul>

        <h2>2. Why we use it</h2>
        <ul>
          <li>To sign you in and keep your account</li>
          <li>To keep your README and your records about your people, and to deliver the questions you ask and the answers you receive</li>
          <li>To send birthday and anniversary reminders (solar dates are calculated from lunar ones)</li>
          <li>To answer questions and keep the service safe (preventing abuse)</li>
        </ul>
        <p>We don&rsquo;t sell your information, show ads, or use it for marketing.</p>

        <h2>3. Health information (allergies)</h2>
        <p>
          Allergies and foods you can&rsquo;t eat may be health information. We save it only after you agree and encrypt it before it is stored. Your README is visible only to you. When you answer someone&rsquo;s
          questions about allergies, you agree on that screen to send them to the asker, and the answer is saved, encrypted, to the asker&rsquo;s record. Allergies you write down about someone else are encrypted
          the same way and visible only to you. You can delete them or withdraw consent any time by editing or deleting your account.
        </p>

        <h2>4. Who can see it</h2>
        <ul>
          <li>There is no public profile or search. Nobody can find you by name, email or phone number.</li>
          <li>Your README is visible only to you. Nobody else can read it, even people in your list.</li>
          <li>Your records about other people and your private notes are visible only to you. They are not shown to that person either.</li>
          <li>A question link expires in 7 days and can be answered once. Once answered, the answers belong to the asker&rsquo;s record and the asker can edit or delete them.</li>
        </ul>

        <h2>5. Service providers and overseas transfer</h2>
        <table>
          <thead>
            <tr>
              <th>Provider</th>
              <th>Task</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Vercel Inc.</td>
              <td>Hosting the app and server</td>
              <td>USA, South Korea (data moves over the network as you use the app)</td>
            </tr>
            <tr>
              <td>Supabase, Inc.</td>
              <td>Database storage</td>
              <td>South Korea, Seoul (AWS ap-northeast-2)</td>
            </tr>
            <tr>
              <td>Google LLC, Apple Inc.</td>
              <td>Sign-in, only if you choose it</td>
              <td>USA</td>
            </tr>
            <tr>
              <td>OpenAI, L.L.C.</td>
              <td>Sorting a sentence you say or type in Say it into people and sections, only when you use it</td>
              <td>USA (sent over the network each time)</td>
            </tr>
          </tbody>
        </table>
        <p>
          Information is stored with these providers until you delete your account. If you don&rsquo;t want overseas transfer, you can choose not to sign up or delete your account; the service can&rsquo;t
          run without it. Voice input uses your device&rsquo;s or browser&rsquo;s speech recognition (Apple, Google, etc.); we never receive the audio. In Say it, the recognized sentence and the names of your people are
          sent to OpenAI only to sort the sentence; we don&rsquo;t keep the sentence itself, only the values saved to your records. Sending a link through KakaoTalk or another app passes
          only the link to that app.
        </p>

        <h2>6. How long we keep it</h2>
        <ul>
          <li>Until you delete your account. Deleting removes your README, people, records, notes, question links and notifications right away; database backups roll off within 7 days.</li>
          <li>Demo accounts are deleted automatically 7 days after they are created.</li>
          <li>Unanswered question links stop working after 7 days.</li>
          <li>Answers you send stay in the asker&rsquo;s record until they delete them or their account. Deleting your own account doesn&rsquo;t remove them. To have your answer removed, ask the asker or email us.</li>
        </ul>

        <h2>7. Your rights</h2>
        <p>
          You can view, correct, or delete your information at any time in the app. To get a copy of your data, or for any other request, email {mail}; we reply within 10 days.
        </p>

        <h2>8. Security</h2>
        <ul>
          <li>All traffic is encrypted (HTTPS).</li>
          <li>Allergies, sizes, dates of birth and anniversaries, private notes and prefilled question values are encrypted (AES-256-GCM) before they are stored.</li>
          <li>The database itself checks that each person can only read their own data (row-level security).</li>
          <li>Question links are random, stored only as a hash, work once, and expire.</li>
        </ul>

        <h2>9. Children</h2>
        <p>README is not meant for children under 14, and we don&rsquo;t knowingly collect their information.</p>

        <h2>10. Contact</h2>
        <p>
          Privacy officer: {CEO.en}, {mail}
        </p>

        <h2>11. Changes</h2>
        <p>If this policy changes, we&rsquo;ll post the new version here with its effective date at least 7 days before (30 days for important changes).</p>
      </LegalPage>
    );
  }
  return (
    <LegalPage locale="ko" path="/privacy-policy" title="개인정보 처리방침">
      <p>
        리드미 - 소울메이트 컨닝페이퍼(이하 &lsquo;리드미&rsquo;)는 {OPERATOR.ko}(대표 {CEO.ko}, 이하 &lsquo;운영자&rsquo;)가 운영합니다. 리드미는 내 취향·못 먹는 음식·사이즈·기념일을 적어 두고, 가까운
        사람들의 것도 적어 두거나 물어봐서 채우는 서비스입니다. 운영자는 「개인정보 보호법」을 지키며 개인정보를 아래와 같이 처리합니다.
      </p>

      <h2>1. 처리하는 개인정보 항목</h2>
      <ul>
        <li>
          <b>가입·로그인(Google 또는 Apple)</b>: 이메일 주소, 이름, 프로필 사진 주소, 로그인 서비스가 주는 회원 식별값. 비밀번호는 받지 않습니다. Apple의 &lsquo;나의 이메일 가리기&rsquo;를 쓰면 Apple이 만든
          중계 이메일 주소를 받습니다. <b>데모 계정</b>은 이메일·이름 없이 만들어집니다.
        </li>
        <li>
          <b>내 리드미</b>: 부를 이름, 아바타, 좋아하는·싫어하는 음식, <b>알레르기·못 먹는 음식(건강 정보)</b>, 옷·신발 사이즈, 받고 싶은 선물과 좋아하는 브랜드, 좋아하는 것들(무늬·스타일·연예인·캐릭터·응원팀·영화·드라마·TV·음악·계절·디저트·여행지·동물·책), 술 취향, 생년월일(양력·음력, 태어난 해는 선택)과 기념일
        </li>
        <li>
          <b>내 사람들</b>: 내가 더한 사람, 내가 붙인 호칭과 그룹, 그 사람에 대해 적어 둔 내용(취향, 알레르기, 사이즈, 선물, 기념일), 물어봐서 받은 답, 나만 보는 메모
        </li>
        <li>
          <b>물어보기에 답한 경우</b>: 보낸 답은 물어본 사람이 나에 대해 적어 둔 기록에 저장됩니다. 알레르기 답은 그 화면에서 동의한 경우에만 보냅니다. 로그인하고 답하면 물어본 사람에게 내 이름과
          아바타가 보이고, 고르면 내 리드미에도 저장됩니다.
        </li>
        <li>
          <b>설정과 기기</b>: 언어, 시간대, 알림 시점, 앱 잠금 사용 여부, 기기 언어. 휴대폰에서 알림을 허용하면 생일 알림은 기기 안에서 예약됩니다.
        </li>
        <li>
          <b>자동으로 만들어지는 정보</b>: 로그인 유지를 위한 쿠키, 호스팅 업체가 남기는 접속 기록(IP 주소, 브라우저·기기 종류, 접속 시각)
        </li>
      </ul>

      <h2>2. 처리 목적</h2>
      <ul>
        <li>회원 확인, 로그인 유지, 계정 관리</li>
        <li>내 리드미와 내 사람들 기록 보관, 물어보기 전달과 받은 답 저장</li>
        <li>생일·기념일 알림(음력은 양력으로 바꿔 계산)</li>
        <li>문의 응대, 부정 이용 방지 등 서비스 안전 관리</li>
      </ul>
      <p>개인정보를 팔거나 광고·마케팅에 쓰지 않습니다.</p>

      <h2>3. 민감정보(알레르기)</h2>
      <p>
        알레르기와 못 먹는 음식은 건강에 관한 정보일 수 있어, 따로 동의를 받은 뒤에만 저장하고 저장하기 전에 암호화합니다. 내 리드미는 나만 봅니다. 물어보기에 알레르기를 답할 때는 그 화면에서
        물어본 사람에게 보내는 데 동의를 받고, 답은 암호화해 물어본 사람의 기록에 저장합니다. 다른 사람에 대해 적어 둔 알레르기도 같은 방식으로 암호화하고, 적은 사람만 봅니다. 고치거나 지우거나
        계정을 삭제해 언제든 동의를 철회할 수 있습니다.
      </p>

      <h2>4. 누가 볼 수 있나요</h2>
      <ul>
        <li>공개 프로필과 검색이 없습니다. 이름·이메일·전화번호로 나를 찾을 수 없습니다.</li>
        <li>내 리드미는 나만 봅니다. 내 사람들에 있는 사람도 읽을 수 없습니다.</li>
        <li>다른 사람에 대해 적어 둔 기록과 메모는 나만 봅니다. 그 사람에게도 보이지 않습니다.</li>
        <li>물어보기 링크는 7일 안에 한 번만 답할 수 있습니다. 답한 내용은 물어본 사람의 기록이 되어, 물어본 사람이 고치거나 지울 수 있습니다.</li>
      </ul>

      <h2>5. 처리 위탁과 국외 이전</h2>
      <table>
        <thead>
          <tr>
            <th>받는 곳</th>
            <th>맡기는 일</th>
            <th>위치</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Vercel Inc.</td>
            <td>앱·서버 호스팅</td>
            <td>미국, 대한민국(이용할 때마다 네트워크로 전송)</td>
          </tr>
          <tr>
            <td>Supabase, Inc.</td>
            <td>데이터베이스 보관</td>
            <td>대한민국 서울(AWS ap-northeast-2)</td>
          </tr>
          <tr>
            <td>Google LLC, Apple Inc.</td>
            <td>로그인(고른 경우만)</td>
            <td>미국</td>
          </tr>
          <tr>
            <td>OpenAI, L.L.C.</td>
            <td>말로 적기에서 말하거나 적은 문장을 사람·항목으로 나누기(쓸 때만)</td>
            <td>미국(쓸 때마다 네트워크로 전송)</td>
          </tr>
        </tbody>
      </table>
      <p>
        보유 기간은 회원 탈퇴 때까지입니다. 국외 이전을 원하지 않으면 가입하지 않거나 계정을 삭제할 수 있으며, 이 경우 서비스를 쓸 수 없습니다. 말로 입력하기는 기기·브라우저의 음성 인식(Apple·Google
        등)을 쓰며 운영자는 음성을 받지 않습니다. 말로 적기에서는 글로 바뀐 문장과 내 사람들의 이름을 문장을 나누는 데만 OpenAI에 보내고, 운영자는 문장 자체는 보관하지 않고 기록에 넣은 값만
        저장합니다. 카카오톡 등 다른 앱으로 보내기는 링크만 그 앱에 넘깁니다.
      </p>

      <h2>6. 보유 기간과 파기</h2>
      <ul>
        <li>계정을 삭제할 때까지 보관합니다. 삭제하면 리드미·사람들·기록·메모·물어보기 링크·알림을 바로 지우고, 데이터베이스 백업에서도 7일 안에 사라집니다.</li>
        <li>데모 계정은 만든 지 7일 뒤 자동으로 지웁니다.</li>
        <li>답하지 않은 물어보기 링크는 7일 뒤 열리지 않습니다.</li>
        <li>내가 보낸 답은 물어본 사람이 지우거나 탈퇴할 때까지 그 사람의 기록에 남습니다. 내 계정을 지워도 지워지지 않습니다. 지우고 싶으면 물어본 사람에게 말하거나 메일로 알려 주세요.</li>
      </ul>

      <h2>7. 이용자의 권리</h2>
      <p>앱에서 언제든 내 정보를 보고, 고치고, 지울 수 있습니다. 내 정보 사본이 필요하거나 다른 요청이 있으면 {mail}로 보내 주세요. 10일 안에 답합니다.</p>

      <h2>8. 안전성 확보 조치</h2>
      <ul>
        <li>모든 통신을 암호화(HTTPS)합니다.</li>
        <li>알레르기·사이즈·생년월일과 기념일·메모·물어볼 때 미리 채운 값은 저장 전에 암호화(AES-256-GCM)합니다.</li>
        <li>데이터베이스가 직접 &lsquo;본인&rsquo;만 자기 정보를 읽게 막습니다(행 수준 보안).</li>
        <li>물어보기 링크는 무작위로 만들고 해시로만 보관하며, 한 번만 쓰이고 기한이 지나면 열리지 않습니다.</li>
      </ul>

      <h2>9. 만 14세 미만</h2>
      <p>리드미는 만 14세 미만을 대상으로 하지 않으며, 그 개인정보를 알고 수집하지 않습니다.</p>

      <h2>10. 개인정보 보호책임자</h2>
      <p>
        {CEO.ko}, {mail}
      </p>
      <p>
        개인정보 침해에 대한 신고·상담은 개인정보침해신고센터(privacy.kisa.or.kr, 국번 없이 118), 개인정보분쟁조정위원회(kopico.go.kr, 1833-6972)에도 할 수 있습니다.
      </p>

      <h2>11. 바뀌는 경우</h2>
      <p>이 방침이 바뀌면 시행 7일 전(중요한 변경은 30일 전)부터 이 페이지에 시행일과 함께 알립니다.</p>
    </LegalPage>
  );
}
