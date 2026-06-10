import LegalLayout from './LegalLayout';

/**
 * Política de Privacidade — conforme LGPD (Lei 13.709/2018).
 * O conteúdo descreve PRÁTICAS REAIS implementadas no código:
 * Supabase Auth + Postgres com RLS, Mercado Pago (PCI),
 * proxy serverless para a IA, dados públicos do TSE. Nada aqui é inventado.
 * IMPORTANTE: não afirmar aqui nenhuma medida de segurança que não exista
 * de fato no código (ex.: não prometer hash de CPF — a Plataforma não coleta CPF).
 *
 * Aviso: este texto é um modelo informativo e não substitui revisão jurídica
 * por advogado especializado antes de uso comercial em escala.
 */
export default function PrivacyPolicy({ onBack }) {
  return (
    <LegalLayout title="Política de Privacidade" updatedAt="10 de junho de 2026" onBack={onBack}>
      <p>
        Esta Política de Privacidade descreve como a plataforma <strong>e-politica.ia</strong>{' '}
        ("Plataforma", "nós") coleta, usa, armazena e protege dados pessoais, em conformidade
        com a Lei Geral de Proteção de Dados Pessoais (<strong>Lei nº 13.709/2018 — LGPD</strong>).
        Ao criar uma conta e utilizar a Plataforma, você concorda com as práticas aqui descritas.
      </p>

      <h2>1. Quem é o controlador e quem é o operador</h2>
      <p>
        A e-politica.ia atua como <strong>controladora</strong> dos dados de cadastro da sua
        conta (e-mail, autenticação e status de assinatura). Em relação aos dados de eleitores e
        lideranças que <strong>você</strong> cadastra no CRM, você é o <strong>controlador</strong>{' '}
        desses dados e a e-politica.ia atua como <strong>operadora</strong>, tratando-os apenas
        conforme suas instruções e para as finalidades da Plataforma.
      </p>

      <h2>2. Dados que coletamos</h2>
      <h3>2.1. Dados de conta</h3>
      <ul>
        <li>E-mail e credenciais de autenticação (via Supabase Auth; senha nunca é armazenada em texto puro).</li>
        <li>Quando você usa login social (Google OAuth), recebemos seu e-mail e identificador da conta.</li>
        <li>Parâmetros da campanha que você configura (município, cargo, nome de urna, meta).</li>
      </ul>
      <h3>2.2. Dados de eleitores/lideranças (CRM)</h3>
      <ul>
        <li>Nome, telefone, região e demais campos que você optar por cadastrar.</li>
        <li>
          <strong>A Plataforma não solicita nem coleta CPF de eleitores.</strong> Recomendamos
          não inserir números de documentos em campos de texto livre; cadastre apenas os dados
          necessários à finalidade da campanha (princípio da minimização, LGPD art. 6º, III).
        </li>
        <li>
          Para agilizar o uso, uma cópia dos contatos pode ser mantida em cache local no seu
          navegador (<code>localStorage</code>), associada à sua conta. Use a Plataforma apenas
          em dispositivos de sua confiança e encerre a sessão em computadores compartilhados.
        </li>
      </ul>
      <h3>2.3. Dados de uso e auditoria</h3>
      <ul>
        <li>Registros de uso do assistente de IA (Mestre), incluindo contagem de tokens e custo, para controle e auditoria.</li>
        <li>Status e histórico de pagamentos da assinatura.</li>
      </ul>

      <h2>3. Dados públicos do TSE/TRE</h2>
      <p>
        A Plataforma consome <strong>dados públicos</strong> de candidaturas, votação e prestação
        de contas divulgados pelo Tribunal Superior Eleitoral (TSE) e Tribunais Regionais
        Eleitorais (TRE). Esses dados são de acesso público e não constituem dado pessoal sob seu
        controle. A e-politica.ia <strong>não possui vínculo, endosso ou homologação</strong> de
        qualquer órgão governamental.
      </p>

      <h2>4. Finalidades do tratamento</h2>
      <ul>
        <li>Autenticar seu acesso e manter sua sessão.</li>
        <li>Disponibilizar dashboards, CRM, relatórios e o assistente de IA.</li>
        <li>Processar e confirmar o pagamento da assinatura.</li>
        <li>Cumprir obrigações legais e regulatórias.</li>
      </ul>

      <h2>5. Compartilhamento e operadores</h2>
      <p>
        Utilizamos prestadores de serviço que atuam como operadores, restritos às finalidades
        acima:
      </p>
      <ul>
        <li><strong>Supabase</strong> — autenticação e banco de dados (hospedagem na região sa-east-1, Brasil).</li>
        <li><strong>Mercado Pago</strong> — processamento de pagamentos. <strong>Nenhum dado de cartão trafega ou é armazenado pela Plataforma</strong>; o tratamento de cartão ocorre integralmente no ambiente PCI do Mercado Pago.</li>
        <li><strong>Anthropic (Claude)</strong> — geração de texto do assistente. As requisições passam por um proxy serverless; a chave de API nunca é exposta ao navegador.</li>
        <li><strong>Vercel</strong> — hospedagem da aplicação e funções serverless.</li>
      </ul>
      <p>Não vendemos seus dados pessoais nem os de seus eleitores a terceiros.</p>

      <h2>6. Segurança</h2>
      <ul>
        <li><strong>Row Level Security (RLS)</strong> em todas as tabelas: cada usuário só acessa os próprios dados, validado por <code>auth.uid()</code>.</li>
        <li>Segredos (chaves de API, tokens) existem apenas como variáveis de ambiente em funções serverless, nunca no navegador.</li>
        <li>Comunicação criptografada em trânsito (HTTPS/TLS).</li>
        <li>Senhas tratadas exclusivamente pelo Supabase Auth, com armazenamento em formato irreversível (hash).</li>
      </ul>

      <h2>7. Seus direitos como titular (LGPD art. 18)</h2>
      <p>Você pode, a qualquer momento, solicitar:</p>
      <ul>
        <li>Confirmação da existência de tratamento e acesso aos seus dados;</li>
        <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
        <li>Anonimização, bloqueio ou eliminação de dados desnecessários;</li>
        <li>Portabilidade e eliminação dos dados tratados com seu consentimento;</li>
        <li>Revogação do consentimento.</li>
      </ul>
      <p>
        Para exercer esses direitos, entre em contato pelo e-mail{' '}
        <a href="mailto:contato@e-politica.ia">contato@e-politica.ia</a>.
      </p>

      <h2>8. Retenção e exclusão</h2>
      <p>
        Mantemos seus dados enquanto sua conta estiver ativa. Ao cancelar a assinatura e
        solicitar exclusão, removemos os dados pessoais associados, ressalvadas as obrigações
        legais de retenção (por exemplo, registros fiscais de pagamento).
      </p>

      <h2>9. Responsabilidade do usuário-controlador</h2>
      <p>
        Ao cadastrar dados de eleitores e lideranças, você declara possuir base legal adequada
        (por exemplo, consentimento ou legítimo interesse) para esse tratamento e compromete-se a
        usar a Plataforma em conformidade com a LGPD e com a legislação eleitoral, em especial a
        <strong> Lei nº 9.504/1997</strong>.
      </p>

      <h2>10. Alterações</h2>
      <p>
        Esta Política pode ser atualizada. Mudanças relevantes serão comunicadas pela Plataforma.
        A data de "última atualização" no topo indica a versão vigente.
      </p>

      <h2>11. Contato e Encarregado (DPO)</h2>
      <p>
        Dúvidas sobre privacidade e proteção de dados:{' '}
        <a href="mailto:contato@e-politica.ia">contato@e-politica.ia</a>.
      </p>
    </LegalLayout>
  );
}
