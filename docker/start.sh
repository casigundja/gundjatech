#!/usr/bin/env bash
set -e

PORT="${PORT:-10000}"

# Bind Apache dynamically to the platform PORT (Render / Railway / Fly) without leaking internal port on redirects
sed -ri "s/Listen [0-9]+/Listen ${PORT}/g" /etc/apache2/ports.conf
sed -ri "s/<VirtualHost \*:[0-9]+>/<VirtualHost *:${PORT}>/g" /etc/apache2/sites-available/000-default.conf
if ! grep -q "UseCanonicalPhysicalPort Off" /etc/apache2/apache2.conf; then
    printf '\nServerName localhost\nUseCanonicalName Off\nUseCanonicalPhysicalPort Off\n' >> /etc/apache2/apache2.conf
fi

# Ensure runtime writable directories exist
mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache

# Warn clearly in logs if APP_KEY or Supabase DB env vars are missing
if [ -z "${APP_KEY:-}" ]; then
    echo "[ERROR] APP_KEY nao esta configurada no Render (aba Environment)! O Laravel retornara HTTP 500 ate voce configurar APP_KEY." >&2
fi
if [ "${DB_CONNECTION:-}" != "pgsql" ]; then
    echo "[WARN] DB_CONNECTION='${DB_CONNECTION:-sqlite}' (esperado 'pgsql' para o Supabase). Verifique as variaveis na aba Environment do Render." >&2
fi

# Symlink public storage (non-fatal if already linked)
php artisan storage:link --force 2>/dev/null || true

# Cache Laravel config, routes & views with production environment variables
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Apply any pending database migrations safely
php artisan migrate --force || echo "[WARN] Migrate skipped/failed - verify DB_* env vars" >&2

# Ensure www-data owns ALL files created during boot (views, cache, logs, sqlite if any)
chown -R www-data:www-data storage bootstrap/cache database
chmod -R 775 storage bootstrap/cache

exec apache2-foreground
