#!/usr/bin/env bash
set -euo pipefail

PG_BIN="${PG_BIN:-/opt/homebrew/opt/libpq/bin}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/Backups/fit-coach}"

if [ -z "${DATABASE_URL_UNPOOLED:-}" ] && [ -f .env.local ]; then
  DATABASE_URL_UNPOOLED="$(grep -E '^DATABASE_URL_UNPOOLED=' .env.local | cut -d= -f2-)"
fi
: "${DATABASE_URL_UNPOOLED:?DATABASE_URL_UNPOOLED is not set}"

host="$(printf '%s' "$DATABASE_URL_UNPOOLED" | sed -E 's#^[^@]*@([^.:/]*).*#\1#')"
file="$BACKUP_DIR/neon-$host-$(date +%Y%m%d-%H%M).dump"
mkdir -p "$BACKUP_DIR"

"$PG_BIN/pg_dump" --format=custom --no-owner --no-privileges --file="$file" "$DATABASE_URL_UNPOOLED"
entries="$("$PG_BIN/pg_restore" --list "$file" | grep -c 'TABLE DATA')"
echo "backup $file ($(du -h "$file" | cut -f1), $entries tables with data)"
