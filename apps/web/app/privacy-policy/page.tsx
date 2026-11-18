import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { PrivacyBody, PRIVACY_TITLE } from "@/components/legal/PrivacyBody";
import { legalLocale } from "@/lib/legal";

export const metadata: Metadata = { title: "개인정보 처리방침 · Privacy Policy" };

export default async function PrivacyPolicy({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const locale = await legalLocale((await searchParams).lang);
  return (
    <LegalPage locale={locale} path="/privacy-policy" title={PRIVACY_TITLE[locale]}>
      <PrivacyBody locale={locale} />
    </LegalPage>
  );
}
