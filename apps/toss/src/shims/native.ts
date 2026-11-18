// components/native(Capacitor 앱 전용) 대신. 토스 미니앱은 Capacitor 앱이 아니고, 원본은 next/navigation을 들여와 번들에 넣을 수 없다
export function isNativeApp(): boolean {
  return false;
}

export function useIsNative(): boolean {
  return false;
}
