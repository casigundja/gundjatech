# Guia de Publicação em Produção • GundjaTech

Este documento detalha o procedimento completo e seguro para publicar, configurar, monitorar e manter a aplicação **GundjaTech** em ambiente de produção.

---

## 1. Preparação Pré-Deploy & Segurança de Segredos

Antes do primeiro deploy, execute rigorosamente os passos abaixo:

1. **Rotação de credenciais de banco de dados**:
   - No painel do **Supabase** (`Project Settings → Database → Reset Database Password`), gere uma nova senha forte exclusiva para produção.
   - Nunca inclua credenciais reais em `.env.example`, commits Git ou logs.
2. **Geração de `APP_KEY` dedicada**:
   ```bash
   php artisan key:generate --show
   ```
3. **Variáveis de ambiente recomendadas para produção (`.env`)**:
   ```env
   APP_NAME="GundjaTech"
   APP_ENV=production
   APP_KEY=base64:GERAR_CHAVE_UNICA_DE_PRODUCAO
   APP_DEBUG=false
   APP_URL=https://seudominio.com.br
   APP_LOCALE=pt_BR
   APP_FALLBACK_LOCALE=pt_BR

   BCRYPT_ROUNDS=12

   LOG_CHANNEL=stack
   LOG_STACK=daily
   LOG_LEVEL=warning

   # Supabase PostgreSQL via Supavisor Pooler (IPv4 + SSL obrigatório)
   DB_CONNECTION=pgsql
   DB_HOST=aws-0-us-west-2.pooler.supabase.com
   DB_PORT=5432
   DB_DATABASE=postgres
   DB_USERNAME=postgres.<SEU_PROJECT_REF>
   DB_PASSWORD="<NOVA_SENHA_FORTE_PRODUCAO>"
   DB_SSLMODE=require

   SESSION_DRIVER=database
   SESSION_LIFETIME=120
   SESSION_ENCRYPT=true
   SESSION_SECURE_COOKIE=true
   SESSION_HTTP_ONLY=true
   SESSION_SAME_SITE=lax

   CACHE_STORE=database
   QUEUE_CONNECTION=database
   FILESYSTEM_DISK=local

   # SMTP real (obrigatório para /esqueci-minha-senha)
   MAIL_MAILER=smtp
   MAIL_HOST=smtp.seuprovedor.com
   MAIL_PORT=587
   MAIL_USERNAME=contato@gundjatech.com
   MAIL_PASSWORD="<SENHA_SMTP>"
   MAIL_FROM_ADDRESS="contato@gundjatech.com"
   MAIL_FROM_NAME="GundjaTech"
   ```
   > **Dica de performance**: se houver Redis gerenciado disponível em produção, altere `CACHE_STORE=redis`, `SESSION_DRIVER=redis` e `QUEUE_CONNECTION=redis` para reduzir latência de sessão e cache RBAC a < 2ms.

---

## 2. Opção A — Deploy no Laravel Cloud (Recomendado)

O **Laravel Cloud** oferece PHP 8.4 nativo, SSL automático, zero-downtime deploy, scheduler e workers gerenciados.

1. Suba o repositório Git para GitHub/GitLab/Bitbucket (confirmando que `.env` está no `.gitignore` e `.env.example` não contém segredos).
2. No painel da [Laravel Cloud](https://cloud.laravel.com/) ou via CLI `cloud`:
   - Crie a aplicação selecionando **PHP 8.4**.
   - Adicione todas as variáveis de ambiente da Seção 1 em **Environment Variables**.
3. Configure os hooks de **Build** e **Deploy**:
   - **Build Command**:
     ```bash
     composer install --no-dev --optimize-autoloader
     npm ci
     npm run build
     ```
   - **Deploy Command**:
     ```bash
     php artisan storage:link
     php artisan migrate --force
     php artisan db:seed --class=PermissionSeeder --force
     php artisan optimize
     ```
4. Ative o **Scheduler** e um **Queue Worker** na aba de Background Processes.
5. Configure o domínio personalizado (DNS `CNAME`/`A`) e valide o certificado TLS automático.

---

## 3. Opção B — Deploy em VPS Linux (Ubuntu 24.04 + Nginx + PHP 8.4-FPM)

### 3.1. Instalação das dependências do servidor
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y software-properties-common curl unzip git nginx supervisor certbot python3-certbot-nginx
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update
sudo apt install -y php8.4-fpm php8.4-cli php8.4-pgsql php8.4-mbstring php8.4-xml php8.4-curl php8.4-zip php8.4-bcmath php8.4-intl php8.4-gd
```

Instale **Composer 2** e **Node.js 20 LTS**:
```bash
curl -sS https://getcomposer.org/installer | php && sudo mv composer.phar /usr/local/bin/composer
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs
```

### 3.2. Preparação da aplicação
```bash
sudo mkdir -p /var/www/gundjatech
sudo chown -R $USER:www-data /var/www/gundjatech
cd /var/www/gundjatech

# Clone o projeto ou envie o pacote de release
git clone <URL_DO_REPOSITORIO> .
cp .env.example .env
nano .env # Preencha com os valores da Seção 1

composer install --no-dev --optimize-autoloader
npm ci && npm run build

php artisan storage:link
php artisan migrate --force
php artisan db:seed --class=PermissionSeeder --force
php artisan optimize

sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache
```

### 3.3. Configuração do Nginx (`/etc/nginx/sites-available/gundjatech`)
```nginx
server {
    listen 80;
    server_name seudominio.com.br www.seudominio.com.br;
    root /var/www/gundjatech/public;
    index index.php;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    charset utf-8;
    client_max_body_size 25M;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.4-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_hide_header X-Powered-By;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

Ative o virtual host e emita o certificado HTTPS gratuito via Let's Encrypt:
```bash
sudo ln -s /etc/nginx/sites-available/gundjatech /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d seudominio.com.br -d www.seudominio.com.br --redirect
```

### 3.4. Queue Worker (Supervisor) e Scheduler (Cron)

Crie `/etc/supervisor/conf.d/gundjatech-worker.conf`:
```ini
[program:gundjatech-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/gundjatech/artisan queue:work database --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/gundjatech/storage/logs/worker.log
stopwaitsecs=3600
```

Ative o Supervisor:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start gundjatech-worker:*
```

Adicione o agendador Laravel no crontab do usuário `www-data`:
```bash
sudo crontab -u www-data -e
```
Inclua a linha:
```cron
* * * * * cd /var/www/gundjatech && php artisan schedule:run >> /dev/null 2>&1
```

---

## 4. Rotina de Atualização (Re-Deploy Seguro)

Sempre que publicar uma nova versão em produção:
```bash
cd /var/www/gundjatech
php artisan down --retry=60
git pull origin main
composer install --no-dev --optimize-autoloader
npm ci && npm run build
php artisan migrate --force
php artisan db:seed --class=PermissionSeeder --force
php artisan optimize
php artisan queue:restart
php artisan up
```

> ⚠️ **Regra Crítica de Banco de Dados**: jamais execute `migrate:fresh`, `migrate:reset` ou `db:wipe` em produção ou no Supabase.

---

## 5. Armazenamento de Arquivos & Backups

- **Anexos confidenciais** (briefings de solicitações e entregáveis de projetos) são armazenados em disco privado `storage/app/private/` e nunca são expostos diretamente pela URL pública `/storage`.
- **Arquivos públicos** (se houver uploads públicos futuros) residem em `storage/app/public/` (linkado em `public/storage`).
- **Estratégia de backup recomendada**:
  - Ative **Point-in-Time Recovery / Daily Backups** no Supabase PostgreSQL.
  - Configure sincronização diária de `storage/app/private` e `storage/app/public` para um bucket S3 / Cloudflare R2 (ou configure `FILESYSTEM_DISK=s3` para ambientes multi-instância).

---

## 6. Checklist Final de Validação Pós-Deploy

- [ ] `GET /up` retorna HTTP `200` (health check Laravel).
- [ ] `GET /site.webmanifest`, `GET /feed.xml` e `GET /sitemap.xml` retornam HTTP `200`.
- [ ] URL inexistente (ex.: `/pagina-inexistente-teste`) retorna HTTP `404` com layout GundjaTech.
- [ ] HTTPS ativo com redirecionamento HTTP → HTTPS e header `Strict-Transport-Security` presente.
- [ ] `APP_DEBUG=false`, `APP_ENV=production` e `SESSION_SECURE_COOKIE=true` confirmados via `php artisan about`.
- [ ] Senhas padrão do seeder alteradas e contas de teste removidas em produção.
- [ ] Fluxo de redefinição de senha (`/esqueci-minha-senha`) testado com entrega real de e-mail SMTP.
- [ ] Upload e download protegido de anexo testados no Admin (`/admin/projetos`) e Portal (`/portal/projetos`).
