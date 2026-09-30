#!/usr/bin/env sh
# Create missing .env files for infra, frontend, and backend from templates.
# Never overwrites an existing .env.
set -eu

ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"

ensure_env_file() {
    label="$1"
    target="$2"
    shift 2

    if [ -f "$target" ]; then
        echo "OK  ${label} already exists: ${target}"
        return 0
    fi

    for src in "$@"; do
        if [ -f "$src" ]; then
            dir="$(dirname "$target")"
            if [ ! -d "$dir" ]; then
                echo "Cannot create ${label} .env: directory missing (${dir}). Clone the app first." >&2
                exit 1
            fi
            cp "$src" "$target"
            echo "OK  ${label} created: ${target} <- ${src}"
            return 0
        fi
    done

    echo "Cannot create ${label} .env: no template found among: $*" >&2
    exit 1
}

ensure_env_file "infra" "${ROOT}/.env" \
    "${ROOT}/.env.development" \
    "${ROOT}/.env.example"

ensure_env_file "frontend" "${ROOT}/frontend/.env" \
    "${ROOT}/frontend/.env.example"

ensure_env_file "backend" "${ROOT}/backend/.env" \
    "${ROOT}/backend/.env.example"

echo "ensure-env: done"
