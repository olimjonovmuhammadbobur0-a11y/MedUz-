export interface Mnemonic {
  id?: number;
  category: string;
  title: string;
  mnemonic: string;
  explanation: string;
}

export interface Question {
  id?: number;
  subject: string;
  topic: string;
  difficulty: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface SymptomData {
  id?: number;
  symptoms: string[];
  diagnosis: string;
  redFlag: boolean;
}

export interface VideoData {
  id?: number;
  title: string;
  duration: string;
  category: string;
  videoUrl: string;
  available: boolean;
}

export interface Section {
  id?: number;
  title: string;
  content: string;
  icon: string;
  color: string;
}

export interface Patient {
  id?: number;
  name: string;
  age: number;
  symptoms: string;
  condition: string;
  healthScore: number;
  medications: string;
}

export interface Setting {
  key: string;
  value: string;
}

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
