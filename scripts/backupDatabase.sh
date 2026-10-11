#!/usr/bin/env bash
set -euo pipefail

PG_BIN="${PG_BIN:-/opt/homebrew/opt/libpq/bin}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/Backups/fit-coach}"

if [ -z "${DATABASE_URL_UNPOOLED:-}" ] && [ -f .env.local ]; then
  DATABASE_URL_UNPOOLED="$(grep -E '^DATABASE_URL_UNPOOLED=' .env.local | cut -d= -f2- | sed -E "s/^['\"]//; s/['\"]$//")"
fi
: "${DATABASE_URL_UNPOOLED:?DATABASE_URL_UNPOOLED is not set}"

host="$(printf '%s' "$DATABASE_URL_UNPOOLED" | sed -E 's#^[^@]*@([^.:/]*).*#\1#')"
expected="${1:-}"
if [ "$expected" != "$host" ]; then
  echo "Refusing: pass the Neon endpoint to back up as the first argument (connected to $host)." >&2
  exit 1
fi

umask 077
mkdir -p "$BACKUP_DIR"
file="$BACKUP_DIR/neon-$host-$(date +%Y%m%d-%H%M).dump"

"$PG_BIN/pg_dump" --format=custom --no-owner --no-privileges --file="$file" "$DATABASE_URL_UNPOOLED"
listing="$("$PG_BIN/pg_restore" --list "$file")"
entries="$(printf '%s\n' "$listing" | grep -c 'TABLE DATA' || true)"
echo "backup $file ($(du -h "$file" | cut -f1), $entries tables with data)"
