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

## [I-008] Rate-limit e budget cap em produção EXIGEM RPC SQL atômica
- Categoria: custo
- Gatilho: implementar qualquer cap (rate-limit, budget, quota) usando UPSERT ou GET+PATCH em Postgres
- Comportamento: NÃO use UPSERT-then-SELECT nem GET+PATCH. Crie RPC SQL com INSERT...ON CONFLICT DO UPDATE...RETURNING (atomic) ou UPDATE...WHERE guard...RETURNING. Verifier vai pegar esse race em 100% dos casos. Adotado via atomic_rate_limit_check + atomic_budget_charge.
- Origem: NEMESIS 3 verifier (2026-06-21), defeitos #2 e #3
- Confiança: 0.95 (regra dura, evidência forte)
- Evidência: 1 reprovação direta + literatura clássica de race conditions

## [I-009] INV de domínio NUNCA vai opcional — implementar mesmo que custe
- Categoria: domínio
- Gatilho: tentar entregar feature com invariante "TODO"
- Comportamento: validator que diz "INV-1 desligada nesta versão" é vetor de alucinação em 100% dos casos onde IA está no caminho. Solução: ou (a) implementa a invariante com a fonte de dados disponível, ou (b) DESATIVA a feature até ter a invariante. Não publicar com INV-off.
- Origem: NEMESIS 3 verifier (2026-06-21), defeito #5
- Confiança: 0.85
- Evidência: 1 reprovação direta + I-003 (banner de honestidade) reforça

## [I-010] Blocklist regex contra fala humana é teatro de segurança
- Categoria: segurança
- Gatilho: filtrar saída de LLM por conteúdo proibido com regex
- Comportamento: regex pega 30-50% dos casos. Homoglyph, base64, idioma alternativo, paráfrase passam. Solução real: classifier IA (Claude rápido perguntando "isso viola X?") OU revisão humana obrigatória até ter dataset. Normalização de homoglyph é must-have mas não é suficiente.
- Origem: NEMESIS 3 verifier (2026-06-21), defeito #6
- Confiança: 0.8
- Evidência: 1 reprovação + estado da arte de safety filters

## [I-011] Subagent do tipo Skill NÃO vê /tmp do parent
- Categoria: operação
- Gatilho: spawn de onda-verifier ou outro subagent para auditar código que está em /tmp
- Comportamento: subagent começa cold, sem acesso ao filesystem do parent. Para auditar código, anexar o diretório à sessão ANTES via request_cowork_directory, OU mandar os trechos no brief (caro), OU clonar o repo dentro do agent. Sem isso, verifier devolve "REPROVADO por falta de evidência" — o que tecnicamente está correto.
- Origem: NEMESIS 3 verifier (2026-06-21), nota de método
- Confiança: 0.7
- Evidência: 1 ocorrência clara

## [I-012] cpf_hash sem salt = CPF em claro perante ANPD
- Categoria: segurança
- Gatilho: armazenar identificador derivado de PII (CPF, CNPJ, telefone)
- Comportamento: SHA-256 de CPF é quebrado por rainbow table (10^11 espaço) em segundos. Use HMAC com chave em KMS/secret manager, ou hash com salt único por linha. Nunca hash plano. ANPD trata como dado pessoal em claro.
- Origem: NEMESIS 3 verifier (2026-06-21), defeito #7
- Confiança: 0.9
- Evidência: regulação ANPD + literatura básica de criptografia

## [I-013] Vercel Hobby plan = 12 serverless functions MAX por deployment
- Categoria: operação
- Gatilho: adicionar novo .js dentro de api/ ou subpastas de api/
- Comportamento: Vercel conta TODO .js dentro de api/ (incluindo subpastas) como serverless function. Hobby plan cap=12. Pro $20/mês cap=100+. Para projetos Hobby, helpers de uma function devem viver em lib/ (não em api/), e a function importa via `import { ... } from '../../lib/...'`. Confirmado em 21/06/2026 — build falhou com mensagem clara "No more than 12 Serverless Functions can be added".
- Origem: NEMESIS 3 (2026-06-21), build Vercel falhou 2x
- Confiança: 0.95
- Evidência: mensagem explícita do Vercel + fix funcionou imediatamente

## [I-014] Sem acesso ao Vercel dashboard? Use Claude in Chrome MCP (user logado)
- Categoria: operação
- Gatilho: build da Vercel falhou, WebFetch retorna HTML shell sem log, sem token Vercel
- Comportamento: pedir ao user pra abrir o link de build no Chrome dele (logado), depois usar mcp__Claude_in_Chrome__navigate + get_page_text para ler o log real renderizado. Funciona porque Chrome MCP executa JS (WebFetch não). Levou 1 turn pra achar o erro real, vs várias horas de chute cego.
- Origem: NEMESIS 3 (2026-06-21)
- Confiança: 0.8
- Evidência: 1 ocorrência salvou a iteração

## [I-015] Inline prompts em serverless functions (não readFileSync de .txt)
- Categoria: arquitetura
- Gatilho: serverless function precisa de conteúdo grande estático (prompt, config, template)
- Comportamento: Vercel/Netlify/Lambda NÃO incluem arquivos não-JS no bundle por default. readFileSync de .txt vai falhar em runtime. Solução: inline como template string no .js, ou criar wrapper .js que exporta a string. Para versionamento de prompts grandes: usar arquivo .js separado (ex: prompts/v1.js exportando const SYSTEM_PROMPT). Confirmado mas não foi a causa do build fail desta iteração (foi I-013).
- Origem: NEMESIS 3 (2026-06-21)
- Confiança: 0.85
- Evidência: comportamento conhecido + correção preventiva aplicada
