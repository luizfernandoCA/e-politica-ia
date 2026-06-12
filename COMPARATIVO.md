# Comparativo — e-politica.ia × Politique

Atualizado em **2026-06-10**. Comparação factual entre a e-politica.ia e o
concorrente de referência **Politique** (politique.com.br). Cada afirmação sobre
a e-politica.ia corresponde a código real neste repositório. As características do
Politique baseiam-se no que o site público anuncia; não temos acesso ao produto
interno deles, então itens marcados como "não anunciado" não devem ser vendidos
como ausências confirmadas.

> **⚠️ Status de produção (2026-06-11):** as capacidades de **IA (Mestre e
> Consultoria E-Poliana)** exigem uma `ANTHROPIC_API_KEY` ativa e estão
> **pendentes de ativação** no deploy atual — o código existe (`api/assistant.js`,
> `api/intel.js`), mas em produção o assistente degrada para um estrategista
> local. Todos os demais itens da tabela estão ativos. Configure a chave antes
> de vender a IA Mestre como diferencial em operação.

## Tabela de paridade e diferenciação

| Recurso | e-politica.ia | Politique | Evidência no nosso código |
|---|---|---|---|
| Consulta/comparação de votos por candidato (TSE) | ✅ | ✅ | `ApuracaoTSE.jsx` consome `/api/tse-apuracao` (boletim oficial) |
| Apuração paralela / boletim por zona e seção | ✅ | ✅ | `/api/tse-secoes`, `Reports.jsx` (distribuição por zona) |
| Prestação de contas / gastos eleitorais | ✅ | parcial/não anunciado | `/api/tse-gastos`, KPIs de receita/despesa/custo-por-voto |
| Exportação de relatório (CSV) | ✅ | ✅ (Excel) | `Reports.jsx` → `exportCSV()` (BOM UTF-8, dados TSE reais) |
| Mapa de votos por município/zona | parcial | ✅ | dashboards por zona; mapa interativo está no roadmap (P2) |
| Página de Política de Privacidade | ✅ | ✅ | `src/pages/PrivacyPolicy.jsx` (`#/privacidade`) |
| Página de Termos de Uso | ✅ | ✅ | `src/pages/TermsOfUse.jsx` (`#/termos`) |
| Contato | ✅ (e-mail) | ✅ (WhatsApp) | links no footer/landing |
| **IA estrategista integrada (Mestre)** | ⚙️ **(Claude Opus 4.7 + tool calling — requer chave de IA ativa)** | ❌ não possui | `api/assistant.js` com 5 tools sobre dados TSE |
| **CRM de lideranças** | ✅ | não anunciado | `CRM.jsx` + persistência em `user_state` (RLS por dono) via `dbService.js` |
| **SaaS self-service com checkout** | ✅ (Pix/cartão/boleto via Mercado Pago) | ✅ | `api/checkout.js`, `api/mp-webhook.js` |
| **Cache TSE resiliente** | ✅ (Supabase, TTL 14d) | não anunciado | `api/tse.js` consulta cache antes do TSE |
| **Procedência de dados explícita** | ✅ (Oficial/Estimativa/Demo) | não anunciado | `DataSourceBadge.jsx` |
| Segurança RLS por usuário | ✅ (todas as tabelas do `schema.sql`) | não anunciado | `supabase/schema.sql` (políticas `auth.uid() = user_id`) |
| Minimização de dados (sem coleta de CPF de eleitor) | ✅ | não anunciado | `CRM.jsx` coleta apenas nome/telefone/região |

## Onde de fato somos superiores (afirmações verdadeiras)

1. **IA Mestre nativa com acesso a dados reais.** O Politique, pelo site público,
   não anuncia IA. Nosso Mestre (Claude Opus 4.7) chama 5 tools que leem a
   apuração oficial do TSE durante a conversa — análise baseada em fato, não em
   opinião genérica. Evidência: `api/assistant.js`.
2. **Transparência de procedência.** Cada número exibido é rotulado como Oficial
   TSE, Estimativa ou Demonstração — o usuário nunca confunde demo com resultado
   oficial. Evidência: `DataSourceBadge.jsx`.
3. **Self-service de ponta a ponta.** Assinatura online (Pix/cartão/boleto), sem
   fidelidade, com liberação automática via webhook. Evidência: `api/checkout.js`
   + `api/mp-webhook.js`.
4. **Resiliência de dados.** Cache TSE persistente reduz latência e mantém o
   painel funcional quando o portal do TSE cai. Evidência: `api/tse.js`.

## Onde ainda estamos atrás / em paridade parcial (honesto)

- **Mapa interativo de votos.** O Politique destaca mapa de votos; nós temos
  distribuição por zona em tabela, mas o mapa geográfico interativo é roadmap P2.
- **Exportação Excel nativa.** Hoje exportamos **CSV** (abre no Excel, separador e
  BOM corretos). Export `.xlsx` formatado é incremento futuro.
- **Multi-tenant por equipe.** Hoje 1 conta = 1 candidato; equipes (assessor +
  candidato) são roadmap P2.

## Regras de discurso comercial (não inflar)

- Nunca dizer "homologado pelo TSE". Dizer "integra dados públicos do TSE/TRE".
- Nunca dizer que o Politique "não tem" algo que apenas não está no site público —
  usar "não anunciado publicamente".
- Nunca prometer votos ou resultado eleitoral.
