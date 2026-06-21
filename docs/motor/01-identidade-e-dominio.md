# Motor Estratégico — Identidade e Contrato de Domínio

> Documento Kit Engenharia v2 — NEMESIS 3 (2026-06-21).
> Passou pelo Ciclo 6-Fases: premissas contestadas, mecanismo, 5-personas, red team, teste do sono, versão final.

## Identidade

O **Motor Estratégico** é o coração diferenciador do e-politica.ia. Não é "mais uma IA": é
um pipeline determinístico+probabilístico que **cruza dados oficiais** (TSE, IBGE, Câmara,
Senado, GDELT) com **sinal de rede** (X, Meta, news) para produzir um único artefato:

**Plano Tático do Candidato** — documento auditável, com fontes citadas inline, contendo:

1. **Mapa de Adversários** — ranking dos N adversários reais (não inventados), priorizados
   por ameaça factível ao candidato no pleito atual, com dossiê de cada um (histórico TSE,
   bases geográficas, narrativas dominantes, vulnerabilidades).
2. **Geografia de Esforço** — onde concentrar dinheiro, tempo e presença física, por
   município/zona/seção, com peso = (eleitorado × votos históricos × indicador IBGE de
   afinidade × custo marginal estimado).
3. **Calendário de Mensagem** — pautas semanais para os próximos 90 dias com (a) o que
   postar, (b) onde postar (canal), (c) por que postar (qual sinal/dor real do território
   justifica), (d) qual adversário isso enfraquece.

## Contrato de Domínio (linguagem ubíqua — todo o time usa estes nomes)

| Termo | Definição executável (sem ambiguidade) | NÃO é |
|---|---|---|
| **Candidato** | Pessoa física registrada no TSE (ou pré-candidato declarado) que assinou o uso do produto. Identificado por `cpf_hash + cargo_alvo + estado + ano_eleicao`. | Um usuário qualquer. Um partido. Uma coligação. |
| **Adversário** | Outro candidato (mesmo cargo, mesma circunscrição, mesmo pleito) cuja remoção/enfraquecimento aumenta probabilidade de vitória do Candidato em ≥ θ pontos percentuais (θ default = 1pp). | Concorrente partidário. Crítico genérico na internet. |
| **Território** | Menor unidade geográfica com dado eleitoral consistente: município → zona → seção. Sempre referenciado por `mun_code` (TSE 5-dig) + `zone_code` + `section_code`. | Bairro (não tem dado eleitoral). Região administrativa solta. |
| **Sinal** | Observação datada e atribuída de uma fonte. Schema: `{source, source_url, observed_at, subject_id, signal_type, raw, normalized, confidence}`. | Opinião do operador. Output de IA sem fonte. |
| **Plano Tático** | Output versionado do motor: `(candidato, gerado_em, inputs_hash, adversaries[], territories[], content_calendar[], evidencias[])`. Imutável após geração; nova versão = novo plano. | Texto solto do chat. Sugestão genérica de IA. |
| **Evidência** | Tupla `(claim, source_url, observed_at, source_type)` que sustenta CADA item do Plano Tático. Sem evidência → o item não entra. | Justificativa do modelo "porque sim". |
| **Fonte Oficial** | TSE, IBGE, Câmara, Senado, TCU, Banco Central, DataSUS, INEP, MTE. Tem `tier=1`. | Portal de notícias (tier=2). Rede social (tier=3). Opinião (tier=4, descartada). |

## Invariantes (regras que o sistema NUNCA pode violar)

1. **INV-1** — Toda afirmação no Plano Tático tem ≥ 1 evidência de fonte tier 1 OU ≥ 2 evidências de tier 2. Sinal de rede (tier 3) só corrobora, nunca sustenta sozinho.
2. **INV-2** — Nenhum dado pessoal sensível de eleitor (CPF, telefone, endereço) entra no motor. O CRM é separado e não retroalimenta o Plano.
3. **INV-3** — Adversário não pode ser tratado por nome próprio em prompt de IA sem que o candidato exista no TSE para o pleito atual. Evita atacar alguém que nem é candidato.
4. **INV-4** — Custo por geração de Plano não excede orçamento configurado (default $2.00 em tokens + $1.00 em X reads). Excedeu → degrada (corta X, usa só TSE+IBGE) ou recusa.
5. **INV-5** — Plano gerado fora do prazo legal de pré-campanha (antes de 30/03 do ano eleitoral) marca explicitamente "MODO PRÉ-CAMPANHA — propaganda eleitoral antecipada é proibida pela Lei 9.504/97".
6. **INV-6** — Sugestão de conteúdo não contém: ataque pessoal, fato não-evidenciado, promessa de voto/benesse, conteúdo discriminatório. Filtro de saída obrigatório.
7. **INV-7** — RLS Supabase: candidato só vê o próprio Plano. Operador admin nunca lê plano de outro candidato sem flag de auditoria explícita.

## Atores e Papéis

| Ator | O que pode fazer | O que NÃO pode |
|---|---|---|
| **Candidato (owner)** | Gerar planos para sua candidatura. Ver histórico. Exportar PDF. | Ver planos de outros candidatos. Mudar invariantes. |
| **Operador da campanha** | Convidado pelo Candidato com role=team. Lê e comenta planos. | Gerar plano sem aprovação do Candidato (cota é do Candidato). |
| **Sistema (motor)** | Ler dados oficiais, chamar IA, gerar Plano, gravar `ai_analyses`. | Acessar dados de outro tenant. Gastar acima do teto. |
| **Verificador adversarial (CI)** | Rodar testes de invariantes em cada PR. | Mexer em dados de produção. |

## Estados do Plano Tático (FSM)

```
DRAFT  ──(inputs_ok)──▶  COLLECTING  ──(all_signals_collected)──▶  ANALYZING
                                ↓ (collect_timeout/fail)
                            DEGRADED ──(retry_ok)──▶ COLLECTING
                                                      ↓
ANALYZING  ──(ai_ok)──▶  READY  ──(superseded_by_newer)──▶  ARCHIVED
                ↓ (ai_fail/budget_exceeded)
            FAILED
```

- **DRAFT**: validando inputs (candidato existe? pleito existe?). TTL 60s.
- **COLLECTING**: chamando fontes oficiais paralelo. TTL 5min. Cada fonte pode falhar e cair para DEGRADED.
- **DEGRADED**: opera com subconjunto de fontes (rotular no output). Não bloqueia.
- **ANALYZING**: IA cruzando dados normalizados. TTL 3min. Custo monitorado live.
- **READY**: plano imutável. Pode ser substituído por nova versão (ARCHIVED).
- **FAILED**: erro irrecuperável. Devolve diagnóstico para o usuário sem cobrar tokens.

## Escopo / Limites

**Está no escopo:**
- Cargos majoritários federais/estaduais/municipais (Presidente, Governador, Senador, Prefeito).
- Cargos proporcionais (Dep. Federal, Dep. Estadual, Vereador) com cálculo de quociente eleitoral.
- Eleições de 2026 e retrospectiva de 2020+2022+2024.
- Brasil. Sem internacionalização nesta onda.

**Fora do escopo (nesta iteração):**
- Plebiscitos, referendos, eleições internas de partido.
- Compra de mídia paga (Meta Ads, Google Ads) — só sugere; não executa.
- Disparo de WhatsApp/SMS em massa — viola TSE e Lei 14.197.
- Identificação de eleitor individual — INV-2.
