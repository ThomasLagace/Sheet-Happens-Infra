#!/bin/sh
set -eu

cd /app

if node --input-type=module -e "import 'vite'" >/dev/null 2>&1; then
    echo "npm dependencies already present."
else
    echo "npm dependencies are missing or unusable in this container. Installing..."
    export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
    if [ -f package-lock.json ]; then
        npm ci --no-audit --no-fund
    else
        npm install --no-audit --no-fund
    fi
fi

exec npm run dev -- --host 0.0.0.0 --port 5173
