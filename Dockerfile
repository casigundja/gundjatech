# ==============================================================================
# GundjaTech • Production Dockerfile (PHP 8.4 + Apache + PostgreSQL + Vite)
# Optimized for Render.com / Railway / Fly.io / Cloud Containers
# ==============================================================================
FROM composer:2 AS composer_bin
FROM node:22-bookworm-slim AS node_bin

FROM php:8.4-apache-bookworm

ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
ENV COMPOSER_ALLOW_SUPERUSER=1
ENV PORT=10000

# System dependencies & PHP extensions for Laravel 13 + Supabase PostgreSQL
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        git \
        unzip \
        libpq-dev \
        libzip-dev \
        libicu-dev \
        libpng-dev \
        libjpeg62-turbo-dev \
        libfreetype6-dev \
        libonig-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo \
        pdo_pgsql \
        pgsql \
        mbstring \
        bcmath \
        intl \
        zip \
        gd \
        opcache \
    && a2enmod rewrite headers \
    && rm -rf /var/lib/apt/lists/*

# PHP production tuning (OPcache + upload limits)
RUN { \
        echo "memory_limit=256M"; \
        echo "upload_max_filesize=20M"; \
        echo "post_max_size=25M"; \
        echo "max_execution_time=60"; \
        echo "opcache.enable=1"; \
        echo "opcache.memory_consumption=128"; \
        echo "opcache.interned_strings_buffer=16"; \
        echo "opcache.max_accelerated_files=10000"; \
        echo "opcache.validate_timestamps=0"; \
    } > /usr/local/etc/php/conf.d/gundjatech.ini

# Configure Apache DocumentRoot -> /var/www/html/public with AllowOverride All
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
    && sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf \
    && printf '<Directory /var/www/html/public>\n    Options -Indexes +FollowSymLinks\n    AllowOverride All\n    Require all granted\n</Directory>\n' > /etc/apache2/conf-available/gundjatech-public.conf \
    && a2enconf gundjatech-public

# Bring in Composer & Node 22 for build step
COPY --from=composer_bin /usr/bin/composer /usr/bin/composer
COPY --from=node_bin /usr/local/bin/node /usr/local/bin/node
COPY --from=node_bin /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -sf /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -sf /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

WORKDIR /var/www/html

# Install PHP dependencies first (cached Docker layer)
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --no-scripts --optimize-autoloader

# Copy application source
COPY . .

# Finish Composer autoload & package discovery
RUN composer dump-autoload --no-dev --optimize \
    && php artisan package:discover --ansi

# Build Vite + Tailwind v4 frontend assets, then strip node_modules to keep image small
RUN (npm ci --no-audit --no-fund || npm install --no-audit --no-fund) && npm run build && rm -rf node_modules /root/.npm

# Prepare writable Laravel directories & entrypoint script
COPY docker/start.sh /usr/local/bin/start.sh
RUN sed -i 's/\r$//' /usr/local/bin/start.sh \
    && chmod +x /usr/local/bin/start.sh \
    && mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

EXPOSE 10000

CMD ["/usr/local/bin/start.sh"]
