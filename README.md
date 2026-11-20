# GundjaTech • Plataforma Unificada de Serviços Digitais

Plataforma corporativa completa da **GundjaTech** construída em **Laravel 13 (PHP 8.4)**, **Supabase PostgreSQL 17**, **Tailwind CSS v4**, **Livewire 4** e **Alpine.js**, integrando **Site Institucional**, **Painel Administrativo com RBAC** e **Portal do Cliente** em uma única base de código.

---

## 🏛️ Arquitetura & Ambientes Integrados

### 1. Site Institucional & Comercial (`/`)
- Experiência editorial interativa com **WebGL/Three.js**, tipografia institucional (`Zalando Sans Expanded` e `Plus Jakarta Sans`) e páginas completas (`/sobre`, `/servicos`, `/servicos/*`, `/portfolio`, `/cases/*`, `/blog`, `/contato`, `/solicitar-orcamento`, `/acompanhar-solicitacao`, `/politica-de-privacidade`).
- **SEO & Syndication Nativos**: manifesto PWA (`/site.webmanifest`), feed RSS 2.0 dinâmico (`/feed.xml`), sitemap XML dinâmico (`/sitemap.xml`), redirecionamentos `301` de rotas legadas e páginas de erro personalizadas (`403`, `404`, `500`) com a identidade visual GundjaTech.
- **Captação integrada ao CRM**: os formulários `/contato`, `/solicitar-orcamento` e `/api/lead` (com proteção anti-spam honeypot e rate limiting) persistem diretamente em `service_requests` com geração imediata de protocolo (`GNDJ-...` / `CNT-...`) e histórico de status.
- **Acesso ao Ecossistema**: links diretos para **Área do Cliente (`/login`)** no rodapé e navegação móvel, além de rastreamento de protocolo em `/acompanhar-solicitacao`.

### 2. Painel Administrativo (`/admin`) — 12 Módulos Conectados & RBAC
Todas as rotas administrativas exigem autenticação, conta ativa, perfil de equipe (`isStaff()` via `AdminMiddleware`) e permissão granular (`permission:<slug>`):
1. **Dashboard Executivo (`/admin`)**: KPIs em tempo real, gráficos Chart.js (com serialização segura `@json`), alertas de domínios vencendo e auditoria de atividades.
2. **Clientes (`/admin/clientes`)**: CRUD completo, geração automática de senha temporária aleatória forte para acesso ao Portal e **Visão 360°** (projetos, orçamentos, solicitações, domínios, campanhas e histórico financeiro).
3. **Solicitações (`/admin/solicitacoes`)**: funil de atendimento, download protegido de anexos do briefing, atribuição de responsável técnico, histórico localizado em português, emissão de orçamento e conversão em projeto.
4. **Orçamentos (`/admin/orcamentos`)**: construtor dinâmico multi-itens com catálogo de serviços, cálculo de subtotal/desconto/total, controle de status e conversão direta em projeto.
5. **Projetos (`/admin/projetos`)**: gestão de cronograma e etapas com recálculo automático de progresso (ao criar ou atualizar etapas), alocação exclusiva de profissionais da equipe (`project_members`) e entregáveis protegidos (`project_attachments` em disco privado `local` com flag `is_client_visible`).
6. **Serviços & Catálogo (`/admin/servicos`)**: CRUD de serviços (`one_time`, `monthly`, `yearly`) e categorias (`service_categories`).
7. **Domínios & DNS (`/admin/dominios`)**: monitoramento de vencimento (30 dias / expirados), zona DNS (`A`, `AAAA`, `CNAME`, `MX`, `TXT`, `NS`), histórico de renovações e lançamento automático no financeiro.
8. **Tráfego Pago (`/admin/campanhas`)**: gestão de campanhas (Google, Meta, TikTok, LinkedIn Ads), controle de status e registro de métricas com cálculo automático de CPC, CPA, ROAS e investimento total.
9. **Financeiro (`/admin/financeiro`)**: fluxo de caixa consolidado, confirmação de pagamento com registro em `payments` e validação de consistência entre projeto e cliente.
10. **Atendimento & Chat (`/admin/atendimento`)**: central de conversas com filtros de status, abertura proativa, resposta em tempo real, encerramento e reabertura.
11. **Usuários & Equipe (`/admin/usuarios`)**: gestão de contas internas e clientes com proteção estrita de contas `superadmin` contra edição por administradores comuns e criação automática do perfil `Client` para contas de cliente.
12. **Controle de Permissões (`/admin/permissoes`)**: matriz RBAC dinâmica por cargo e módulo persistida em `permissions` e `role_permissions` (com cache invalidado automaticamente e proteção contra auto-bloqueio de `settings.manage`).

### 3. Portal do Cliente (`/portal`)
Área exclusiva protegida por `ClientMiddleware`, **7 permissões granulares RBAC** (`portal.requests.manage`, `portal.projects.view`, `portal.quotations.approve`, `portal.domains.view`, `portal.campaigns.view`, `portal.finance.view`, `portal.chat.manage`) e **5 Eloquent Policies** (`ProjectPolicy`, `QuotationPolicy`, `ServiceRequestPolicy`, `DomainPolicy`, `ConversationPolicy`), garantindo isolamento estrito multi-cliente:
- Resumo de projetos, demandas, domínios e campanhas.
- Abertura de novas solicitações com anexo em armazenamento privado e download autenticado.
- Acompanhamento de etapas e download autenticado apenas de entregáveis marcados como visíveis ao cliente (`is_client_visible = true`).
- Revisão, **aprovação** e **recusa com motivo** apenas de orçamentos enviados (`sent`) e dentro do prazo de validade (rascunhos e propostas expiradas são bloqueados).
- Consulta de domínios com solicitação de renovação protegida contra duplicidade (gera protocolo no Admin).
- Relatório de tráfego pago (investimento, cliques, conversões, CPA e ROAS).
- Extrato financeiro isolado (exibe apenas receitas/faturas do cliente — despesas internas da agência jamais são expostas) e chat direto com a equipe.

---

## 🛡️ Segurança & Boas Práticas Aplicadas

- **Autorização em Camadas**: RBAC em banco de dados com cache (`permissions` / `role_permissions`) + `AdminMiddleware` (allowlist `isStaff()`) + `ClientMiddleware` + `PermissionMiddleware` + `Gate::before` + 5 Eloquent Policies.
- **Proteção contra IDOR & Escalonamento de Privilégio**:
  - Toda ação no Portal valida propriedade via `Gate::authorize(...)`.
  - Contas `superadmin` só podem ser alteradas por outro `superadmin`.
  - Contas desativadas sofrem logout imediato com invalidação completa da sessão e regeneração do token CSRF.
- **Armazenamento Privado de Anexos**: anexos de solicitações e entregáveis de projetos são salvos no disco privado `local` (`storage/app/private`) e servidos exclusivamente por rotas autenticadas com verificação de permissão e visibilidade.
- **Rate Limiting (`throttle`) & Anti-Spam**: `10 req/min` em login, cadastro e recuperação de senha; `20 req/min` em contato, orçamento e `/api/lead` (com honeypot `sobrenome_hp`); `30 req/min` em `/acompanhar-solicitacao` e `/api/whatsapp`; `15 req/min` em renovação de domínio.
- **Headers de Segurança HTTP**: `SecurityHeadersMiddleware` aplica `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy` e `Strict-Transport-Security` (em HTTPS).
- **Busca Case-Insensitive Compatível com PostgreSQL & SQLite**: filtros de busca utilizam `LOWER(...) LIKE ?` em todos os módulos.
- **Auditoria**: operações administrativas e aprovações comerciais críticas são registradas em `activity_logs`.

---

## 🛠️ Stack Tecnológica

- **Backend**: PHP 8.4, Laravel 13, Livewire 4
- **Banco de Dados**: PostgreSQL 17 (Supabase) em produção/desenvolvimento; SQLite `:memory:` nos testes PHPUnit
- **Frontend**: Blade, Tailwind CSS v4, Alpine.js (integrado ao Livewire 4), Chart.js, Three.js, Vite 8
- **Qualidade**: PHPUnit 12 + Laravel Pint

---

## 🔑 Credenciais de Demonstração (Seeder)

| Perfil | E-mail | Senha | Ambiente |
| :--- | :--- | :--- | :--- |
| **Super Administrador** | `admin@gundjatech.com` | `password` | `/admin` |
| **Gerente de Contas** | `gerente@gundjatech.com` | `password` | `/admin` |
| **Atendimento** | `atendimento@gundjatech.com` | `password` | `/admin` |
| **Desenvolvedor** | `dev@gundjatech.com` | `password` | `/admin` |
| **Financeiro** | `financeiro@gundjatech.com` | `password` | `/admin` |
| **Cliente (Acme Corp)** | `cliente@acmecorp.com` | `password` | `/portal` |
| **Cliente (Innova Solutions)** | `contato@innovasolutions.com` | `password` | `/portal` |

> ⚠️ **Importante**: Em produção, altere todas as senhas padrão imediatamente após o primeiro acesso e nunca publique credenciais reais em `.env.example` ou no controle de versão.

---

## 💻 Como Executar Localmente

### Pré-requisitos
- **PHP 8.4+** com extensões `pdo_pgsql`, `pgsql`, `pdo_sqlite`, `mbstring`, `openssl`, `fileinfo`, `bcmath`, `xml`, `curl`
- **Composer 2+**
- **Node.js 20+** e **NPM**

### Passo a Passo

1. **Configurar o arquivo `.env`**:
   ```bash
   cp .env.example .env
   ```
   Edite `.env` com suas credenciais do **Supabase PostgreSQL** (via Supavisor Pooler IPv4):
   ```env
   APP_NAME="GundjaTech"
   APP_ENV=local
   APP_DEBUG=true
   APP_URL=http://127.0.0.1:8000

   DB_CONNECTION=pgsql
   DB_HOST=aws-0-us-west-2.pooler.supabase.com
   DB_PORT=5432
   DB_DATABASE=postgres
   DB_USERNAME=postgres.<SEU_PROJECT_REF>
   DB_PASSWORD="<SUA_SENHA_SUPABASE>"
   DB_SSLMODE=require
   ```
   > **Alternativa local sem Supabase (SQLite)**: basta definir `DB_CONNECTION=sqlite` e remover/comentar `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, criando o arquivo vazio `database/database.sqlite`.

2. **Instalar dependências PHP e JS**:
   ```bash
   composer install
   npm install
   ```

3. **Gerar chave da aplicação e criar symlink de storage**:
   ```bash
   php artisan key:generate
   php artisan storage:link
   ```

4. **Executar migrations e seeders**:
   ```bash
   php artisan migrate
   php artisan db:seed
   ```
   > ⚠️ **Atenção no Supabase**: nunca execute `php artisan migrate:fresh` no banco Supabase, pois ele contém schemas gerenciados (`auth`, `storage`, `realtime`). Use sempre `php artisan migrate` e o seeder idempotente `php artisan db:seed --class=PermissionSeeder`.

5. **Compilar assets do frontend**:
   ```bash
   npm run build
   # ou em desenvolvimento com hot reload (ou `composer run dev`):
   npm run dev
   ```

6. **Iniciar servidor local**:
   ```bash
   php artisan serve --host=127.0.0.1 --port=8000
   ```
   Acesse:
   - **Site Institucional**: `http://127.0.0.1:8000`
   - **Login / Cadastro**: `http://127.0.0.1:8000/login` e `http://127.0.0.1:8000/cadastro`
   - **Painel Admin**: `http://127.0.0.1:8000/admin`
   - **Portal do Cliente**: `http://127.0.0.1:8000/portal`
   - **Health Check**: `http://127.0.0.1:8000/up`

---

## 🧪 Testes Automatizados & Qualidade

Execute toda a suíte PHPUnit (rodando isoladamente em SQLite `:memory:` sem tocar no Supabase):
```bash
php artisan test --compact
```

Suítes incluídas:
- `tests/Feature/GundjaTechFullPlatformTest.php` — páginas públicas, captação de leads, protocolos, login/redirecionamento, admin e portal.
- `tests/Feature/ArchitectureFoundationTest.php` — schema completo, factories, relacionamentos, cadastro, recuperação de senha, gates e policies.
- `tests/Feature/AdminPanelCompleteTest.php` — testes end-to-end dos 12 módulos administrativos e matriz RBAC dinâmica.
- `tests/Feature/SecurityAndPortalAuditTest.php` — headers HTTP de segurança, proteção contra IDOR no portal, isolamento de anexos internos, bloqueio de uploads inseguros, rate limiting (`429`) e fluxos do portal.
- `tests/Feature/FullPlatformAuditVerificationTest.php` — proteção de SuperAdmin, anti auto-lockout RBAC, geração segura de senhas, bloqueio de orçamentos rascunho/expirados, isolamento de despesas no financeiro do portal, permissões granulares do portal, download protegido de anexos, invalidação de sessão, integridade de projetos/financeiro, busca case-insensitive, SEO (`/feed.xml`, `/sitemap.xml`, `404`), honeypot e escape XSS.

Formatação de código (Laravel Pint):
```bash
vendor/bin/pint
```

---

## 🚀 Publicação em Produção

Consulte o guia operacional completo passo a passo em **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** cobrindo:
- Configuração segura de `.env` e rotação de credenciais
- Publicação no **Laravel Cloud** (recomendado)
- Publicação em **VPS Linux (Ubuntu 24.04 + Nginx + PHP 8.4-FPM + Certbot SSL + Supervisor + Cron)**
- Checklist completo de verificação pós-deploy e rotinas de backup
