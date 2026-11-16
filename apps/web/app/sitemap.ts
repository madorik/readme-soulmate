import type { MetadataRoute } from "next";
import { GUIDES } from "@/lib/guides";
import { LEGAL_EFFECTIVE_ON } from "@/lib/legal";
import { absoluteUrl } from "@/lib/site";

// 검색에 내보내는 주소: 시작 화면·선물 가이드·약관류
const GUIDES_UPDATED = "2026-11-16";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl("/"), lastModified: GUIDES_UPDATED, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/gifts"), lastModified: GUIDES_UPDATED, changeFrequency: "weekly", priority: 0.9 },
    ...GUIDES.map((g) => ({ url: absoluteUrl(`/gifts/${g.slug}`), lastModified: GUIDES_UPDATED, changeFrequency: "weekly" as const, priority: 0.8 })),
    { url: absoluteUrl("/terms"), lastModified: LEGAL_EFFECTIVE_ON, changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/privacy-policy"), lastModified: LEGAL_EFFECTIVE_ON, changeFrequency: "yearly", priority: 0.2 },
  ];
}
