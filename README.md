# e-politica.ia

Plataforma SaaS de inteligência política para campanhas eleitorais municipais: dashboards com dados oficiais do TSE, CRM de lideranças, comparativos e assistente estrategista com IA (E-Poliana).

## Arquitetura (produção)

| Camada | Tecnologia | Status |
|---|---|---|
| Frontend | React 19 + Vite | ✅ pronto |
| Autenticação | Supabase Auth (e-mail/senha + Google OAuth) | ✅ ativo |
| Banco de dados | Supabase Postgres com Row Level Security | ✅ ativo (projeto `tlnprjkiydiogrcsruxw`, região São Paulo) |
| Pagamentos | Mercado Pago Checkout Pro (Pix, cartão, boleto) | ⚙️ requer `MP_ACCESS_TOKEN` |
| IA (E-Poliana) | Claude API via proxy serverless | ⚙️ requer `ANTHROPIC_API_KEY` |
| Dados eleitorais | API TSE DivulgaCandContas (proxy `api/tse.js`) | ✅ ativo |
| Hospedagem | Vercel (SPA + serverless functions) | ✅ configurado |

**Sem chaves configuradas**, o app continua funcional: auth e dados já são reais (Supabase); o assistente usa o estrategista local e o checkout exibe aviso de gateway pendente.

## Rodando localmente

```bash
npm install
npm run dev
```

O frontend já aponta para o Supabase de produção (a chave publishable é pública por design; a segurança vem das políticas RLS).

## Deploy na Vercel

1. Importe o repositório na Vercel (framework: Vite).
2. Em **Settings → Environment Variables**, configure:

| Variável | Onde obter | Para quê |
|---|---|---|
| `MP_ACCESS_TOKEN` | [Mercado Pago Developers](https://www.mercadopago.com.br/developers/panel/app) → Criar aplicação → Credenciais de produção | Pagamentos reais |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com/settings/keys) | Assistente IA real |
| `SUPABASE_SERVICE_ROLE_KEY` | [Supabase → Settings → API](https://supabase.com/dashboard/project/tlnprjkiydiogrcsruxw/settings/api) | Webhook ativa assinatura |
| `SUPABASE_URL` | `https://tlnprjkiydiogrcsruxw.supabase.co` | Webhook |
| `APP_URL` | URL pública do deploy | Redirects do checkout |

3. Redeploy. Tudo passa a operar em modo 100% real.

## Fluxo de venda

1. Visitante → Landing Page → "Começar Agora".
2. Cria conta (Supabase Auth). Com confirmação de e-mail ativa, o usuário confirma e entra.
3. Tela de assinatura → **Pagar com Mercado Pago** → redirecionado ao checkout seguro (Pix/cartão/boleto).
4. Mercado Pago notifica `api/mp-webhook` → pagamento gravado na tabela `payments` → assinatura ativada em `user_state.payment_status`.
5. Usuário volta ao app já com acesso liberado → configura a campanha (dados reais do TSE) → usa o painel.

E-mails VIP (`webcamargo@gmail.com`, `sergio.augusto.olv@gmail.com`) têm acesso sem pagamento.

## Configurações opcionais no Supabase

- **Login com Google**: Dashboard → Authentication → Providers → Google (requer client ID/secret do Google Cloud Console).
- **Entrada sem confirmação de e-mail**: Authentication → Providers → Email → desativar "Confirm email".
- **E-mails transacionais em produção**: configurar SMTP próprio (Authentication → Emails), pois o SMTP embutido tem limite de 2 e-mails/hora.

## Esquema do banco (resumo)

- `profiles` — perfil criado automaticamente no signup (trigger).
- `user_state` — parâmetros de campanha, contatos do CRM, tarefas e status de assinatura (1 linha por usuário, RLS própria).
- `payments` — livro-razão de pagamentos (escrito apenas pelo webhook com service role).
- `candidates`, `regions`, `voting_results` — dados de referência somente leitura.

Migração completa em `supabase/schema.sql`.

## Segurança

- Nenhum dado de cartão passa pela aplicação (PCI fica 100% no Mercado Pago).
- Chaves secretas só existem como variáveis de ambiente nas funções serverless.
- Todas as tabelas têm Row Level Security; cada usuário só acessa os próprios dados.
