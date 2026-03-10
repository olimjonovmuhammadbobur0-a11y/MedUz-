import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("meduz_v2.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS mnemonics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT,
    title TEXT,
    mnemonic TEXT,
    explanation TEXT
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject TEXT,
    topic TEXT,
    difficulty TEXT,
    question TEXT,
    options TEXT, -- JSON array
    correct INTEGER,
    explanation TEXT
  );

  CREATE TABLE IF NOT EXISTS symptoms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symptoms TEXT, -- JSON array
    diagnosis TEXT,
    redFlag INTEGER -- 0 or 1
  );

  CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    duration TEXT,
    category TEXT,
    videoUrl TEXT,
    available INTEGER -- 0 or 1
  );

  CREATE TABLE IF NOT EXISTS sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content TEXT,
    icon TEXT,
    color TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Seed data if empty
const videoCount = db.prepare("SELECT COUNT(*) as count FROM videos").get() as any;
if (videoCount.count === 0) {
  const seedVideos = [
    { title: "Yurak auskultatsiyasi asoslari", duration: "12:45", category: "Fizikal ko'rik", videoUrl: "https://www.youtube.com/watch?v=6_Xp9-q0X-8", available: 1 },
    { title: "O'pka perkussiyasi texnikasi", duration: "08:20", category: "Fizikal ko'rik", videoUrl: "https://www.youtube.com/watch?v=X0q7G_A-f0o", available: 1 }
  ];
  const insert = db.prepare("INSERT INTO videos (title, duration, category, videoUrl, available) VALUES (?, ?, ?, ?, ?)");
  seedVideos.forEach(v => insert.run(v.title, v.duration, v.category, v.videoUrl, v.available));
}

// Seed data if empty
const mnemonicCount = db.prepare("SELECT COUNT(*) as count FROM mnemonics").get() as any;
if (mnemonicCount.count === 0) {
  const seedMnemonics = [
    { category: "Kardiologiya", title: "Yurak yetishmovchiligi belgilari", mnemonic: "OLD CAB", explanation: "Orthopnea, LVH, Dyspnea, Cough, Ankle swelling, Bibasilar crackles" },
    { category: "Nevrologiya", title: "Kalla miya nervlari", mnemonic: "ON OLD OLYMPUS", explanation: "Olfactory, Optic, Oculomotor, Trochlear, Trigeminal, Abducens, Facial, Vestibulocochlear, Glossopharyngeal, Vagus, Accessory, Hypoglossal" }
  ];
  const insert = db.prepare("INSERT INTO mnemonics (category, title, mnemonic, explanation) VALUES (?, ?, ?, ?)");
  seedMnemonics.forEach(m => insert.run(m.category, m.title, m.mnemonic, m.explanation));
}

const questionCount = db.prepare("SELECT COUNT(*) as count FROM questions").get() as any;
if (questionCount.count === 0) {
  const seedQuestions = [
    // INTERNAL MEDICINE (5 questions)
    {
      subject: "internal",
      topic: "yurak",
      difficulty: "medium",
      question: "Yurak yetishmovchiligida qanday gemodinamik o'zgarish kuzatiladi?",
      options: JSON.stringify(["ABP ortadi", "ABP kamayadi", "CVP kamayadi", "CVP ortadi"]),
      correct: 3,
      explanation: "Yurak yetishmovchiligida markaziy venoz bosim (CVP) ortadi."
    },
    {
      subject: "internal",
      topic: "yurak",
      difficulty: "hard",
      question: "Miyokard infarktining eng tez-tez uchraydigan asorati?",
      options: JSON.stringify(["Yurak tamponadasi", "Aritmiya", "Miyokard rupture", "Qorincha anevrizmasi"]),
      correct: 1,
      explanation: "Aritmiyalar eng ko'p uchraydi."
    },
    {
      subject: "internal",
      topic: "opka",
      difficulty: "medium",
      question: "O'pka arteriyasida bosim qachon ortadi?",
      options: JSON.stringify(["Mitral stenozda", "Aorta stenozda", "Trikuspidal yetishmovchilikda", "O'pka venoz bosim ortishida"]),
      correct: 0,
      explanation: "Mitral stenozda chap qorincha to'lishi qiyinlashadi."
    },
    {
      subject: "internal",
      topic: "jigar",
      difficulty: "medium",
      question: "Jigar sirrozi bilan og'rigan bemorda qanday gormonal o'zgarish kuzatiladi?",
      options: JSON.stringify(["Aldosteron kamayadi", "Aldosteron ortadi", "ADH kamayadi", "Renin kamayadi"]),
      correct: 1,
      explanation: "Jigar sirrozida aldosteron ortadi."
    },
    {
      subject: "internal",
      topic: "buyrak",
      difficulty: "easy",
      question: "O'tkir glomerulonefritning asosiy belgisi?",
      options: JSON.stringify(["Gipertenziya", "Gipotoniya", "Poliuriya", "Dizuriya"]),
      correct: 0,
      explanation: "Qon bosimi ortadi va shish paydo bo'ladi."
    },

    // SURGERY (5 questions)
    {
      subject: "surgery",
      topic: "appenditsit",
      difficulty: "medium",
      question: "O'tkir appenditsitda eng tipik simptom?",
      options: JSON.stringify(["Murphy", "Kocher", "Ortner", "Cough"]),
      correct: 1,
      explanation: "Kocher simptomi – og'riqning o'ng yonbosh sohaga ko'chishi."
    },
    {
      subject: "surgery",
      topic: "xoletsistit",
      difficulty: "medium",
      question: "O'tkir xoletsistitda qaysi simptom kuzatiladi?",
      options: JSON.stringify(["Murphy", "Kocher", "Psoas", "Rovsing"]),
      correct: 0,
      explanation: "Murphy simptomi – o't pufagi sohasida og'riq."
    },
    {
      subject: "surgery",
      topic: "pankreatit",
      difficulty: "hard",
      question: "O'tkir pankreatitda qaysi ferment yuqori bo'ladi?",
      options: JSON.stringify(["ALT", "AST", "Amilaza", "Kreatinin"]),
      correct: 2,
      explanation: "Amilaza va lipaza yuqori bo'ladi."
    },
    {
      subject: "surgery",
      topic: "travma",
      difficulty: "easy",
      question: "Suyak sinishining mutloq belgisi?",
      options: JSON.stringify(["Og'riq", "Shish", "Krepitatsiya", "Gematoma"]),
      correct: 2,
      explanation: "Krepitatsiya – suyak parchalarning ishqalanishi."
    },
    {
      subject: "surgery",
      topic: "onkologiya",
      difficulty: "medium",
      question: "Oshqozon saratonining eng keng tarqalgan gistologik turi?",
      options: JSON.stringify(["Adenokarsinoma", "Skuamoz", "Sarkoma", "Limfoma"]),
      correct: 0,
      explanation: "95% adenokarsinoma."
    },

    // PEDIATRICS (5 questions)
    {
      subject: "pediatrics",
      topic: "raxit",
      difficulty: "easy",
      question: "Bolalarda raxit qaysi vitamin yetishmovchiligida kelib chiqadi?",
      options: JSON.stringify(["A", "B", "D", "E"]),
      correct: 2,
      explanation: "Raxit vitamin D yetishmovchiligida kelib chiqadi."
    },
    {
      subject: "pediatrics",
      topic: "infeksiyalar",
      difficulty: "medium",
      question: "Qizamiq kasalligining inkubatsion davri?",
      options: JSON.stringify(["3-5 kun", "7-14 kun", "14-21 kun", "21-28 kun"]),
      correct: 1,
      explanation: "Qizamiqda inkubatsion davr o'rtacha 7-14 kun."
    },
    {
      subject: "pediatrics",
      topic: "yuqumli kasalliklar",
      difficulty: "medium",
      question: "Skarlatinada qanday toshma xarakterli?",
      options: JSON.stringify(["Papulyoz", "Mayda nuqtali", "Vezikulyar", "Pustulyoz"]),
      correct: 1,
      explanation: "Mayda nuqtali toshma xarakterli."
    },
    {
      subject: "pediatrics",
      topic: "nevrologiya",
      difficulty: "hard",
      question: "Bolalarda meningitning eng tez-tez qo'zg'atuvchisi?",
      options: JSON.stringify(["Viruslar", "Bakteriyalar", "Zamburug'lar", "Parazitlar"]),
      correct: 1,
      explanation: "Bakterial meningit ko'proq uchraydi."
    },
    {
      subject: "pediatrics",
      topic: "raxit",
      difficulty: "medium",
      question: "Raxitning boshlang'ich belgisi?",
      options: JSON.stringify(["Terlash", "Suyak deformatsiyasi", "Mushak gipotoniyasi", "Tish chiqishining kechikishi"]),
      correct: 0,
      explanation: "Bosh terlash, bezovtalik boshlang'ich belgilar."
    },

    // OBSTETRICS (5 questions)
    {
      subject: "obstetrics",
      topic: "homiladorlik",
      difficulty: "medium",
      question: "Homiladorlikda preeklampsiyaning asosiy belgisi?",
      options: JSON.stringify(["Gipertenziya", "Gipotoniya", "Bradikardiya", "Anemiya"]),
      correct: 0,
      explanation: "Preeklampsiyada qon bosimi ortadi."
    },
    {
      subject: "obstetrics",
      topic: "tug'ruq",
      difficulty: "easy",
      question: "Tug'ruqning birinchi davri nima bilan tugaydi?",
      options: JSON.stringify(["Bola tug'ilishi", "Yo'ldosh ajralishi", "Bachadon bo'yni ochilishi", "Qisqarishlar boshlanishi"]),
      correct: 2,
      explanation: "Bachadon bo'yni to'liq ochiladi."
    },
    {
      subject: "obstetrics",
      topic: "asoratlar",
      difficulty: "hard",
      question: "HeLLP sindromi qaysi kasallikning asorati?",
      options: JSON.stringify(["Preeklampsiya", "Giperemez", "Anemiya", "Piyelonefrit"]),
      correct: 0,
      explanation: "HeLLP preeklampsiyaning og'ir asorati."
    },
    {
      subject: "obstetrics",
      topic: "homiladorlik",
      difficulty: "medium",
      question: "Homiladorlikda qanday anemiya ko'p uchraydi?",
      options: JSON.stringify(["B12 yetishmovchilik", "Folat yetishmovchilik", "Temir yetishmovchilik", "Gemolitik"]),
      correct: 2,
      explanation: "Temir yetishmovchilik anemiyasi 90%"
    },
    {
      subject: "obstetrics",
      topic: "tug'ruq",
      difficulty: "medium",
      question: "Tug'ruqdan keyingi qon ketishning eng ko'p sababi?",
      options: JSON.stringify(["Bachadon atoniyasi", "Platsenta akkreta", "Tug'ruq yo'llari yorilishi", "Koaqulopatiya"]),
      correct: 0,
      explanation: "Bachadon tonusi pasayishi sabab bo'ladi."
    },

    // NEUROLOGY (5 questions)
    {
      subject: "neurology",
      topic: "bosh_miya",
      difficulty: "hard",
      question: "Insultning eng keng tarqalgan turi?",
      options: JSON.stringify(["Gemorragik", "Ishemik", "Subaraxnoidal", "Mikroinsult"]),
      correct: 1,
      explanation: "Barcha insultlarning 85% ishemik insult."
    },
    {
      subject: "neurology",
      topic: "periferik_nervlar",
      difficulty: "medium",
      question: "Karpal tunnel sindromida qaysi nerv zararlanadi?",
      options: JSON.stringify(["Ulnar", "Radial", "Median", "Aksillar"]),
      correct: 2,
      explanation: "Median nerv karpal tunnelda zararlanadi."
    },
    {
      subject: "neurology",
      topic: "bosh_miya",
      difficulty: "easy",
      question: "Miya chayqalishining asosiy belgisi?",
      options: JSON.stringify(["Qisqa muddatli xotira yo'qolishi", "Uzoq muddatli koma", "Falaj", "Nutq buzilishi"]),
      correct: 0,
      explanation: "Qisqa muddatli xotira yo'qolishi xarakterli."
    },
    {
      subject: "neurology",
      topic: "o'murtqa",
      difficulty: "medium",
      question: "Lumbal ponksiya qayerda o'tkaziladi?",
      options: JSON.stringify(["L1-L2", "L2-L3", "L3-L4", "L4-L5"]),
      correct: 3,
      explanation: "L4-L5 yoki L5-S1 oralig'ida."
    },
    {
      subject: "neurology",
      topic: "bosh_miya",
      difficulty: "hard",
      question: "Parkinson kasalligida qaysi neyrotransmitter kamayadi?",
      options: JSON.stringify(["Serotonin", "Dopamin", "Noradrenalin", "GABA"]),
      correct: 1,
      explanation: "Dopamin ishlab chiqaruvchi neyronlar nobud bo'ladi."
    }
  ];
  const insert = db.prepare("INSERT INTO questions (subject, topic, difficulty, question, options, correct, explanation) VALUES (?, ?, ?, ?, ?, ?, ?)");
  seedQuestions.forEach(q => insert.run(q.subject, q.topic, q.difficulty, q.question, q.options, q.correct, q.explanation));
}

const symptomCount = db.prepare("SELECT COUNT(*) as count FROM symptoms").get() as any;
if (symptomCount.count === 0) {
  const seedSymptoms = [
    { symptoms: JSON.stringify(["ko'krak og'rig'i", "terlash", "chap qo'lga og'riq berishi"]), diagnosis: "Miokard infarkti", redFlag: 1 },
    { symptoms: JSON.stringify(["yo'tal", "isitma", "yashil balg'am"]), diagnosis: "Pnevmoniya", redFlag: 0 },
    { symptoms: JSON.stringify(["bosh og'rig'i", "qusish", "yorug'likdan qo'rqish", "ensa qotishi"]), diagnosis: "Meningit", redFlag: 1 }
  ];
  const insert = db.prepare("INSERT INTO symptoms (symptoms, diagnosis, redFlag) VALUES (?, ?, ?)");
  seedSymptoms.forEach(s => insert.run(s.symptoms, s.diagnosis, s.redFlag));
}

const settingsCount = db.prepare("SELECT COUNT(*) as count FROM settings").get() as any;
if (settingsCount.count === 0) {
  const seedSettings = [
    { key: "contact_email", value: "info@meduz.uz" },
    { key: "contact_telegram", value: "@meduz_admin" },
    { key: "contact_phone", value: "+998 90 123 45 67" }
  ];
  const insert = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
  seedSettings.forEach(s => insert.run(s.key, s.value));
}

async function startServer() {
  const app = express();
  app.use(express.json());

  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

  // Simple Auth Middleware
  const auth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const password = req.headers["x-admin-password"];
    if (password === ADMIN_PASSWORD) {
      next();
    } else {
      res.status(401).json({ error: "Unauthorized" });
    }
  };

  app.post("/api/login", (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false });
    }
  });

  // API Routes
  app.get("/api/mnemonics", (req, res) => {
    const rows = db.prepare("SELECT * FROM mnemonics").all();
    res.json(rows);
  });

  app.post("/api/mnemonics", auth, (req, res) => {
    const { category, title, mnemonic, explanation } = req.body;
    const info = db.prepare("INSERT INTO mnemonics (category, title, mnemonic, explanation) VALUES (?, ?, ?, ?)").run(category, title, mnemonic, explanation);
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/mnemonics/:id", auth, (req, res) => {
    db.prepare("DELETE FROM mnemonics WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/questions", (req, res) => {
    const rows = db.prepare("SELECT * FROM questions").all();
    const formatted = rows.map((r: any) => ({ ...r, options: JSON.parse(r.options) }));
    res.json(formatted);
  });

  app.post("/api/questions", auth, (req, res) => {
    const { subject, topic, difficulty, question, options, correct, explanation } = req.body;
    const info = db.prepare("INSERT INTO questions (subject, topic, difficulty, question, options, correct, explanation) VALUES (?, ?, ?, ?, ?, ?, ?)").run(subject, topic, difficulty, question, JSON.stringify(options), correct, explanation);
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/questions/:id", auth, (req, res) => {
    db.prepare("DELETE FROM questions WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/symptoms", (req, res) => {
    const rows = db.prepare("SELECT * FROM symptoms").all();
    const formatted = rows.map((r: any) => ({ ...r, symptoms: JSON.parse(r.symptoms), redFlag: !!r.redFlag }));
    res.json(formatted);
  });

  app.post("/api/symptoms", auth, (req, res) => {
    const { symptoms, diagnosis, redFlag } = req.body;
    const info = db.prepare("INSERT INTO symptoms (symptoms, diagnosis, redFlag) VALUES (?, ?, ?)").run(JSON.stringify(symptoms), diagnosis, redFlag ? 1 : 0);
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/symptoms/:id", auth, (req, res) => {
    db.prepare("DELETE FROM symptoms WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Videos
  app.get("/api/videos", (req, res) => {
    const rows = db.prepare("SELECT * FROM videos").all();
    const formatted = rows.map((r: any) => ({ ...r, available: !!r.available }));
    res.json(formatted);
  });

  app.post("/api/videos", auth, (req, res) => {
    const { title, duration, category, videoUrl, available } = req.body;
    const info = db.prepare("INSERT INTO videos (title, duration, category, videoUrl, available) VALUES (?, ?, ?, ?, ?)").run(title, duration, category, videoUrl, available ? 1 : 0);
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/videos/:id", auth, (req, res) => {
    db.prepare("DELETE FROM videos WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Sections
  app.get("/api/sections", (req, res) => {
    const rows = db.prepare("SELECT * FROM sections").all();
    res.json(rows);
  });

  app.post("/api/sections", auth, (req, res) => {
    const { title, content, icon, color } = req.body;
    const info = db.prepare("INSERT INTO sections (title, content, icon, color) VALUES (?, ?, ?, ?)").run(title, content, icon, color);
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/sections/:id", auth, (req, res) => {
    db.prepare("DELETE FROM sections WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Settings
  app.get("/api/settings", (req, res) => {
    const rows = db.prepare("SELECT * FROM settings").all();
    res.json(rows);
  });

  app.post("/api/settings", auth, (req, res) => {
    const { key, value } = req.body;
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
    res.json({ success: true });
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
