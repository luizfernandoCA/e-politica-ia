// Converte o Markdown do relatório (mesma gramática do componente Markdown.jsx)
// em "content" do pdfmake: títulos, parágrafos, listas, tabelas (SWOT), negrito,
// itálico, links e citações [Fonte].
import { COLORS } from './reportTheme';

const INLINE = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(\[([^\]]+)\]\((https?:\/\/[^)]+)\))|(\[([^\]]+)\])/;

// Retorna um array de "runs" do pdfmake a partir de uma linha com markdown inline.
export function renderInline(text) {
  const runs = [];
  let rest = String(text);
  let guard = 0;
  while (rest && guard++ < 500) {
    const m = rest.match(INLINE);
    if (!m) { runs.push(rest); break; }
    if (m.index > 0) runs.push(rest.slice(0, m.index));
    if (m[1]) runs.push({ text: m[2], bold: true });
    else if (m[3]) runs.push({ text: m[4], italics: true });
    else if (m[5]) runs.push({ text: m[6], link: m[7], color: COLORS.blueDeep, decoration: 'underline' });
    else if (m[8]) runs.push({ text: m[9], color: COLORS.blue, bold: true, fontSize: 8.5 });
    rest = rest.slice(m.index + m[0].length);
  }
  return runs.length ? runs : [''];
}

function splitRow(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim());
}

export function markdownToPdfContent(md) {
  const lines = String(md || '').replace(/\r/g, '').split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Tabela GFM
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
      const header = splitRow(line);
      i += 2;
      const bodyRows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        bodyRows.push(splitRow(lines[i]));
        i++;
      }
      const cols = header.length;
      const body = [
        header.map((h) => ({ text: renderInline(h), style: 'tableHeader' })),
        ...bodyRows.map((r) => {
          const cells = [];
          for (let c = 0; c < cols; c++) cells.push({ text: renderInline(r[c] || ''), style: 'tableCell' });
          return cells;
        })
      ];
      out.push({
        table: { headerRows: 1, widths: Array(cols).fill('*'), body },
        layout: {
          hLineWidth: (ri) => (ri === 0 || ri === 1 ? 0 : 0.5),
          vLineWidth: () => 0,
          hLineColor: () => COLORS.line,
          fillColor: (ri) => (ri === 0 ? null : ri % 2 === 0 ? COLORS.rowAlt : null),
          paddingLeft: () => 7, paddingRight: () => 7, paddingTop: () => 4, paddingBottom: () => 4
        },
        margin: [0, 6, 0, 10]
      });
      continue;
    }

    // Títulos
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const style = level <= 2 ? 'h2' : level === 3 ? 'h3' : 'h4';
      out.push({ text: renderInline(h[2]), style });
      i++;
      continue;
    }

    // Listas
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        const content = lines[i].replace(/^\s*([-*]|\d+\.)\s+/, '');
        items.push({ text: renderInline(content), style: 'li' });
        i++;
      }
      out.push(ordered ? { ol: items, margin: [6, 2, 0, 6] } : { ul: items, margin: [6, 2, 0, 6] });
      continue;
    }

    // Linha em branco
    if (line.trim() === '') { i++; continue; }

    // Parágrafo
    out.push({ text: renderInline(line), style: 'para' });
    i++;
  }

  return out;
}
