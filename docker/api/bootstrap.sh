#!/usr/bin/env bash
set -euo pipefail

cd /var/www/html

need_install=0
if [ ! -f vendor/autoload.php ]; then
    need_install=1
else
    case "$(printf "%s" "${APP_ENV:-production}" | tr -d "\"'")" in
        local|development|testing)
            # The api-vendor volume is seeded from the image (--no-dev tree).
            [ -d vendor/phpunit/phpunit ] || need_install=1
            ;;
    esac
fi

if [ "$need_install" = 0 ]; then
    echo "Composer dependencies already present."
else
    echo "Composer dependencies are missing. Installing..."

    if ! command -v composer >/dev/null 2>&1; then
        echo "Composer is not in this image. Downloading it."
        curl -fsSL https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
    fi

    export COMPOSER_ALLOW_SUPERUSER=1
    if command -v git >/dev/null 2>&1; then
        git config --global --add safe.directory /var/www/html || true
    fi

    app_env="${APP_ENV:-production}"
    app_env="${app_env//$'\r'/}"
    app_env="${app_env#\"}"
    app_env="${app_env%\"}"
    app_env="${app_env#\'}"
    app_env="${app_env%\'}"

    composer_args=(install --no-interaction --prefer-dist --no-progress --no-scripts)
    case "$app_env" in
        local|development|testing)
            ;;
        *)
            composer_args+=(--no-dev --optimize-autoloader)
            ;;
    esac

    composer "${composer_args[@]}"

    mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache
    rm -f bootstrap/cache/*.php
fi

# Use the app tree entrypoint (bind-mounted in Compose), not the copy baked
# at /entrypoint.sh in the image — otherwise local edits to backend/entrypoint.sh
# never run.
exec /var/www/html/entrypoint.sh
