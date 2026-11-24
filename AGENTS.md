# Diretrizes Técnicas do Projeto • GundjaTech (Cloudflare Workers)

## Stack Oficial
- **Runtime:** Cloudflare Workers (TypeScript + Hono 4 JSX SSR)
- **Banco de Dados:** Cloudflare D1 (SQLite) — migrations em `migrations/`
- **Cache & Sessões:** Cloudflare KV (`KV_SESSIONS`, `KV_CACHE`)
- **Storage:** Cloudflare R2 (`UPLOADS_BUCKET`)
- **IA:** Cloudflare Workers AI (`AI`) com fallback Gemini / OpenAI / determinístico
- **Testes:** Vitest (`test/*.test.ts`)

## Comandos Obrigatórios de Validação
- Checagem de tipos: `npm run worker:typecheck` (`tsc --noEmit`)
- Suíte de testes: `npm test` (`vitest run`)
- Migrations D1: `npm run db:migrate:local` (local) / `npm run db:migrate:remote` (produção)
- Deploy: `npm run deploy` (`wrangler deploy`)
- **Shell Windows PowerShell:** use `;` (e `if ($LASTEXITCODE -eq 0) { ... }`) em vez de `&&`.

## Regras de Segurança & Integridade
- Nunca commitar segredos ou fallbacks hardcoded (`SESSION_SECRET` é obrigatório via `wrangler secret`).
- Antes de publicar mudanças que dependam de secrets, validar com `npx wrangler secret list`.
- Rotas administrativas devem exigir `*.view` em `GET/HEAD/OPTIONS` e `*.manage` em `POST/PUT/PATCH/DELETE`.
- Preservar as Travas Contábeis e de Fase (nunca excluir faturas pagas ou clientes/fluxos com fatura quitada).
- Ao alterar `public/css/gt-admin.css` ou `gt-tailwind.css`, incrementar a versão centralizada em `src/lib/assets.ts`.
