import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { TermsBody, TERMS_TITLE } from "@/components/legal/TermsBody";
import { legalLocale } from "@/lib/legal";

export const metadata: Metadata = { title: "이용약관 · Terms of Use" };

export default async function Terms({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const locale = await legalLocale((await searchParams).lang);
  return (
    <LegalPage locale={locale} path="/terms" title={TERMS_TITLE[locale]}>
      <TermsBody locale={locale} />
    </LegalPage>
  );
}
