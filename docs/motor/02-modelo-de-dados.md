# Motor Estratégico — Modelo de Dados Executável

> NEMESIS 3 (2026-06-21). Schemas concretos. PostgreSQL/Supabase. RLS obrigatório.

## Novas tabelas (migration `20260621_motor_estrategico_v1.sql`)

### `candidate_profiles` — quem é o candidato do tenant
Liga o usuário Supabase ao candidato no TSE (1 user → 1+ candidaturas históricas/atuais).
```
- id (uuid, pk)
- user_id (uuid, fk auth.users, on delete cascade)  -- tenant
- nome_urna (text, not null)
- cpf_hash (text)  -- sha256(cpf||salt), nunca CPF cru
- partido_sigla (text)
- cargo_alvo (text, not null)  -- 'PR','GV','SF','DF','DE','PM','VR'
- estado (text, not null, char(2))
- mun_code (text)  -- 5-dig TSE, NULL para cargo estadual+
- ano_eleicao (int, not null)
- tse_candidate_id (text)  -- numero da urna + sequencial TSE
- created_at, updated_at
- RLS: owner CRUD (auth.uid()=user_id)
- UNIQUE (user_id, ano_eleicao, cargo_alvo) -- evita duplicar candidatura
```

### `strategic_plans` — o output principal (imutável)
```
- id (uuid, pk)
- candidate_profile_id (uuid, fk candidate_profiles, not null)
- user_id (uuid, fk auth.users, not null)  -- denormalizado para RLS rápido
- status (text, not null, default 'DRAFT')  -- DRAFT|COLLECTING|DEGRADED|ANALYZING|READY|FAILED|ARCHIVED
- inputs_hash (text)  -- sha256 dos inputs; identifica plano duplicado
- model_used (text)  -- ex 'claude-opus-4-7'
- tokens_in, tokens_out (int)
- cost_usd_cents (int)
- duration_ms (int)
- data_sources (jsonb)  -- {tse:true,ibge:true,x:false,...}
- plan_data (jsonb)  -- schema validado abaixo
- evidence_count (int)  -- contagem total de evidências cobrindo claims
- error_code (text)  -- preenchido se FAILED
- error_message (text)
- created_at, updated_at, ready_at, archived_at
- RLS: owner read-only (auth.uid()=user_id). INSERT/UPDATE só via service role.
- INDEX (user_id, status, created_at DESC)
- INDEX (candidate_profile_id, status, created_at DESC)
```

`plan_data` JSONB segue o schema:
```json
{
  "version": "1.0",
  "generated_at": "ISO-8601",
  "candidate": { "nome_urna","cargo_alvo","estado","mun_code","ano" },
  "adversaries": [
    {
      "rank": 1,
      "tse_candidate_id": "...",
      "nome_urna": "...",
      "partido_sigla": "...",
      "threat_score": 0.0-1.0,
      "rationale": "texto curto",
      "evidence_ids": ["uuid","uuid"]
    }
  ],
  "territories": [
    {
      "mun_code":"00035","mun_name":"PORTO VELHO",
      "zone_code":"0001",
      "priority": "ALTA|MEDIA|BAIXA",
      "effort_score": 0.0-1.0,
      "rationale":"...",
      "evidence_ids":["uuid"]
    }
  ],
  "content_calendar": [
    {
      "week_start":"2026-06-22",
      "theme":"...",
      "messages":[
        {"channel":"X|Instagram|Tiktok|WhatsApp Status|Comicio",
         "message":"...","why":"...","targets_adversary_ids":["uuid"],
         "evidence_ids":["uuid"]}
      ]
    }
  ],
  "warnings": ["string"],
  "degraded_sources": ["x_api","gdelt"]
}
```

### `evidence` — TODO claim do plano referencia ≥ 1
```
- id (uuid, pk)
- user_id (uuid, fk auth.users, not null)  -- RLS
- strategic_plan_id (uuid, fk strategic_plans, on delete cascade)
- claim (text, not null)
- source_type (text, not null)  -- 'tse'|'ibge'|'camara'|'senado'|'gdelt'|'x'|'meta'|'news'
- source_tier (int, not null, check 1..4)
- source_url (text)
- observed_at (timestamptz)
- raw_excerpt (text)
- created_at
- RLS: owner read
- INDEX (strategic_plan_id), (source_type, observed_at DESC)
```

### `tse_candidates` — catálogo TSE para o pleito ativo (cache compartilhado)
Não é por tenant; é referência global. Read-all-authenticated.
```
- election_id (text, not null)  -- ex '619' para 2024-1
- tse_candidate_id (text, not null)
- nome_urna (text)
- nome_completo (text)
- partido_sigla (text)
- cargo_code (text)  -- '11','13', etc
- mun_code (text)
- estado (text)
- numero_urna (int)
- situacao (text)
- updated_from_tse_at (timestamptz)
- PK (election_id, tse_candidate_id)
- INDEX (estado, cargo_code, mun_code)
- RLS: SELECT to authenticated; INSERT/UPDATE service role only
```

### `ibge_indicators` — KPIs socioeconômicos por município (cache global)
```
- mun_code (text, not null)  -- IBGE 7-dig (mapear ↔ TSE 5-dig via lookup)
- indicator (text, not null)  -- 'populacao'|'idhm'|'pib_pc'|'analfabetismo'|'cobertura_saude'
- year (int, not null)
- value (numeric)
- source_table (text)  -- '6579','5938', etc (SIDRA agregado)
- fetched_at (timestamptz)
- PK (mun_code, indicator, year)
- RLS: SELECT to authenticated
```

### `signals` — agregador de menções/sinais externos
```
- id (uuid, pk)
- subject_type (text)  -- 'candidate'|'mun_code'|'topic'
- subject_id (text)  -- tse_candidate_id ou mun_code ou slug
- source (text)  -- 'x'|'meta'|'gdelt'|'news_rss'|'camara'|'senado'
- source_tier (int)
- observed_at (timestamptz, not null)
- signal_kind (text)  -- 'mention'|'sentiment'|'engagement'|'discourse'
- value_numeric (numeric)
- value_text (text)
- meta_json (jsonb)
- url (text)
- ingest_run_id (uuid)
- INDEX (subject_id, observed_at DESC), (source, observed_at DESC)
- RLS: read all authenticated; write service role
```

### `ai_budget` — guarda-chuva de custo
```
- user_id (uuid, fk auth.users, PK)
- plan_tier (text)  -- 'start'|'pro'|'premium'
- month (text)  -- 'YYYY-MM', PK composto
- tokens_in_used, tokens_out_used (int)
- x_reads_used (int)
- cost_usd_cents_used (int)
- monthly_cap_cents (int)  -- 200,500,1500 (start,pro,premium)
- updated_at
- RLS: owner read; service role write
```

### `rate_limits` — bucket por usuário+endpoint
```
- user_id (uuid)
- endpoint (text)  -- 'assistant','intel','strategic_plan'
- window_start (timestamptz)  -- arredondado para minuto
- count (int)
- PK (user_id, endpoint, window_start)
- TTL automático (cleanup job): linhas > 7d removidas
```

## Mudanças em tabelas existentes

- `ai_analyses`: adicionar coluna `strategic_plan_id` (uuid, nullable, fk) para linkar Mestre/Consultoria a Plano. Não-breaking.
- `payments` + `voting_results`: criar índices nos FKs (advisor recomendou).

## Políticas RLS — padrão NEMESIS 3

Todas as policies usam `(select auth.uid())` em vez de `auth.uid()` para evitar re-eval por linha
(corrige `auth_rls_initplan` warnings). Migration vai REESCREVER todas as policies existentes.

Exemplo:
```sql
DROP POLICY IF EXISTS strategic_plans_owner_select ON strategic_plans;
CREATE POLICY strategic_plans_owner_select ON strategic_plans
  FOR SELECT
  USING ((select auth.uid()) = user_id);
```

## Eventos (catálogo)

| Evento | Quando | Payload | Quem consome |
|---|---|---|---|
| `strategic_plan.requested` | Usuário clica "Gerar Plano" | `{candidate_id, inputs_hash}` | Worker do motor |
| `strategic_plan.source_collected` | Cada fonte respondeu | `{plan_id, source, ok, latency_ms}` | Observability |
| `strategic_plan.degraded` | Fonte falhou após retries | `{plan_id, source, reason}` | UI banner |
| `strategic_plan.ready` | Plano gerado e gravado | `{plan_id, evidence_count}` | UI + webhook |
| `strategic_plan.failed` | Erro irrecuperável | `{plan_id, error_code}` | UI + alerta |
| `ai_budget.threshold_crossed` | Atingiu 80% do cap mensal | `{user_id, used_cents, cap_cents}` | Email + UI banner |

## Matriz IA × Backend

| Função | IA decide | Backend decide |
|---|---|---|
| **Quem são os adversários** | Confirma ranking final com rationale | Pré-filtra candidatos do mesmo cargo+circunscrição via SQL |
| **Score de ameaça** | Justifica em texto | Calcula numericamente (votos históricos, recall, share) |
| **Geografia de esforço** | Sugere prioridade narrativa | Calcula peso por (eleitorado×histórico×afinidade IBGE) |
| **Pauta semanal** | Cria texto, justifica, mapeia para adversário | Filtra contra blocklist legal (INV-6) |
| **Saída final (Plano)** | Gera estrutura JSON | Valida schema, garante evidence_count ≥ N, REJEITA se INV-1 violado |

A IA NUNCA é fonte primária. Ela orquestra e narra; o backend valida e protege.
