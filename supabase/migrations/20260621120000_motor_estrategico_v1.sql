-- Migration: Motor Estratégico v1 (NEMESIS 3, 2026-06-21)
-- Objetivo: criar tabelas/RLS/índices do motor estratégico cross-fonte (TSE×IBGE×sinais).
-- Idempotente: usa IF NOT EXISTS / IF EXISTS / CREATE OR REPLACE quando possível.
-- Não-breaking: nenhuma tabela existente é dropada; só adições + reescrita de policies.

BEGIN;

-- =========================================================================
-- 1) candidate_profiles — 1 user → 1+ candidaturas
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.candidate_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_urna text NOT NULL,
  cpf_hash text,
  partido_sigla text,
  cargo_alvo text NOT NULL CHECK (cargo_alvo IN ('PR','GV','SF','DF','DE','PM','VR')),
  estado char(2) NOT NULL,
  mun_code text,
  ano_eleicao int NOT NULL CHECK (ano_eleicao BETWEEN 2018 AND 2030),
  tse_candidate_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, ano_eleicao, cargo_alvo)
);
CREATE INDEX IF NOT EXISTS candidate_profiles_user_idx ON public.candidate_profiles(user_id);
CREATE INDEX IF NOT EXISTS candidate_profiles_estado_cargo_idx ON public.candidate_profiles(estado, cargo_alvo, ano_eleicao);
ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS candidate_profiles_owner_all ON public.candidate_profiles;
CREATE POLICY candidate_profiles_owner_all ON public.candidate_profiles
  FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- =========================================================================
-- 2) strategic_plans — output principal (imutável após READY)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.strategic_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_profile_id uuid NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','COLLECTING','DEGRADED','ANALYZING','READY','FAILED','ARCHIVED')),
  prompt_version text NOT NULL DEFAULT 'v1',
  inputs_hash text,
  model_used text,
  tokens_in int DEFAULT 0,
  tokens_out int DEFAULT 0,
  cache_read_tokens int DEFAULT 0,
  cache_creation_tokens int DEFAULT 0,
  cost_usd_cents int DEFAULT 0,
  duration_ms int,
  data_sources jsonb DEFAULT '{}'::jsonb,
  degraded_sources jsonb DEFAULT '[]'::jsonb,
  plan_data jsonb,
  evidence_count int DEFAULT 0,
  error_code text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  ready_at timestamptz,
  archived_at timestamptz
);
CREATE INDEX IF NOT EXISTS strategic_plans_user_status_idx
  ON public.strategic_plans(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS strategic_plans_candidate_idx
  ON public.strategic_plans(candidate_profile_id, status, created_at DESC);
ALTER TABLE public.strategic_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS strategic_plans_owner_select ON public.strategic_plans;
CREATE POLICY strategic_plans_owner_select ON public.strategic_plans
  FOR SELECT USING ((select auth.uid()) = user_id);
-- INSERT/UPDATE somente via service role (sem policy → bloqueado para anon/authenticated)

-- =========================================================================
-- 3) evidence — sustenta cada claim
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategic_plan_id uuid NOT NULL REFERENCES public.strategic_plans(id) ON DELETE CASCADE,
  claim text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('tse','ibge','camara','senado','tcu','gdelt','x','meta','news','other')),
  source_tier int NOT NULL CHECK (source_tier BETWEEN 1 AND 4),
  source_url text,
  observed_at timestamptz,
  raw_excerpt text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS evidence_plan_idx ON public.evidence(strategic_plan_id);
CREATE INDEX IF NOT EXISTS evidence_source_idx ON public.evidence(source_type, observed_at DESC);
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS evidence_owner_select ON public.evidence;
CREATE POLICY evidence_owner_select ON public.evidence
  FOR SELECT USING ((select auth.uid()) = user_id);

-- =========================================================================
-- 4) tse_candidates — catálogo TSE (cache compartilhado)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.tse_candidates (
  election_id text NOT NULL,
  tse_candidate_id text NOT NULL,
  nome_urna text,
  nome_completo text,
  partido_sigla text,
  cargo_code text,
  mun_code text,
  estado char(2),
  numero_urna int,
  situacao text,
  updated_from_tse_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (election_id, tse_candidate_id)
);
CREATE INDEX IF NOT EXISTS tse_candidates_lookup_idx
  ON public.tse_candidates(estado, cargo_code, mun_code);
ALTER TABLE public.tse_candidates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tse_candidates_read_authenticated ON public.tse_candidates;
CREATE POLICY tse_candidates_read_authenticated ON public.tse_candidates
  FOR SELECT TO authenticated USING (true);

-- =========================================================================
-- 5) ibge_indicators — KPIs socioeconômicos por município
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.ibge_indicators (
  mun_code text NOT NULL,
  indicator text NOT NULL,
  year int NOT NULL,
  value numeric,
  source_table text,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (mun_code, indicator, year)
);
CREATE INDEX IF NOT EXISTS ibge_indicators_indicator_idx ON public.ibge_indicators(indicator, year DESC);
ALTER TABLE public.ibge_indicators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ibge_indicators_read_authenticated ON public.ibge_indicators;
CREATE POLICY ibge_indicators_read_authenticated ON public.ibge_indicators
  FOR SELECT TO authenticated USING (true);

-- =========================================================================
-- 6) signals — agregador de menções/sinais externos
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL CHECK (subject_type IN ('candidate','mun_code','topic','party')),
  subject_id text NOT NULL,
  source text NOT NULL,
  source_tier int NOT NULL CHECK (source_tier BETWEEN 1 AND 4),
  observed_at timestamptz NOT NULL,
  signal_kind text NOT NULL CHECK (signal_kind IN ('mention','sentiment','engagement','discourse','poll','official_act')),
  value_numeric numeric,
  value_text text,
  meta_json jsonb,
  url text,
  ingest_run_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS signals_subject_idx ON public.signals(subject_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS signals_source_idx ON public.signals(source, observed_at DESC);
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS signals_read_authenticated ON public.signals;
CREATE POLICY signals_read_authenticated ON public.signals
  FOR SELECT TO authenticated USING (true);

-- =========================================================================
-- 7) ai_budget — guarda-chuva de custo por usuário/mês
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.ai_budget (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month char(7) NOT NULL,  -- YYYY-MM
  plan_tier text NOT NULL DEFAULT 'start' CHECK (plan_tier IN ('start','pro','premium','admin')),
  tokens_in_used int NOT NULL DEFAULT 0,
  tokens_out_used int NOT NULL DEFAULT 0,
  x_reads_used int NOT NULL DEFAULT 0,
  cost_usd_cents_used int NOT NULL DEFAULT 0,
  monthly_cap_cents int NOT NULL DEFAULT 200,  -- $2.00 default
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, month)
);
ALTER TABLE public.ai_budget ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_budget_owner_select ON public.ai_budget;
CREATE POLICY ai_budget_owner_select ON public.ai_budget
  FOR SELECT USING ((select auth.uid()) = user_id);

-- =========================================================================
-- 8) rate_limits — bucket por usuário+endpoint+minuto
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  window_start timestamptz NOT NULL,
  count int NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, endpoint, window_start)
);
CREATE INDEX IF NOT EXISTS rate_limits_cleanup_idx ON public.rate_limits(window_start);
-- Sem RLS: acesso só pelo service role nas serverless functions

-- =========================================================================
-- 9) Reescrita de policies existentes para corrigir auth_rls_initplan
--    (usar (select auth.uid()) evita re-eval por linha em queries grandes)
-- =========================================================================
DO $$
DECLARE r RECORD;
BEGIN
  -- profiles
  DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
  CREATE POLICY profiles_select_own ON public.profiles
    FOR SELECT USING ((select auth.uid()) = id);
  DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
  CREATE POLICY profiles_update_own ON public.profiles
    FOR UPDATE USING ((select auth.uid()) = id) WITH CHECK ((select auth.uid()) = id);

  -- user_state
  DROP POLICY IF EXISTS user_state_select_own ON public.user_state;
  CREATE POLICY user_state_select_own ON public.user_state
    FOR SELECT USING ((select auth.uid()) = user_id);
  DROP POLICY IF EXISTS user_state_insert_own ON public.user_state;
  CREATE POLICY user_state_insert_own ON public.user_state
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
  DROP POLICY IF EXISTS user_state_update_own ON public.user_state;
  CREATE POLICY user_state_update_own ON public.user_state
    FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
  DROP POLICY IF EXISTS user_state_delete_own ON public.user_state;
  CREATE POLICY user_state_delete_own ON public.user_state
    FOR DELETE USING ((select auth.uid()) = user_id);

  -- payments
  DROP POLICY IF EXISTS payments_select_own ON public.payments;
  CREATE POLICY payments_select_own ON public.payments
    FOR SELECT USING ((select auth.uid()) = user_id);

  -- contacts
  DROP POLICY IF EXISTS contacts_select_own ON public.contacts;
  CREATE POLICY contacts_select_own ON public.contacts
    FOR SELECT USING ((select auth.uid()) = user_id);
  DROP POLICY IF EXISTS contacts_insert_own ON public.contacts;
  CREATE POLICY contacts_insert_own ON public.contacts
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
  DROP POLICY IF EXISTS contacts_update_own ON public.contacts;
  CREATE POLICY contacts_update_own ON public.contacts
    FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
  DROP POLICY IF EXISTS contacts_delete_own ON public.contacts;
  CREATE POLICY contacts_delete_own ON public.contacts
    FOR DELETE USING ((select auth.uid()) = user_id);

  -- demands
  DROP POLICY IF EXISTS demands_select_own ON public.demands;
  CREATE POLICY demands_select_own ON public.demands
    FOR SELECT USING ((select auth.uid()) = user_id);
  DROP POLICY IF EXISTS demands_insert_own ON public.demands;
  CREATE POLICY demands_insert_own ON public.demands
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
  DROP POLICY IF EXISTS demands_update_own ON public.demands;
  CREATE POLICY demands_update_own ON public.demands
    FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
  DROP POLICY IF EXISTS demands_delete_own ON public.demands;
  CREATE POLICY demands_delete_own ON public.demands
    FOR DELETE USING ((select auth.uid()) = user_id);

  -- ai_analyses
  DROP POLICY IF EXISTS ai_analyses_select_own ON public.ai_analyses;
  CREATE POLICY ai_analyses_select_own ON public.ai_analyses
    FOR SELECT USING ((select auth.uid()) = user_id);
  DROP POLICY IF EXISTS ai_analyses_insert_own ON public.ai_analyses;
  CREATE POLICY ai_analyses_insert_own ON public.ai_analyses
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
END $$;

-- =========================================================================
-- 10) Vincular ai_analyses ao strategic_plan (nullable, não-breaking)
-- =========================================================================
ALTER TABLE public.ai_analyses
  ADD COLUMN IF NOT EXISTS strategic_plan_id uuid REFERENCES public.strategic_plans(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS ai_analyses_strategic_plan_idx
  ON public.ai_analyses(strategic_plan_id);

-- =========================================================================
-- 11) Índices em FKs não-indexadas (advisor)
-- =========================================================================
CREATE INDEX IF NOT EXISTS payments_user_id_idx ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS voting_results_candidate_id_idx ON public.voting_results(candidate_id);
CREATE INDEX IF NOT EXISTS voting_results_region_id_idx ON public.voting_results(region_id);

-- =========================================================================
-- 12) Trigger updated_at em strategic_plans
-- =========================================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS strategic_plans_touch_updated_at ON public.strategic_plans;
CREATE TRIGGER strategic_plans_touch_updated_at
  BEFORE UPDATE ON public.strategic_plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS candidate_profiles_touch_updated_at ON public.candidate_profiles;
CREATE TRIGGER candidate_profiles_touch_updated_at
  BEFORE UPDATE ON public.candidate_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

COMMIT;

-- =========================================================================
-- Verificação pós-migration (rodar manualmente, não dentro de transação):
-- SELECT name, level FROM advisors WHERE level='WARN'; -- esperar redução
-- SELECT count(*) FROM public.strategic_plans;        -- 0
-- SELECT count(*) FROM public.candidate_profiles;     -- 0
-- =========================================================================
