#!/usr/bin/env bash
set -e

PORT="${PORT:-10000}"

# Bind Apache dynamically to the platform PORT (Render / Railway / Fly)
sed -ri "s/Listen [0-9]+/Listen ${PORT}/g" /etc/apache2/ports.conf
sed -ri "s/<VirtualHost \*:[0-9]+>/<VirtualHost *:${PORT}>/g" /etc/apache2/sites-available/000-default.conf

# Ensure runtime writable directories
mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache

# Symlink public storage (non-fatal if already linked)
php artisan storage:link --force 2>/dev/null || true

# Cache Laravel config, routes & views with production environment variables
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Apply any pending database migrations safely
php artisan migrate --force || echo "[WARN] Migrate skipped/failed - verify DB_* env vars"

exec apache2-foreground
