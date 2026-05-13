#!/bin/zsh

set -euo pipefail

PORT="${1:-8001}"

cd "$(dirname "$0")"

echo "Starting Frame Maker dev server at http://localhost:${PORT}"
exec npx vite --host 0.0.0.0 --port "${PORT}"
