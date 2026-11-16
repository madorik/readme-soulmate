// 구조화 데이터(schema.org JSON-LD): 검색·AI 답변이 이 페이지가 무엇인지 읽게. </script> 같은 글이 끼지 않게 <를 바꿔 넣는다
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
