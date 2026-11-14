# 리드미 - 소울메이트 컨닝페이퍼

가까운 사람(배우자·애인·가족·친한 친구)끼리 취향, 못 먹는 음식, 사이즈, 생일을 **본인이 직접 적고**, **고른 사람에게만** 보여 주는 앱.
"아빠 리드미 보냈는데 답장해줘"처럼 쓴다. 한국어·영어, iOS·Android·웹.

계획과 완료 기준은 [PLAN.md](./PLAN.md), 디자인 시안은 캔버스(https://claude.ai/artifact/9paJQ7bmzf4cayyWUyMpaa, 시안의 임시 로고 hint → README).

## 구조

```
readme/
├─ apps/web/        Next.js 16 앱 화면 전체 + 앱 없이 답하는 웹 화면(/r/[token]) + 크론·푸시·앱 링크 API
├─ apps/mobile/     Capacitor 8 iOS·Android 껍데기(배포된 웹을 띄운다)
├─ packages/core/   음력 변환·다음 생일·알림 시점, 항목 사전, 사이즈 환산, 한/영 문구, 초대 토큰(순수 TS)
├─ db/              PostgreSQL 마이그레이션(db/migrations)과 RLS 통합 테스트(db/tests)
└─ scripts/         migrate.mjs(마이그레이션), write-local-env.mjs, fetch-fonts.mjs(Noto Sans KR 직접 호스팅)
```

## 처음 실행

```bash
pnpm install
pnpm db:start        # 로컬 Postgres 17(도커 readme-pg, 127.0.0.1:55433, DB readme)
pnpm env:local       # apps/web/.env.local 생성(DB 주소 + 로그인 세션 키 + 암호화 키 + 크론 비밀값)
pnpm db:migrate      # db/migrations 적용(pnpm db:reset은 로컬만 지우고 처음부터)
pnpm dev             # http://localhost:3200
```

로그인은 Google·Apple(키를 넣은 것만 버튼이 보인다)과 **데모로 둘러보기**(익명 계정 + 샘플 사람 4명, 7일 뒤 자동 삭제). 이메일 로그인은 없다.
언어는 기기(시스템) 언어를 따르고, 공유 관리에서 시스템·한국어·English를 고를 수 있다.

## 테스트

```bash
pnpm test            # core·암호화 단위 테스트(29개): 음력·윤달·30일 대체·다음 생일·알림·사이즈·한영 문구 짝·조사·말로 입력 해석·AES-GCM
pnpm test:db         # RLS 통합 테스트(16개): 로그인 표 못 읽음, 남의 리드미 못 읽음, 허락한 항목만, 끊으면 바로 못 읽음, 초대 재사용·조작 불가 …
pnpm e2e             # Playwright(14개): 가입·온보딩 → 보내기·받기 → 부탁하기·웹 답 → 끊기 → 영어 사이즈 → 메모 → 가입 후 가져오기 → 삭제 → 데모 → 기기 언어
pnpm typecheck && pnpm lint && pnpm build
```

e2e는 로컬 Postgres와 개발 서버(3200)가 떠 있어야 한다. 로그인은 `?demo=empty`(개발 서버에서만 먹는 빈 데모 계정)로 한다. `SHOTS=<폴더> pnpm e2e`면 주요 화면을 찍어 둔다.
RLS 테스트는 `DATABASE_URL=<Supabase 풀러 주소> pnpm test:db`로 운영 DB에도 돌릴 수 있다(테스트 사용자는 끝나면 지운다).

## 앱(iOS·Android)

```bash
cd apps/mobile
CAP_SERVER_URL=http://localhost:3200 pnpm build:ios        # 시뮬레이터 빌드(서명 없이)
CAP_SERVER_URL=http://10.0.2.2:3200 pnpm build:android     # 디버그 APK (ANDROID_HOME, JAVA_HOME 필요)
pnpm open:ios / pnpm open:android                          # Xcode·Android Studio로 열어 기기 실행·서명
```

- 앱은 `CAP_SERVER_URL`의 웹을 띄운다. 운영 빌드 전에는 반드시 운영 도메인으로 `pnpm sync`.
- 앱에서만: Face ID·지문 앱 잠금, 기기 로컬 생일 알림(서버 푸시 없이도 온다), 링크로 앱 열기, 네이티브 공유.
- 앱 ID `kr.readme.app`(확정, Play에 한 번 올리면 못 바꾼다).
- 구글은 웹뷰 로그인을 막으므로, 앱에서는 시스템 브라우저(`/auth/app/start`)로 로그인하고 3분짜리 원타임 토큰을 `kr.readme.app://auth?ott=…`로 받아 웹뷰에 세션을 넘긴다(`lib/native-auth.ts`).
- 아이콘·스플래시·스토어 그래픽: `node apps/mobile/scripts/make-assets.mjs`, 스토어 스크린샷: `node apps/mobile/scripts/store-screens.mjs`. 출시 절차는 [apps/mobile/STORE.md](./apps/mobile/STORE.md).

## 보안 설계

- 공개 프로필·검색 없음. 연결은 초대 링크(또는 6자리 코드)로만.
- 리드미는 항목(알레르기·음식·사이즈·선물·기념일) 단위로 저장하고, **RLS**가 "주인 또는 그 항목을 허락받은 사람"만 읽게 한다. 서버는 요청마다 트랜잭션 안에서 `set local role app_user` + `app.user_id`로 바꿔 쿼리하므로(`lib/db.ts`), 서버 코드에 실수가 있어도 DB가 남의 리드미를 돌려주지 않는다(`db/tests/rls.test.ts`). 앱 역할은 로그인 표(user·session·account)를 못 읽는다.
- 알레르기·사이즈·메모·요청 초안은 서버 키(AES-256-GCM)로 암호화하고, 어느 사람·어느 항목의 값인지 묶어서(AAD) 다른 행에 옮겨 붙이면 풀리지 않는다.
- 초대 토큰은 해시만 저장, 7일 만료, 한 사람만 열 수 있다. 끊으면 허락이 철회되어 바로 못 본다(사본을 주지 않는다).
- 앱 없이 답한 내용도 답한 사람 것이고, 알레르기 같은 건강 정보는 저장 동의를 받는다(개인정보보호법 제23조 민감정보). 가입하면 자기 리드미로 가져간다.
- "누가 봤는지 알림"은 선물 준비가 들키지 않게 기본으로 꺼 둔다.
- 계정 삭제는 앱 안에서 바로(앱스토어 심사 5.1.1(v)). 내 정보 내려받기(JSON) 제공.

## 운영

- 웹: Vercel 프로젝트 `readme`(madoriks-projects, 루트 `apps/web`, 함수 지역 icn1(서울)) → **https://readme.watalabs.com**(watalabs.com DNS가 같은 Vercel 팀에 있다. 예전 주소 itsreadme.vercel.app은 308로 넘어온다). 배포는 저장소 루트에서 `vercel deploy --prod`(`.vercelignore`가 비밀값·네이티브 폴더를 뺀다).
- DB: Supabase 프로젝트 `readme`(madorik's Org, Free, 서울 ap-northeast-2). Supabase의 Data API는 꺼 두었고(0006 마이그레이션으로 anon·authenticated 권한도 회수), 앱은 Postgres로만 붙는다. Vercel `DATABASE_URL` = 트랜잭션 풀러(`aws-0-ap-northeast-2.pooler.supabase.com:6543`, 사용자 `postgres.<ref>`), `DATABASE_URL_UNPOOLED` = 세션 풀러(같은 호스트 5432, 마이그레이션용). 비밀번호·ref는 `~/.readme/supabase.env`. 마이그레이션: `vercel env pull <파일> --environment production` 뒤 `node --env-file=<파일> scripts/migrate.mjs`. 무료 프로젝트는 1주일 동안 활동이 없으면 일시정지된다(매일 크론이 DB를 읽는다).
- 비밀값(`BETTER_AUTH_SECRET`, `DATA_ENCRYPTION_KEY`, `CRON_SECRET`)은 Vercel과 저장소 밖 `~/.readme/prod-secrets.env`에 있다. **암호화 키를 잃으면 저장된 알레르기·사이즈·메모를 못 읽는다.**
- `vercel.json`이 매일 오전 8시(KST)에 생일 알림 크론을 부르고, 그때 7일 지난 데모 계정을 지운다.
- 약관류(로그인 없이 열림, `?lang=en`): `/privacy-policy`, `/terms`, `/delete-account`.

## 남은 외부 설정

1. **구글 로그인**: Google Cloud 프로젝트 `readme-514623`(Google 인증 플랫폼, 앱 이름 리드미, 외부, 승인된 도메인 watalabs.com), 웹 클라이언트 `readme web`(리디렉션 `https://readme.watalabs.com/api/auth/callback/google`, `http://localhost:3200/api/auth/callback/google`). 값은 Vercel·`apps/web/.env.local`·`~/.readme/google-oauth.env`. **게시 상태가 '테스트 중'이면 테스트 사용자만 로그인된다** → 대상 > 앱 게시로 프로덕션.
2. **Apple 로그인**(iOS 출시 전): Services ID + Sign in with Apple 키로 client secret(JWT)을 만들어 `APPLE_CLIENT_ID`·`APPLE_CLIENT_SECRET`. Return URL `https://readme.watalabs.com/api/auth/callback/apple`.
3. **앱 링크**: Android는 업로드 키와 Play 앱 서명 키 SHA-256이 `ANDROID_SHA256_FINGERPRINTS`에 있다(`/.well-known/*`는 요청 때 환경 변수를 읽는다). iOS는 Xcode에서 Associated Domains `applinks:readme.watalabs.com`, 서버에 `APPLE_TEAM_ID`.
4. **카카오톡 공유(선택)**: JavaScript 키를 `NEXT_PUBLIC_KAKAO_JS_KEY`에, 플랫폼에 운영 도메인 등록.
5. **서버 푸시(선택)**: Firebase 프로젝트 → `google-services.json`·APNs 키, 서비스 계정 값을 `FCM_*`에. 없으면 앱은 기기 로컬 알림만 쓴다(처리방침의 위탁 목록에 Google FCM을 더해야 한다).

## 아직 안 한 것

- 앱을 새로 깔았을 때 초대 링크가 저절로 이어지는 "지연 딥링크"는 붙이지 않았다. 대신 초대 화면·공유 결과에 6자리 코드가 있고, 앱 시작 화면의 "초대 코드가 있어요"로 연다. 필요하면 Airbridge·Branch를 붙인다.
- "사진으로 입력"(옷 태그 사진으로 사이즈 읽기)은 아직 없다. "말로 입력"은 브라우저 음성 인식이 되는 곳(크롬·사파리)에서만 보이고, iOS 앱 웹뷰에서는 숨는다.
- 초대 코드 입력·답하기 요청에 IP 단위 횟수 제한이 없다(코드 경우의 수 약 8.9억). 정식 출시 전에 Vercel 방화벽이나 미들웨어로 막는다.
- 데모 계정으로 쓰다가 앱에서 구글로 로그인하면(시스템 브라우저 경로) 데모 계정은 남았다가 7일 뒤 크론이 지운다(웹에서는 바로 지워진다).
