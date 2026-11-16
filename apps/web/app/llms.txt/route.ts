import { GUIDES } from "@/lib/guides";
import { SUPPORT_EMAIL } from "@/lib/legal";
import { absoluteUrl } from "@/lib/site";

// llms.txt: AI 검색·답변 엔진(GEO)이 이 서비스를 한 번에 이해하도록 쓰는 요약(https://llmstxt.org 형식)
export const dynamic = "force-static";

export function GET() {
  const body = `# 기억해유 (Remember You)

> 가족·연인·친구처럼 가까운 사람의 취향, 못 먹는 음식(알레르기), 사이즈, 생일·기념일을 적어 두고, 모르는 건 링크로 물어보고, 챙길 날이 다가오면 그 사람에게 맞는 선물을 가격대별로 골라 주는 무료 앱이에요. "사랑하는 사람들의 컨닝페이퍼".

- 만든 곳: 와타랩스(WataLabs), 대한민국
- 쓰는 곳: 웹 ${absoluteUrl("/")} · 아이폰·안드로이드 앱
- 값: 무료(선물 링크는 쿠팡 파트너스 링크라, 구매 시 일정액의 수수료를 받아요)
- 개인정보: 내가 적은 기록과 메모는 나만 봐요. 알레르기·사이즈·날짜·메모는 암호화해서 저장해요. 공개 프로필이나 이름 검색은 없어요.

## 할 수 있는 것
- 나에 대한 기록: 취향, 못 먹는 음식, 사이즈, 생일을 적어 두고 가까운 사람에게 보여 줄 수 있어요.
- 내 사람들 기록: 가족·연인·친구·동료를 폴더로 묶고, 각자의 취향·사이즈·챙길 날·메모를 적어요. 말이나 글로 한 문장을 적으면 사람·항목을 알아서 나눠 넣어요.
- 물어보기: 모르는 항목은 링크로 물어보면, 답이 바로 내 기록에 들어가요(상대는 앱 설치 없이 답해요).
- 챙길 날 알림: 생일(음력 포함)·기념일이 다가오면 알려 줘요.
- 선물 추천: 그 사람의 기록과 메모를 보고 1만원대·3만원대·5만원대·10만원 이상 가격대마다 다섯 개씩 골라, 왜 어울리는지 한 문장으로 알려 줘요. 작년에 준 선물은 빼요. 가족에게 카드로 보내 같이 고를 수 있어요.

## 선물 가이드
${GUIDES.map((g) => `- [${g.title}](${absoluteUrl(`/gifts/${g.slug}`)}): ${g.description}`).join("\n")}

## 더 보기
- [선물 가이드 모음](${absoluteUrl("/gifts")})
- [이용약관](${absoluteUrl("/terms")})
- [개인정보 처리방침](${absoluteUrl("/privacy-policy")})
- 문의: ${SUPPORT_EMAIL}
`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
