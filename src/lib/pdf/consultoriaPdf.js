// Monta e baixa o PDF profissional da Consultoria E-Poliana.
import { loadPdfMake, STYLES, COLORS, coverBlock, pageHeader, pageFooter } from './reportTheme';
import { markdownToPdfContent } from './markdownToPdf';

function fmtDate(iso) {
  try {
    return new Date(iso || Date.now()).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch { return ''; }
}
function fileStamp(iso) {
  const d = new Date(iso || Date.now());
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}
function slug(s) {
  return String(s || 'candidato').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function downloadConsultoriaPdf({ candidateName, party, role, city, state, report, sources = [], generatedAt }) {
  const pdfMake = await loadPdfMake();
  const dateStr = fmtDate(generatedAt);
  const meta = [role, `${city}/${state || 'RO'}`, party].filter(Boolean).join('  ·  ') + `   ·   ${dateStr}`;

  const content = [
    coverBlock({
      kicker: 'CONSULTORIA ESTRATÉGICA DE PRÉ-CAMPANHA',
      title: 'Inteligência de campanha — E-Poliana',
      name: candidateName || 'Candidato',
      meta
    }),
    ...markdownToPdfContent(report)
  ];

  if (sources && sources.length) {
    content.push({ text: `Fontes consultadas na web (${sources.length})`, style: 'sectionLabel', margin: [0, 14, 0, 6] });
    content.push({
      ul: sources.slice(0, 60).map((s) => ({
        text: [{ text: (s.title || s.url) + '  ', fontSize: 8.5, color: COLORS.ink }, { text: s.url, link: s.url, style: 'sourceItem', decoration: 'underline' }]
      })),
      margin: [6, 0, 0, 10]
    });
  }

  content.push({
    text: 'Análise gerada com pesquisa web em tempo real pela E-Poliana. Estimativas devem ser validadas com pesquisa de campo. Conteúdo em conformidade com a Lei 9.504/97.',
    style: 'disclaimer', margin: [0, 16, 0, 0]
  });

  const doc = {
    info: { title: `Consultoria — ${candidateName || 'Candidato'}`, author: 'e-politica.ia', subject: 'Consultoria estratégica de pré-campanha' },
    pageSize: 'A4',
    pageMargins: [40, 46, 40, 40],
    header: pageHeader('Consultoria Estratégica · E-Poliana'),
    footer: pageFooter(dateStr),
    styles: STYLES,
    defaultStyle: { font: 'Roboto', fontSize: 10.5, color: COLORS.ink },
    content
  };

  pdfMake.createPdf(doc).download(`consultoria-${slug(candidateName)}-${fileStamp(generatedAt)}.pdf`);
}
