export interface Mnemonic {
  id?: string;
  category: string;
  title: string;
  mnemonic: string;
  explanation: string;
}

export interface Question {
  id?: string;
  subject: string;
  topic: string;
  difficulty: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface SymptomData {
  id?: string;
  symptoms: string[];
  diagnosis: string;
  redFlag: boolean;
}

export interface VideoData {
  id?: string;
  title: string;
  duration: string;
  category: string;
  videoUrl: string;
  available: boolean;
}

export interface Section {
  id?: string;
  title: string;
  content: string;
  icon: string;
  color: string;
}

export interface Patient {
  id?: string;
  name: string;
  age: number;
  symptoms: string;
  condition: string;
  healthScore: number;
  medications: string;
  aiAdvice?: string;
}

export interface Setting {
  key: string;
  value: string;
}

export interface Guide {
  id: string;
  title: string;
  description?: string;
  driveLink: string;
}

export interface VideoLecture {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
}

export interface Topic {
  id: string;
  title: string;
  description?: string;
  videos: VideoLecture[];
  guides: Guide[];
}

export interface Subject {
  id: string;
  title: string;
  description: string;
  icon: string;
  topics: Topic[];
}

export interface OSCEScenario {
  id?: string;
  title: string;
  description: string;
  systemInstruction: string;
  initialMessage: string;
  patientInfo?: {
    age: number;
    gender: 'male' | 'female';
  };
}

export interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  imageUrl: string;
  link: string;
}

export interface JournalItem {
  id: string;
  title: string;
  description: string;
  date: string;
  category: string;
  imageUrl: string;
  pdfUrl: string;
}

export const initialJournals: JournalItem[] = [
  {
    id: '1',
    title: 'Tibbiyot Jurnali - Mart 2026',
    description: 'Zamonaviy tibbiyotdagi so\'nggi yangiliklar va maqolalar to\'plami.',
    date: '2026-03-20',
    category: 'Umumiy Tibbiyot',
    imageUrl: 'https://picsum.photos/seed/journal1/800/600',
    pdfUrl: '#'
  }
];

export const initialNews: NewsItem[] = [
  {
    id: "1",
    title: "JS/TS texnologiyalari tibbiyotda",
    excerpt: "Tibbiyot sohasida sun'iy intellekt va yangi dasturlash tillarining o'rni kundan kunga oshib bormoqda. Zamonaviy yondashuvlar...",
    date: "2026-03-20",
    category: "Global Health Updates",
    imageUrl: "https://picsum.photos/seed/mednews1/800/400",
    link: "https://www.who.int"
  },
  {
    id: "2",
    title: "Yangi JS/TS texnologiyalari tibbiyotda",
    excerpt: "Tibbiyot sohasida sun'iy intellekt va yangi dasturlash tillarining o'rni kundan kunga oshib bormoqda. Zamonaviy yondashuvlar...",
    date: "2026-03-18",
    category: "WHO Guidelines",
    imageUrl: "https://picsum.photos/seed/mednews2/800/400",
    link: "https://www.who.int"
  },
  {
    id: "3",
    title: "JS/TS texnologiyalari tibbiyotda",
    excerpt: "Tibbiyot sohasida sun'iy intellekt va yangi dasturlash tillarining o'rni kundan kunga oshib bormoqda. Zamonaviy yondashuvlar...",
    date: "2026-03-15",
    category: "CDC Vaccination Protocols",
    imageUrl: "https://picsum.photos/seed/mednews3/800/400",
    link: "https://www.cdc.gov"
  }
];

export const osceScenarios: OSCEScenario[] = [
  {
    title: "Ko'krak qafasida og'riq",
    description: "54 yoshli erkak bemor ko'krak qafasidagi og'riq shikoyati bilan kelgan.",
    systemInstruction: `You are a virtual patient designed to help medical students practice clinical history taking in an OSCE-style interaction.

IMPORTANT LANGUAGE RULE:
You must ALWAYS respond in Uzbek language only.
All responses must be written in Uzbek.
Even if the student asks questions in English or another language, your answer must remain in Uzbek.

YOUR ROLE:
Act like a real patient speaking with a doctor. The medical student will ask questions to take your medical history.

RULES:
1. Always stay in the role of a patient.
2. Never say you are an AI or simulator.
3. Do not act like a teacher or provide explanations.
4. Only answer the questions asked by the student.
5. If the student asks unclear questions, ask them to clarify.
6. Do not reveal the diagnosis unless the student explicitly asks about it.
7. Speak in natural everyday language, like a real patient.
8. Do not provide extra medical information unless the student asks for it.
9. Your emotional tone should resemble a slightly worried patient.

PATIENT INFORMATION:
Age: 54
Gender: Male
Main complaint: Chest discomfort during walking
Duration: 3 months
Additional symptom: Sometimes pain spreads to the left arm
Past medical history: Hypertension
Medication: Occasionally takes blood pressure medication
Lifestyle: Smokes about 10 cigarettes per day
Family history: Father died from heart disease at age 60

HIDDEN DIAGNOSIS:
Stable angina (Do NOT reveal unless the student directly asks about the possible diagnosis)`,
    initialMessage: "Assalomu alaykum doktor, oxirgi paytlarda ko'kragimda biroz siqilish sezayapman.",
    patientInfo: {
      age: 54,
      gender: 'male'
    }
  }
];

export const mnemonics: Mnemonic[] = [
  {
    category: "Kardiologiya",
    title: "Yurak yetishmovchiligi belgilari",
    mnemonic: "OLD CAB",
    explanation: "Orthopnea (Ortopnoe), LVH (Chap qorincha gipertrofiyasi), Dyspnea (Harsillash), Cough (Yo'tal), Ankle swelling (To'piq shishishi), Bibasilar crackles (O'pka asosida xirillashlar)"
  },
  {
    category: "Nevrologiya",
    title: "Kalla miya nervlari",
    mnemonic: "ON OLD OLYMPUS",
    explanation: "Olfactory, Optic, Oculomotor, Trochlear, Trigeminal, Abducens, Facial, Vestibulocochlear, Glossopharyngeal, Vagus, Accessory, Hypoglossal"
  },
  {
    category: "Pulmonologiya",
    title: "Pnevmoniya bosqichlari",
    mnemonic: "PQRST",
    explanation: "P - Progression, Q - Quality, R - Radiation, S - Severity, T - Timing (Pnevmoniya diagnostikasida og'riq xarakteristikasi)"
  },
  {
    category: "Gastroenterologiya",
    title: "O'tkir pankreatit sabablari",
    mnemonic: "GET SMASHED",
    explanation: "Gallstones, Ethanol, Trauma, Steroids, Mumps, Autoimmune, Scorpion sting, Hypertriglyceridemia/Hypercalcemia, ERCP, Drugs"
  },
  {
    category: "Endokrinologiya",
    title: "Giperkaltsemiya belgilari",
    mnemonic: "Stones, Bones, Abdominal Groans, Psychic Moans",
    explanation: "Buyrak toshlari, suyak og'rig'i, qorin og'rig'i (pankreatit/yaralar), depressiya/psixoz"
  }
];

export const questions: Question[] = [
  {
    subject: "internal",
    topic: "opka",
    difficulty: "medium",
    question: "O'pka arteriyasida bosim qachon ortadi?",
    options: [
      "Mitral stenozda",
      "Aorta stenozda", 
      "Trikuspidal yetishmovchilikda",
      "O'pka venoz bosim ortishida"
    ],
    correct: 0,
    explanation: "Mitral stenozda chap qorincha to'lishi qiyinlashadi, natijada o'pka arteriyasida bosim ortadi."
  },
  {
    subject: "internal",
    topic: "yurak",
    difficulty: "medium",
    question: "Yurak yetishmovchiligida qanday gemodinamik o'zgarish kuzatiladi?",
    options: [
      "ABP ortadi",
      "ABP kamayadi", 
      "CVP kamayadi",
      "CVP ortadi"
    ],
    correct: 3,
    explanation: "Yurak yetishmovchiligida markaziy venoz bosim (CVP) ortadi, chunki qon yurakda to'xtab qoladi."
  },
  {
    subject: "internal",
    topic: "yurak",
    difficulty: "easy",
    question: "Quyidagilardan qaysi biri yurak ishemik kasalligi xavf omili hisoblanadi?",
    options: [
      "Jismoniy faollik",
      "Chekish",
      "Meva ko'p iste'mol qilish",
      "Yengil atletika"
    ],
    correct: 1,
    explanation: "Chekish – asosiy xavf omillaridan biri, chunki nikotin tomirlarni toraytiradi."
  },
  {
    subject: "internal",
    topic: "yurak",
    difficulty: "hard",
    question: "Miyokard infarktining eng tez-tez uchraydigan asorati?",
    options: [
      "Yurak tamponadasi",
      "Aritmiya",
      "Miyokard rupture",
      "Qorincha anevrizmasi"
    ],
    correct: 1,
    explanation: "Aritmiyalar (ayniqsa qorincha taxikardiyasi) eng ko'p uchraydi."
  },
  {
    subject: "internal",
    topic: "jigar",
    difficulty: "medium",
    question: "Jigar sirrozi bilan og'rigan bemorda qanday gormonal o'zgarish kuzatiladi?",
    options: [
      "Aldosteron kamayadi",
      "Aldosteron ortadi",
      "ADH kamayadi",
      "Renin kamayadi"
    ],
    correct: 1,
    explanation: "Jigar sirrozida renin-angiotensin-aldosteron tizimi faollashadi, aldosteron ortadi."
  },
  {
    subject: "surgery",
    topic: "appenditsit",
    difficulty: "medium",
    question: "O'tkir appenditsitda eng tipik simptom?",
    options: [
      "Murphy simptomi",
      "Kocher simptomi",
      "Ortner simptomi",
      "Cough simptomi"
    ],
    correct: 1,
    explanation: "Kocher simptomi – og'riqning epigastral sohadan o'ng yonbosh sohaga ko'chishi."
  },
  {
    subject: "pediatrics",
    topic: "raxit",
    difficulty: "easy",
    question: "Bolalarda raxit kasalligi qaysi vitamin yetishmovchiligida kelib chiqadi?",
    options: [
      "Vitamin A",
      "Vitamin B",
      "Vitamin D",
      "Vitamin E"
    ],
    correct: 2,
    explanation: "Raxit vitamin D yetishmovchiligida kelib chiqadi."
  }
];

export const symptomCheckerData: SymptomData[] = [
  {
    symptoms: ["ko'krak og'rig'i", "terlash", "chap qo'lga og'riq berishi"],
    diagnosis: "Miokard infarkti",
    redFlag: true
  },
  {
    symptoms: ["yo'tal", "isitma", "yashil balg'am"],
    diagnosis: "Pnevmoniya",
    redFlag: false
  },
  {
    symptoms: ["bosh og'rig'i", "qusish", "yorug'likdan qo'rqish", "ensa qotishi"],
    diagnosis: "Meningit",
    redFlag: true
  },
  {
    symptoms: ["qorin o'ng pastki qismida og'riq", "ko'ngil aynishi", "isitma"],
    diagnosis: "O'tkir appenditsit",
    redFlag: true
  },
  {
    symptoms: ["tez-tez siyish", "chanqash", "vazn yo'qotish"],
    diagnosis: "Qandli diabet",
    redFlag: false
  }
];

export const initialFanlar: Subject[] = [
  {
    id: '1',
    title: 'Ichki kasalliklar',
    description: 'Yurak, o\'pka, jigar va boshqa ichki a\'zolar kasalliklari',
    icon: 'Stethoscope',
    topics: []
  },
  {
    id: '2',
    title: 'Xirurgiya',
    description: 'Jarrohlik kasalliklari va operativ muolajalar',
    icon: 'Scissors',
    topics: []
  },
  {
    id: '3',
    title: 'Pediatriya',
    description: 'Bolalar kasalliklari va ularning rivojlanishi',
    icon: 'Baby',
    topics: []
  },
  {
    id: '4',
    title: 'Nevrologiya',
    description: 'Asab tizimi kasalliklari va diagnostikasi',
    icon: 'Brain',
    topics: []
  },
  {
    id: '5',
    title: 'Kardiologiya',
    description: 'Yurak-qon tomir tizimi kasalliklari',
    icon: 'Heart',
    topics: []
  }
];

export const initialSettings = {
  creatorName: 'Olimjonov Muhammadbobur',
  creatorImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Muhammadbobur',
  gradientFrom: '#3b82f6',
  gradientTo: '#8b5cf6',
};
