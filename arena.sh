#!/usr/bin/env bash
# arena.sh — jalankan / hentikan AI Arena Hub (caddy + semua model) di tmux.
#
# Usage:
#   ./arena.sh --start   # caddy :8080 + 1 window serve per model di aggregator/models.json
#   ./arena.sh --stop    # matikan session tmux + caddy
#
# Model dibaca dari aggregator/models.json (id + port).
# Model tanpa folder dist/ di-SKIP (mis. yang source-nya rusak / belum kelar).

set -u

BASE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SESSION="arena"
MODELS_JSON="$BASE/aggregator/models.json"

usage() {
  echo "Usage: $0 --start | --stop"
  exit 1
}

do_stop() {
  echo "-- stop arena --"
  if tmux has-session -t "$SESSION" 2>/dev/null; then
    tmux kill-session -t "$SESSION" && echo "tmux session '$SESSION' killed"
  else
    echo "no tmux session '$SESSION'"
  fi
  # Caddy mengabaikan SIGHUP jadi tidak ikut mati saat session di-kill.
  # Harus di-kill eksplisit, kalau tidak ia tetap listen :8080 (SO_REUSEPORT)
  # dengan config lama dan bikin routing flip-flop dengan caddy yang baru.
  if pgrep -x caddy >/dev/null; then
    pkill -x caddy && echo "caddy stopped"
    sleep 1
  else
    echo "caddy not running"
  fi
  if pgrep -x caddy >/dev/null; then
    echo "WARN: caddy masih hidup:"; pgrep -a -x caddy; return 1
  fi
  echo "stopped."
}

do_start() {
  if tmux has-session -t "$SESSION" 2>/dev/null; then
    echo "session '$SESSION' sudah jalan — jalankan '$0 --stop' dulu"
    exit 1
  fi
  if pgrep -x caddy >/dev/null; then
    echo "stale caddy ditemukan, kill dulu:"; pgrep -a -x caddy
    pkill -x caddy; sleep 1
  fi
  command -v caddy >/dev/null || { echo "caddy tidak ada di PATH"; exit 1; }
  command -v tmux >/dev/null || { echo "tmux tidak ada di PATH"; exit 1; }

  echo "-- start caddy (:8080) --"
  tmux new-session -d -s "$SESSION" -n caddy -c "$BASE" \
    "caddy run --config Caddyfile; echo 'caddy exit, tekan enter'; read"

  echo "-- start models (dari aggregator/models.json) --"
  while read -r id port; do
    if [ ! -d "$BASE/$id/dist" ]; then
      echo "SKIP $id (tidak ada dist/)"
      continue
    fi
    tmux new-window -t "$SESSION" -n "$id" -c "$BASE/$id" \
      "npx -y serve -s -l $port dist; echo 'serve exit, tekan enter'; read"
    echo "  $id -> $port"
  done < <(python3 -c "import json; [print(m['id'], m['port']) for m in json.load(open('$MODELS_JSON'))]")

  sleep 12
  echo "-- windows --"
  tmux list-windows -t "$SESSION" -F "#{window_index} #{window_name}"
  echo "dashboard: http://localhost:8080/"
}

[ $# -eq 1 ] || usage
case "$1" in
  --start) do_start ;;
  --stop) do_stop ;;
  *) usage ;;
esac
