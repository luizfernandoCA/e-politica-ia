// e-politica.ia electoral mock database
// Dynamic state-driven database configured for Rondônia (RO) campaigns

const campaignParams = (() => {
  try {
    return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('campaignParams')) : null;
  } catch { return null; }
})();

export const CANDIDATES = campaignParams ? [
  {
    id: "dr-marcos-silva", // Maintain ID to prevent React routes crashing
    name: campaignParams.candidateName,
    party: `${campaignParams.party} (15)`, // Mock number
    role: campaignParams.role,
    avatar: campaignParams.role === 'Prefeito' ? "👨‍⚖️" : "👨‍💼",
    color: "var(--accent-green)",
    status: "Candidato Principal",
    baseCount: 0,
    targetGoal: 12000
  },
  {
    id: "ana-souza",
    name: "Oponente PL",
    party: "PL (22)",
    role: campaignParams.role,
    avatar: "👩‍💼",
    color: "var(--accent-blue)",
    status: "Concorrente 1",
    baseCount: 0,
    targetGoal: 11000
  },
  {
    id: "roberto-lima",
    name: "Oponente PT",
    party: "PT (13)",
    role: campaignParams.role,
    avatar: "👨‍💼",
    color: "var(--accent-yellow)",
    status: "Concorrente 2",
    baseCount: 0,
    targetGoal: 9000
  }
] : [
  {
    id: "dr-marcos-silva",
    name: "Candidato Demo",
    party: "PSD (12)",
    role: "Prefeito",
    avatar: "👨‍⚕️",
    color: "var(--accent-green)",
    status: "Candidato Principal",
    baseCount: 7420,
    targetGoal: 10000
  },
  {
    id: "ana-souza",
    name: "Oponente Demo 1",
    party: "PL (22)",
    role: "Prefeito",
    avatar: "👩‍💼",
    color: "var(--accent-blue)",
    status: "Concorrente 1",
    baseCount: 6850,
    targetGoal: 9500
  },
  {
    id: "roberto-lima",
    name: "Oponente Demo 2",
    party: "PT (13)",
    role: "Prefeito",
    avatar: "👨‍💼",
    color: "var(--accent-yellow)",
    status: "Concorrente 2",
    baseCount: 5120,
    targetGoal: 8000
  }
];

export const YEARS = [2020, 2022, 2024];

export const REGIONS = campaignParams ? [
  { id: "centro", name: "Centro", population: 45000, profile: "Comercial e administrativo", issues: "Segurança e trânsito", mapX: 50, mapY: 50, colorStrength: 0.8 },
  { id: "vila-nova", name: "Agenor de Carvalho", population: 32000, profile: "Residencial tradicional popular", issues: "Saneamento e postos de saúde", mapX: 30, mapY: 35, colorStrength: 0.95 },
  { id: "jardins", name: "Nova Porto Velho", population: 28000, profile: "Comercial e expansão residencial", issues: "Iluminação e conservação de vias", mapX: 70, mapY: 30, colorStrength: 0.4 },
  { id: "floresta", name: "Aponiã", population: 38000, profile: "Residencial muito populoso", issues: "Transporte público e creches", mapX: 35, mapY: 65, colorStrength: 0.65 },
  { id: "industrial", name: "Jatuarana", population: 15000, profile: "Zona comercial popular sul", issues: "Asfalto de vias pesadas e drenagem", mapX: 65, mapY: 70, colorStrength: 0.75 },
  { id: "morada-sol", name: "Tancredo Neves", population: 22000, profile: "Expansão residencial recente", issues: "Escolas públicas e saneamento básico", mapX: 80, mapY: 55, colorStrength: 0.85 }
] : [
  { id: "centro", name: "Centro", population: 45000, profile: "Comercial e residencial médio-alto", issues: "Segurança e trânsito", mapX: 50, mapY: 50, colorStrength: 0.8 },
  { id: "vila-nova", name: "Vila Nova", population: 32000, profile: "Residencial familiar popular", issues: "Saneamento e postos de saúde", mapX: 30, mapY: 35, colorStrength: 0.95 },
  { id: "jardins", name: "Jardins", population: 28000, profile: "Alto padrão residencial", issues: "Iluminação e conservação de praças", mapX: 70, mapY: 30, colorStrength: 0.4 },
  { id: "floresta", name: "Floresta", population: 38000, profile: "Zona mista residencial e verde", issues: "Transporte público e creches", mapX: 35, mapY: 65, colorStrength: 0.65 },
  { id: "industrial", name: "Distrito Industrial", population: 15000, profile: "Operário e industrial", issues: "Asfalto de vias pesadas e poluição", mapX: 65, mapY: 70, colorStrength: 0.75 },
  { id: "morada-sol", name: "Morada do Sol", population: 22000, profile: "Expansão urbana recente", issues: "Escolas e internet de alta velocidade", mapX: 80, mapY: 55, colorStrength: 0.85 }
];

export const ZONES = campaignParams ? [
  { id: "zone-12", name: "Zona 02 (TRE-RO Central)" },
  { id: "zone-34", name: "Zona 20 (TRE-RO Leste)" },
  { id: "zone-56", name: "Zona 21 (TRE-RO Sul)" }
] : [
  { id: "zone-12", name: "Zona 12 (Central)" },
  { id: "zone-34", name: "Zona 34 (Norte/Oeste)" },
  { id: "zone-56", name: "Zona 56 (Sul/Leste)" }
];

// Granular voting historical records for Councilor and Mayor
export const VOTING_DATA = {
  2024: {
    totalVotes: 145000,
    mayor: campaignParams ? [
      { candidateId: "dr-marcos-silva", votes: 58600, percentage: 40.41, color: "var(--accent-green)" },
      { candidateId: "ana-souza", votes: 53200, percentage: 36.69, color: "var(--accent-blue)" },
      { candidateId: "roberto-lima", votes: 33200, percentage: 22.90, color: "var(--accent-yellow)" }
    ] : [
      { candidateId: "dr-marcos-silva", votes: 58600, percentage: 40.41, color: "var(--accent-green)" },
      { candidateId: "ana-souza", votes: 53200, percentage: 36.69, color: "var(--accent-blue)" },
      { candidateId: "roberto-lima", votes: 33200, percentage: 22.90, color: "var(--accent-yellow)" }
    ],
    byRegion: {
      "centro": [
        { candidateId: "dr-marcos-silva", votes: 18400, percentage: 46.0 },
        { candidateId: "ana-souza", votes: 14400, percentage: 36.0 },
        { candidateId: "roberto-lima", votes: 7200, percentage: 18.0 }
      ],
      "vila-nova": [
        { candidateId: "dr-marcos-silva", votes: 15200, percentage: 47.5 },
        { candidateId: "ana-souza", votes: 8800, percentage: 27.5 },
        { candidateId: "roberto-lima", votes: 8000, percentage: 25.0 }
      ],
      "jardins": [
        { candidateId: "dr-marcos-silva", votes: 6160, percentage: 22.0 },
        { candidateId: "ana-souza", votes: 18200, percentage: 65.0 },
        { candidateId: "roberto-lima", votes: 3640, percentage: 13.0 }
      ],
      "floresta": [
        { candidateId: "dr-marcos-silva", votes: 11400, percentage: 30.0 },
        { candidateId: "ana-souza", votes: 13300, percentage: 35.0 },
        { candidateId: "roberto-lima", votes: 13300, percentage: 35.0 }
      ],
      "industrial": [
        { candidateId: "dr-marcos-silva", votes: 6000, percentage: 40.0 },
        { candidateId: "ana-souza", votes: 4500, percentage: 30.0 },
        { candidateId: "roberto-lima", votes: 4500, percentage: 30.0 }
      ],
      "morada-sol": [
        { candidateId: "dr-marcos-silva", votes: 10450, percentage: 47.5 },
        { candidateId: "ana-souza", votes: 5500, percentage: 25.0 },
        { candidateId: "roberto-lima", votes: 6050, percentage: 27.5 }
      ]
    },
    byZone: {
      "zone-12": [
        { candidateId: "dr-marcos-silva", votes: 24560, percentage: 49.12 },
        { candidateId: "ana-souza", votes: 18020, percentage: 36.04 },
        { candidateId: "roberto-lima", votes: 7420, percentage: 14.84 }
      ],
      "zone-34": [
        { candidateId: "dr-marcos-silva", votes: 18240, percentage: 38.00 },
        { candidateId: "ana-souza", votes: 16120, percentage: 33.58 },
        { candidateId: "roberto-lima", votes: 13640, percentage: 28.42 }
      ],
      "zone-56": [
        { candidateId: "dr-marcos-silva", votes: 15800, percentage: 33.62 },
        { candidateId: "ana-souza", votes: 19060, percentage: 40.55 },
        { candidateId: "roberto-lima", votes: 12140, percentage: 25.83 }
      ]
    }
  },
  2022: {
    totalVotes: 138000,
    mayor: [
      { candidateId: "dr-marcos-silva", votes: 52100, percentage: 37.75, color: "var(--accent-green)" },
      { candidateId: "ana-souza", votes: 48900, percentage: 35.43, color: "var(--accent-blue)" },
      { candidateId: "roberto-lima", votes: 37000, percentage: 26.81, color: "var(--accent-yellow)" }
    ],
    byRegion: {
      "centro": [
        { candidateId: "dr-marcos-silva", votes: 16200, percentage: 42.0 },
        { candidateId: "ana-souza", votes: 13800, percentage: 35.8 },
        { candidateId: "roberto-lima", votes: 8500, percentage: 22.2 }
      ],
      "vila-nova": [
        { candidateId: "dr-marcos-silva", votes: 13500, percentage: 45.0 },
        { candidateId: "ana-souza", votes: 8100, percentage: 27.0 },
        { candidateId: "roberto-lima", votes: 8400, percentage: 28.0 }
      ],
      "jardins": [
        { candidateId: "dr-marcos-silva", votes: 5300, percentage: 20.3 },
        { candidateId: "ana-souza", votes: 16800, percentage: 64.6 },
        { candidateId: "roberto-lima", votes: 3900, percentage: 15.0 }
      ],
      "floresta": [
        { candidateId: "dr-marcos-silva", votes: 10100, percentage: 28.8 },
        { candidateId: "ana-souza", votes: 12300, percentage: 35.1 },
        { candidateId: "roberto-lima", votes: 12600, percentage: 36.0 }
      ],
      "industrial": [
        { candidateId: "dr-marcos-silva", votes: 5200, percentage: 37.1 },
        { candidateId: "ana-souza", votes: 4200, percentage: 30.0 },
        { candidateId: "roberto-lima", votes: 4600, percentage: 32.9 }
      ],
      "morada-sol": [
        { candidateId: "dr-marcos-silva", votes: 9300, percentage: 46.5 },
        { candidateId: "ana-souza", votes: 5000, percentage: 25.0 },
        { candidateId: "roberto-lima", votes: 5700, percentage: 28.5 }
      ]
    },
    byZone: {
      "zone-12": [
        { candidateId: "dr-marcos-silva", votes: 21800, percentage: 45.41 },
        { candidateId: "ana-souza", votes: 16900, percentage: 35.21 },
        { candidateId: "roberto-lima", votes: 9300, percentage: 19.38 }
      ],
      "zone-34": [
        { candidateId: "dr-marcos-silva", votes: 16200, percentage: 36.00 },
        { candidateId: "ana-souza", votes: 14800, percentage: 32.89 },
        { candidateId: "roberto-lima", votes: 14000, percentage: 31.11 }
      ],
      "zone-56": [
        { candidateId: "dr-marcos-silva", votes: 14100, percentage: 31.33 },
        { candidateId: "ana-souza", votes: 17200, percentage: 38.22 },
        { candidateId: "roberto-lima", votes: 13700, percentage: 30.44 }
      ]
    }
  },
  2020: {
    totalVotes: 128000,
    mayor: [
      { candidateId: "dr-marcos-silva", votes: 43300, percentage: 33.83, color: "var(--accent-green)" },
      { candidateId: "ana-souza", votes: 44200, percentage: 34.53, color: "var(--accent-blue)" },
      { candidateId: "roberto-lima", votes: 40500, percentage: 31.64, color: "var(--accent-yellow)" }
    ],
    byRegion: {
      "centro": [
        { candidateId: "dr-marcos-silva", votes: 13800, percentage: 35.0 },
        { candidateId: "ana-souza", votes: 14200, percentage: 36.0 },
        { candidateId: "roberto-lima", votes: 11400, percentage: 29.0 }
      ],
      "vila-nova": [
        { candidateId: "dr-marcos-silva", votes: 10500, percentage: 38.0 },
        { candidateId: "ana-souza", votes: 9200, percentage: 33.3 },
        { candidateId: "roberto-lima", votes: 7900, percentage: 28.7 }
      ],
      "jardins": [
        { candidateId: "dr-marcos-silva", votes: 4800, percentage: 20.0 },
        { candidateId: "ana-souza", votes: 13400, percentage: 55.8 },
        { candidateId: "roberto-lima", votes: 5800, percentage: 24.2 }
      ],
      "floresta": [
        { candidateId: "dr-marcos-silva", votes: 9200, percentage: 28.5 },
        { candidateId: "ana-souza", votes: 11500, percentage: 35.6 },
        { candidateId: "roberto-lima", votes: 11600, percentage: 35.9 }
      ],
      "industrial": [
        { candidateId: "dr-marcos-silva", votes: 4300, percentage: 33.6 },
        { candidateId: "ana-souza", votes: 4100, percentage: 32.0 },
        { candidateId: "roberto-lima", votes: 4400, percentage: 34.4 }
      ],
      "morada-sol": [
        { candidateId: "dr-marcos-silva", votes: 7800, percentage: 40.0 },
        { candidateId: "ana-souza", votes: 6200, percentage: 31.8 },
        { candidateId: "roberto-lima", votes: 5500, percentage: 28.2 }
      ]
    },
    byZone: {
      "zone-12": [
        { candidateId: "dr-marcos-silva", votes: 17600, percentage: 40.00 },
        { candidateId: "ana-souza", votes: 15200, percentage: 34.55 },
        { candidateId: "roberto-lima", votes: 11200, percentage: 25.45 }
      ],
      "zone-34": [
        { candidateId: "dr-marcos-silva", votes: 13800, percentage: 33.17 },
        { candidateId: "ana-souza", votes: 14500, percentage: 34.86 },
        { candidateId: "roberto-lima", votes: 13300, percentage: 31.97 }
      ],
      "zone-56": [
        { candidateId: "dr-marcos-silva", votes: 11900, percentage: 28.47 },
        { candidateId: "ana-souza", votes: 14500, percentage: 34.69 },
        { candidateId: "roberto-lima", votes: 16000, percentage: 36.84 }
      ]
    }
  }
};

// Sections list for drill down inside a selected zone
export const SECTIONS_MOCK = campaignParams ? {
  "zone-12": [
    { section: "Seção 001", location: "Colégio Tiradentes PM-RO", votes: 245, candidateVotes: 128 },
    { section: "Seção 002", location: "Colégio Tiradentes PM-RO", votes: 260, candidateVotes: 135 },
    { section: "Seção 003", location: "Câmara Municipal de Porto Velho", votes: 198, candidateVotes: 89 },
    { section: "Seção 004", location: "Câmara Municipal de Porto Velho", votes: 210, candidateVotes: 104 },
    { section: "Seção 005", location: "Instituto Federal de Rondônia (IFRO)", votes: 312, candidateVotes: 164 },
    { section: "Seção 006", location: "Instituto Federal de Rondônia (IFRO)", votes: 290, candidateVotes: 141 }
  ],
  "zone-34": [
    { section: "Seção 120", location: "Escola Municipal Estela Compasso", votes: 215, candidateVotes: 85 },
    { section: "Seção 121", location: "Escola Municipal Estela Compasso", votes: 230, candidateVotes: 91 },
    { section: "Seção 122", location: "Ginásio Cláudio Coutinho", votes: 285, candidateVotes: 110 },
    { section: "Seção 123", location: "Ginásio Cláudio Coutinho", votes: 270, candidateVotes: 102 },
    { section: "Seção 124", location: "Colégio Padrão", votes: 340, candidateVotes: 138 },
    { section: "Seção 125", location: "Colégio Padrão", votes: 320, candidateVotes: 120 }
  ],
  "zone-56": [
    { section: "Seção 240", location: "Paróquia Sagrada Família (Porto Velho)", votes: 195, candidateVotes: 62 },
    { section: "Seção 241", location: "Paróquia Sagrada Família (Porto Velho)", votes: 205, candidateVotes: 68 },
    { section: "Seção 242", location: "Centro de Convivência do Idoso da Zona Sul", votes: 250, candidateVotes: 82 },
    { section: "Seção 243", location: "Centro de Convivência do Idoso da Zona Sul", votes: 240, candidateVotes: 79 },
    { section: "Seção 244", location: "Escola Estadual João Bento da Costa", votes: 280, candidateVotes: 95 },
    { section: "Seção 245", location: "Escola Estadual João Bento da Costa", votes: 295, candidateVotes: 99 }
  ]
} : {
  "zone-12": [
    { section: "Seção 001", location: "Escola Estadual Castro Alves", votes: 245, candidateVotes: 128 },
    { section: "Seção 002", location: "Escola Estadual Castro Alves", votes: 260, candidateVotes: 135 },
    { section: "Seção 003", location: "Câmara de Vereadores", votes: 198, candidateVotes: 89 },
    { section: "Seção 004", location: "Câmara de Vereadores", votes: 210, candidateVotes: 104 },
    { section: "Seção 005", location: "Colégio Objetivo", votes: 312, candidateVotes: 164 },
    { section: "Seção 006", location: "Colégio Objetivo", votes: 290, candidateVotes: 141 }
  ],
  "zone-34": [
    { section: "Seção 120", location: "Creche Municipal Pingo de Gente", votes: 215, candidateVotes: 85 },
    { section: "Seção 121", location: "Creche Municipal Pingo de Gente", votes: 230, candidateVotes: 91 },
    { section: "Seção 122", location: "Ginásio de Esportes Municipal", votes: 285, candidateVotes: 110 },
    { section: "Seção 123", location: "Ginásio de Esportes Municipal", votes: 270, candidateVotes: 102 },
    { section: "Seção 124", location: "Escola Municipal Monteiro Lobato", votes: 340, candidateVotes: 138 },
    { section: "Seção 125", location: "Escola Municipal Monteiro Lobato", votes: 320, candidateVotes: 120 }
  ],
  "zone-56": [
    { section: "Seção 240", location: "Paróquia São Judas Tadeu", votes: 195, candidateVotes: 62 },
    { section: "Seção 241", location: "Paróquia São Judas Tadeu", votes: 205, candidateVotes: 68 },
    { section: "Seção 242", location: "Centro de Convivência do Idoso", votes: 250, candidateVotes: 82 },
    { section: "Seção 243", location: "Centro de Convivência do Idoso", votes: 240, candidateVotes: 79 },
    { section: "Seção 244", location: "Escola Est. D. Pedro II", votes: 280, candidateVotes: 95 },
    { section: "Seção 245", location: "Escola Est. D. Pedro II", votes: 295, candidateVotes: 99 }
  ]
};

// Campaign analytics comparison values
export const COMPARATIVE_YEARS_SUMMARY = {
  "dr-marcos-silva": {
    spend: { 2020: 120000, 2022: 240000, 2024: 380000 },
    leadersCount: { 2020: 120, 2022: 210, 2024: 310 },
    costPerVote: { 2020: 2.77, 2022: 4.60, 2024: 6.48 }
  },
  "ana-souza": {
    spend: { 2020: 150000, 2022: 280000, 2024: 420000 },
    leadersCount: { 2020: 95, 2022: 180, 2024: 280 },
    costPerVote: { 2020: 3.58, 2022: 5.72, 2024: 7.89 }
  },
  "roberto-lima": {
    spend: { 2020: 95000, 2022: 180000, 2024: 290000 },
    leadersCount: { 2020: 80, 2022: 150, 2024: 220 },
    costPerVote: { 2020: 2.06, 2022: 4.86, 2024: 8.73 }
  }
};
