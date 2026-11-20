// 앱 첫 실행 로딩 덮개(components/LaunchOverlay.tsx)와 같이 HTML 맨 앞에 박는 아주 작은 스크립트. JS 번들이 오기 전에 돈다.
// 1) 이 앱 실행에서 덮개를 이미 보여 줬으면(sessionStorage) 덮개를 처음부터 숨긴다(html.ry-seen): 로그인 되돌아오기 같은 전체 새로고침마다 보이지 않게
// 2) 덮개가 그려지기 시작하면 네이티브 스플래시(정지판)를 바로 걷는다: 정지판 → 움직이는 로딩 화면으로 이어진다.
//    덮개가 문서에 들어오고 로고 글꼴이 준비되길 잠깐(글꼴은 최대 0.5초) 기다리고, 안드로이드는 스플래시가 있는 동안 화면을 그리지 않아 rAF가 안 돌 수 있어 타이머로도 건다
// 앱(Capacitor)이 아니면 이 스크립트는 아예 내려가지 않는다
export const LAUNCH_SEEN_KEY = "ry-boot";

export const LAUNCH_BOOT_SCRIPT = `(function(){var w=window,d=document,s=false,r=false,n=0;
try{if(w.sessionStorage.getItem("${LAUNCH_SEEN_KEY}"))d.documentElement.classList.add("ry-seen")}catch(e){}
function hide(){if(s)return;if(!d.querySelector(".ry-boot")&&n++<20){setTimeout(hide,50);return}s=true;try{w.Capacitor.Plugins.SplashScreen.hide({fadeOutDuration:200})}catch(e){}}
function go(){if(r)return;r=true;requestAnimationFrame(function(){requestAnimationFrame(hide)});setTimeout(hide,150)}
setTimeout(go,500);
try{d.fonts.load('56px "Wordmark Hand"','기억해Remember').then(go,go)}catch(e){go()}
})();`;
