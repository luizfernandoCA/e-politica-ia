# Pitch — e-politica.ia

Material de apoio para conversas comerciais com candidatos, coordenadores
de campanha e assessores parlamentares. Cada bloco é independente:
escolha o que servir conforme a conversa.

> **✅ Status de produção (2026-06-12).** O painel está no ar em
> https://e-politica-ia.vercel.app com **dados reais** (TSE, CRM, Reports,
> cache, LGPD, checkout) **e a IA ativa**: o **Mestre (Claude Opus 4.7)** responde
> no chat chamando tools sobre a apuração oficial do TSE, e a **Consultoria
> E-Poliana** gera relatórios com busca web. Validado em produção em 2026-06-12.

---

## 🎯 Posicionamento em 1 frase

> **A inteligência de campanha que candidatos sérios usam para ganhar — dados oficiais TSE/TRE + CRM eleitoral + IA estrategista em um único painel, por R$ 99,90/mês sem fidelidade.**

---

## 🥊 Por que não é "mais um sistema de campanha"

Concorrente referência: **Politique.com.br**. Comparativo objetivo:

| Item | e-politica.ia | Politique |
|---|---|---|
| Assinatura mensal | **R$ 99,90** sem fidelidade | Mensalidade elevada com fidelidade |
| Custo por relatório PDF | **R$ 500,00** (no plano executivo) | até R$ 2.000,00 |
| IA estrategista integrada | **Mestre (Claude Opus 4.7)** com SWOT/discursos | Não possui |
| Mapa de calor de lideranças | Coordenadas reais cruzadas com CRM | Mapa genérico, sem foco tático |
| Dados TSE/TRE | Oficiais + cache resiliente (Fase D) | Oficiais |
| Foco regional | **Rondônia (52 municípios pré-mapeados)** + expansão BR | Brasil genérico |
| Pagamento | Pix / cartão / boleto via Mercado Pago | Boleto/cartão |
| Cancelamento | Online, a qualquer momento | Em geral via SAC |

---

## 💡 Os 3 diferenciais que fecham venda

### 1. Mestre: IA Estrategista que entende eleição brasileira
Não é "ChatGPT genérico" — o Mestre roda em **Claude Opus 4.7**
(modelo de ponta da Anthropic, 2026) com prompt cacheado pelo
contexto da sua campanha (candidato, partido, município, cargo).

Pergunte coisas como:
- *"Faça meu SWOT de campanha pra Porto Velho"*
- *"Escreva um discurso pro evento no Jardim das Mangueiras"*
- *"Compare meu histórico TSE com o vereador X eleito em 2020"*
- *"Quais 3 ações eu deveria fazer essa semana?"*

E recebe respostas **em 15 segundos**, estruturadas em Markdown,
respeitando a Lei 9.504/97 (sem sugestões ilegais).

### 2. Cache TSE resiliente (você nunca fica sem dados)
O portal DivulgaCandContas do TSE cai com frequência — e justamente
em pico de campanha. Nosso `api/tse` consulta primeiro um **cache
persistente** no Supabase (TTL 14 dias) e só bate no TSE quando precisa.

Resultado:
- **~30x mais rápido** em cache hit (50ms vs 1.5s)
- **Continua funcionando** mesmo se o TSE cair
- Você vê `lastFetchedAt` na UI — saber se o dado é desta semana ou
  do mês passado é parte da confiança.

### 3. Foco em Rondônia, pronto para o Brasil
- **52 municípios de RO pré-mapeados** com códigos TSE + IBGE + variantes
  de acentuação (Porto Velho → 00035, Cacaulândia → 00620, etc.).
- Dados eleitorais de **2020, 2022 e 2024** já indexados.
- Reconhecimento das particularidades do TRE-RO.
- Arquitetura multi-tenant via RLS Supabase — adicionar outros estados
  é configuração, não engenharia.

---

## 📊 Quantos votos / R$ você precisa pra justificar?

Tomando o plano padrão R$ 99,90 × 12 meses = **R$ 1.198,80/ano**:

- Custo médio por voto em campanha estadual = **R$ 1,50 a R$ 4,00**
  (fonte: TSE Prestação de Contas 2022).
- Se a plataforma te ajudar a converter **300 votos a mais**, ela se paga.
- Se converter **1.000 a mais**, você economiza ~R$ 2.000.

Não é mágica — é método: dados oficiais + CRM organizado + IA que ajuda
a decidir mais rápido = menos energia desperdiçada com palpite.

---

## 🛡️ Por que é seguro confiar dados sensíveis aqui

1. **Sem cartão na aplicação**. Pagamento 100% no Mercado Pago (PCI).
2. **Row Level Security** em todas as tabelas: outro candidato
   **nunca** vê seus dados, nem por bug, nem por SQL injection.
3. **Minimização de dados (LGPD art. 6º, III)** — não coletamos CPF de
   eleitores; o CRM guarda apenas nome, telefone e região.
4. **Chave da IA nunca chega no browser** — proxy serverless.
5. **Auditoria de uso da IA** (relatório de consumo por dia/semana) está no
   roadmap — a tabela `ai_analyses` já existe com RLS por dono, e a gravação
   de métricas será habilitada junto com a ativação da IA.

---

## ❓ FAQ comercial rápida

**"Vocês são parceiros oficiais do TSE?"**
Não. Somos uma plataforma privada que **consome dados públicos** do TSE
e TRE. Nenhuma instituição governamental endossa, certifica ou homologa
o produto.

**"E se as eleições acabarem? Continuo pagando?"**
Você cancela online quando quiser. Sem fidelidade. Sem multa.

**"Posso usar pra vereador? Deputado? Senador?"**
Hoje o foco é municipal (prefeito + vereador) em RO. Estamos
expandindo pra cargos estaduais/federais e outros estados em 2026.
Entre em contato pra agendar early access.

**"Posso ter mais de um usuário (equipe)?"**
Hoje 1 conta = 1 candidato. Multi-usuário/equipe está no roadmap P2
(item #14) — chegue agora e a feature será calibrada no seu caso.

**"Vocês fazem o site/redes sociais da campanha?"**
Não. Somos plataforma de **inteligência e gestão**, não agência de
marketing. Mas nossas saídas de IA (discursos, posts) são consumíveis
pela sua equipe de comunicação diretamente.

**"E a Lei Geral de Proteção de Dados?"**
Cumprimos LGPD: dados de eleitor cadastrado por você ficam sob sua
responsabilidade como controlador; somos operador. Não coletamos CPF de
eleitores (minimização de dados, LGPD art. 6º, III) — o CRM guarda apenas
nome, telefone e região. Política de Privacidade e Termos de Uso públicos
em `#/privacidade` e `#/termos`.

---

## 🚀 Próximos passos pra fechar

1. **Onboarding em 10 minutos** — você cria conta, paga, configura
   município/cargo/meta, e já vê dashboards com dados reais.
2. **Acesso VIP pra avaliação** — peça um teste guiado de 30 min:
   `contato@e-politica.ia`.
3. **Demo ao vivo** — agendamos chamada de 20 min com tela compartilhada.
4. **Workshop pra equipe de campanha** — 2h, presencial ou online,
   negociável.

---

## 📌 Para a equipe comercial — o que NÃO dizer

Cuidado com promessas que nos expõem juridicamente ou nos comparam
indevidamente:

- ❌ "Somos homologados pelo TSE." → ✅ "Integramos dados públicos
  do TSE/TRE."
- ❌ "Nossa IA não erra." → ✅ "A Mestre acelera análise; valide
  decisões críticas com sua equipe."
- ❌ "Garantimos votos." → ✅ "Reduzimos o trabalho braçal pra você
  decidir melhor com os mesmos recursos."
- ❌ "Concorrentes são caros e ruins." → ✅ "Temos uma proposta de
  valor diferente: mensalidade baixa, IA nativa, foco regional."
