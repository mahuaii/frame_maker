#!/bin/zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
THUMBNAILS_DIR="${ROOT_DIR}/thumbnails"
SAMPLE_RELATIVE_PATH="assets/samples/thumbnail-source-z30.jpg"
GENERATOR_PAGE="scripts/thumbnail-generator.html"
EDGE_BIN="${EDGE_BIN:-/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge}"
MAX_WIDTH="${THUMBNAIL_RENDER_MAX_WIDTH:-540}"
MAX_HEIGHT="${THUMBNAIL_RENDER_MAX_HEIGHT:-405}"
HOST="127.0.0.1"
FORCE_REBUILD="false"

if [[ "${1:-}" == "--force" ]]; then
    FORCE_REBUILD="true"
fi

if [[ ! -x "${EDGE_BIN}" ]]; then
    echo "Missing headless browser: ${EDGE_BIN}" >&2
    exit 1
fi

if [[ ! -f "${ROOT_DIR}/${SAMPLE_RELATIVE_PATH}" ]]; then
    echo "Missing sample photo: ${ROOT_DIR}/${SAMPLE_RELATIVE_PATH}" >&2
    exit 1
fi

mkdir -p "${THUMBNAILS_DIR}"

TEMPLATE_IDS=("${(@f)$(cd "${ROOT_DIR}" && node --input-type=module -e "import { templates } from './js/templates.js'; console.log(templates.map((template) => template.id).join('\n'));")}")
MISSING_TEMPLATE_IDS=()

for template_id in "${TEMPLATE_IDS[@]}"; do
    output_path="${THUMBNAILS_DIR}/${template_id}_thumbnail.png"
    if [[ "${FORCE_REBUILD}" == "true" || ! -f "${output_path}" ]]; then
        MISSING_TEMPLATE_IDS+=("${template_id}")
    fi
done

if [[ "${#MISSING_TEMPLATE_IDS[@]}" -eq 0 ]]; then
    echo "All thumbnails already exist."
    exit 0
fi

PORT="$(python3 - <<'PY'
import socket

with socket.socket() as sock:
    sock.bind(("127.0.0.1", 0))
    print(sock.getsockname()[1])
PY
)"

SERVER_PID=""

cleanup() {
    if [[ -n "${SERVER_PID}" ]]; then
        kill "${SERVER_PID}" >/dev/null 2>&1 || true
        wait "${SERVER_PID}" 2>/dev/null || true
    fi
}

trap cleanup EXIT

cd "${ROOT_DIR}"
python3 -m http.server "${PORT}" --bind "${HOST}" >/tmp/frame-maker-thumbnail-server.log 2>&1 &
SERVER_PID="$!"
sleep 1

for template_id in "${MISSING_TEMPLATE_IDS[@]}"; do
    output_path="${THUMBNAILS_DIR}/${template_id}_thumbnail.png"
    url="http://${HOST}:${PORT}/${GENERATOR_PAGE}?templateId=${template_id}&sample=${SAMPLE_RELATIVE_PATH}&maxWidth=${MAX_WIDTH}&maxHeight=${MAX_HEIGHT}"

    echo "Generating ${template_id} -> ${output_path}"

    html_output="$("${EDGE_BIN}" \
        --headless \
        --disable-gpu \
        --virtual-time-budget=10000 \
        --dump-dom \
        "${url}")"

    printf '%s' "${html_output}" | python3 -c '
import base64
import html
import re
import sys

dom = sys.stdin.read()
output_path = sys.argv[1]

status_match = re.search(r"<pre[^>]*id=\"status\"[^>]*>(.*?)</pre>", dom, re.S)
status_text = html.unescape(status_match.group(1).strip()) if status_match else "unknown"

data_match = re.search(r"<textarea[^>]*id=\"thumbnail-data\"[^>]*>(.*?)</textarea>", dom, re.S)
if not data_match:
    raise SystemExit(f"Thumbnail generation failed: {status_text}")

data_url = html.unescape(data_match.group(1).strip())
prefix = "data:image/png;base64,"

if not data_url.startswith(prefix):
    raise SystemExit(f"Unexpected thumbnail payload: {status_text}")

with open(output_path, "wb") as handle:
    handle.write(base64.b64decode(data_url[len(prefix):]))
' "${output_path}"
done

echo "Thumbnail generation complete."
