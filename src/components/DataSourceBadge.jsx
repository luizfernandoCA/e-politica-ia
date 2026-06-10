import { BadgeCheck, FlaskConical, Info } from 'lucide-react';

/**
 * DataSourceBadge — chip de PROCEDÊNCIA do dado exibido ao lado de números.
 *
 * Mecanismo anti-engano: o usuário precisa saber, sem adivinhar, se o número
 * que está vendo é resultado OFICIAL do TSE, uma ESTIMATIVA derivada, ou dado
 * de DEMONSTRAÇÃO (pré-configuração). Isso reduz risco de decisão errada e de
 * exposição jurídica (afirmar oficialidade sobre dado simulado).
 *
 * kinds:
 *  - 'official'  → boletim oficial do TSE/TRE (candidate_votes reais)
 *  - 'estimate'  → número derivado/projetado a partir de bases oficiais
 *  - 'demo'      → dataset de demonstração (não é dado real do candidato)
 */
const VARIANTS = {
  official: {
    label: 'Oficial TSE',
    Icon: BadgeCheck,
    fg: '#34D399',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.35)',
    title: 'Resultado oficial publicado pelo TSE/TRE.'
  },
  estimate: {
    label: 'Estimativa',
    Icon: FlaskConical,
    fg: '#FBBF24',
    bg: 'rgba(251, 191, 36, 0.12)',
    border: 'rgba(251, 191, 36, 0.35)',
    title: 'Número estimado/projetado a partir de bases oficiais. Não é o boletim oficial.'
  },
  demo: {
    label: 'Demonstração',
    Icon: Info,
    fg: '#94A3B8',
    bg: 'rgba(148, 163, 184, 0.12)',
    border: 'rgba(148, 163, 184, 0.35)',
    title: 'Dados de demonstração exibidos antes da configuração da campanha. Não refletem o candidato real.'
  }
};

export default function DataSourceBadge({ kind = 'official', size = 'sm', style = {} }) {
  const v = VARIANTS[kind] || VARIANTS.official;
  const { Icon } = v;
  const fontSize = size === 'lg' ? '0.78rem' : '0.68rem';
  const iconSize = size === 'lg' ? 14 : 12;
  const pad = size === 'lg' ? '4px 10px' : '2px 8px';

  return (
    <span
      title={v.title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: pad,
        borderRadius: '999px',
        fontSize,
        fontWeight: 700,
        letterSpacing: '0.02em',
        color: v.fg,
        background: v.bg,
        border: `1px solid ${v.border}`,
        whiteSpace: 'nowrap',
        lineHeight: 1.2,
        verticalAlign: 'middle',
        ...style
      }}
    >
      <Icon size={iconSize} strokeWidth={2.5} aria-hidden="true" />
      {v.label}
    </span>
  );
}
