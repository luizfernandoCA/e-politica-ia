/**
 * IBGE SIDRA collector — busca indicadores socioeconômicos.
 * Estratégia: tenta cache `ibge_indicators`; se vazio, chama SIDRA e cacheia.
 *
 * Indicadores prioritários:
 *  - populacao         (tabela 6579, variável 9324, último ano)
 *  - pib_pc            (tabela 5938, variável 37, último ano)
 *  - idhm              (Atlas, não-SIDRA; aceitamos cache-only ou skip)
 *  - analfabetismo15+  (tabela 9543, variável 1641)
 *  - cobertura_saude   (CNES via DataSUS — fora desta primeira versão)
 *
 * mun_code aceito: 7 dígitos IBGE (ex: 1100205 = Porto Velho).
 * Conversão TSE 5-dig → IBGE 7-dig: tabela de equivalência (próxima onda).
 */
import { fetchWithTimeout } from '../../../lib/guard.js';

const SB = () => ({ url: process.env.SUPABASE_URL || 'https://tlnprjkiydiogrcsruxw.supabase.co', key: process.env.SUPABASE_SERVICE_ROLE_KEY });
const SIDRA = 'https://servicodados.ibge.gov.br/api/v3/agregados';
const INDICATORS = [
  { key:'populacao',     table:'6579', variable:'9324' },
  { key:'pib_pc',        table:'5938', variable:'37'   },
  { key:'analfabetismo', table:'9543', variable:'1641' },
];

async function readCache(mun_code, indicator) {
  const { url, key } = SB();
  if (!key) return null;
  const r = await fetchWithTimeout(
    `${url}/rest/v1/ibge_indicators?mun_code=eq.${mun_code}&indicator=eq.${indicator}&order=year.desc&limit=1`,
    { headers: { apikey:key, Authorization:`Bearer ${key}` } },
    3000
  );
  if (!r.ok) return null;
  const arr = await r.json();
  return arr?.[0] ?? null;
}

async function writeCache(rows) {
  const { url, key } = SB();
  if (!key || rows.length === 0) return;
  await fetchWithTimeout(
    `${url}/rest/v1/ibge_indicators?on_conflict=mun_code,indicator,year`,
    {
      method:'POST',
      headers:{ apikey:key, Authorization:`Bearer ${key}`, 'Content-Type':'application/json', Prefer:'resolution=merge-duplicates' },
      body: JSON.stringify(rows),
    },
    5000
  );
}

async function fetchOneIndicator(mun_code_ibge, def) {
  // SIDRA: /api/v3/agregados/{table}/periodos/{period}/variaveis/{var}?localidades=N6[{mun_ibge}]
  const url = `${SIDRA}/${def.table}/periodos/-1/variaveis/${def.variable}?localidades=N6%5B${mun_code_ibge}%5D`;
  try {
    const r = await fetchWithTimeout(url, { headers: { Accept:'application/json' } }, 6000);
    if (!r.ok) return null;
    const json = await r.json();
    // estrutura: [{ resultados:[{ series:[{ serie:{ '<ano>': '<valor>' }, localidade:{} }] }] }]
    const series = json?.[0]?.resultados?.[0]?.series?.[0]?.serie || {};
    const years = Object.keys(series).sort();
    const lastYear = years[years.length - 1];
    if (!lastYear) return null;
    const rawValue = series[lastYear];
    const value = parseFloat(String(rawValue).replace(',', '.'));
    if (Number.isNaN(value) || rawValue === '...') return null;
    return { mun_code: mun_code_ibge, indicator: def.key, year: parseInt(lastYear,10), value, source_table: def.table, fetched_at: new Date().toISOString() };
  } catch { return null; }
}

/**
 * @param {string} mun_code_ibge  7 dígitos IBGE (ex 1100205). Se receber 5-dig TSE, NÃO converte ainda (TODO).
 */
export async function collectIBGE(mun_code_ibge) {
  if (!mun_code_ibge || mun_code_ibge.length !== 7) {
    return { ok:false, code:'NEED_IBGE_7DIG', got: mun_code_ibge };
  }
  const out = {};
  const toWrite = [];
  for (const def of INDICATORS) {
    const cached = await readCache(mun_code_ibge, def.key);
    if (cached) { out[def.key] = cached; continue; }
    const fresh = await fetchOneIndicator(mun_code_ibge, def);
    if (fresh) { out[def.key] = fresh; toWrite.push(fresh); }
  }
  if (toWrite.length) await writeCache(toWrite);
  return {
    ok: true,
    indicators: out,
    source_url: 'https://servicodados.ibge.gov.br/api/docs/agregados?versao=3',
    coverage: Object.keys(out).length / INDICATORS.length,
  };
}
