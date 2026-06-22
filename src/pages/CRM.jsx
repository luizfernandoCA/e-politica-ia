import { useState } from 'react';
import { 
  UserPlus, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  Trash2, 
  Users, 
  Sparkles,
  Map 
} from 'lucide-react';
import Modal from '../components/Modal';
import { REGIONS, ZONES } from '../data/electoralMockData';

export default function CRM({ contacts, setContacts, setCandidates, activeCandidate }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [zoneFilter, setZoneFilter] = useState('all');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    role: 'Apoiador',
    phone: '',
    email: '',
    zone: 'Zona 12',
    regionId: 'centro',
    notes: '',
    status: 'Ativo',
    subscribers: 0
  });

  // Selected contact highlight
  const [selectedContactId, setSelectedContactId] = useState(null);

  // Stats calculation
  const totalSupporters = contacts.length;
  const leadersCount = contacts.filter(c => c.role === 'Liderança').length;
  const volunteersCount = contacts.filter(c => c.role === 'Voluntário').length;
  
  // Handle filter matching
  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.notes.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || c.role === roleFilter;
    const matchesZone = zoneFilter === 'all' || c.zone === zoneFilter;
    return matchesSearch && matchesRole && matchesZone;
  });

  // Add contact submit
  const handleAddContactSubmit = (e) => {
    e.preventDefault();
    if (!newContact.name || !newContact.phone) return;

    // Pick region details
    const regionObj = REGIONS.find(r => r.id === newContact.regionId) || REGIONS[0];

    // Deterministic jitter around the region centroid so pins cluster without
    // overlapping. Seeded by id+name so the same contact always lands on the
    // same spot (stable map, computed once and persisted with the contact).
    const id = Date.now();
    const jitter = (salt) => {
      const str = `${id}|${newContact.name}|${salt}`;
      let h = 2166136261;
      for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
      return ((h >>> 0) / 4294967296) * 12 - 6; // [-6, 6)
    };

    const createdContact = {
      ...newContact,
      id,
      regionName: regionObj.name,
      lastContact: new Date().toISOString().split('T')[0],
      // Pick coordinates close to their region coordinates for visualization clustering
      mapX: Math.min(Math.max(regionObj.mapX + jitter('x'), 5), 95),
      mapY: Math.min(Math.max(regionObj.mapY + jitter('y'), 5), 95),
      subscribers: parseInt(newContact.subscribers) || 0
    };

    // Update contacts list state
    setContacts(prev => [createdContact, ...prev]);

    // Update active candidate base count (grow base element!)
    setCandidates(prev => prev.map(c => {
      if (c.id === activeCandidate) {
        return { ...c, baseCount: c.baseCount + 1 };
      }
      return c;
    }));

    // Trigger visual confetti success!
    import('canvas-confetti').then((confetti) => {
      confetti.default({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00A859', '#FFCC00', '#2563EB', '#FFFFFF']
      });
    }).catch(() => {});

    // Reset and close
    setNewContact({
      name: '',
      role: 'Apoiador',
      phone: '',
      email: '',
      zone: 'Zona 12',
      regionId: 'centro',
      notes: '',
      status: 'Ativo',
      subscribers: 0
    });
    setIsModalOpen(false);
  };

  // Delete contact
  const handleDeleteContact = (contactId) => {
    if (window.confirm("Deseja realmente remover este apoiador do CRM?")) {
      setContacts(prev => prev.filter(c => c.id !== contactId));
      
      // Reduce active candidate base count
      setCandidates(prev => prev.map(c => {
        if (c.id === activeCandidate && c.baseCount > 0) {
          return { ...c, baseCount: c.baseCount - 1 };
        }
        return c;
      }));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* CRM Metric Stats Header bar */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1.25rem' 
        }}
      >
        <div className="glass" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-gray)', textTransform: 'uppercase', fontWeight: 600 }}>Total no CRM</span>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '2px' }}>{totalSupporters}</h3>
          </div>
          <Users size={28} style={{ color: 'var(--accent-green-bright)' }} />
        </div>

        <div className="glass" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-gray)', textTransform: 'uppercase', fontWeight: 600 }}>Lideranças</span>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '2px' }}>{leadersCount}</h3>
          </div>
          <Sparkles size={28} style={{ color: 'var(--accent-yellow)' }} />
        </div>

        <div className="glass" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-gray)', textTransform: 'uppercase', fontWeight: 600 }}>Voluntários</span>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '2px' }}>{volunteersCount}</h3>
          </div>
          <MapPin size={28} style={{ color: 'var(--accent-blue-bright)' }} />
        </div>

        {/* Trigger Button: Add new Supporter */}
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            background: 'linear-gradient(135deg, var(--accent-green) 0%, var(--accent-green-bright) 100%)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
            fontSize: '0.95rem',
            boxShadow: '0 8px 24px rgba(0, 168, 89, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'transform var(--transition-fast)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <UserPlus size={20} />
          Adicionar Contato
        </button>
      </div>

      {/* CRM Main Grid (Map + Search Table) */}
      <div 
        className="grid-2-1"
        style={{ alignItems: 'start' }}
      >
        
        {/* Left Column: Search & Filter Contacts List Table */}
        <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Search filters row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ position: 'relative', flexGrow: 1 }}>
              <input
                type="text"
                placeholder="Pesquisar contatos por nome ou observações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', paddingLeft: '2.5rem' }}
              />
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-gray)' }} />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="all">Todas as Funções</option>
              <option value="Liderança">Lideranças</option>
              <option value="Voluntário">Voluntários</option>
              <option value="Apoiador">Apoiadores</option>
              <option value="Eleitor">Eleitores</option>
            </select>

            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="all">Todas as Zonas</option>
              {ZONES.map(z => <option key={z.id} value={z.name}>{z.name}</option>)}
            </select>
          </div>

          {/* Contacts table list */}
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-gray)', fontWeight: 600 }}>
                  <th style={{ padding: '10px' }}>Nome</th>
                  <th style={{ padding: '10px' }}>Função</th>
                  <th style={{ padding: '10px' }}>Região (Zona)</th>
                  <th style={{ padding: '10px' }}>Base</th>
                  <th style={{ padding: '10px' }}>Contato</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((c) => (
                  <tr 
                    key={c.id} 
                    onClick={() => setSelectedContactId(c.id === selectedContactId ? null : c.id)}
                    style={{ 
                      borderBottom: '1px solid rgba(20,30,60,0.03)',
                      background: c.id === selectedContactId ? 'rgba(0,168,89,0.08)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background var(--transition-fast)'
                    }}
                    className="crm-row"
                  >
                    <td style={{ padding: '12px 10px', fontWeight: 600, color: 'var(--text-white)' }}>{c.name}</td>
                    <td style={{ padding: '12px 10px' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '100px',
                          background: 
                            c.role === 'Liderança' ? 'rgba(255,204,0,0.1)' : 
                            c.role === 'Voluntário' ? 'rgba(37,99,235,0.1)' : 'rgba(20,30,60,0.05)',
                          color: 
                            c.role === 'Liderança' ? 'var(--accent-yellow)' : 
                            c.role === 'Voluntário' ? 'var(--accent-blue-bright)' : 'var(--text-white)',
                          border: 
                            c.role === 'Liderança' ? '1px solid rgba(255,204,0,0.2)' : 
                            c.role === 'Voluntário' ? '1px solid rgba(37,99,235,0.2)' : '1px solid rgba(20,30,60,0.1)'
                        }}
                      >
                        {c.role}
                      </span>
                    </td>
                    <td style={{ padding: '12px 10px' }}>{c.regionName} ({c.zone})</td>
                    <td style={{ padding: '12px 10px', fontWeight: 700, color: 'var(--accent-green-bright)' }}>{c.subscribers}</td>
                    <td style={{ padding: '12px 10px' }}>
                      <div style={{ display: 'flex', gap: '8px', color: 'var(--text-gray)' }}>
                        <a href={`tel:${c.phone}`} style={{ color: 'inherit' }} title={c.phone}><Phone size={14} /></a>
                        {c.email && <a href={`mailto:${c.email}`} style={{ color: 'inherit' }} title={c.email}><Mail size={14} /></a>}
                      </div>
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteContact(c.id);
                        }}
                        style={{ background: 'transparent', color: 'rgba(239, 68, 68, 0.7)', padding: '4px' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(239, 68, 68, 0.7)'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Spatial Support Heat Map */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Heat map visualizer */}
          <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '380px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Map size={20} style={{ color: 'var(--accent-green-bright)' }} />
              <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-title)', fontWeight: 700 }}>
                Distribuição Espacial de Bases
              </h3>
            </div>
            
            <p style={{ fontSize: '0.8rem', color: 'var(--text-gray)' }}>
              Visualização gráfica das suas lideranças locais. Passe o mouse para ver e clique em um ponto para selecioná-lo na lista.
            </p>

            {/* Custom interactive grid map representing voter location coordinates */}
            <div 
              style={{ 
                position: 'relative', 
                width: '100%', 
                height: '240px', 
                background: 'rgba(0,0,0,0.3)', 
                border: '1px solid rgba(20,30,60,0.06)',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden'
              }}
            >
              {/* Map grid lines */}
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(20,30,60,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(20,30,60,0.02) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

              {/* Mapped Coordinates points */}
              {contacts.map((c) => {
                const isHighlighted = c.id === selectedContactId;
                const dotColor = 
                  c.role === 'Liderança' ? 'var(--accent-yellow)' : 
                  c.role === 'Voluntário' ? 'var(--accent-blue-bright)' : 'var(--accent-green-bright)';

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedContactId(c.id === selectedContactId ? null : c.id)}
                    style={{
                      position: 'absolute',
                      left: `${c.mapX}%`,
                      top: `${c.mapY}%`,
                      width: isHighlighted ? '14px' : '10px',
                      height: isHighlighted ? '14px' : '10px',
                      borderRadius: '50%',
                      background: dotColor,
                      cursor: 'pointer',
                      transform: 'translate(-50%, -50%)',
                      boxShadow: isHighlighted ? `0 0 15px ${dotColor}` : `0 0 8px ${dotColor}aa`,
                      border: '2px solid #FFFFFF',
                      zIndex: isHighlighted ? 10 : 2,
                      transition: 'all 0.2s ease'
                    }}
                    title={`${c.name} (${c.role}) - ${c.regionName}`}
                  />
                );
              })}
            </div>
          </div>

          {/* Selected supporter detailed notes sheet */}
          {selectedContactId && contacts.find(c => c.id === selectedContactId) && (() => {
            const selectedContact = contacts.find(c => c.id === selectedContactId);
            return (
              <div className="glass" style={{ padding: '1.25rem', borderLeft: `4px solid ${selectedContact.role === 'Liderança' ? 'var(--accent-yellow)' : 'var(--accent-green)'}` }}>
                <strong style={{ fontSize: '0.9rem', color: 'var(--text-white)', display: 'block' }}>{selectedContact.name}</strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-gray)', display: 'block', margin: '2px 0 8px 0' }}>
                  {selectedContact.role} em {selectedContact.regionName} ({selectedContact.zone})
                </span>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-white)', fontStyle: 'italic', background: 'rgba(20,30,60,0.02)', padding: '8px', borderRadius: '4px' }}>
                  "{selectedContact.notes || 'Sem observações adicionais.'}"
                </p>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginTop: '8px', textAlign: 'right' }}>
                  Último contato em: {selectedContact.lastContact}
                </span>
              </div>
            );
          })()}

        </div>
      </div>

      {/* Add Contact Modal Component */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Cadastrar Apoiador no CRM"
      >
        <form onSubmit={handleAddContactSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Name input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-gray)' }}>Nome Completo *</label>
            <input 
              type="text" 
              required
              placeholder="Digite o nome do apoiador"
              value={newContact.name}
              onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          {/* Grid row: Role and Phone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-gray)' }}>Função *</label>
              <select
                value={newContact.role}
                onChange={(e) => setNewContact(prev => ({ ...prev, role: e.target.value }))}
              >
                <option value="Coordenador Municipal">Coordenador Municipal (líder local)</option>
                <option value="Formiguinha">Formiguinha (porta-a-porta)</option>
                <option value="Apoiador">Apoiador Independente</option>
                <option value="Liderança">Liderança (regional)</option>
                <option value="Voluntário">Voluntário (eventual)</option>
                <option value="Eleitor">Eleitor (cadastro simples)</option>
              </select>
              <span style={{fontSize:'0.65rem', color:'var(--text-muted)', marginTop:2}}>
                <strong>Coordenador Municipal</strong> = responsável por mobilizar uma cidade. <strong>Formiguinha</strong> = vai porta a porta. <strong>Apoiador Independente</strong> = rede passiva (sem atribuição).
              </span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-gray)' }}>Celular *</label>
              <input 
                type="text" 
                required
                placeholder="(00) 00000-0000"
                value={newContact.phone}
                onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
          </div>

          {/* Grid row: Zone and Region */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-gray)' }}>Zona Eleitoral</label>
              <select
                value={newContact.zone}
                onChange={(e) => setNewContact(prev => ({ ...prev, zone: e.target.value }))}
              >
                {ZONES.map(z => <option key={z.id} value={z.name}>{z.name}</option>)}
              </select>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-gray)' }}>Bairro / Localidade</label>
              <select
                value={newContact.regionId}
                onChange={(e) => setNewContact(prev => ({ ...prev, regionId: e.target.value }))}
              >
                {REGIONS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>

          {/* Grid row: Email and Base Count */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-gray)' }}>E-mail</label>
              <input 
                type="email" 
                placeholder="exemplo@email.com"
                value={newContact.email}
                onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-gray)' }}>Base do Líder (Qtd)</label>
              <input 
                type="number" 
                placeholder="0"
                value={newContact.subscribers}
                onChange={(e) => setNewContact(prev => ({ ...prev, subscribers: e.target.value }))}
              />
            </div>
          </div>

          {/* Notes area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-gray)' }}>Notas e Recomendações</label>
            <textarea 
              rows="3" 
              placeholder="Digite observações sobre o perfil do líder ou do apoiador..."
              value={newContact.notes}
              onChange={(e) => setNewContact(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              style={{
                background: 'rgba(20,30,60,0.05)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-white)',
                padding: '10px 20px',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                background: 'linear-gradient(to right, var(--accent-green), var(--accent-green-bright))',
                color: '#FFFFFF',
                padding: '10px 24px',
                borderRadius: 'var(--radius-sm)',
                boxShadow: '0 0 10px rgba(0,168,89,0.3)'
              }}
            >
              Salvar Apoiador
            </button>
          </div>
        </form>
      </Modal>

      {/* Embedded CSS for table row actions hover */}
      <style>{`
        .crm-row:hover {
          background: rgba(20,30,60,0.015) !important;
        }
      `}</style>
    </div>
  );
}
