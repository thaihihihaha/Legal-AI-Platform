#!/bin/sh
# Khởi tạo lược đồ CSDL lần đầu rồi chạy máy chủ.
#
# VÌ SAO CẦN: server/src/app.js gọi ensureMvpTables() lúc khởi động, mà hàm đó tạo bảng có khoá
# ngoại trỏ `companies(id)` — bảng nằm trong database/init.sql. Postgres rỗng ⇒ app sập ngay với
# `relation "companies" does not exist`. Hợp đồng mẫu của VAYS chưa có bước "init job", nên đặt ở đây.
set -e

# DATABASE_URL của Prisma mang tham số riêng (`?schema=`, `connection_limit`, `pgbouncer`…) mà psql
# từ chối thẳng: `invalid URI query parameter: "schema"`. Giữ lại đúng nhóm tham số TLS psql hiểu.
psql_url() {
  base=${1%%\?*}
  query=""
  case "$1" in *\?*) query=${1#*\?} ;; esac
  keep=""
  OIFS=$IFS
  IFS='&'
  for kv in $query; do
    case "$kv" in
      sslmode=*|sslrootcert=*|sslcert=*|sslkey=*) keep="${keep:+$keep&}$kv" ;;
    esac
  done
  IFS=$OIFS
  printf '%s' "$base${keep:+?$keep}"
}

if [ -n "$DATABASE_URL" ]; then
  PG_URL=$(psql_url "$DATABASE_URL")
  if psql "$PG_URL" -tAc "SELECT to_regclass('public.companies')" 2>/dev/null | grep -q companies; then
    echo "[init] Lược đồ đã có — bỏ qua init.sql."
  else
    echo "[init] Chưa có lược đồ — áp /app/database/init.sql…"
    # CREATE TYPE ... AS ENUM trong init.sql KHÔNG có IF NOT EXISTS, nên tệp này chỉ an toàn khi
    # chạy đúng một lần. Cổng kiểm `companies` ở trên là thứ bảo đảm điều đó qua mọi lần deploy lại.
    #
    # KHÔNG dùng ON_ERROR_STOP: init.sql khai `embedding vector` không số chiều (dòng 117, 282) rồi
    # tạo index ivfflat trên chính cột đó (dòng 457-458) — pgvector luôn từ chối. Dừng ở đó thì mất
    # cả lược đồ vì hai index chỉ là tối ưu tốc độ. Cho chạy tiếp, nhưng đếm và in lỗi ra.
    psql "$PG_URL" -f /app/database/init.sql > /tmp/init.log 2>&1 || true
    if ! psql "$PG_URL" -tAc "SELECT to_regclass('public.companies')" 2>/dev/null | grep -q companies; then
      echo "[init] ✗ Khởi tạo lược đồ THẤT BẠI — không tạo được bảng companies:"
      grep -E "ERROR" /tmp/init.log | head -10
      # KHÔNG exit: dòng cuối tệp này là `exec node index.js`, và `set -e` ở đầu tệp khiến exit 1
      # thành container không bao giờ khởi động. App vẫn phải lên để còn phục vụ /v1/health, trang
      # React tĩnh và log chẩn đoán. ensureAuthSchema() trong bootstrap.js cũng chịu lỗi từng câu.
      echo "[init] Vẫn khởi động app để còn xem log và /v1/health."
    fi
    errs=$(grep -cE "^psql:.*ERROR" /tmp/init.log || true)
    if [ "${errs:-0}" -gt 0 ]; then
      echo "[init] ⚠ $errs câu lệnh lỗi được bỏ qua (lược đồ chính đã tạo xong):"
      grep -E "^psql:.*ERROR" /tmp/init.log | head -5
    fi
    echo "[init] Xong."
  fi
else
  echo "[init] Không có DATABASE_URL — bỏ qua khởi tạo lược đồ."
fi

# App đọc APP_PORT (server/index.js:3); nền tảng tiêm PORT.
export APP_PORT="${PORT:-${APP_PORT:-8080}}"
exec node index.js
