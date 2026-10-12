FROM composer:latest AS vendor

WORKDIR /app

COPY composer.json composer.lock ./

RUN composer install --no-scripts --no-interaction --no-progress --prefer-dist --optimize-autoloader --no-dev

FROM php:8.5-fpm

# Production-safe image defaults. .env.example is a dev template and is not
# copied on boot. Infra overrides these with environment variables.
ARG APP_ENV=production
ENV APP_ENV=${APP_ENV}
ENV APP_DEBUG=false

ARG WWWUSER=1000
ARG WWWGROUP=1000
ARG INSTALL_XDEBUG=false

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libpq-dev \
    libzip-dev \
    libicu-dev \
    libfcgi-bin \
    zip \
    unzip \
    git \
    && docker-php-ext-install \
        pdo \
        pdo_mysql \
        pdo_pgsql \
        mbstring \
        exif \
        pcntl \
        bcmath \
        gd \
        zip \
        intl \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN { \
    echo 'pm.status_path = /status'; \
    echo 'ping.path = /ping'; \
    echo 'clear_env = no'; \
} >> /usr/local/etc/php-fpm.d/www.conf

RUN { \
    echo 'xdebug.client_host=host.docker.internal'; \
    echo 'xdebug.start_with_request=yes'; \
} > /usr/local/etc/php/conf.d/xdebug.ini

RUN if [ "$INSTALL_XDEBUG" = "true" ]; then \
    pecl install xdebug && docker-php-ext-enable xdebug; \
fi

RUN groupmod -g $WWWGROUP www-data && usermod -u $WWWUSER -g $WWWGROUP www-data

WORKDIR /var/www/html

COPY . .
COPY --from=vendor /app/vendor ./vendor
COPY --from=vendor /usr/bin/composer /usr/local/bin/composer
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh \
    && rm -f bootstrap/cache/*.php \
    && mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && php artisan package:discover --ansi --no-interaction \
    && chown -R www-data:www-data storage bootstrap/cache

ENTRYPOINT ["/entrypoint.sh"]