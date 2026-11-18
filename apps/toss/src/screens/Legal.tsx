import { PrivacyBody, PRIVACY_TITLE } from "@/components/legal/PrivacyBody";
import { TermsBody, TERMS_TITLE } from "@/components/legal/TermsBody";
import { formatEffective } from "@/lib/legal-info";
import { useNav } from "../nav";
import { Page } from "../ui";

// 개인정보 처리방침·이용약관: 웹과 같은 본문을 토스 화면 안에서 보여 준다(자사 사이트로 내보내지 않는다).
// 본문 속 웹 주소 링크는 토스 화면으로 바꿔 연다

export type LegalDoc = "privacy" | "terms";

export function Legal({ doc }: { doc: LegalDoc }) {
  const { navigate } = useNav();
  const onClick = (e: React.MouseEvent) => {
    const href = (e.target as Element).closest?.("a[href]")?.getAttribute("href") ?? "";
    if (href.startsWith("/delete-account")) {
      e.preventDefault();
      navigate("/privacy");
    }
  };
  return (
    <Page>
      <div className="px-6 pb-8">
        <h1 className="headline pt-1 text-[24px]">{doc === "privacy" ? PRIVACY_TITLE.ko : TERMS_TITLE.ko}</h1>
        <p className="pt-2 text-[13px] text-muted">시행일 {formatEffective("ko")}</p>
        <article className="legal pt-2" onClick={onClick}>
          {doc === "privacy" ? <PrivacyBody locale="ko" /> : <TermsBody locale="ko" />}
        </article>
      </div>
    </Page>
  );
}
