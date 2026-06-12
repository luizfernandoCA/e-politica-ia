// Monta e baixa o PDF profissional do cruzamento de dados oficiais do TSE
// (apuração + prestação de contas + distribuição por zona) da página Relatórios.
import { loadPdfMake, STYLES, COLORS, coverBlock, pageHeader, pageFooter } from './reportTheme';
import { markdownToPdfContent } from './markdownToPdf';

const dash = '—';
function brl(v) {
  if (v == null || v === '') return dash;
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function num(v) {
  if (v == null || v === '') return dash;
  const n = Number(v);
  return Number.isNaN(n) ? String(v) : n.toLocaleString('pt-BR');
}
function pct(v) { return v == null || v === '' ? dash : `${v}%`; }
function fmtDate(iso) {
  try { return new Date(iso || Date.now()).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }); }
  catch { return ''; }
}
function fileStamp(iso) {
  const d = new Date(iso || Date.now());
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}
function slug(s) {
  return String(s || 'candidato').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function kvTable(rows) {
  return {
    table: {
      widths: ['*', 'auto'],
      body: rows.map(([k, v], idx) => [
        { text: k, fontSize: 9.5, color: COLORS.soft, fillColor: idx % 2 ? COLORS.rowAlt : null, margin: [0, 3, 0, 3] },
        { text: v, fontSize: 9.5, bold: true, color: COLORS.ink, alignment: 'right', fillColor: idx % 2 ? COLORS.rowAlt : null, margin: [0, 3, 0, 3] }
      ])
    },
    layout: { hLineWidth: () => 0.5, vLineWidth: () => 0, hLineColor: () => COLORS.line, paddingLeft: () => 8, paddingRight: () => 8 },
    margin: [0, 2, 0, 12]
  };
}

export async function downloadTseReportPdf({ myCandidate, apuracao, gastos, secoes, role, city, mestreInsight, generatedAt }) {
  const pdfMake = await loadPdfMake();
  const dateStr = fmtDate(generatedAt);
  const cand = myCandidate || {};
  const munName = apuracao?.municipality?.name || city || '';

  const content = [
    coverBlock({
      kicker: 'RELATÓRIO EXECUTIVO · DADOS OFICIAIS TSE',
      title: 'Cruzamento eleitoral — apuração, contas e zonas',
      name: cand.candidate_urn_name || 'Candidato',
      meta: [role, `${munName}/RO`, cand.party_abbr].filter(Boolean).join('  ·  ') + `   ·   2024 · 1º Turno   ·   ${dateStr}`
    }),

    { text: '1. Posição na apuração oficial', style: 'h2' },
    kvTable([
      ['Candidato', cand.candidate_urn_name || dash],
      ['Partido / Número', `${cand.party_abbr || dash} · ${cand.candidate_number || dash}`],
      ['Colocação', num(cand.candidate_seq)],
      ['Votos', num(cand.candidate_votes)],
      ['% dos votos válidos', pct(cand.candidate_percentage)],
      ['Resultado', cand.candidate_outcome || dash],
      ['Eleitorado total', num(apuracao?.aggregate?.totalVoters)],
      ['Comparecimento', `${num(apuracao?.aggregate?.totalPresent)} (${pct(apuracao?.aggregate?.pctPresent)})`]
    ]),

    { text: '2. Prestação de contas eleitorais', style: 'h2' },
    gastos ? kvTable([
      ['Total de receita', brl(gastos.total_receita)],
      ['Total de despesa', brl(gastos.total_despesa)],
      ['Doações próprias', brl(gastos.total_doacoes_proprio)],
      ['Limite legal', brl(gastos.limite_legal)],
      ['Custo por voto', brl(gastos.custo_por_voto)],
      ['Taxa de uso do limite', pct(gastos.taxa_uso_limite)]
    ]) : { text: 'Prestação de contas não disponível no cache para este candidato.', style: 'para', italics: true }
  ];

  // 3. Distribuição por zona (tabela)
  content.push({ text: '3. Distribuição de votos por zona eleitoral', style: 'h2' });
  if (secoes?.zones?.length) {
    const total = secoes.zones.reduce((a, z) => a + (z.votes || 0), 0) || 1;
    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto'],
        body: [
          [{ text: 'Zona', style: 'tableHeader' }, { text: 'Votos', style: 'tableHeader', alignment: 'right' }, { text: '% do total', style: 'tableHeader', alignment: 'right' }, { text: 'Seções', style: 'tableHeader', alignment: 'right' }],
          ...secoes.zones.map((z, idx) => {
            const fill = idx % 2 === 0 ? COLORS.rowAlt : null;
            return [
              { text: `Zona ${z.electoral_zone}`, style: 'tableCell', fillColor: fill },
              { text: num(z.votes), style: 'tableCell', alignment: 'right', fillColor: fill },
              { text: `${((z.votes / total) * 100).toFixed(1)}%`, style: 'tableCell', alignment: 'right', fillColor: fill },
              { text: num(z.sections), style: 'tableCell', alignment: 'right', fillColor: fill }
            ];
          })
        ]
      },
      layout: { hLineWidth: (ri) => (ri <= 1 ? 0 : 0.5), vLineWidth: () => 0, hLineColor: () => COLORS.line, paddingLeft: () => 8, paddingRight: () => 8, paddingTop: () => 4, paddingBottom: () => 4 },
      margin: [0, 2, 0, 12]
    });
  } else {
    content.push({ text: 'Distribuição por zona não disponível no cache para este candidato.', style: 'para', italics: true });
  }

  // 4. Diagnóstico do Mestre (opcional)
  if (mestreInsight?.text) {
    content.push({ text: '4. Diagnóstico estratégico (Mestre IA)', style: 'h2' });
    content.push(...markdownToPdfContent(mestreInsight.text));
  }

  content.push({
    text: 'Dados públicos do TSE (DivulgaCandContas / Resultados / Dados Abertos), consolidados pela e-politica.ia. Confira sempre a fonte oficial. Conteúdo em conformidade com a Lei 9.504/97.',
    style: 'disclaimer', margin: [0, 16, 0, 0]
  });

  const doc = {
    info: { title: `Relatório TSE — ${cand.candidate_urn_name || 'Candidato'}`, author: 'e-politica.ia', subject: 'Cruzamento de dados oficiais do TSE' },
    pageSize: 'A4',
    pageMargins: [40, 46, 40, 40],
    header: pageHeader('Relatório Executivo · Dados TSE'),
    footer: pageFooter(dateStr),
    styles: STYLES,
    defaultStyle: { font: 'Roboto', fontSize: 10.5, color: COLORS.ink },
    content
  };

  pdfMake.createPdf(doc).download(`relatorio-tse-${slug(cand.candidate_urn_name)}-${fileStamp(generatedAt)}.pdf`);
}
