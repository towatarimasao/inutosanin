#!/bin/bash
# photo_urlキャッシュバッチを updated:0 になるまでループ実行する

BASE_URL="${1:-http://localhost:3000}"
LIMIT="${2:-10}"
CRON_SECRET="inutosanin-cron-2026"
INTERVAL=3  # API負荷対策のウェイト（秒）

echo "=== cache-photos バッチ開始 ==="
echo "URL   : ${BASE_URL}/api/batch/cache-photos?limit=${LIMIT}"
echo "LIMIT : ${LIMIT} 件/回"
echo ""

round=1

while true; do
  echo -n "[Round ${round}] $(date '+%H:%M:%S') ... "

  response=$(curl -s \
    -H "Authorization: Bearer ${CRON_SECRET}" \
    "${BASE_URL}/api/batch/cache-photos?limit=${LIMIT}")

  if [ $? -ne 0 ]; then
    echo "ERROR: curl 失敗"
    exit 1
  fi

  updated=$(echo "$response" | grep -o '"updated":[0-9]*' | grep -o '[0-9]*')
  skipped=$(echo "$response" | grep -o '"skipped":[0-9]*' | grep -o '[0-9]*')
  targets=$(echo "$response" | grep -o '"targets":[0-9]*' | grep -o '[0-9]*')

  echo "targets=${targets} updated=${updated} skipped=${skipped}"

  # エラーがあれば表示
  if echo "$response" | grep -q '"errors"'; then
    echo "  WARN: $(echo "$response" | grep -o '"errors":\[.*\]')"
  fi

  # updated が 0 なら終了
  if [ "${updated}" = "0" ]; then
    echo ""
    echo "=== updated:0 のため停止 ==="
    exit 0
  fi

  round=$((round + 1))
  sleep "${INTERVAL}"
done
