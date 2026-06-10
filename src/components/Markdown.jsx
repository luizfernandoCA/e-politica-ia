/**
 * Markdown — renderizador leve, sem dependências externas.
 * Suporta: ## / ### títulos, **negrito**, *itálico*, [links](url),
 * listas (-, *, 1.), tabelas GFM, citações entre [colchetes] destacadas,
 * e parágrafos. Pensado para relatórios de consultoria.
 */

function renderInline(text, keyPrefix) {
  // Tokeniza negrito, itálico, links e citações [Fonte] mantendo a ordem.
  const nodes = [];
  let remaining = text;
  let i = 0;
  const pattern =
    /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(\[([^\]]+)\]\((https?:\/\/[^)]+)\))|(\[([^\]]+)\])/;

  while (remaining.length) {
    const m = remaining.match(pattern);
    if (!m) {
      nodes.push(remaining);
      break;
    }
    if (m.index > 0) nodes.push(remaining.slice(0, m.index));

    if (m[1]) {
      nodes.push(<strong key={`${keyPrefix}-b-${i}`}>{m[2]}</strong>);
    } else if (m[3]) {
      nodes.push(<em key={`${keyPrefix}-i-${i}`}>{m[4]}</em>);
    } else if (m[5]) {
      nodes.push(
        <a key={`${keyPrefix}-a-${i}`} href={m[7]} target="_blank" rel="noopener noreferrer" className="md-link">
          {m[6]}
        </a>
      );
    } else if (m[8]) {
      nodes.push(
        <span key={`${keyPrefix}-c-${i}`} className="md-cite">{m[9]}</span>
      );
    }
    remaining = remaining.slice(m.index + m[0].length);
    i++;
  }
  return nodes;
}

export default function Markdown({ text = '' }) {
  const lines = text.replace(/\r/g, '').split('\n');
  const out = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Tabela GFM
    if (line.includes('|') && lines[i + 1] && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
      const header = line.split('|').map((c) => c.trim()).filter(Boolean);
      const rows = [];
      i += 2;
      while (i < lines.length && lines[i].includes('|')) {
        rows.push(lines[i].split('|').map((c) => c.trim()).filter((_, idx, arr) => idx < arr.length));
        i++;
      }
      out.push(
        <div className="md-table-wrap" key={key++}>
          <table className="md-table">
            <thead>
              <tr>{header.map((h, hi) => <th key={hi}>{renderInline(h, `th${key}-${hi}`)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>
                  {r.filter((c) => c !== '').map((c, ci) => <td key={ci}>{renderInline(c, `td${key}-${ri}-${ci}`)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Títulos
    if (/^###\s+/.test(line)) {
      out.push(<h4 className="md-h4" key={key++}>{renderInline(line.replace(/^###\s+/, ''), `h4${key}`)}</h4>);
      i++;
      continue;
    }
    if (/^##\s+/.test(line)) {
      out.push(<h3 className="md-h3" key={key++}>{renderInline(line.replace(/^##\s+/, ''), `h3${key}`)}</h3>);
      i++;
      continue;
    }
    if (/^#\s+/.test(line)) {
      out.push(<h2 className="md-h2" key={key++}>{renderInline(line.replace(/^#\s+/, ''), `h2${key}`)}</h2>);
      i++;
      continue;
    }

    // Listas
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items = [];
      while (i < lines.length && (/^\s*[-*]\s+/.test(lines[i]) || /^\s*\d+\.\s+/.test(lines[i]))) {
        items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ''));
        i++;
      }
      const ListTag = ordered ? 'ol' : 'ul';
      out.push(
        <ListTag className="md-list" key={key++}>
          {items.map((it, ii) => <li key={ii}>{renderInline(it, `li${key}-${ii}`)}</li>)}
        </ListTag>
      );
      continue;
    }

    // Linha em branco
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Parágrafo
    out.push(<p className="md-p" key={key++}>{renderInline(line, `p${key}`)}</p>);
    i++;
  }

  return <div className="md-root">{out}</div>;
}
