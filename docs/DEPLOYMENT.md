# Guia de Publicação em Produção • GundjaTech (Cloudflare Workers)

Este documento descreve o procedimento oficial para configurar, migrar, publicar e monitorar a aplicação **GundjaTech** na infraestrutura **Cloudflare Workers + D1 + KV + R2 + Workers AI**.

---

## 1. Arquitetura de Produção

| Componente | Binding (`wrangler.jsonc`) | Finalidade |
|---|---|---|
| **Worker SSR & APIs** | `src/index.ts` (Hono 4) | Site público, Portal do Cliente, Painel Admin/ERP, Chat IA, Webhooks PIX & WhatsApp |
| **Banco Relacional** | `DB` (`gundjatech-db` — Cloudflare D1) | Usuários, sessões, clientes, solicitações, orçamentos, projetos, financeiro, domínios, campanhas, chat |
| **Sessões & Cache** | `KV_SESSIONS`, `KV_CACHE` | Cache de sessão HMAC, Rate Limiting distribuído, deduplicação de webhooks e cache de cobranças PIX |
| **Armazenamento** | `UPLOADS_BUCKET` (`gundjatech-uploads` — R2) | Anexos de projetos, comprovantes de pagamento (`private/`) e avatares |
| **Inteligência Artificial** | `AI` (Workers AI) | CRM Autônomo em cascata (Workers AI → Gemini → OpenAI → Fallback determinístico) |
| **Cron Trigger** | `0 3 * * *` | Limpeza diária automática de sessões expiradas no D1 |

---

## 2. Segredos Obrigatórios (Wrangler Secrets)

Nunca salve segredos em `wrangler.jsonc` nem em commits Git. Cadastre-os via CLI:

```bash
# Obrigatório (mínimo 32 bytes aleatórios — sem fallback hardcoded)
npx wrangler secret put SESSION_SECRET

# E-mails transacionais (Resend)
npx wrangler secret put RESEND_API_KEY

# Provedores de IA opcionais (fallback além do Workers AI nativo)
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put OPENAI_API_KEY

# Segurança de Webhooks WhatsApp (recomendado em produção)
npx wrangler secret put WHATSAPP_VERIFY_TOKEN
npx wrangler secret put WHATSAPP_APP_SECRET      # Meta Cloud API (X-Hub-Signature-256 Hex)
npx wrangler secret put WHATSAPP_WEBHOOK_SECRET  # Z-API / Evolution API
```

Verifique os segredos configurados:
```bash
npx wrangler secret list
```

---

## 3. Variáveis de Ambiente (`wrangler.jsonc`)

Antes do deploy definitivo em domínio próprio, valide em `wrangler.jsonc`:
- `APP_ENV`: `"production"` (ativa mascaramento de erros internos no handler global)
- `APP_URL`: URL pública oficial sem barra final (ex.: `https://gundjatech.com.br`) — usada em links de e-mail, recibos e `notification_url` do Mercado Pago
- `EMAIL_FROM`: remetente com **domínio verificado no Resend** (ex.: `GundjaTech <contato@gundjatech.com.br>`) — evite `onboarding@resend.dev` em produção
- `STAFF_NOTIFY_EMAIL`: e-mail da equipe comercial/financeira

---

## 4. Migrations de Banco de Dados (Cloudflare D1)

Sempre faça backup antes de aplicar migrations em produção:

```bash
# Backup remoto do D1
npx wrangler d1 export gundjatech-db --remote --output=backup-d1.sql

# Aplicar migrations localmente (desenvolvimento)
npm run db:migrate:local

# Aplicar migrations em produção
npm run db:migrate:remote
```

---

## 5. Validação Pré-Deploy & Publicação

```bash
# 1. Checagem estática de tipos TypeScript
npm run worker:typecheck

# 2. Suíte completa de testes automatizados (Vitest)
npm test

# 3. Deploy na Cloudflare
npm run deploy
```

---

## 6. Checklist Pós-Deploy

1. Verificar saúde do Worker em `GET /up` (deve retornar HTTP `200`).
2. Testar login no Painel Admin (`/admin/dashboard`) e Portal do Cliente (`/portal`).
3. Conferir em `/admin/configuracoes`:
   - Gateway PIX (`static`, `mercadopago` ou `asaas`), chave de API e `webhookSecret`.
   - Canais WhatsApp 1 (Oficial/IA) e WhatsApp 2 (Diretor).
4. Validar uma fatura real de valor simbólico (ex.: R$ 1,00) para confirmar o fluxo completo: QR Code → pagamento → webhook `/api/webhooks/pix` → baixa automática → e-mail com Recibo Oficial de Quitação.
5. Acompanhar logs em tempo real se necessário:
   ```bash
   npx wrangler tail
   ```
