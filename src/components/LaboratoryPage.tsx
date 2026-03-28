import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Droplet, 
  Heart, 
  History, 
  AlertTriangle, 
  Info,
  Calculator,
  ChevronRight,
  Save,
  Trash2
} from 'lucide-react';
import { useTranslation } from '../i18n';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

type LabCategory = 'kidney' | 'anemia' | 'liver' | 'cardio' | 'custom' | 'history';

interface CalculationResult {
  id: string;
  timestamp: number;
  category: LabCategory;
  title: string;
  result: string;
  interpretation: string;
  status: 'normal' | 'warning' | 'danger';
  details?: any;
}

export function LaboratoryPage() {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<LabCategory>('kidney');
  const [history, setHistory] = useState<CalculationResult[]>(() => {
    const saved = localStorage.getItem('meduz_lab_history');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('meduz_lab_history', JSON.stringify(history));
  }, [history]);

  const saveResult = (result: Omit<CalculationResult, 'id' | 'timestamp'>) => {
    const newResult: CalculationResult = {
      ...result,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };
    setHistory(prev => [newResult, ...prev]);
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const categories = [
    { id: 'kidney', label: 'Buyrak funksiyasi', icon: Droplet },
    { id: 'anemia', label: 'Anemiya paneli', icon: Activity },
    { id: 'liver', label: 'Jigar funksiyasi', icon: Activity },
    { id: 'cardio', label: 'Yurak-qon tomir xavfi', icon: Heart },
    { id: 'custom', label: 'Maxsus kalkulyator', icon: Calculator },
    { id: 'history', label: 'Tarix', icon: History },
  ] as const;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Calculator className="w-8 h-8 text-primary" />
          Laboratoriya va Klinik Kalkulyatorlar
        </h1>
        <p className="text-foreground/60">
          Klinik hisob-kitoblarni bajaring va bemorning laboratoriya natijalarini vaqt o'tishi bilan kuzatib boring.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeCategory === cat.id 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'bg-card text-foreground/70 hover:bg-secondary hover:text-foreground border border-border/50'
              }`}
            >
              <cat.icon className="w-5 h-5" />
              <span className="font-medium">{cat.label}</span>
              {activeCategory === cat.id && <ChevronRight className="w-4 h-4 ml-auto" />}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="bg-card rounded-2xl shadow-sm border border-border/50 p-6 min-h-[500px]"
            >
              {activeCategory === 'kidney' && <KidneyFunction onSave={saveResult} />}
              {activeCategory === 'anemia' && <AnemiaPanel onSave={saveResult} />}
              {activeCategory === 'liver' && <LiverFunction onSave={saveResult} />}
              {activeCategory === 'cardio' && <CardiovascularRisk onSave={saveResult} />}
              {activeCategory === 'custom' && <CustomCalculator onSave={saveResult} />}
              {activeCategory === 'history' && <HistoryView history={history} onClear={clearHistory} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Disclaimer() {
  return (
    <div className="mt-6 p-4 bg-secondary/50 rounded-xl border border-border/50 flex items-start gap-3">
      <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
      <p className="text-sm text-foreground/70">
        <strong>Ogohlantirish:</strong> Ushbu vosita faqat ta'lim maqsadlarida mo'ljallangan va professional tibbiy xulosani o'rnini bosmasligi kerak. Tashxis va davolanish uchun har doim shifokor bilan maslahatlashing.
      </p>
    </div>
  );
}

function ResultCard({ result, onSave }: { result: Omit<CalculationResult, 'id' | 'timestamp'> | null, onSave: (r: Omit<CalculationResult, 'id' | 'timestamp'>) => void }) {
  if (!result) return null;

  const statusColors = {
    normal: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    danger: 'bg-red-500/10 text-red-600 border-red-500/20',
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`mt-6 p-6 rounded-2xl border ${statusColors[result.status]} relative overflow-hidden`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold mb-1">{result.title}</h3>
          <div className="text-3xl font-bold mb-2">{result.result}</div>
        </div>
        <button 
          onClick={() => onSave(result)}
          className="flex items-center gap-2 px-3 py-1.5 bg-background/50 hover:bg-background/80 rounded-lg text-sm font-medium transition-colors border border-current/10"
        >
          <Save className="w-4 h-4" /> Saqlash
        </button>
      </div>
      <p className="text-sm font-medium opacity-90">{result.interpretation}</p>
    </motion.div>
  );
}

// --- Calculators ---

function KidneyFunction({ onSave }: { onSave: (r: any) => void }) {
  const [calcType, setCalcType] = useState<'ckd-epi' | 'mdrd' | 'cockcroft'>('ckd-epi');
  const [creatinine, setCreatinine] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [weight, setWeight] = useState('');
  const [result, setResult] = useState<any>(null);

  const calculate = () => {
    const cr = parseFloat(creatinine);
    const a = parseFloat(age);
    const w = parseFloat(weight);

    if (isNaN(cr) || isNaN(a)) return;

    let resValue = 0;
    let title = '';

    if (calcType === 'ckd-epi') {
      // CKD-EPI 2021 (simplified, without race)
      const k = sex === 'female' ? 0.7 : 0.9;
      const alpha = sex === 'female' ? -0.241 : -0.302;
      const min = Math.min(cr / k, 1);
      const max = Math.max(cr / k, 1);
      resValue = 142 * Math.pow(min, alpha) * Math.pow(max, -1.200) * Math.pow(0.9938, a) * (sex === 'female' ? 1.012 : 1);
      title = 'eGFR (CKD-EPI 2021)';
    } else if (calcType === 'mdrd') {
      // MDRD
      resValue = 175 * Math.pow(cr, -1.154) * Math.pow(a, -0.203) * (sex === 'female' ? 0.742 : 1);
      title = 'eGFR (MDRD)';
    } else if (calcType === 'cockcroft') {
      if (isNaN(w)) return;
      resValue = ((140 - a) * w) / (72 * cr) * (sex === 'female' ? 0.85 : 1);
      title = 'Creatinine Clearance (Cockcroft-Gault)';
    }

    let status: 'normal' | 'warning' | 'danger' = 'normal';
    let interpretation = '';

    if (resValue >= 90) {
      status = 'normal';
      interpretation = 'Normal yoki yuqori buyrak funksiyasi (G1).';
    } else if (resValue >= 60) {
      status = 'warning';
      interpretation = 'Yengil pasaygan buyrak funksiyasi (G2).';
    } else if (resValue >= 45) {
      status = 'warning';
      interpretation = 'Yengil va o\'rtacha pasaygan buyrak funksiyasi (G3a).';
    } else if (resValue >= 30) {
      status = 'danger';
      interpretation = 'O\'rtacha va og\'ir pasaygan buyrak funksiyasi (G3b).';
    } else if (resValue >= 15) {
      status = 'danger';
      interpretation = 'Og\'ir pasaygan buyrak funksiyasi (G4).';
    } else {
      status = 'danger';
      interpretation = 'Buyrak yetishmovchiligi (G5).';
    }

    setResult({
      category: 'kidney',
      title,
      result: `${resValue.toFixed(1)} mL/min/1.73m²`,
      interpretation,
      status
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Buyrak funksiyasi</h2>
      
      <div className="flex gap-2 mb-6 bg-secondary p-1 rounded-xl">
        {(['ckd-epi', 'mdrd', 'cockcroft'] as const).map(type => (
          <button
            key={type}
            onClick={() => { setCalcType(type); setResult(null); }}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              calcType === type ? 'bg-card text-foreground shadow-sm' : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            {type === 'ckd-epi' ? 'CKD-EPI' : type === 'mdrd' ? 'MDRD' : 'Cockcroft-Gault'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Qon zardobidagi kreatinin (mg/dL)</label>
          <input type="number" value={creatinine} onChange={e => setCreatinine(e.target.value)} className="w-full p-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none" placeholder="e.g. 1.2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Yosh (yil)</label>
          <input type="number" value={age} onChange={e => setAge(e.target.value)} className="w-full p-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none" placeholder="e.g. 45" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Jins</label>
          <select value={sex} onChange={e => setSex(e.target.value as any)} className="w-full p-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none">
            <option value="male">Erkak</option>
            <option value="female">Ayol</option>
          </select>
        </div>
        {calcType === 'cockcroft' && (
          <div>
            <label className="block text-sm font-medium mb-1">Vazn (kg)</label>
            <input type="number" value={weight} onChange={e => setWeight(e.target.value)} className="w-full p-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none" placeholder="e.g. 70" />
          </div>
        )}
      </div>

      <button onClick={calculate} className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors">
        Calculate
      </button>

      <ResultCard result={result} onSave={onSave} />
      <Disclaimer />
    </div>
  );
}

function AnemiaPanel({ onSave }: { onSave: (r: any) => void }) {
  const [calcType, setCalcType] = useState<'rbc' | 'iron' | 'ganzoni'>('rbc');
  const [hb, setHb] = useState('');
  const [hct, setHct] = useState('');
  const [rbc, setRbc] = useState('');
  const [ferritin, setFerritin] = useState('');
  const [tsat, setTsat] = useState('');
  const [weight, setWeight] = useState('');
  const [targetHb, setTargetHb] = useState('15');
  const [result, setResult] = useState<any>(null);

  const calculate = () => {
    const h = parseFloat(hb);
    const hc = parseFloat(hct);
    const r = parseFloat(rbc);
    const f = parseFloat(ferritin);
    const t = parseFloat(tsat);
    const w = parseFloat(weight);
    const th = parseFloat(targetHb);

    if (calcType === 'rbc') {
      if (isNaN(h) || isNaN(hc) || isNaN(r)) return;
      const mcv = (hc * 10) / r;
      const mch = (h * 10) / r;
      const mchc = (h * 100) / hc;

      let status: 'normal' | 'warning' | 'danger' = 'normal';
      let interpretation = 'Normotsitar normoxrom.';

      if (mcv < 80) {
        status = 'warning';
        interpretation = 'Mikrotsitar (temir tanqisligi, talassemiyani ko\'rib chiqing).';
      } else if (mcv > 100) {
        status = 'warning';
        interpretation = 'Makrotsitar (B12/folat tanqisligi, jigar kasalligini ko\'rib chiqing).';
      }

      setResult({
        category: 'anemia',
        title: 'RBC Indices',
        result: `MCV: ${mcv.toFixed(1)} fL, MCH: ${mch.toFixed(1)} pg, MCHC: ${mchc.toFixed(1)} g/dL`,
        interpretation,
        status
      });
    } else if (calcType === 'iron') {
      if (isNaN(f) || isNaN(t)) return;
      let status: 'normal' | 'warning' | 'danger' = 'normal';
      let interpretation = 'Normal temir zaxiralari.';

      if (f < 30 || t < 20) {
        status = 'danger';
        interpretation = 'Mutlaq temir tanqisligi.';
      } else if (f >= 30 && f <= 100 && t < 20) {
        status = 'warning';
        interpretation = 'Ehtimoliy funksional temir tanqisligi.';
      }

      setResult({
        category: 'anemia',
        title: 'Iron Studies',
        result: `Ferritin: ${f} ng/mL, TSAT: ${t}%`,
        interpretation,
        status
      });
    } else if (calcType === 'ganzoni') {
      if (isNaN(w) || isNaN(h) || isNaN(th)) return;
      // Ganzoni equation: Total Iron Deficit (mg) = Weight (kg) × (Target Hb - Actual Hb) (g/dL) × 2.4 + 500
      const deficit = w * (th - h) * 2.4 + 500;
      
      setResult({
        category: 'anemia',
        title: 'Umumiy temir tanqisligi (Ganzoni)',
        result: `${Math.round(deficit)} mg`,
        interpretation: 'Depo temirini (500mg) o\'z ichiga olgan umumiy temir tanqisligi.',
        status: deficit > 500 ? 'warning' : 'normal'
      });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Anemiya paneli</h2>
      
      <div className="flex gap-2 mb-6 bg-secondary p-1 rounded-xl">
        {(['rbc', 'iron', 'ganzoni'] as const).map(type => (
          <button
            key={type}
            onClick={() => { setCalcType(type); setResult(null); }}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              calcType === type ? 'bg-card text-foreground shadow-sm' : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            {type === 'rbc' ? 'RBC Indekslari' : type === 'iron' ? 'Temir ko\'rsatkichlari' : 'Ganzoni tenglamasi'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {calcType === 'rbc' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Gemoglobin (g/dL)</label>
              <input type="number" value={hb} onChange={e => setHb(e.target.value)} className="w-full p-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Gematokrit (%)</label>
              <input type="number" value={hct} onChange={e => setHct(e.target.value)} className="w-full p-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Eritrotsitlar (x10^6/µL)</label>
              <input type="number" value={rbc} onChange={e => setRbc(e.target.value)} className="w-full p-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none" />
            </div>
          </>
        )}

        {calcType === 'iron' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Ferritin (ng/mL)</label>
              <input type="number" value={ferritin} onChange={e => setFerritin(e.target.value)} className="w-full p-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">TSAT (%)</label>
              <input type="number" value={tsat} onChange={e => setTsat(e.target.value)} className="w-full p-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none" />
            </div>
          </>
        )}

        {calcType === 'ganzoni' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Vazn (kg)</label>
              <input type="number" value={weight} onChange={e => setWeight(e.target.value)} className="w-full p-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Haqiqiy Hb (g/dL)</label>
              <input type="number" value={hb} onChange={e => setHb(e.target.value)} className="w-full p-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Maqsadli Hb (g/dL)</label>
              <input type="number" value={targetHb} onChange={e => setTargetHb(e.target.value)} className="w-full p-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none" />
            </div>
          </>
        )}
      </div>

      <button onClick={calculate} className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors">
        Calculate
      </button>

      <ResultCard result={result} onSave={onSave} />
      <Disclaimer />
    </div>
  );
}

function LiverFunction({ onSave }: { onSave: (r: any) => void }) {
  const [calcType, setCalcType] = useState<'meld' | 'child-pugh' | 'fib4'>('meld');
  const [bilirubin, setBilirubin] = useState('');
  const [inr, setInr] = useState('');
  const [creatinine, setCreatinine] = useState('');
  const [albumin, setAlbumin] = useState('');
  const [ascites, setAscites] = useState('1');
  const [enceph, setEnceph] = useState('1');
  const [age, setAge] = useState('');
  const [ast, setAst] = useState('');
  const [alt, setAlt] = useState('');
  const [platelets, setPlatelets] = useState('');
  const [result, setResult] = useState<any>(null);

  const calculate = () => {
    const bil = parseFloat(bilirubin);
    const i = parseFloat(inr);
    const cr = parseFloat(creatinine);
    const alb = parseFloat(albumin);
    const a = parseFloat(age);
    const as = parseFloat(ast);
    const al = parseFloat(alt);
    const pl = parseFloat(platelets);

    if (calcType === 'meld') {
      if (isNaN(bil) || isNaN(i) || isNaN(cr)) return;
      
      // MELD = 3.78×ln[serum bilirubin (mg/dL)] + 11.2×ln[INR] + 9.57×ln[serum creatinine (mg/dL)] + 6.43
      const meld = 3.78 * Math.log(Math.max(1, bil)) + 11.2 * Math.log(Math.max(1, i)) + 9.57 * Math.log(Math.max(1, cr)) + 6.43;
      const roundedMeld = Math.round(meld);

      let status: 'normal' | 'warning' | 'danger' = 'normal';
      let interpretation = '';

      if (roundedMeld <= 9) {
        status = 'normal';
        interpretation = '3 oylik o\'lim xavfi 1.9%.';
      } else if (roundedMeld <= 19) {
        status = 'warning';
        interpretation = '3 oylik o\'lim xavfi 6.0%.';
      } else if (roundedMeld <= 29) {
        status = 'danger';
        interpretation = '3 oylik o\'lim xavfi 19.6%.';
      } else {
        status = 'danger';
        interpretation = '3 oylik o\'lim xavfi 52.6%.';
      }

      setResult({
        category: 'liver',
        title: 'MELD Score',
        result: roundedMeld.toString(),
        interpretation,
        status
      });
    } else if (calcType === 'child-pugh') {
      if (isNaN(bil) || isNaN(i) || isNaN(alb)) return;

      let points = 0;
      
      // Bilirubin
      if (bil < 2) points += 1;
      else if (bil <= 3) points += 2;
      else points += 3;

      // Albumin
      if (alb > 3.5) points += 1;
      else if (alb >= 2.8) points += 2;
      else points += 3;

      // INR
      if (i < 1.7) points += 1;
      else if (i <= 2.2) points += 2;
      else points += 3;

      points += parseInt(ascites);
      points += parseInt(enceph);

      let status: 'normal' | 'warning' | 'danger' = 'normal';
      let interpretation = '';

      if (points <= 6) {
        status = 'normal';
        interpretation = 'A sinfi (Yaxshi kompensatsiyalangan kasallik). 1 yillik yashovchanlik 100%.';
      } else if (points <= 9) {
        status = 'warning';
        interpretation = 'B sinfi (Sezilarli funksional buzilish). 1 yillik yashovchanlik 80%.';
      } else {
        status = 'danger';
        interpretation = 'C sinfi (Dekompenatsiyalangan kasallik). 1 yillik yashovchanlik 45%.';
      }

      setResult({
        category: 'liver',
        title: 'Child-Pugh Score',
        result: `${points} Points`,
        interpretation,
        status
      });
    } else if (calcType === 'fib4') {
      if (isNaN(a) || isNaN(as) || isNaN(al) || isNaN(pl)) return;
      
      // FIB-4 = (Age × AST) / (Platelets × √ALT)
      const fib4 = (a * as) / (pl * Math.sqrt(al));
      
      let status: 'normal' | 'warning' | 'danger' = 'normal';
      let interpretation = '';

      if (fib4 < 1.45) {
        status = 'normal';
        interpretation = 'Rivojlangan fibroz xavfi past.';
      } else if (fib4 <= 3.25) {
        status = 'warning';
        interpretation = 'Rivojlangan fibroz xavfi noaniq.';
      } else {
        status = 'danger';
        interpretation = 'Rivojlangan fibroz xavfi yuqori.';
      }

      setResult({
        category: 'liver',
        title: 'FIB-4 Score',
        result: fib4.toFixed(2),
        interpretation,
        status
      });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Jigar funksiyasi</h2>
      
      <div className="flex gap-2 mb-6 bg-secondary p-1 rounded-xl">
        {(['meld', 'child-pugh', 'fib4'] as const).map(type => (
          <button
            key={type}
            onClick={() => { setCalcType(type); setResult(null); }}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              calcType === type ? 'bg-card text-foreground shadow-sm' : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            {type === 'meld' ? 'MELD shkalasi' : type === 'child-pugh' ? 'Child-Pugh shkalasi' : 'FIB-4 shkalasi'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(calcType === 'meld' || calcType === 'child-pugh') && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Bilirubin (mg/dL)</label>
              <input type="number" value={bilirubin} onChange={e => setBilirubin(e.target.value)} className="w-full p-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">INR</label>
              <input type="number" value={inr} onChange={e => setInr(e.target.value)} className="w-full p-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none" />
            </div>
          </>
        )}
        
        {calcType === 'meld' && (
          <div>
            <label className="block text-sm font-medium mb-1">Kreatinin (mg/dL)</label>
            <input type="number" value={creatinine} onChange={e => setCreatinine(e.target.value)} className="w-full p-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none" />
          </div>
        )}

        {calcType === 'child-pugh' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Albumin (g/dL)</label>
              <input type="number" value={albumin} onChange={e => setAlbumin(e.target.value)} className="w-full p-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Assit</label>
              <select value={ascites} onChange={e => setAscites(e.target.value)} className="w-full p-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none">
                <option value="1">Yo'q</option>
                <option value="2">Yengil</option>
                <option value="3">O'rtacha/Og'ir</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ensefalopatiya</label>
              <select value={enceph} onChange={e => setEnceph(e.target.value)} className="w-full p-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none">
                <option value="1">Yo'q</option>
                <option value="2">I-II daraja</option>
                <option value="3">III-IV daraja</option>
              </select>
            </div>
          </>
        )}

        {calcType === 'fib4' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Yosh (yil)</label>
              <input type="number" value={age} onChange={e => setAge(e.target.value)} className="w-full p-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">AST (U/L)</label>
              <input type="number" value={ast} onChange={e => setAst(e.target.value)} className="w-full p-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ALT (U/L)</label>
              <input type="number" value={alt} onChange={e => setAlt(e.target.value)} className="w-full p-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Trombotsitlar (10^9/L)</label>
              <input type="number" value={platelets} onChange={e => setPlatelets(e.target.value)} className="w-full p-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none" />
            </div>
          </>
        )}
      </div>

      <button onClick={calculate} className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors">
        Calculate
      </button>

      <ResultCard result={result} onSave={onSave} />
      <Disclaimer />
    </div>
  );
}

function CardiovascularRisk({ onSave }: { onSave: (r: any) => void }) {
  const [calcType, setCalcType] = useState<'ascvd' | 'framingham'>('ascvd');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [tc, setTc] = useState('');
  const [hdl, setHdl] = useState('');
  const [sbp, setSbp] = useState('');
  const [smoker, setSmoker] = useState('no');
  const [diabetes, setDiabetes] = useState('no');
  const [result, setResult] = useState<any>(null);

  const calculate = () => {
    const a = parseFloat(age);
    const t = parseFloat(tc);
    const h = parseFloat(hdl);
    const s = parseFloat(sbp);

    if (isNaN(a) || isNaN(t) || isNaN(h) || isNaN(s)) return;

    if (calcType === 'ascvd') {
      // Simplified ASCVD estimation for demonstration
      let riskPoints = 0;
      
      if (a > 40) riskPoints += (a - 40) * 0.5;
      if (t > 200) riskPoints += (t - 200) * 0.05;
      if (h < 40) riskPoints += (40 - h) * 0.2;
      if (s > 120) riskPoints += (s - 120) * 0.1;
      if (smoker === 'yes') riskPoints += 5;
      if (diabetes === 'yes') riskPoints += 7;
      if (sex === 'male') riskPoints += 2;

      const riskPercent = Math.min(Math.max(riskPoints, 1), 30); // Cap at 30%

      let status: 'normal' | 'warning' | 'danger' = 'normal';
      let interpretation = '';

      if (riskPercent < 5) {
        status = 'normal';
        interpretation = 'Yurak-qon tomir kasalliklarining 10 yillik xavfi past.';
      } else if (riskPercent < 7.5) {
        status = 'warning';
        interpretation = 'Chegaradagi 10 yillik xavf. Turmush tarzini o\'zgartirishni ko\'rib chiqing.';
      } else if (riskPercent < 20) {
        status = 'danger';
        interpretation = 'O\'rtacha 10 yillik xavf. Statin terapiyasi ko\'rsatilishi mumkin.';
      } else {
        status = 'danger';
        interpretation = 'Yuqori 10 yillik xavf. Statin terapiyasi qat\'iy tavsiya etiladi.';
      }

      setResult({
        category: 'cardio',
        title: 'Taxminiy 10 yillik ASCVD xavfi',
        result: `${riskPercent.toFixed(1)}%`,
        interpretation,
        status
      });
    } else {
      // Simplified Framingham Risk Score
      let points = 0;
      
      if (sex === 'male') {
        if (a >= 35 && a <= 39) points += 3;
        else if (a >= 40 && a <= 44) points += 5;
        else if (a >= 45 && a <= 49) points += 7;
        else if (a >= 50 && a <= 54) points += 8;
        else if (a >= 55 && a <= 59) points += 10;
        else if (a >= 60 && a <= 64) points += 11;
        else if (a >= 65 && a <= 69) points += 12;
        else if (a >= 70 && a <= 74) points += 14;
        else if (a >= 75) points += 15;

        if (t >= 160 && t <= 199) points += 1;
        else if (t >= 200 && t <= 239) points += 3;
        else if (t >= 240 && t <= 279) points += 4;
        else if (t >= 280) points += 5;

        if (h < 40) points += 2;
        else if (h >= 60) points -= 1;

        if (s >= 120 && s <= 129) points += 1;
        else if (s >= 130 && s <= 139) points += 2;
        else if (s >= 140 && s <= 159) points += 3;
        else if (s >= 160) points += 4;

        if (smoker === 'yes') points += 4;
      } else {
        if (a >= 35 && a <= 39) points += 3;
        else if (a >= 40 && a <= 44) points += 5;
        else if (a >= 45 && a <= 49) points += 7;
        else if (a >= 50 && a <= 54) points += 8;
        else if (a >= 55 && a <= 59) points += 10;
        else if (a >= 60 && a <= 64) points += 11;
        else if (a >= 65 && a <= 69) points += 12;
        else if (a >= 70 && a <= 74) points += 14;
        else if (a >= 75) points += 15;

        if (t >= 160 && t <= 199) points += 1;
        else if (t >= 200 && t <= 239) points += 3;
        else if (t >= 240 && t <= 279) points += 4;
        else if (t >= 280) points += 5;

        if (h < 40) points += 2;
        else if (h >= 60) points -= 1;

        if (s >= 120 && s <= 129) points += 1;
        else if (s >= 130 && s <= 139) points += 2;
        else if (s >= 140 && s <= 159) points += 3;
        else if (s >= 160) points += 4;

        if (smoker === 'yes') points += 3;
      }

      const riskPercent = Math.min(Math.max(points * 1.2, 1), 30); // Simplified mapping

      let status: 'normal' | 'warning' | 'danger' = 'normal';
      let interpretation = '';

      if (riskPercent < 10) {
        status = 'normal';
        interpretation = 'Yurak-qon tomir kasalliklarining 10 yillik xavfi past.';
      } else if (riskPercent <= 20) {
        status = 'warning';
        interpretation = 'O\'rtacha 10 yillik xavf.';
      } else {
        status = 'danger';
        interpretation = 'Yuqori 10 yillik xavf.';
      }

      setResult({
        category: 'cardio',
        title: 'Framingham xavf shkalasi',
        result: `${riskPercent.toFixed(1)}%`,
        interpretation,
        status
      });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Yurak-qon tomir xavfi</h2>
      
      <div className="flex gap-2 mb-6 bg-secondary p-1 rounded-xl">
        {(['ascvd', 'framingham'] as const).map(type => (
          <button
            key={type}
            onClick={() => { setCalcType(type); setResult(null); }}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              calcType === type ? 'bg-card text-foreground shadow-sm' : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            {type === 'ascvd' ? 'ASCVD xavfini baholash' : 'Framingham xavf shkalasi'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Yosh (yil)</label>
          <input type="number" value={age} onChange={e => setAge(e.target.value)} className="w-full p-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Jins</label>
          <select value={sex} onChange={e => setSex(e.target.value as any)} className="w-full p-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none">
            <option value="male">Erkak</option>
            <option value="female">Ayol</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Umumiy xolesterin (mg/dL)</label>
          <input type="number" value={tc} onChange={e => setTc(e.target.value)} className="w-full p-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">HDL xolesterin (mg/dL)</label>
          <input type="number" value={hdl} onChange={e => setHdl(e.target.value)} className="w-full p-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Sistolik qon bosimi (mmHg)</label>
          <input type="number" value={sbp} onChange={e => setSbp(e.target.value)} className="w-full p-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Chekuvchi</label>
          <select value={smoker} onChange={e => setSmoker(e.target.value)} className="w-full p-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none">
            <option value="no">Yo'q</option>
            <option value="yes">Ha</option>
          </select>
        </div>
        {calcType === 'ascvd' && (
          <div>
            <label className="block text-sm font-medium mb-1">Qandli diabet</label>
            <select value={diabetes} onChange={e => setDiabetes(e.target.value)} className="w-full p-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none">
              <option value="no">Yo'q</option>
              <option value="yes">Ha</option>
            </select>
          </div>
        )}
      </div>

      <button onClick={calculate} className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors">
        Calculate
      </button>

      <ResultCard result={result} onSave={onSave} />
      <Disclaimer />
    </div>
  );
}

function CustomCalculator({ onSave }: { onSave: (r: any) => void }) {
  const [calcType, setCalcType] = useState<'bmi' | 'bsa' | 'calcium'>('bmi');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [calcium, setCalcium] = useState('');
  const [albumin, setAlbumin] = useState('');
  const [result, setResult] = useState<any>(null);

  const calculate = () => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    const ca = parseFloat(calcium);
    const alb = parseFloat(albumin);

    if (calcType === 'bmi') {
      if (isNaN(h) || isNaN(w)) return;
      const heightInMeters = h / 100;
      const bmi = w / (heightInMeters * heightInMeters);
      
      let status: 'normal' | 'warning' | 'danger' = 'normal';
      let interpretation = '';

      if (bmi < 18.5) {
        status = 'warning';
        interpretation = 'Vazn yetishmovchiligi';
      } else if (bmi < 25) {
        status = 'normal';
        interpretation = 'Normal vazn';
      } else if (bmi < 30) {
        status = 'warning';
        interpretation = 'Ortiqcha vazn';
      } else {
        status = 'danger';
        interpretation = 'Semizlik';
      }

      setResult({
        category: 'custom',
        title: 'Tana vazni indeksi (TVI)',
        result: `${bmi.toFixed(1)} kg/m²`,
        interpretation,
        status
      });
    } else if (calcType === 'bsa') {
      if (isNaN(h) || isNaN(w)) return;
      // Mosteller formula
      const bsa = Math.sqrt((h * w) / 3600);
      
      setResult({
        category: 'custom',
        title: 'Tana yuzasi maydoni (BSA)',
        result: `${bsa.toFixed(2)} m²`,
        interpretation: 'Mosteller formulasi yordamida hisoblangan.',
        status: 'normal'
      });
    } else if (calcType === 'calcium') {
      if (isNaN(ca) || isNaN(alb)) return;
      // Corrected Calcium = Measured Total Ca + 0.8 * (4.0 - Serum Albumin)
      const correctedCa = ca + 0.8 * (4.0 - alb);
      
      let status: 'normal' | 'warning' | 'danger' = 'normal';
      let interpretation = '';

      if (correctedCa < 8.5) {
        status = 'warning';
        interpretation = 'Gipokalsemiya';
      } else if (correctedCa > 10.5) {
        status = 'danger';
        interpretation = 'Giperkalsemiya';
      } else {
        status = 'normal';
        interpretation = 'Normal kalsiy darajasi';
      }

      setResult({
        category: 'custom',
        title: 'To\'g\'rilangan kalsiy',
        result: `${correctedCa.toFixed(2)} mg/dL`,
        interpretation,
        status
      });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Maxsus kalkulyator</h2>
      
      <div className="flex gap-2 mb-6 bg-secondary p-1 rounded-xl">
        {(['bmi', 'bsa', 'calcium'] as const).map(type => (
          <button
            key={type}
            onClick={() => { setCalcType(type); setResult(null); }}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              calcType === type ? 'bg-card text-foreground shadow-sm' : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            {type === 'bmi' ? 'TVI' : type === 'bsa' ? 'BSA' : 'To\'g\'rilangan kalsiy'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(calcType === 'bmi' || calcType === 'bsa') && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Bo'y (sm)</label>
              <input type="number" value={height} onChange={e => setHeight(e.target.value)} className="w-full p-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none" placeholder="e.g. 175" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Vazn (kg)</label>
              <input type="number" value={weight} onChange={e => setWeight(e.target.value)} className="w-full p-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none" placeholder="e.g. 70" />
            </div>
          </>
        )}
        
        {calcType === 'calcium' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Qon zardobidagi kalsiy (mg/dL)</label>
              <input type="number" value={calcium} onChange={e => setCalcium(e.target.value)} className="w-full p-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none" placeholder="e.g. 8.2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Qon zardobidagi albumin (g/dL)</label>
              <input type="number" value={albumin} onChange={e => setAlbumin(e.target.value)} className="w-full p-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 outline-none" placeholder="e.g. 3.2" />
            </div>
          </>
        )}
      </div>

      <button onClick={calculate} className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors">
        Hisoblash
      </button>

      <ResultCard result={result} onSave={onSave} />
      <Disclaimer />
    </div>
  );
}

function HistoryView({ history, onClear }: { history: CalculationResult[], onClear: () => void }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const kidneyHistory = history.filter(h => h.category === 'kidney' && h.title.includes('eGFR'));
  
  const chartData = kidneyHistory.reverse().map(h => ({
    date: new Date(h.timestamp).toLocaleDateString(),
    eGFR: parseFloat(h.result)
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Hisoblash tarixi</h2>
        {history.length > 0 && (
          showConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground/70">Ishonchingiz komilmi?</span>
              <button onClick={() => { onClear(); setShowConfirm(false); }} className="text-red-500 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium">Ha</button>
              <button onClick={() => setShowConfirm(false)} className="text-foreground/70 hover:bg-secondary px-3 py-1.5 rounded-lg transition-colors text-sm font-medium">Yo'q</button>
            </div>
          ) : (
            <button onClick={() => setShowConfirm(true)} className="flex items-center gap-2 text-red-500 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium">
              <Trash2 className="w-4 h-4" /> Barchasini o'chirish
            </button>
          )
        )}
      </div>

      {chartData.length > 1 && (
        <div className="bg-secondary/30 p-4 rounded-2xl border border-border/50 mb-6">
          <h3 className="text-sm font-semibold mb-4 text-foreground/70">eGFR dinamikasi</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--foreground)" opacity={0.5} fontSize={12} />
                <YAxis stroke="var(--foreground)" opacity={0.5} fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--foreground)' }}
                />
                <Line type="monotone" dataKey="eGFR" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--primary)' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {history.length === 0 ? (
        <div className="text-center py-12 text-foreground/50">
          <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Hali hech qanday hisob-kitob saqlanmagan.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map(item => (
            <div key={item.id} className="p-4 rounded-xl border border-border/50 bg-background flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-foreground/70 uppercase tracking-wider">
                    {item.category}
                  </span>
                  <span className="text-xs text-foreground/50">
                    {new Date(item.timestamp).toLocaleString()}
                  </span>
                </div>
                <h4 className="font-medium">{item.title}</h4>
                <p className="text-sm text-foreground/70">{item.interpretation}</p>
              </div>
              <div className="text-right">
                <div className={`text-xl font-bold ${
                  item.status === 'normal' ? 'text-emerald-500' : 
                  item.status === 'warning' ? 'text-amber-500' : 'text-red-500'
                }`}>
                  {item.result}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
