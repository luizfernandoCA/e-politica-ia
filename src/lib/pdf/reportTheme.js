// Tema/branding compartilhado dos PDFs (pdfmake) — azul DashStack + acento Brasil.
// Carregamento lazy do pdfmake (só quando o usuário clica em "Baixar PDF").

export const COLORS = {
  blue: '#2F6BFF',
  blueDeep: '#1E40AF',
  green: '#16A363',
  yellow: '#F5A623',
  ink: '#1F2A37',
  soft: '#5B6B79',
  muted: '#8A97A8',
  line: '#E3E7EF',
  band: '#0F1F3D',
  rowAlt: '#F5F7FB'
};

// SVG do logo (cores inline) para a capa.
export const LOGO_SVG = `<svg width="64" height="64" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
<circle cx="50" cy="50" r="44" stroke="${COLORS.green}" stroke-width="3.5" fill="none" stroke-dasharray="10 6 30 6"/>
<path d="M50 14L86 50L50 86L14 50Z" stroke="${COLORS.yellow}" stroke-width="3" stroke-linejoin="round" fill="none" stroke-dasharray="8 4"/>
<circle cx="50" cy="50" r="24" fill="${COLORS.blue}" stroke="${COLORS.blue}" stroke-width="4"/>
<path d="M27 50H73M50 27V73" stroke="rgba(255,255,255,0.55)" stroke-width="2"/>
<path d="M44 42H54C57.5 42 59 44 59 47C59 50 57.5 52 54 52H44V58" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;

export const STYLES = {
  coverKicker: { fontSize: 10, color: COLORS.blue, bold: true, characterSpacing: 1, margin: [0, 0, 0, 6] },
  coverTitle: { fontSize: 26, bold: true, color: '#FFFFFF', lineHeight: 1.05 },
  coverName: { fontSize: 30, bold: true, color: COLORS.yellow, margin: [0, 2, 0, 4] },
  coverMeta: { fontSize: 11, color: '#D7DEEA' },
  h2: { fontSize: 16, bold: true, color: COLORS.ink, margin: [0, 16, 0, 6] },
  h3: { fontSize: 13, bold: true, color: COLORS.blueDeep, margin: [0, 12, 0, 4] },
  h4: { fontSize: 11, bold: true, color: COLORS.ink, margin: [0, 8, 0, 2] },
  para: { fontSize: 10.5, color: '#33414F', lineHeight: 1.4, margin: [0, 2, 0, 6], alignment: 'justify' },
  li: { fontSize: 10.5, color: '#33414F', lineHeight: 1.35, margin: [0, 1, 0, 3] },
  tableHeader: { fontSize: 9.5, bold: true, color: '#FFFFFF', fillColor: COLORS.blue, margin: [0, 3, 0, 3] },
  tableCell: { fontSize: 9.5, color: '#33414F', margin: [0, 2, 0, 2] },
  sectionLabel: { fontSize: 12, bold: true, color: COLORS.blueDeep, margin: [0, 4, 0, 8] },
  sourceItem: { fontSize: 8.5, color: COLORS.blueDeep, margin: [0, 1, 0, 1] },
  disclaimer: { fontSize: 7.5, color: COLORS.muted, italics: true }
};

let _pdfMake = null;
export async function loadPdfMake() {
  if (_pdfMake) return _pdfMake;
  const [{ default: pdfMake }, { default: pdfFonts }] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts')
  ]);
  pdfMake.addVirtualFileSystem(pdfFonts);
  _pdfMake = pdfMake;
  return pdfMake;
}

// Cabeçalho/rodapé de páginas internas (não na capa).
export function pageHeader(brandRight) {
  return (currentPage) => {
    if (currentPage === 1) return null;
    return {
      margin: [40, 18, 40, 0],
      columns: [
        { text: 'e-politica.ia', fontSize: 9, bold: true, color: COLORS.blueDeep },
        { text: brandRight || '', fontSize: 8, color: COLORS.muted, alignment: 'right' }
      ]
    };
  };
}

export function pageFooter(dateStr) {
  return (currentPage, pageCount) => ({
    margin: [40, 6, 40, 0],
    columns: [
      { text: `Gerado por e-politica.ia · ${dateStr}`, fontSize: 7.5, color: COLORS.muted },
      { text: `${currentPage} / ${pageCount}`, fontSize: 7.5, color: COLORS.muted, alignment: 'right' }
    ]
  });
}

// Bloco de capa branded (banda escura no topo).
export function coverBlock({ kicker, title, name, meta }) {
  return {
    table: {
      widths: ['*'],
      body: [[{
        stack: [
          { svg: LOGO_SVG, width: 54, margin: [0, 0, 0, 12] },
          { text: kicker, style: 'coverKicker' },
          { text: title, style: 'coverTitle' },
          { text: name, style: 'coverName' },
          { text: meta, style: 'coverMeta' }
        ],
        fillColor: COLORS.band,
        margin: [26, 30, 26, 30]
      }]]
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 18]
  };
}
