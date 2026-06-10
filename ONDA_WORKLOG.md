# ONDA WORKLOG — e-politica-ia (MODO NEMESIS AUTÔNOMO)

## Missão
Refatorar e amadurecer e-politica-ia até nível profissional: lint 0 erros, build
limpo, todas as páginas funcionando, robustez de produção, superioridade demonstrável
sobre Politique. Deploy final `vercel --prod` autorizado pelo usuário.
Critério de pronto: ver Checklist de Pronto no fim deste arquivo.

## Reconhecimento (2026-06-10)
- Estado MUITO mais maduro que o ROADMAP (datado 2026-06-05). Vários P0/P1 já feitos.
- `npm run lint` → **0 erros** (baseline já limpo).
- `npm run build` → **sucesso**. Único warning: chunk index >500kB (não-crítico).
- Roteamento legado `useState activePage`. Comparison.jsx/Analytics.jsx são LEGADAS
  (App.jsx redireciona `analytics`/`comparison` → ApuracaoTSE). Não são rotas ativas.
- Reports.jsx JÁ consome TSE real (/api/tse-apuracao, /api/tse-gastos, /api/tse-secoes)
  e JÁ TEM exportCSV() implementado (BOM UTF-8 + escaping). Paridade Politique já existe.
- ApuracaoTSE.jsx usa boletim OFICIAL do TSE (candidate_votes reais), não estimativa.

## Hipóteses ativas (substituem perguntas em modo autônomo)
- [H1] FORTE — Os "votos" exibidos nas telas ATIVAS (ApuracaoTSE, Reports) são oficiais
  do TSE; o badge "Estimativa" do roadmap visava telas legadas (mock). Impacto se falsa:
  badge no lugar errado induz erro. Mitigação: adicionar badge de PROCEDÊNCIA (Oficial
  TSE vs Demo) que reflete a fonte real, cobrindo ambos os casos sem mentir.
- [H2] FORTE — Páginas LGPD não existem (footer só tem copyright). Gap de paridade real
  com Politique. Impacto se falsa: retrabalho mínimo.
- [H3] FORTE — Math.random no electoralMockData.js (9 ocorrências) só roda em telas de
  demo pré-setup; as 2 do CRM.jsx posicionam pin no mapa (cosmético, justificável).
- [H4] DESCONHECIDA — Não tenho acesso MCP ao Supabase (instruído a não usar). Qualquer
  mudança de schema fica ADIADA/documentada. RLS intocada.
- [H5] FRACA — PITCH.md cita "Sonnet 4.6" mas assistant.js subiu p/ Opus 4.7 (commit #13).
  Inconsistência de doc a corrigir.

## Decisões (ADRs resumidos)
- [D1] NÃO migrar para TypeScript nesta missão (P1, 20-30h, fora do escopo "amadurecer
  sem reescrever o que funciona"). Anti-redecisão: o app funciona em JSX. Documentado.
- [D2] NÃO migrar CRM JSONB→tabela `contacts` agora: exige migração de dados + mudança
  de schema, e NÃO tenho acesso Supabase. Risco de perda de dados. ADIADO com ADR.
- [D3] NÃO implementar React Router agora: o roteamento por estado funciona e ErrorBoundary
  protege as telas. Trocar agora é re-decisão de alto custo/baixo retorno p/ a missão de
  produção. ADIADO. (Deep linking é P1, não gate de produção.)
- [D4] Badge de procedência será componente reutilizável <DataSourceBadge kind=.../> com
  kinds: 'official' (Oficial TSE), 'estimate' (Estimativa), 'demo' (Demonstração).
- [D5] Streaming SSE no /api/assistant ADIADO: custo/benefício não justifica risco em
  janela de produção; resposta completa já funciona. P1.
- [D6] Leaked Password Protection: toggle MANUAL no dashboard Supabase. Pendência HUMANA.

## Estado atual
modo=Onda 4 (maturidade/produção) onda=4 etapa=ver Fila

## Fila de trabalho
- [x] Inspeção completa (lint/build/estrutura/leitura código) — FEITO
- [x] Branch feat/nemesis-refactor criada
- [ ] Limpar Math.random do electoralMockData.js (determinístico)
- [ ] Criar <DataSourceBadge> e aplicar em telas (procedência real dos dados)
- [ ] Páginas LGPD: PrivacyPolicy + TermsOfUse + linká-las no footer da Landing
- [ ] Debounce nas saves automáticas (App.jsx saveContacts/saveTasks)
- [ ] Code-splitting p/ matar warning de chunk >500kB
- [ ] Corrigir inconsistência de modelo no PITCH/README (Opus 4.7)
- [ ] Atualizar README/ROADMAP refletindo novo estado
- [ ] Refinamento + onda-verifier (auditoria hostil) antes do deploy
- [ ] Deploy vercel --prod + capturar URL

## Log de execução (append-only)
- 2026-06-10 — Reconhecimento concluído. Lint/build limpos. Plano cirúrgico definido
  (não é refatoração ampla; o app já é maduro). Branch criada. Worklog inicializado.

## Bloqueios (só o que EXIGE humano)
- Leaked Password Protection (toggle Supabase Auth dashboard) — pendência humana.
- Mudanças de schema Supabase — sem acesso MCP por instrução; adiadas e documentadas.

## Checklist de Pronto (gate de produção)
- [ ] npm run lint → 0 erros
- [ ] npm run build → sucesso sem warnings críticos
- [ ] Smoke test: todas as páginas montam sem exception
- [ ] P0 do roadmap implementado; adiados documentados em ADR
- [ ] Páginas LGPD publicadas e linkadas
- [ ] Exportação CSV nos Reports (paridade Politique) — já existe, validar
- [ ] Tabela comparativa vs Politique verdadeira (PITCH.md)
- [ ] README/ROADMAP atualizados
- [ ] Veredito onda-verifier OK
- [ ] Deploy prod + URL capturada
