# 추적 링크 모음 (2026-11-21)

채널마다 다른 링크를 쓰면 관리자 **통계 → 유입** 탭에서 어디가 효과 있는지 볼 수 있어요.

## 규칙(코드가 이렇게 읽어요 — `lib/usage.ts`의 `channelOf`, `app/get/route.ts`)

- `utm_source`: **영문 소문자와 밑줄만**, 20자까지. 숫자·하이픈은 `_`로 바뀌어요(`blog2` → `blog_`). 숫자는 `utm_campaign`에 넣으세요.
- `utm_campaign`: 영문·숫자·`_`·`.`·`-`, 60자까지. 철마다 바꿔요(예: `xmas2026`, `seol2027`, `parents2027`).
- `/get?from=…`: `from`은 영문 소문자와 밑줄 2~20자. **앱 받기 누름**(`app_get`)으로 기록돼요.
- **앱 설치가 목적인 링크는 `from=share_…`로 시작하게** 하세요. 그래야 아이폰이 App Store로 가요(그 밖의 `from`은 아이폰을 웹으로 보내요, 환경변수 `APP_STORE_URL`이 없을 때).
- 안드로이드·PC는 Play가 정식 공개되기 전까지 웹 첫 화면으로 가요(막다른 길 방지). Play를 정식 출시하면 Vercel에 `PLAY_PUBLIC=1`을 넣으면 Play 스토어로 가요.

## 채널별 링크

| 채널 | utm_source | 웹으로 들어오게(가입까지 추적) | 앱 받기(아이폰은 App Store) |
| --- | --- | --- | --- |
| 네이버 블로그 글 | `naver_blog` | https://remember-you.watalabs.com/?utm_source=naver_blog&utm_campaign=xmas2026 | https://remember-you.watalabs.com/get?from=share_naver_blog |
| 네이버 카페 | `naver_cafe` | https://remember-you.watalabs.com/?utm_source=naver_cafe&utm_campaign=xmas2026 | https://remember-you.watalabs.com/get?from=share_naver_cafe |
| 인스타그램(프로필·릴스) | `insta` | https://remember-you.watalabs.com/?utm_source=insta&utm_campaign=xmas2026 | https://remember-you.watalabs.com/get?from=share_insta |
| 유튜브 쇼츠 | `youtube` | https://remember-you.watalabs.com/?utm_source=youtube&utm_campaign=xmas2026 | https://remember-you.watalabs.com/get?from=share_youtube |
| 스레드 | `threads` | https://remember-you.watalabs.com/?utm_source=threads&utm_campaign=xmas2026 | https://remember-you.watalabs.com/get?from=share_threads |
| 디스콰이엇(메이커 커뮤니티) | `disquiet` | https://remember-you.watalabs.com/?utm_source=disquiet&utm_campaign=xmas2026 | https://remember-you.watalabs.com/get?from=share_disquiet |
| 카카오톡(지인·오픈채팅) | `kakao` | https://remember-you.watalabs.com/?utm_source=kakao&utm_campaign=xmas2026 | https://remember-you.watalabs.com/get?from=share_kakao |

## 선물 가이드로 들어오게(검색·글에서 바로 읽게)

`https://remember-you.watalabs.com/gifts/<slug>?utm_source=<채널>&utm_campaign=xmas2026_<slug>` — slug: `parents`(부모님) · `partner`(연인) · `friends`(친구) · `coworkers`(직장) · `hiking` · `golf` · `camping` · `coffee-tea`

예: https://remember-you.watalabs.com/gifts/parents?utm_source=naver_blog&utm_campaign=xmas2026_parents

## 이 링크로는 못 재는 것

`앱 받기 누름`은 설치가 아니라 **누른 수**예요. 실제 설치는 App Store Connect > 앱 분석 > 소스 > **캠페인 링크 만들기**로 채널별 링크(`ct=` 캠페인 이름)를 만들어 쓰면 채널별 설치 수가 App Store Connect에 잡혀요.
그 링크를 만들면 `/get`을 거치지 않으니 웹 유입과 따로 봐야 해요.

## 매주 보기(5분)

1. 관리자 > 통계 > **유입**: 채널별 방문·가입, 캠페인.
2. 관리자 > 통계 > **기능**: `앱 받기 누름` 수와 기기.
3. App Store Connect > 앱 분석: 노출·제품 페이지 조회·다운로드, 캠페인별.
4. 가입 대비 방문이 낮은 채널은 글·영상 말머리부터 고쳐요.
