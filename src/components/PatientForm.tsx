import React, { useState } from 'react';
import { Patient } from '../data';

interface PatientFormProps {
  onAdd: (patient: Patient) => void;
}

export const PatientForm: React.FC<PatientFormProps> = ({ onAdd }) => {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [condition, setCondition] = useState('Barqaror');
  const [healthScore, setHealthScore] = useState('');
  const [medications, setMedications] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      name,
      age: parseInt(age),
      symptoms,
      condition,
      healthScore: parseInt(healthScore),
      medications
    });
    setName('');
    setAge('');
    setSymptoms('');
    setCondition('Barqaror');
    setHealthScore('');
    setMedications('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="text" placeholder="Ism" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" required />
      <input type="number" placeholder="Yosh" value={age} onChange={(e) => setAge(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" required />
      <input type="text" placeholder="Simptomlar" value={symptoms} onChange={(e) => setSymptoms(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" required />
      <select value={condition} onChange={(e) => setCondition(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary">
        <option value="Barqaror">Barqaror</option>
        <option value="Og'ir">Og'ir</option>
        <option value="Kritik">Kritik</option>
      </select>
      <input type="number" placeholder="Sog'liq ko'rsatkichi (0-100)" value={healthScore} onChange={(e) => setHealthScore(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" required />
      <input type="text" placeholder="Dorilar" value={medications} onChange={(e) => setMedications(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" required />
      <button type="submit" className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all">Qo'shish</button>
    </form>
  );
};
