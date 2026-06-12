import { useState, useEffect, useRef } from 'react';
import { 
  Brain, 
  Send, 
  Sparkles, 
  MessageSquare,
  ChevronRight
} from 'lucide-react';
import { CANDIDATES } from '../data/electoralMockData';

export default function Assistant({ activeCandidate }) {
  const candidate = CANDIDATES.find(c => c.id === activeCandidate) || CANDIDATES[0];
  
  const campaignParams = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('campaignParams')) : null;
  const cityName = campaignParams ? campaignParams.city : "Serra Dourada";
  
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'assistant',
      text: `Olá! Eu sou o **Mestre**, seu estrategista em inteligência política da plataforma **e-politica.ia**. 🇧🇷\n\nAnalisei os dados de votação das seções eleitorais de ${cityName} para a sua candidatura do **${candidate.party}**. Como posso ajudar você a otimizar a sua campanha hoje?`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Pre-configured expert prompt suggestions
  const suggestions = [
    { id: 1, label: 'Como crescer na Zona 12?', query: 'Como posso expandir minha votação e consolidar minha força na Zona 12?' },
    { id: 2, label: 'Estratégia para os Jardins', query: 'Minha oponente do PL lidera nos Jardins com 65%. Qual plano de contra-ataque o Mestre sugere?' },
    { id: 3, label: 'Roteiro de Discurso', query: 'Crie um roteiro de discurso voltado para saúde e saneamento para usar em Vila Nova.' },
    { id: 4, label: 'Análise SWOT da Campanha', query: 'Faça uma matriz SWOT rápida comparando minha força com a oponente do PL e o oponente do PT.' }
  ];

  // Dynamic Political Response Compiler (Real Strategy simulation)
  const generateAIResponse = (userQuery) => {
    const q = userQuery.toLowerCase();
    
    if (q.includes('zona 12') || q.includes('z12')) {
      return `### 🎯 Plano Tático para a Zona 12 (Área Central)
      
Temos uma base consolidada excelente na **Zona 12 com 49.12% dos votos** em 2024. No entanto, **a oponente do PL** está crescendo nas seções próximas ao Centro Comercial.

#### Recomendações Estratégicas de Campanha:
1. **Ativação da Liderança:** Acione **seu líder de referência** (Centro) para organizar uma roda de conversa com comerciantes locais. O tema principal deve ser *Revitalização do Centro Comercial e Segurança Pública*.
2. **Foco em Seções Chave:** Nas seções **003 e 004 (Câmara de Vereadores)**, nossa votação caiu 4% comparada a 2022. Direcione panfletagem pesada nas manhãs de sábado nessa região.
3. **Mensagem Digital:** Dispare criativos nas redes sociais focados em *Gestão e Empreendedorismo Urbano*, direcionados por geolocalização para moradores do Centro.

*Meta:* Subir para **53% de intenção de votos** na Zona 12 nas próximas 3 semanas.`;
    }

    if (q.includes('jardins') || q.includes('oponente do pl')) {
      return `### 🛡️ Plano de Contingência para o Bairro Jardins
      
O Bairro **Jardins** é o reduto de alta renda da **oponente do PL**, onde ela concentra **65% dos votos**. É uma zona de difícil penetração direta, mas com espaço para crescimento.

#### Táticas de Desgaste e Penetração:
1. **Apelo Moderado / Zeladoria Urbana:** Os moradores dos Jardins priorizam *Conservação Ambiental, Iluminação Pública e Praças*. Evite discursos populistas. Foque em projetos técnicos de sustentabilidade urbana e acessibilidade.
2. **Influenciadora Interna:** Acione **sua liderança local** (Jardins). Ela possui grande rede de contatos entre empresárias locais. Agende um chá de apresentação focado em propostas de *Segurança e Desburocratização de Alvarás*.
3. **Marketing Segmentado:** Campanhas de tráfego pago mostrando a proposta do **${candidate.name}** de integrar câmeras de vigilância privadas ao centro de monitoramento municipal (Muralha Digital).

*Meta:* Reduzir a margem da oponente do PL nos Jardins para **55%**, herdando os 10% flutuantes para a nossa base.`;
    }

    if (q.includes('discurso') || q.includes('vila nova') || q.includes('roteiro')) {
      return `### 🎤 Roteiro de Discurso e Plano de Ação - Vila Nova
      
Bairro residencial popular com **47.5% de preferência**. Aqui é nosso principal reduto eleitoral popular. Saneamento e postos de saúde são as demandas prioritárias.

#### Roteiro do Discurso (Tempo: 3 a 5 minutos):
*   **Abertura Empática:** *"Boa tarde, meus amigos! Estar aqui é sempre me sentir em casa. É olhar nos olhos de quem acorda cedo e batalha todos os dias..."*
*   **O Problema (O Calcanhar de Aquiles da Oposição):** *"Nós sabemos que a saúde não pode esperar na fila. O saneamento básico não é luxo, é dignidade. O outro lado governou e prometeu, mas as poças continuam na rua e as consultas demoram meses."*
*   **A Solução (Proposta de ${candidate.name}):** *"Meu compromisso com vocês é colocar o Posto de Saúde local para funcionar com horário estendido até as 22h, e garantir que 100% das ruas deste bairro recebam asfalto e rede de esgoto tratada."*
*   **Chamado à Ação (CTA):** *"Eu não faço isso sozinho. Preciso da força e do coração de cada um de vocês. Vamos juntos levar essa onda de mudança para todas as nossas famílias!"*

#### Ações Físicas Recomendadas:
*   Fazer caminhada no comércio de rua com o líder comunitário local gravando stories para redes sociais.`;
    }

    if (q.includes('swot') || q.includes('matriz') || q.includes('compar')) {
      return `### 📊 Matriz SWOT - Cenário Competitivo de ${cityName}

Com base nas estatísticas das eleições recentes do TRE-RO e no engajamento de CRM:

| Fator | **${candidate.name} (${candidate.party.split(' ')[0]})** | **Oponente PL (PL)** | **Oponente PT (PT)** |
| :--- | :--- | :--- | :--- |
| **Forças (S)** | Forte aceitação popular, credibilidade, liderança em bairros de classe média e comércio. | Altíssima penetração na elite empresarial, recursos financeiros. | Base sindical fiel, militância orgânica histórica. |
| **Fraquezas (W)** | Dificuldade com o eleitorado de alta renda. | Rejeição moderada nos bairros populares periféricos. | Teto eleitoral rígido, alta rejeição ideológica geral. |
| **Oportunidades (O)** | Atrair o eleitorado moderado e de centro das zonas urbanas. | Ampliar discurso sobre segurança para bairros comerciais. | Capitalizar sobre insatisfação do transporte coletivo local. |
| **Ameaças (T)** | Perda de votos na classe média por campanhas de desinformação. | Alianças da oposição que possam isolar seu eleitorado. | Esvaziamento de votos úteis. |

#### Recomendação Geral:
Manter o tom propositivo na Saúde Pública para isolar o oponente do PT e iniciar ofensiva técnica sobre *Câmeras de Segurança* para atrair eleitores de classe média do oponente do PL.`;
    }

    // Default Fallback strategic generator
    return `### 💡 Insight Geral da Estrategista Mestre

Entendi o seu ponto sobre: *"${userQuery}"*. Para a candidatura de **${candidate.name} (${candidate.party})**, elaborei as seguintes diretrizes:

1. **Inteligência de Dados:** No cenário atual, os eleitores indecisos representam **14.2%** do município. A maioria deles está concentrada no **Distrito Industrial** e na **Morada do Sol**.
2. **Estratégia de Abordagem:** O principal tema motivador de voto nesses locais é *Geração de Emprego e Cursos Profissionalizantes*. 
3. **Plano de Ação Digital:** Recomendo a criação de uma série de 3 vídeos curtos (Reels/TikTok) apresentando sua proposta de *Parceria Municipal com o SENAI* para oferecer 1.500 vagas de cursos técnicos.

Deseja detalhar a abordagem para algum bairro específico ou prefere criar um roteiro de postagem para as redes sociais?`;
  };

  const handleSendMessage = async (textToSend) => {
    if (!textToSend.trim()) return;

    // Add user message
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    const history = [...messages, userMsg];
    setMessages(history);
    setInputValue('');
    setIsTyping(true);

    let responseText = null;

    // 1. Real AI: secure serverless proxy to the Anthropic Claude API
    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map(({ sender, text }) => ({ sender, text })),
          context: {
            candidateName: campaignParams?.candidateName || candidate.name,
            candidateParty: campaignParams?.party || candidate.party,
            city: cityName,
            role: campaignParams?.role || candidate.role
          }
        })
      });
      const data = await response.json();
      if (response.ok && data.success && data.text) {
        responseText = data.text;
      } else if (data.code !== 'AI_NOT_CONFIGURED') {
        console.error('[Assistant API]:', data.message);
      }
    } catch (err) {
      console.warn('[Assistant API] indisponível, usando estrategista local:', err);
    }

    // 2. Fallback: local strategy compiler (offline / API not configured)
    if (!responseText) {
      responseText = generateAIResponse(textToSend);
    }

    const aiMsg = {
      id: Date.now() + 1,
      sender: 'assistant',
      text: responseText,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, aiMsg]);
    setIsTyping(false);
  };

  return (
    <div 
      className="grid-1-340"
      style={{ 
        height: 'calc(100vh - var(--header-height) - 4rem)' 
      }}
    >
      
      {/* Left Widget: Chat messaging board */}
      <div 
        className="glass" 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          height: '100%',
          overflow: 'hidden',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)'
        }}
      >
        {/* Chat Header */}
        <div 
          style={{ 
            padding: '1.25rem 1.5rem', 
            borderBottom: '1px solid var(--border-color)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between' 
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(0, 168, 89, 0.15)', padding: '8px', borderRadius: '50%', color: 'var(--accent-green-bright)' }} className="pulse-glow-green">
              <Brain size={20} />
            </div>
            <div>
              <strong style={{ fontSize: '0.95rem', color: 'var(--text-white)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Mestre Inteligência Artificial <Sparkles size={14} style={{ color: 'var(--accent-yellow)' }} />
              </strong>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-gray)', display: 'block' }}>Mentora Estratégica Eleitoral</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ fontSize: '0.65rem', background: 'rgba(255, 204, 0, 0.1)', color: 'var(--accent-yellow)', border: '1px solid rgba(255, 204, 0, 0.2)', padding: '2px 8px', borderRadius: '100px', fontWeight: 600 }}>
              MODELO V2.0
            </span>
          </div>
        </div>

        {/* Message Thread Area */}
        <div 
          style={{ 
            flexGrow: 1, 
            padding: '1.5rem', 
            overflowY: 'auto', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1.25rem' 
          }}
        >
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            
            return (
              <div 
                key={msg.id} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'flex-start',
                  flexDirection: isUser ? 'row-reverse' : 'row',
                  gap: '10px',
                  alignItems: 'flex-start'
                }}
              >
                {/* Avatar bubble */}
                <div 
                  style={{ 
                    fontSize: '1.25rem',
                    background: isUser ? 'var(--accent-blue)' : 'var(--row-alt)',
                    border: isUser ? 'none' : '1px solid var(--border-color)',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {isUser ? '👤' : '🤖'}
                </div>

                {/* Message Box */}
                <div 
                  style={{ 
                    maxWidth: '80%',
                    padding: '1rem',
                    borderRadius: 'var(--radius-sm)',
                    background: isUser ? 'var(--accent-blue)' : '#ffffff',
                    border: isUser ? 'none' : '1px solid var(--border-color)',
                    color: isUser ? '#FFFFFF' : 'var(--text-white)',
                    fontSize: '0.88rem',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {/* Strategic Markdown Parser (Simulated) */}
                  {msg.text.split('\n').map((line, lIdx) => {
                    if (line.startsWith('####')) {
                      return <h5 key={lIdx} style={{ fontSize: '0.9rem', color: 'var(--accent-green-bright)', margin: '10px 0 4px 0' }}>{line.replace('####', '').trim()}</h5>;
                    }
                    if (line.startsWith('###')) {
                      return <h4 key={lIdx} style={{ fontSize: '1.05rem', fontFamily: 'var(--font-title)', color: isUser ? '#FFFFFF' : 'var(--accent-blue-bright)', margin: '12px 0 6px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>{line.replace('###', '').trim()}</h4>;
                    }
                    if (line.startsWith('*   ') || line.startsWith('- ')) {
                      return <li key={lIdx} style={{ marginLeft: '12px', listStyleType: 'square', margin: '4px 0' }}>{line.replace(/^(\*\s+|-\s+)/, '')}</li>;
                    }
                    if (line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ')) {
                      return <p key={lIdx} style={{ paddingLeft: '12px', margin: '6px 0', textIndent: '-12px' }}>{line}</p>;
                    }
                    // Replace bold markdown **text**
                    if (line.includes('**')) {
                      const parts = line.split('**');
                      return (
                        <p key={lIdx} style={{ margin: '6px 0' }}>
                          {parts.map((p, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} style={{ color: isUser ? '#FFFFFF' : 'var(--accent-blue-bright)' }}>{p}</strong> : p)}
                        </p>
                      );
                    }
                    return <p key={lIdx} style={{ margin: '6px 0' }}>{line}</p>;
                  })}
                  
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', textAlign: 'right', marginTop: '6px' }}>
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Glowing Animated Typing State */}
          {isTyping && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ fontSize: '1.25rem', background: 'var(--row-alt)', border: '1px solid var(--border-color)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="flex-center">
                🤖
              </div>
              <div 
                className="glass" 
                style={{ 
                  padding: '12px 20px', 
                  borderRadius: 'var(--radius-sm)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  background: 'rgba(20,30,60,0.02)'
                }}
              >
                <div style={{ width: '6px', height: '6px', background: 'var(--accent-green-bright)', borderRadius: '50%', animation: 'bounce 0.8s infinite 0.1s' }} />
                <div style={{ width: '6px', height: '6px', background: 'var(--accent-yellow)', borderRadius: '50%', animation: 'bounce 0.8s infinite 0.3s' }} />
                <div style={{ width: '6px', height: '6px', background: 'var(--accent-blue-bright)', borderRadius: '50%', animation: 'bounce 0.8s infinite 0.5s' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-gray)', marginLeft: '6px', fontWeight: 500 }}>Mestre compilando plano tático...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar form control */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputValue);
          }}
          style={{ 
            padding: '1.25rem 1.5rem', 
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            gap: '10px',
            alignItems: 'center'
          }}
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Pergunte ao Mestre sobre bairros, seções ou discursos de campanha..."
            style={{ flexGrow: 1, borderRadius: 'var(--radius-sm)' }}
            disabled={isTyping}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isTyping}
            style={{
              background: inputValue.trim() && !isTyping ? 'linear-gradient(to right, var(--accent-green), var(--accent-green-bright))' : 'rgba(20,30,60,0.04)',
              color: inputValue.trim() && !isTyping ? '#FFFFFF' : 'var(--text-muted)',
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: inputValue.trim() && !isTyping ? '0 0 10px rgba(0, 168, 89, 0.4)' : 'none'
            }}
          >
            <Send size={18} />
          </button>
        </form>
      </div>

      {/* Right Drawer Widget: Suggested Prompts & Strategic Profile */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Quick Suggestion Prompts */}
        <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} style={{ color: 'var(--accent-yellow)' }} />
            <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-title)', fontWeight: 700 }}>
              Sugestões Táticas
            </h3>
          </div>
          
          <p style={{ fontSize: '0.8rem', color: 'var(--text-gray)' }}>
            Clique em uma das consultas recomendadas para que o Mestre analise os cenários eleitorais:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '0.5rem' }}>
            {suggestions.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSendMessage(s.query)}
                disabled={isTyping}
                style={{
                  textAlign: 'left',
                  padding: '12px',
                  background: 'rgba(20, 30, 60, 0.02)',
                  border: '1px solid rgba(20, 30, 60, 0.05)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  justifyContent: 'space-between',
                  cursor: isTyping ? 'not-allowed' : 'pointer'
                }}
                onMouseEnter={(e) => {
                  if (!isTyping) {
                    e.currentTarget.style.borderColor = 'var(--accent-yellow)';
                    e.currentTarget.style.background = 'rgba(255, 204, 0, 0.02)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isTyping) {
                    e.currentTarget.style.borderColor = 'rgba(20, 30, 60, 0.05)';
                    e.currentTarget.style.background = 'rgba(20, 30, 60, 0.02)';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '85%' }}>
                  <MessageSquare size={14} style={{ color: 'var(--accent-green-bright)', flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.label}
                  </span>
                </div>
                <ChevronRight size={14} style={{ color: 'var(--text-gray)' }} />
              </button>
            ))}
          </div>
        </div>

        {/* Tactical status diagnostic card */}
        <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-title)', fontWeight: 700 }}>
            Diagnóstico de Campanha
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-gray)' }}>Pilar Estrutural:</span>
              <strong style={{ color: 'var(--accent-green-bright)' }}>Saúde Geral e Gestão</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-gray)' }}>Bairro Forte:</span>
              <strong style={{ color: '#FFFFFF' }}>Vila Nova (47.5%)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-gray)' }}>Bairro Crítico:</span>
              <strong style={{ color: '#EF4444' }}>Jardins (22%)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-gray)' }}>Potencial Município:</span>
              <strong style={{ color: 'var(--accent-yellow)' }}>Alto Crescimento</strong>
            </div>
          </div>
        </div>

      </div>

      {/* Bounce keyframe styling */}
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}
