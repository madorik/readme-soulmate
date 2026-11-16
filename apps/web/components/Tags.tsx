import Script from "next/script";

// GA4(NEXT_PUBLIC_GA_ID = G-…)·GTM(NEXT_PUBLIC_GTM_ID = GTM-…): 값이 있을 때만 싣는다(배포할 때 넣는 값).
// 화면 보기는 우리가 사람 id·토큰을 지운 주소로 직접 보낸다(GA4 자동 page_view는 끈다). GTM 안에 GA4 태그를 또 두면 두 번 셀 수 있으니 하나만 쓴다

const GA = /^G-[A-Z0-9]{4,20}$/.test(process.env.NEXT_PUBLIC_GA_ID ?? "") ? process.env.NEXT_PUBLIC_GA_ID! : null;
const GTM = /^GTM-[A-Z0-9]{4,12}$/.test(process.env.NEXT_PUBLIC_GTM_ID ?? "") ? process.env.NEXT_PUBLIC_GTM_ID! : null;

export function Tags() {
  return (
    <>
      {GTM ? (
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM}');`}
        </Script>
      ) : null}
      {GA ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA}',{send_page_view:false});`}
          </Script>
        </>
      ) : null}
    </>
  );
}
