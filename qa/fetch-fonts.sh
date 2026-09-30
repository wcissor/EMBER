#!/bin/sh
# Downloads the Onest + Noto Sans Mono CSS and woff2 files once, so test runs render the real fonts
# even where fonts.googleapis.com is unreachable. Optional: without it the tests use the network or the system-ui fallback.
set -e
cd "$(dirname "$0")" && mkdir -p fonts
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
curl -sS -A "$UA" "https://fonts.googleapis.com/css2?family=Noto+Sans+Mono:wght@400;500;600&family=Onest:wght@400;500;600&display=swap" -o fonts/css.css
grep -o 'https://fonts.gstatic.com/[^)]*' fonts/css.css | sort -u | while read u; do curl -sS "$u" -o "fonts/$(echo "$u" | sed 's#https://fonts.gstatic.com/##; s#/#_#g')"; done
