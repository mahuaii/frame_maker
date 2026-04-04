#!/bin/zsh

set -euo pipefail

PORT="${1:-8001}"

cd "$(dirname "$0")"

echo "Serving Frame Maker at http://localhost:${PORT}"
exec python3 -m http.server "${PORT}"
