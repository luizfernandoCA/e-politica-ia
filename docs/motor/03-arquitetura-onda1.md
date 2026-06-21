# Motor Estratégico — Onda 1: Arquitetura Executável

> NEMESIS 3 (2026-06-21). Blueprint implementável. Estimativa: 80-120h dev sênior do zero ao prod hardened.

## Mapa de Módulos

```
┌─────────────────────────────────────────────────────────────────────┐
│  src/pages/StrategicPlan.jsx        UI: visualização + ação         │
└─────────────────┬───────────────────────────────────────────────────┘
                  │ POST /api/strategic-plan/generate
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  api/strategic-plan/generate.js  ─ orquestrador HTTP                │
│  ┌──────────────────────────────────────────────────────┐           │
│  │  guard: auth + rate-limit + budget cap (rate_limits, │           │
│  │  ai_budget tables)                                   │           │
│  └────────────┬─────────────────────────────────────────┘           │
│               ▼                                                     │
│  ┌─────────────────────────┐  ┌──────────────────────────┐         │
│  │ collectors/              │  │ adversary_ranker.js      │         │
│  │  tse_official.js   ────▶ │  │ (deterministic, sql-based│         │
│  │  ibge_indicators.js      │  │  threat_score)           │         │
│  │  camara_senado.js        │  └──────────────────────────┘         │
│  │  gdelt_news.js           │  ┌──────────────────────────┐         │
│  │  x_mentions.js* ──────── │──│ territory_prioritizer.js │         │
│  │  meta_pages.js*          │  │ (weighted scoring)       │         │
│  └─────────┬───────────────-┘  └──────────────────────────┘         │
│            ▼                                                        │
│  ┌────────────────────────────────────────────────────────┐         │
│  │ normalizer.js — schema unificado Signal{...}           │         │
│  └────────────┬───────────────────────────────────────────┘         │
│               ▼                                                     │
│  ┌────────────────────────────────────────────────────────┐         │
│  │ analyst.js — Claude Opus 4.7 + tool use + prompt cache │         │
│  │  - System prompt versionado (LOCK pra reprodutibilid.) │         │
│  │  - 6 tools: get_adversaries, get_territory_kpis,       │         │
│  │    get_signals_for_subject, get_legal_calendar,        │         │
│  │    propose_content, validate_against_blocklist         │         │
│  │  - Cap de iterações de tool: 8                         │         │
│  │  - Custo monitorado live; aborta se ultrapassar         │         │
│  └────────────┬───────────────────────────────────────────┘         │
│               ▼                                                     │
│  ┌────────────────────────────────────────────────────────┐         │
│  │ validator.js — INV-1..7 hard-coded                     │         │
│  │  - todo claim tem ≥ N evidências                       │         │
│  │  - blocklist legal (Lei 9.504, TSE)                    │         │
│  │  - schema JSON estrito                                 │         │
│  │  - se reprovar: retry 1x com instrução de correção;    │         │
│  │    se reprovar 2x: FAILED                              │         │
│  └────────────┬───────────────────────────────────────────┘         │
│               ▼                                                     │
│  persistor.js → strategic_plans + evidence + ai_analyses           │
└─────────────────────────────────────────────────────────────────────┘

* x_mentions e meta_pages = ondas posteriores (precisa de chaves).
```

## Fronteiras / Dependências (regra: cada seta pode ser cortada sem quebrar o resto)

| De → Para | Tipo | O que passa | Que acontece se cair |
|---|---|---|---|
| UI → /api/strategic-plan | HTTP | request payload | UI mostra fallback "Tente novamente" |
| /api/ → collectors | função local | filtros | timeout por collector; outros continuam |
| collectors → fonte externa | fetch | URL+auth | DEGRADED; plano sai sem aquela fonte |
| analyst → Anthropic | fetch | prompt+tools | retry 1x; se falhar → FAILED |
| persistor → Supabase | client | row insert | rollback do plano; cliente vê erro |

## Sync vs Async

- **Sync** (request/response HTTP, total < 60s p/ Vercel): collectors paralelos + ranker SQL + analyst stream
- **Async** (background worker, fora desta onda): re-cálculo nightly por candidato ativo (refresh TSE/IBGE)

Para esta onda: TUDO sync, max 60s. Se passar de 50s no analyst → graceful degrade (devolve plano parcial marcado).

## Segurança Executável

| Vetor | Defesa | Onde no código |
|---|---|---|
| Spam de geração (custo) | rate-limit 3/min/user + 20/dia/user + cap mensal $ | `lib/rate-limit.js`, `lib/budget.js` |
| Prompt injection | inputs sanitizados, tools server-side only | `api/strategic-plan/generate.js` |
| Atacar adversário inexistente | INV-3 valida que adversário existe no TSE | `validator.js::checkAdversaryExists` |
| Conselho ilegal (compra de voto etc) | blocklist regex + checagem semântica de saída | `validator.js::scanIllegalContent` |
| Vazamento cross-tenant | RLS em todas as tabelas + filtro user_id no service role | migration + `persistor.js` |
| Leaked password | Supabase Auth → HaveIBeenPwned ON | dashboard (pendência humana) |

## IA Executável

```
DEFAULT_MODEL = claude-opus-4-7
prompt_caching = ephemeral, todo system+tools marcados
max_tool_iterations = 8
max_output_tokens = 4000
temperature = 0.2 (factual, não criativo)
```

System prompt versionado em `api/strategic-plan/prompts/v1.txt`. Mudou? Bump versão. Plano antigo guarda `prompt_version`.

## Observabilidade

Cada execução grava em `ai_analyses`:
- `strategic_plan_id`, `model_used`, `tokens_in`, `tokens_out`, `cache_read_input_tokens`, `cache_creation_input_tokens`, `cost_usd_cents`, `duration_ms`, `tool_iterations`, `degraded_sources`, `status`, `error_code`.

Dashboard ops: `SELECT model_used, DATE(created_at), count(*), sum(cost_usd_cents)/100 as usd FROM ai_analyses GROUP BY 1,2;`

## Falhas e Degradação

| Falha | Severidade | Resposta automática | Comunicação ao usuário |
|---|---|---|---|
| TSE offline | ALTA (sem TSE = sem motor) | usa cache `tse_apuracao` se ≤ 7 dias | banner "dados podem estar desatualizados" |
| IBGE offline | MÉDIA | usa cache `ibge_indicators` | banner discreto |
| GDELT offline | BAIXA | pula | nenhum banner |
| X API rate-limit | MÉDIA | degrade | banner "sinal de rede limitado" |
| Anthropic 5xx | ALTA | retry 1× → FAILED | erro com sugestão de tentar em 5min |
| Anthropic 401 (chave inválida) | CRÍTICA | retorna 503 AI_NOT_CONFIGURED | banner ops |
| budget excedido | ALTA | retorna 402 BUDGET_EXCEEDED | upsell para plano superior |
| validator reprova 2× | MÉDIA | FAILED com error_code | "tente reformular candidato" |

## Custo Operacional (estimativa por plano gerado, sem X/Meta)

| Item | Custo unitário | Quantidade | Total |
|---|---|---|---|
| Anthropic input tokens (cacheado) | $0.30 / 1M | ~50k | $0.015 |
| Anthropic input tokens (não-cacheado) | $3 / 1M | ~3k | $0.009 |
| Anthropic output tokens | $15 / 1M | ~3k | $0.045 |
| Anthropic cache write | $3.75 / 1M | ~50k (1ª vez) | $0.19 (amortizado) |
| Supabase queries | desprezível | — | ~$0 |
| Vercel function | grátis no plano | — | $0 |
| **Total esperado** | | | **~$0.07-0.10 por plano** |

Com X reads (Pro plan): +$1-3 dependendo do universo de menções.

Plano **Start** ($297/mês): inclui 30 planos/mês. Margem: $297 - $3 = $294 (98%). Sustentável.

## Estratégia de Testes

| Camada | Tipo | Cobertura mínima |
|---|---|---|
| collectors/* | Contract test (vs fixture salvo) | 100% — se TSE mudar contrato, CI vermelho |
| ranker/prioritizer | Property test (Jest) | função pura: dado input X, saída Y determinística |
| validator | Snapshot test + casos negativos curados | bloquear violação de cada invariante |
| analyst | Integration test com VCR de Anthropic | smoke + casos limite (sem TSE, sem IBGE) |
| /api/strategic-plan | E2E HTTP via supertest | request real → DB real (de teste) → JSON validado |
| UI | Playwright | gerar plano → vê visualização |

## Blueprint Consolidado

**Estrutura de arquivos (novo):**
```
api/strategic-plan/
  generate.js                     # endpoint principal
  refresh-tse.js                  # cron diário (próxima onda)
  collectors/
    tse_official.js
    ibge_indicators.js
    camara_senado.js
    gdelt_news.js
  ranker.js
  prioritizer.js
  normalizer.js
  analyst.js
  validator.js
  persistor.js
  prompts/
    v1.system.txt                 # versionado, não-editável depois de release
    v1.tools.json
lib/
  rate-limit.js
  budget.js
  evidence.js
src/pages/
  StrategicPlan.jsx               # nova rota /plano-tatico
src/components/
  AdversaryCard.jsx
  TerritoryHeatmap.jsx
  ContentCalendar.jsx
  EvidenceTooltip.jsx
supabase/migrations/
  20260621_motor_estrategico_v1.sql
docs/motor/
  01-identidade-e-dominio.md
  02-modelo-de-dados.md
  03-arquitetura-onda1.md
  04-runbook-incidentes.md       # próxima onda
```

**Ordem de implementação (DAG):**
1. Migration SQL (apply via Supabase MCP)
2. `lib/rate-limit.js` + `lib/budget.js` (reusáveis em outros endpoints)
3. `api/_lib/guards-strategic.js` (auth + rate + budget cap)
4. `api/strategic-plan/collectors/tse_official.js` (reusa código de api/tse.js)
5. `api/strategic-plan/collectors/ibge_indicators.js` (novo)
6. `api/strategic-plan/ranker.js`
7. `api/strategic-plan/prioritizer.js`
8. `api/strategic-plan/normalizer.js`
9. `api/strategic-plan/validator.js`
10. `api/strategic-plan/prompts/v1.system.txt`
11. `api/strategic-plan/analyst.js`
12. `api/strategic-plan/persistor.js`
13. `api/strategic-plan/generate.js` (cola tudo)
14. `src/pages/StrategicPlan.jsx` + componentes
15. Testes
16. Verifier adversarial
17. Deploy

**O que NESTA sessão consegue ir até onde?**
Realisticamente: 1-3 (migration + libs guard), 4-6 com TSE+IBGE+ranker funcionais,
8-9 normalizer+validator, 10-11 prompt+analyst esqueleto, 13 endpoint plugado,
14 UI esqueleto. Testes + X/Meta + Câmara/Senado collectors + cron de refresh = próximas ondas.
