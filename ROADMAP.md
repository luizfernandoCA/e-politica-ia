# Roadmap

Estado em **2026-06-05**, após auditoria completa (FASE 0) e hardening
inicial (Fases A→D). Itens estão agrupados por prioridade e cada item
indica esforço estimado em horas. Estimativas assumem 1 dev sênior.

---

## 🔴 P0 — Risco residual (resolver antes de venda em escala)

### 1. Habilitar Leaked Password Protection no Supabase Auth — **5 min**
Toggle no [Auth dashboard](https://supabase.com/dashboard/project/tlnprjkiydiogrcsruxw/auth/policies)
(checa senhas vazadas no HaveIBeenPwned). Único achado do `get_advisors`
não resolvido pela Fase A→D.

### 2. UI: badge "Estimativa" nos componentes que renderizam `votes`/`percentage` — **2h**
O payload de `/api/tse` já marca `voteDistributionKind`. Falta refletir
isso em:
- `src/pages/Comparison.jsx` (linhas que leem `voteDistribution`)
- `src/pages/Analytics.jsx`
- `src/pages/Reports.jsx`
Adicionar componente reutilizável `<DataSourceBadge kind="estimate" />`
que mostra um chip de cor/aviso ao lado do número.

### 3. Limpar `Math.random` residual em `src/data/electoralMockData.js` — **3h**
10 ocorrências geram variação cosmética em dados de demo. Não engana
o candidato em produção (só carrega pré-setup), mas deve ser substituído
por dados determinísticos ou removido junto com o resto do mock dataset.

---

## 🟡 P1 — Qualidade de código (necessário pra escalar time)

### 4. Migração TypeScript do painel — **20-30h**
Adicionar `tsconfig.json`, configurar Vite com TS, migrar 7.435 linhas
de `.jsx` → `.tsx` por módulo. Sugestão de ordem:
- `src/services/*` (auth, db) primeiro — superfície menor
- `src/components/*` (Header, Sidebar, Logo, Modal)
- `src/pages/*` (CRM, Dashboard, Assistant, etc.)
- `api/*` (serverless functions)
Aproveitar pra criar tipos compartilhados em `src/types/` espelhando
o schema Supabase (gerar via `supabase gen types typescript`).

### 5. React Router + URLs nomeáveis — **6h**
Substituir `useState activePage` por `react-router-dom` com rotas
`/dashboard`, `/crm`, `/analytics`, etc. Desbloqueia: deep linking,
back button, SEO básico no painel, analytics por rota.

### 6. Design System mínimo (Tailwind ou shadcn/ui) — **15h**
CSS-in-JS inline torna manutenção e dark mode caros. Migração progressiva
para Tailwind (sem reescrita massiva): adicionar Tailwind ao Vite, criar
tokens equivalentes aos atuais (`--accent-blue`, `--accent-green`, etc.)
como cores Tailwind customizadas, substituir componente por componente.

### 7. Debounce nas saves automáticas — **1h**
`App.jsx:167-177` faz `saveContacts`/`saveTasks` em `useEffect` a cada
mudança de state. Adicionar `lodash.debounce` (300ms) pra evitar
dezenas de upserts/segundo durante edição em massa.

### 8. Mover CRM `user_state.contacts` JSONB → tabela `contacts` — **6h**
Tabela `contacts` já existe (Fase C). Implementar:
- Função `migrateContactsJsonbToTable(userId)` no `dbService.js`
- Disparada na primeira sessão pós-migração
- Atualizar `CRM.jsx` pra ler de `contacts` ao invés de `user_state.contacts`
- Manter user_state.contacts como deprecated read-only por 1 release

### 9. Streaming SSE no `/api/assistant` — **4h**
Hoje o assistente espera resposta completa antes de mostrar texto.
Migrar pra Server-Sent Events: client lê via `ReadableStream`, mostra
tokens conforme chegam. UX dramaticamente melhor pra textos longos
(SWOTs, discursos).

---

## 🟢 P2 — Features novas (super prompt FASES 3-5)

### 10. Mapas interativos com Mapbox/Leaflet — **20h**
- Mapa do estado de RO com 52 municípios
- Camadas: contatos cadastrados, votos TSE (quando boletim integrar),
  potencial de crescimento (delta entre eleições)
- Clusters por bairro
- Planejador de rotas pra visitas
Dependência: tabela `contacts` ativa (P1.8) + `lat`/`lng` populados.

### 11. Triagem de demandas por IA — **8h**
`api/triage-demand` que classifica `category` + `priority` automaticamente
ao criar uma demanda nova. Reusa cliente Claude já configurado. Logar em
`ai_analyses` pra controle de custo.

### 12. Geração de conteúdo (posts, discursos, SWOT) — **12h**
Endpoints separados por tipo de geração, cada um com prompt cacheado:
- `/api/generate-post` (Instagram/Facebook, com tom do candidato)
- `/api/generate-speech` (discurso por território/evento)
- `/api/generate-swot` (forças/fraquezas/oportunidades/ameaças)
Todos logam em `ai_analyses`. UI: novo módulo `/conteudo` no menu.

### 13. Briefing Diário automático — **6h**
Job agendado (Vercel Cron ou Supabase Edge Function) que roda 7h e gera
"o que fazer hoje" com base no estado da campanha. Salva em
`ai_analyses` e mostra como card destacado no Dashboard.

### 14. Multi-tenant por equipe (assessor + candidato) — **12h**
Hoje 1 user = 1 candidato. Pra equipes, criar:
- `teams` (id, name, owner_user_id)
- `team_members` (team_id, user_id, role IN (owner, manager, viewer))
- Adicionar `team_id` em `contacts`, `demands`, `ai_analyses`
- RLS via `EXISTS (SELECT 1 FROM team_members WHERE team_id = X AND user_id = auth.uid())`

### 15. Planos de R$ 297 / R$ 597 / R$ 997 (super prompt FASE 5) — **8h**
Hoje só plano único R$ 99,90. Migrar para 3 níveis:
- Adicionar `plan_id` no preference do MP
- Tabela `plan_features` (plan_id, feature_key, limit_value)
- Middleware verifica limite (ex.: `contacts.count < plan.max_contacts`)
- UI de upgrade quando bater limite

### 16. Integração WhatsApp via Evolution API ou Meta Cloud — **20h**
- Disparo segmentado pra grupos por engagement_level/município
- Pesquisa rápida via webhook (eleitor responde, salvamos em `demands`)
- Chatbot básico com handoff humano
Requer infra (instância Evolution ou app Meta Business) — custo extra
não absorvível no plano de R$ 99/mês.

### 17. Compliance LGPD / TSE — **10h**
- Página `/politica-de-privacidade` (LGPD art. 9)
- Página `/termos-de-uso`
- `cpf_hash` (SHA-256) **já está** na tabela `contacts` — falta usar
  no client (`contactService` deve hashear antes de gravar)
- Banner de cookies (mesmo que só haja essenciais)
- Alertas de prazos eleitorais TSE 2026 (calendário oficial)

---

## ⚪ P3 — Nice-to-have (depois das eleições 2026)

- Apuração paralela em tempo real no dia da eleição (consumir endpoint
  TSE `/resultados/...` que abre ~17h do domingo)
- Monitor de menções na web (Google News + RSS de portais regionais)
- Análise de sentimento em WhatsApp via Claude
- Detecção de fake news (modelo classificador customizado)
- App mobile com push notifications (React Native + Expo)
- Score preditivo de probabilidade de vitória por seção
- Exportação PDF executiva (ReactPDF ou similar)
- Modo dark/light alternável (hoje só dark)

---

## Como contribuir com um item

1. Crie branch a partir de `main` (`git checkout -b feat/nome-do-item`).
2. Implemente + teste local com `npm run dev`.
3. `npm run lint` deve passar (pre-push hook valida).
4. Abra PR descrevendo decisões arquiteturais.
5. Para mudanças no Supabase: rode migration via MCP Supabase ou
   `supabase db push`; documente em `supabase/migrations/`.
