# ONDA — Instintos do Projeto e-politica-ia
<!-- append-only; nunca reescreva instintos antigos, só adicione/atualize confiança -->
<!-- Inicializado em 2026-06-21 na iteração NEMESIS 3 (paridade EleitoAI + motor estratégico cross-fonte). -->
<!-- Os 3 primeiros instintos foram extraídos retroativamente das iterações NEMESIS 1 e 2 (ONDA_WORKLOG.md). -->

## [I-001] Auditar advisors do Supabase antes de mexer em RLS/schema
- Categoria: segurança
- Gatilho: qualquer iteração que toque em Supabase (RLS, schema, queries, novas tabelas)
- Comportamento: `get_advisors(security)` e `(performance)` no início. `auth_leaked_password_protection` e `auth_rls_initplan` voltam como ruído crônico — não ignorar, registrar status. Não criar índice antes de medir uso.
- Origem: NEMESIS 1 (2026-06-10) + auditoria de 2026-06-21 (16 warnings ativos)
- Confiança: 0.7
- Evidência: 2 ocorrências confirmadas

## [I-002] IA sem teto de custo = produto sem teto de prejuízo
- Categoria: custo
- Gatilho: endpoint que chame Anthropic API, especialmente web_search ou tool use multi-turn
- Comportamento: rate-limit por usuário + teto de tokens/mês + teto global do projeto + alerta de custo ANTES de divulgar. `api/intel.js` faz web_search max_uses=8 + 8000 tokens/req = $0.30-0.80/chamada; sem auth = torneira aberta. Documentado como GATE-IA pendente desde 2026-06-11.
- Origem: NEMESIS 2 (2026-06-11), pendência ainda aberta em 2026-06-21
- Confiança: 0.85
- Evidência: 2 iterações apontaram o mesmo risco; código ainda sem guard

## [I-003] Banner de status de produção em docs comerciais = honestidade obrigatória
- Categoria: domínio
- Gatilho: editar PITCH.md, COMPARATIVO.md, README.md, landing copy, qualquer claim de feature ativa
- Comportamento: se a feature depende de env var não-confirmada, adicionar banner "✅ Status: ativo (data)" ou "⚠️ Pendente de ativação por chave". Nunca anunciar como ativo o que está dormindo por falta de secret. Verifier já reprovou claims falsas (CPF-hash, ai_analyses populando).
- Origem: NEMESIS 1 (2026-06-10), verifier reprovou rodada 1
- Confiança: 0.8
- Evidência: 1 reprovação direta + 1 reforço

## [I-004] X API agora é pay-per-use ($0.005/post lido) — modelar como COGS por candidato
- Categoria: custo
- Gatilho: planejar integração com X/Twitter
- Comportamento: Basic ($200) e Pro ($5k) fechados para novos clientes em 06/02/2026 — só pay-per-use ou Enterprise ($42k). Modelar custo como variável por cliente (universo de menções × $0.005). Para 50k-500k posts/mês: $250-$2.500 por candidato só de leitura. Precisa repassar no plano Pro/Premium ou impor cota.
- Origem: pesquisa 2026-06-21 (NEMESIS 3)
- Confiança: 0.6 (confirmar com X DevPortal real após criar conta)
- Evidência: 1 fonte primária + 3 secundárias

## [I-005] PR de "paridade total" com concorrente exige checklist anti-inflação
- Categoria: domínio
- Gatilho: usuário pede "todos os features do concorrente X"
- Comportamento: NÃO entregar paridade pixel-perfect numa iteração. Identificar o feature de MAIOR alavanca (no caso EleitoAI: "motor estratégico cross-fonte" que gera plano tático), entregar ESSE 100%, e enviar os demais como esqueleto + contrato. Caso contrário, 12 features pela metade é pior que 1 inteiro. Aplicar `refinamento-e-pronto` antes de assinar.
- Origem: NEMESIS 3 (2026-06-21)
- Confiança: 0.5 (candidato; confirmar em 2+ iterações)
- Evidência: 1 ocorrência

## [I-006] Smoke test em produção via WebFetch não mostra erro de runtime — é só HTML
- Categoria: teste
- Gatilho: validar app SPA em produção
- Comportamento: WebFetch retorna HTML shell (React não rodou). Validação real: (a) `curl` endpoints de API, (b) abrir via Claude in Chrome MCP que executa JS, (c) `vercel logs`. Nunca afirmar "produção verde" só com WebFetch.
- Origem: NEMESIS 3 (2026-06-21)
- Confiança: 0.5 (candidato)
- Evidência: 1 ocorrência

## [I-007] Antes de spawnar orchestrator agent: verificar quais MCPs são do agent
- Categoria: operação
- Gatilho: delegar via Agent tool, especialmente onda-orchestrator
- Comportamento: orchestrator tem (Read, Write, Edit, Glob, Grep, Bash, Agent, Skill, WebSearch, TaskCreate/Update/List). NÃO tem MCP do Supabase. Migrations e SQL ficam no parent. Brief explicitamente: "para mudança de schema/RLS, escreva SQL em `supabase/migrations/<timestamp>_<nome>.sql` e devolva — eu aplico via MCP".
- Origem: NEMESIS 3 (2026-06-21)
- Confiança: 0.6 (candidato; aplicar no momento da delegação)
- Evidência: 1 análise prévia
