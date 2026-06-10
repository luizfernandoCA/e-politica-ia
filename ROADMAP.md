# Roadmap

Estado em **2026-06-10**, após a iteração NEMESIS (refatoração + hardening
de produção + paridade LGPD/export). Itens agrupados por prioridade; esforço
em horas assume 1 dev sênior.

---

## ✅ P0 — RESOLVIDO na iteração NEMESIS (2026-06-10)

### 1. Leaked Password Protection no Supabase Auth — **PENDÊNCIA HUMANA**
Toggle no [Auth dashboard](https://supabase.com/dashboard/project/tlnprjkiydiogrcsruxw/auth/policies)
(checa senhas vazadas no HaveIBeenPwned). É um toggle de dashboard, **sem código**.
Não há acesso MCP ao Supabase nesta iteração — fica como ação manual do operador.

### 2. ✅ Badge de procedência de dados — FEITO
Criado `src/components/DataSourceBadge.jsx` com 3 kinds: `official` (Oficial TSE),
`estimate` (Estimativa) e `demo` (Demonstração). Aplicado em:
- `ApuracaoTSE.jsx` e `Reports.jsx` → `official` (votos oficiais do TSE).
- `Dashboard.jsx` → `official` no banner TSE + `demo` nos cards ilustrativos.
- `Comparison.jsx` e `Analytics.jsx` (telas legadas) → `estimate`.
> Correção de premissa do roadmap antigo: as telas ATIVAS (ApuracaoTSE/Reports)
> usam votos **oficiais** do TSE, não estimativa — o badge reflete a fonte real.

### 3. ✅ `Math.random` no mock — FEITO
As 9 ocorrências em `electoralMockData.js` foram trocadas por variância
determinística (hash FNV-1a com seed estável), de modo que os dados de demo não
mudam a cada render. O jitter de pin do mapa no `CRM.jsx` também foi tornado
determinístico (seed por id+nome do contato).

### Itens extras entregues nesta iteração
- ✅ Páginas LGPD públicas (`#/privacidade`, `#/termos`) linkadas no footer e sidebar.
- ✅ Export CSV nos Reports — já existia (dados TSE reais, BOM UTF-8); validado.
- ✅ Debounce (700ms) nas saves automáticas de contacts/tasks no `App.jsx`.
- ✅ Code-splitting (React.lazy/Suspense) — bundle inicial 611kB → 482kB, sem warning.
- ✅ Docs corrigidos: modelo IA = Opus 4.7 (era citado "Sonnet 4.6" em PITCH/README).

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
- hash de CPF (SHA-256): a Plataforma hoje **não coleta CPF** (minimização de
  dados, refletida na Política de Privacidade). Se um dia coletar, implementar
  o hash no client **antes** de atualizar a Política — nunca o contrário
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
