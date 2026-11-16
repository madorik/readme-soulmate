#!/usr/bin/env bash
# 운영 DB를 덤프해서 비밀번호로 암호화한 파일 하나로 만든다(pg_dump + openssl AES-256).
#   DATABASE_URL_UNPOOLED=... BACKUP_PASSPHRASE=... scripts/backup-db.sh [출력 파일]
# - 세션 풀러(5432) 주소를 쓴다(트랜잭션 풀러 6543은 pg_dump가 못 쓴다). pg_dump는 DB 버전(17) 이상이어야 한다
# - public·app 스키마만. 다시 만들 수 있거나 사용자 정보가 아닌 표의 '내용'은 뺀다(표 모양은 들어 있다):
#   app_events(이용 기록, 가장 크다. 넣으려면 BACKUP_INCLUDE_EVENTS=1), session·verification(로그인 세션·인증 토큰), coupang_searches·coupang_calls·ai_calls(캐시·한도 세기)
# - 비밀번호가 없으면 만들지 않는다. 비밀번호는 환경 변수로만 받는다(명령 줄·로그에 안 남게)
# - 알레르기·사이즈·메모는 DATA_ENCRYPTION_KEY로 이미 암호화돼 있다. 그 키를 따로 보관하지 않으면 백업을 풀어도 읽지 못한다
# 복원: README의 '백업·복원'
set -euo pipefail

: "${DATABASE_URL_UNPOOLED:?DATABASE_URL_UNPOOLED가 필요해요(세션 풀러 5432 주소)}"
: "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE가 필요해요}"

out="${1:-readme-$(date -u +%Y%m%dT%H%M%SZ).dump.enc}"

exclude=(
  --exclude-table-data=public.session
  --exclude-table-data=public.verification
  --exclude-table-data=public.coupang_searches
  --exclude-table-data=public.coupang_calls
  --exclude-table-data=public.ai_calls
)
if [ "${BACKUP_INCLUDE_EVENTS:-}" != "1" ]; then
  exclude+=(--exclude-table-data=public.app_events)
fi

# 파이프 중간에서 pg_dump가 실패해도 알아채도록(pipefail) 임시 파일 없이 바로 암호화한다. 실패하면 반쯤 쓴 파일은 지운다
trap 'rm -f "$out"' ERR
pg_dump --format=custom --no-owner --schema=public --schema=app "${exclude[@]}" "$DATABASE_URL_UNPOOLED" \
  | openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -salt -pass env:BACKUP_PASSPHRASE -out "$out"
trap - ERR

# 빈 파일·잘린 파일을 성공으로 치지 않는다(암호화 머리글만 있어도 16바이트라 그보다 충분히 커야 한다)
size=$(wc -c < "$out" | tr -d ' ')
if [ "$size" -lt 1024 ]; then
  rm -f "$out"
  echo "백업이 너무 작아요($size바이트): 덤프가 비었어요" >&2
  exit 1
fi
echo "$out ($size바이트)"
