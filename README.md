# e-politica.ia — Painel

Plataforma SaaS de inteligência política para campanhas eleitorais.
Dashboards com dados públicos do TSE/TRE, CRM de lideranças, comparativos
históricos e a **E-Poliana**, estrategista com IA (Claude Sonnet 4.6).

> **Arquitetura.** Este repositório contém o **painel autenticado** (SPA Vite + React 19). A landing pública é separada em [`luizfernandoCA/e-politica-ia-landing`](https://github.com/luizfernandoCA/e-politica-ia-landing) (Next.js). O domínio `e-politica.ia` serve a landing; `painel.e-politica.ia` (a ser configurado) serve este painel.

## Stack (estado atual)

| Camada | Tecnologia | Status |
|---|---|---|
| Frontend | React 19 + Vite 8 (JS, não TS) | ✅ produção |
| Roteamento | `useState activePage` (sem React Router) | ⚠️ legado, ver ROADMAP |
| Estilo | CSS-in-JS inline + variáveis CSS | ⚠️ legado, ver ROADMAP |
| Autenticação | Supabase Auth (email/senha + Google OAuth) | ✅ ativo |
| Banco | Supabase Postgres com RLS (projeto `tlnprjkiydiogrcsruxw`, sa-east-1) | ✅ 10 tabelas |
| Pagamentos | Mercado Pago Checkout Pro (Pix, cartão, boleto) | ⚙️ requer `MP_ACCESS_TOKEN` |
| IA (E-Poliana) | Claude Sonnet 4.6 via proxy serverless + prompt caching | ⚙️ requer `ANTHROPIC_API_KEY` |
| Dados eleitorais | TSE DivulgaCandContas + cache em `tse_votes_cache` | ✅ ativo (Fase D) |
| Hospedagem | Vercel (SPA + serverless functions) | ✅ configurado |

**Sem chaves configuradas**, o app continua funcional: auth e dados de
referência já são reais (Supabase); o assistente usa fallback local e o
checkout exibe aviso de gateway pendente.

## Esquema do banco (10 tabelas)

| Tabela | Tipo | Origem | RLS |
|---|---|---|---|
| `profiles` | 1 linha por usuário (trigger no signup) | Schema inicial | ✅ owner |
| `user_state` | Estado de campanha (JSONB: contacts, tasks, payment) | Schema inicial | ✅ owner |
| `payments` | Livro-razão de pagamentos MP | Schema inicial | ✅ owner read |
| `candidates` | Catálogo público de candidatos demo | Schema inicial | ✅ read all |
| `regions` | Catálogo de regiões demo | Schema inicial | ✅ read all |
| `voting_results` | Resultados eleitorais demo | Schema inicial | ✅ read all |
| `contacts` | **CRM normalizado** (substitui `user_state.contacts`) | `progressive_schema_v1` (Fase C) | ✅ owner CRUD |
| `demands` | **Atendimentos do eleitor** com priority/status | `progressive_schema_v1` (Fase C) | ✅ owner CRUD |
| `tse_votes_cache` | **Cache real TSE** (lista oficial + outcome) | `progressive_schema_v1` (Fase C) | ✅ read authenticated |
| `ai_analyses` | **Auditoria E-Poliana** (tokens, cache hits, custo) | `progressive_schema_v1` (Fase C) | ✅ owner read/insert |

> Migrations aplicadas via MCP Supabase: `progressive_schema_v1` e
> `harden_touch_updated_at_search_path`. O SQL canônico ainda está em
> `supabase/schema.sql` (versão inicial); as novas tabelas são gerenciadas
> via Supabase CLI/migrations.

## Rodando localmente

```bash
npm install
npm run dev
```

O frontend já aponta para o Supabase de produção (chave publishable é
pública por design; a segurança vem do RLS).

## Deploy na Vercel

1. Importe este repositório na Vercel (framework: **Vite**).
2. Em **Settings → Environment Variables**, configure:

| Variável | Onde obter | Para quê |
|---|---|---|
| `MP_ACCESS_TOKEN` | [Mercado Pago Developers](https://www.mercadopago.com.br/developers/panel/app) → Credenciais de produção | Pagamentos reais |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com/settings/keys) | Assistente IA real |
| `ANTHROPIC_MODEL` | (opcional) | Override do modelo padrão (default: `claude-sonnet-4-6`) |
| `SUPABASE_SERVICE_ROLE_KEY` | [Supabase → Settings → API](https://supabase.com/dashboard/project/tlnprjkiydiogrcsruxw/settings/api) | Webhook MP + cache TSE |
| `SUPABASE_URL` | `https://tlnprjkiydiogrcsruxw.supabase.co` | Webhook MP + cache TSE |
| `APP_URL` | URL pública do deploy | Redirects do checkout |

3. Redeploy. Tudo passa a operar em modo 100% real.

## Fluxo de venda

1. Visitante → Landing Page → "Começar Agora".
2. Cria conta (Supabase Auth). Com confirmação de e-mail ativa, o usuário confirma e entra.
3. Tela de assinatura → **Pagar com Mercado Pago** → checkout seguro (Pix/cartão/boleto).
4. Mercado Pago notifica `api/mp-webhook` → grava em `payments` → ativa em `user_state.payment_status`.
5. Usuário volta ao app com acesso liberado → configura a campanha (TSE) → usa o painel.

E-mails VIP (`webcamargo@gmail.com`, `sergio.augusto.olv@gmail.com`)
têm acesso sem pagamento.

## Endpoints serverless (`/api`)

| Endpoint | Método | Função |
|---|---|---|
| `/api/tse?city=&year=&role=` | GET | **Lista de candidatos** TSE com cache em `tse_votes_cache` (TTL 14d). Retorna `cached: bool`, `lastFetchedAt: ISO`, `voteDistributionKind: 'official' \| 'estimate' \| 'pending'` |
| `/api/assistant` | POST | **E-Poliana** em Claude Sonnet 4.6 com prompt caching ephemeral. Aceita `messages[]` + `context{}` |
| `/api/checkout` | POST | Cria preference Mercado Pago (Pix/cartão/boleto). Retorna `init_point` |
| `/api/mp-webhook` | POST | Recebe notificação MP, persiste em `payments` e ativa assinatura |

## Segurança

- ✅ Nenhum dado de cartão passa pela aplicação (PCI fica 100% no MP).
- ✅ Chaves secretas só existem como vars de ambiente nas serverless.
- ✅ RLS em todas as 10 tabelas (`auth.uid() = user_id`).
- ✅ Trigger `handle_new_user` com `SECURITY DEFINER` + `REVOKE` no PUBLIC.
- ✅ Função `touch_updated_at` com `SET search_path = public` (advisor 0011).
- ⚠️ **Pendente**: habilitar Leaked Password Protection no [Supabase Auth dashboard](https://supabase.com/dashboard/project/tlnprjkiydiogrcsruxw/auth/policies) (1 toggle, sem código).

## Histórico de hardening (auditoria 2026-06-05)

- **Fase A** — Branch `chore/audit-and-hardening` ([PR #1](https://github.com/luizfernandoCA/e-politica-ia/pull/1)):
  - Removido `firebaseConfig.js` vestigial (zero refs)
  - Trocado "Homologado pelo TSE" → "Integrado a dados públicos do TSE/TRE" (risco MPE)
  - Removido `Math.random` do `api/tse.js` + payload com `disclaimer` explícito
  - IA migrada para Sonnet 4.6 com prompt caching ephemeral
- **Fase C** — Supabase: 4 tabelas novas com RLS (`contacts`, `demands`, `tse_votes_cache`, `ai_analyses`)
- **Fase D** — Branch `feat/tse-cache`: `api/tse.js` consulta cache antes do TSE; persistência via service_role

Veja [`ROADMAP.md`](./ROADMAP.md) para próximos passos e
[`PITCH.md`](./PITCH.md) para argumentos de venda.
