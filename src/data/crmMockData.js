// e-politica.ia CRM/Voter base mock database

export const CRM_CONTACTS = [
  {
    id: 1,
    name: "Reginaldo de Souza",
    role: "Liderança",
    phone: "(11) 98765-4321",
    email: "reginaldo.souza@gmail.com",
    zone: "Zona 12",
    regionId: "vila-nova",
    regionName: "Vila Nova",
    status: "Ativo",
    subscribers: 245,
    lastContact: "2026-05-24",
    notes: "Grande líder de associação de moradores. Organizou evento com 80 pessoas semana passada.",
    mapX: 28,
    mapY: 33
  },
  {
    id: 2,
    name: "Dr. Roberto Antunes",
    role: "Apoiador",
    phone: "(11) 98123-4567",
    email: "dr.antunes.med@hotmail.com",
    zone: "Zona 12",
    regionId: "centro",
    regionName: "Centro",
    status: "Ativo",
    subscribers: 42,
    lastContact: "2026-05-25",
    notes: "Apoia no setor de saúde pública. Influente entre médicos locais.",
    mapX: 52,
    mapY: 48
  },
  {
    id: 3,
    name: "Clara Maria Mendes",
    role: "Liderança",
    phone: "(11) 97542-1298",
    email: "clara.mendes.jardins@outlook.com",
    zone: "Zona 56",
    regionId: "jardins",
    regionName: "Jardins",
    status: "Ativo",
    subscribers: 180,
    lastContact: "2026-05-18",
    notes: "Coordena o grupo de mulheres empreendedoras. Muito ativa nas redes sociais.",
    mapX: 72,
    mapY: 28
  },
  {
    id: 4,
    name: "Felipe Silva Santos",
    role: "Voluntário",
    phone: "(11) 99654-8732",
    email: "felipe.santos.vol@gmail.com",
    zone: "Zona 34",
    regionId: "floresta",
    regionName: "Floresta",
    status: "Ativo",
    subscribers: 15,
    lastContact: "2026-05-26",
    notes: "Disponível para panfletagem de rua e organização de comitês.",
    mapX: 38,
    mapY: 62
  },
  {
    id: 5,
    name: "Mariana Costa Ramos",
    role: "Liderança",
    phone: "(11) 96321-7890",
    email: "mariana.industrial@yahoo.com.br",
    zone: "Zona 56",
    regionId: "industrial",
    regionName: "Distrito Industrial",
    status: "Ativo",
    subscribers: 310,
    lastContact: "2026-05-22",
    notes: "Líder sindical e coordenadora de base metalúrgica. Extremamente influente.",
    mapX: 68,
    mapY: 68
  },
  {
    id: 6,
    name: "José Augusto (Zezinho)",
    role: "Voluntário",
    phone: "(11) 97410-8523",
    email: "zezinho.morada@gmail.com",
    zone: "Zona 34",
    regionId: "morada-sol",
    regionName: "Morada do Sol",
    status: "Pendente",
    subscribers: 8,
    lastContact: "2026-05-12",
    notes: "Interessado em apoiar no som móvel e distribuição de cartazes.",
    mapX: 82,
    mapY: 53
  },
  {
    id: 7,
    name: "Sandra Mara Pereira",
    role: "Eleitor",
    phone: "(11) 98522-3698",
    email: "sandra.mara.centro@gmail.com",
    zone: "Zona 12",
    regionId: "centro",
    regionName: "Centro",
    status: "Ativo",
    subscribers: 0,
    lastContact: "2026-05-20",
    notes: "Dona de comércio local. Prometeu colocar adesivos na vitrine.",
    mapX: 47,
    mapY: 53
  },
  {
    id: 8,
    name: "Carlos Eduardo Gouveia",
    role: "Apoiador",
    phone: "(11) 99823-1122",
    email: "cadu.gouveia@gmail.com",
    zone: "Zona 34",
    regionId: "vila-nova",
    regionName: "Vila Nova",
    status: "Inativo",
    subscribers: 50,
    lastContact: "2026-04-15",
    notes: "Precisa de contato de reativação. Estava insatisfeito com agenda antiga.",
    mapX: 32,
    mapY: 38
  }
];

export const CAMPAIGN_CHECKLIST = [
  { id: 1, text: "Reunião de alinhamento com Clara Mendes (Jardins)", done: true, category: "alta", page: "CRM" },
  { id: 2, text: "Revisar relatório eleitoral da Zona 12 com marqueteiro", done: false, category: "alta", page: "Analytics" },
  { id: 3, text: "Distribuir materiais de panfletagem para Felipe Santos", done: false, category: "media", page: "CRM" },
  { id: 4, text: "Fazer simulação de plano de ação na IA Mestre sobre Segurança", done: false, category: "media", page: "Assistant" },
  { id: 5, text: "Verificar lideranças inativas no distrito industrial", done: true, category: "baixa", page: "CRM" },
  { id: 6, text: "Exportar PDF analítico do comparativo de candidatos", done: false, category: "baixa", page: "Comparison" }
];

export const CAMPAIGN_METRICS = {
  totalBase: 7420,
  targetGoal: 10000,
  leadersCount: 310,
  volunteersCount: 450,
  regionsCovered: 6,
  activeRatio: 92.4, // percentage of active database
  weeklyGrowth: 4.8 // percentage growth compared to last week
};
