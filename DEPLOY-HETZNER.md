# Deploy do e-politica.ia no Hetzner Cloud

Migração **da Vercel para servidor próprio** (Hetzner), com Docker + Caddy (TLS
automático). O app passa a rodar como um servidor Node único (`server.js`) que
serve o build do Vite e expõe as funções de `api/`.

> **Provisionamento roda na SUA conta.** Este runbook é o passo a passo; os
> comandos de servidor, DNS e segredos são executados por você (ou por um token
> de API que você controla). O assistente não cria conta, não insere senha/cartão,
> não aceita termos nem mexe em permissões por você.

---

## 0. Pré-requisitos
- Um domínio que você controle (ex.: `app.seudominio.com.br`) para apontar ao servidor.
- Os segredos do projeto (mesmos da Vercel): `ANTHROPIC_API_KEY`, `SUPABASE_URL`,
  `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `MP_ACCESS_TOKEN`,
  `MP_WEBHOOK_SECRET`, `APP_URL`.

## 1. Criar o servidor (Hetzner Cloud Console)
1. Em **console.hetzner.com/projects** → seu projeto → **Add Server**.
2. Localização: Alemanha/Finlândia (ou a mais próxima do público) · Imagem: **Ubuntu 24.04**.
3. Tipo: **CX22** (2 vCPU / 4 GB) já roda bem; **CPX21** se quiser folga.
4. Adicione sua **chave SSH**. Crie e anote o **IP público**.

## 2. Apontar o domínio
- No seu DNS, crie um registro **A**: `app.seudominio.com.br → IP_DO_SERVIDOR`.
- Espere propagar (`dig app.seudominio.com.br` deve retornar o IP). Caddy só emite
  o certificado TLS depois que o DNS resolve.

## 3. Preparar o servidor
```bash
ssh root@IP_DO_SERVIDOR
apt-get update && apt-get -y upgrade
# Docker + plugin compose
curl -fsSL https://get.docker.com | sh
# (opcional) usuário não-root
adduser deploy && usermod -aG docker deploy
```

## 4. Subir o código e os segredos
```bash
git clone https://github.com/luizfernandoCA/e-politica-ia.git
cd e-politica-ia
cp .env.example .env
nano .env   # preencha TODOS os segredos reais (ver seção 6)
```

## 5. Build + subir os containers
```bash
export DOMAIN=app.seudominio.com.br
docker compose up -d --build
docker compose logs -f app     # deve mostrar "rota montada" e "em produção na porta 3000"
```
Caddy emite o certificado TLS automaticamente no primeiro acesso HTTPS ao domínio.
Teste:
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://app.seudominio.com.br/         # 200
curl -s https://app.seudominio.com.br/api/intel -X POST \
  -H 'content-type: application/json' -d '{"candidateName":"x","state":"RO"}'    # 401 (gate de auth OK)
```

## 6. Variáveis de ambiente (`.env`)
| Variável | Uso | Obrigatória |
|---|---|---|
| `DOMAIN` | domínio do Caddy (passe no `docker compose`) | sim |
| `ANTHROPIC_API_KEY` | relatório/IA (`/api/intel`, `/api/assistant`) | sim p/ IA |
| `ANTHROPIC_MODEL` | override do modelo | não |
| `SUPABASE_URL` | REST/Auth Supabase | sim |
| `SUPABASE_ANON_KEY` | validação de JWT no servidor | sim |
| `SUPABASE_SERVICE_ROLE_KEY` | webhook MP (server-only) | sim p/ pagamento |
| `MP_ACCESS_TOKEN` | Mercado Pago | sim p/ pagamento |
| `MP_WEBHOOK_SECRET` | assinatura do webhook MP | recomendado |
| `APP_URL` | URL pública (back_urls/notification_url) | sim |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | **build-time** (opcionais; há fallback em `src/supabase.js`) | não |

> `VITE_*` são embutidas no build. Se quiser sobrescrever os fallbacks, defina-as
> **antes** do `docker compose build` (como build args/ambiente do estágio de build).

## 7. Ajustes externos após a migração
- **Mercado Pago:** atualize a `notification_url` do webhook para `https://SEU_DOMINIO/api/mp-webhook`.
- **Supabase Auth:** adicione `https://SEU_DOMINIO` às *Redirect URLs* / *Site URL*.
- **DNS final:** quando validar tudo, aponte o domínio principal para o Hetzner e
  **desative o projeto na Vercel** (mantenha como backup por alguns dias).

## 8. Pipeline de dados do TSE (inalterado pela migração)
O TSE **bloqueia IPs de datacenter (403)** — isso vale para Hetzner igual à Vercel.
Portanto o preload (`scripts/preload-*.js`) **continua rodando em máquina local/residencial**
e empurrando para o Supabase via `SUPABASE_SERVICE_ROLE_KEY`. Agende-o num cron local;
o servidor Hetzner apenas lê do Supabase.

## 9. Operação
```bash
docker compose pull && docker compose up -d --build   # atualizar (após git pull)
docker compose ps                                     # status
docker compose logs -f app                            # logs
docker compose down                                   # parar
```
Backups: o estado fica no **Supabase** (gerencie backups lá); o servidor é
descartável/reprovisionável a partir deste repositório.
