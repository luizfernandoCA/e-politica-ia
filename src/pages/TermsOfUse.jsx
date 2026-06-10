import LegalLayout from './LegalLayout';

/**
 * Termos de Uso — descreve a relação contratual de uso da Plataforma.
 * Reflete o modelo real: assinatura mensal sem fidelidade via Mercado Pago,
 * IA como ferramenta de apoio (não aconselhamento), dados públicos do TSE,
 * vedação a uso ilegal sob a legislação eleitoral.
 *
 * Aviso: modelo informativo; não substitui revisão por advogado antes de uso
 * comercial em escala.
 */
export default function TermsOfUse({ onBack }) {
  return (
    <LegalLayout title="Termos de Uso" updatedAt="10 de junho de 2026" onBack={onBack}>
      <p>
        Estes Termos de Uso regulam o acesso e a utilização da plataforma{' '}
        <strong>e-politica.ia</strong> ("Plataforma"). Ao criar uma conta ou utilizar a
        Plataforma, você concorda integralmente com estes Termos. Se não concordar, não utilize a
        Plataforma.
      </p>

      <h2>1. Objeto</h2>
      <p>
        A e-politica.ia é uma plataforma privada de <strong>inteligência e gestão de campanha
        eleitoral</strong> que oferece: dashboards com dados públicos do TSE/TRE, CRM de
        lideranças, relatórios eleitorais e um assistente de inteligência artificial ("Mestre").
      </p>

      <h2>2. Natureza da Plataforma e ausência de vínculo oficial</h2>
      <p>
        A e-politica.ia é um <strong>serviço privado e independente</strong>. Não é parceira
        oficial, não é homologada, endossada ou certificada pelo TSE, por qualquer TRE ou por
        qualquer órgão público. Os dados eleitorais exibidos têm origem em bases{' '}
        <strong>públicas</strong> divulgadas pela Justiça Eleitoral.
      </p>

      <h2>3. Cadastro e conta</h2>
      <ul>
        <li>Você deve fornecer informações verdadeiras e manter suas credenciais em sigilo.</li>
        <li>Você é responsável por toda atividade realizada em sua conta.</li>
        <li>É vedado compartilhar a conta com terceiros fora da sua equipe de campanha.</li>
      </ul>

      <h2>4. Assinatura, pagamento e cancelamento</h2>
      <ul>
        <li>O acesso é mediante <strong>assinatura mensal</strong>, processada pelo Mercado Pago (Pix, cartão ou boleto).</li>
        <li><strong>Sem fidelidade</strong>: você pode cancelar a qualquer momento, sem multa. O acesso permanece ativo até o fim do período já pago.</li>
        <li>Nenhum dado de cartão é processado ou armazenado pela Plataforma; o pagamento ocorre no ambiente seguro (PCI) do Mercado Pago.</li>
      </ul>

      <h2>5. Uso aceitável e conformidade eleitoral</h2>
      <p>Ao utilizar a Plataforma, você se compromete a:</p>
      <ul>
        <li>Respeitar a legislação eleitoral, em especial a <strong>Lei nº 9.504/1997</strong>, e a legislação de proteção de dados (<strong>LGPD</strong>).</li>
        <li>Não utilizar a Plataforma para disparo de mensagens não solicitadas em massa, desinformação ou qualquer prática vedada pela Justiça Eleitoral.</li>
        <li>Garantir base legal adequada para o tratamento dos dados de eleitores que você cadastrar.</li>
        <li>Não tentar burlar os controles de segurança, acesso ou cobrança da Plataforma.</li>
      </ul>

      <h2>6. Assistente de IA (Mestre)</h2>
      <p>
        O Mestre é uma <strong>ferramenta de apoio</strong>. Suas respostas são geradas por
        modelo de linguagem e <strong>podem conter imprecisões</strong>. Elas não constituem
        aconselhamento jurídico, eleitoral, financeiro ou estratégico definitivo. Decisões
        críticas devem ser validadas por você e por sua equipe. A e-politica.ia não se
        responsabiliza por decisões tomadas exclusivamente com base nas saídas da IA.
      </p>

      <h2>7. Propriedade intelectual</h2>
      <p>
        A Plataforma, sua marca, código e interface são protegidos. Os dados que você cadastra
        permanecem seus. As saídas geradas pela IA a seu pedido (textos, análises) podem ser
        utilizadas livremente por você na sua campanha.
      </p>

      <h2>8. Disponibilidade e dados de terceiros</h2>
      <p>
        Empregamos cache resiliente para mitigar instabilidades das fontes públicas, mas{' '}
        <strong>não garantimos disponibilidade ininterrupta</strong> nem a exatidão de dados
        originados de terceiros (TSE/TRE). A interface indica a data da última atualização dos
        dados exibidos.
      </p>

      <h2>9. Limitação de responsabilidade</h2>
      <p>
        A Plataforma é fornecida "no estado em que se encontra". Na máxima extensão permitida em
        lei, a e-politica.ia não responde por danos indiretos, lucros cessantes ou resultados
        eleitorais. A Plataforma é instrumento de organização e análise, e{' '}
        <strong>não garante votos nem resultados de eleição</strong>.
      </p>

      <h2>10. Suspensão e encerramento</h2>
      <p>
        Podemos suspender ou encerrar contas que violem estes Termos ou a legislação aplicável.
        Você pode encerrar sua conta a qualquer momento.
      </p>

      <h2>11. Alterações dos Termos</h2>
      <p>
        Estes Termos podem ser atualizados. A data de "última atualização" indica a versão
        vigente. O uso continuado após mudanças relevantes implica concordância.
      </p>

      <h2>12. Lei aplicável e foro</h2>
      <p>
        Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro
        do domicílio do consumidor para dirimir controvérsias, conforme o Código de Defesa do
        Consumidor.
      </p>

      <h2>13. Contato</h2>
      <p>
        Dúvidas sobre estes Termos:{' '}
        <a href="mailto:contato@e-politica.ia">contato@e-politica.ia</a>.
      </p>
    </LegalLayout>
  );
}
