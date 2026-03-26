/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PatientForm } from './components/PatientForm';
import * as Icons from 'lucide-react';
import { 
  Heart, 
  Brain, 
  Stethoscope, 
  BookOpen, 
  Video, 
  Search, 
  Copy, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  Menu, 
  X,
  PlayCircle,
  Clock,
  RefreshCw,
  Info,
  Settings,
  Plus,
  Trash2,
  Lock,
  LogOut,
  Edit2,
  Sparkles,
  Loader2,
  Eye,
  MessageSquare,
  Send,
  Camera,
  Image as ImageIcon,
  Film,
  Search as SearchIcon,
  Paperclip,
  Zap,
  Upload,
  Scissors,
  Baby,
  Moon,
  Sun,
  GraduationCap,
  FileText,
  Pill,
  Download,
  ArrowLeft,
  ArrowRight,
  Play,
  ExternalLink,
  Globe,
  Link as LinkIcon,
  Activity,
  Users,
  CheckSquare,
  Microscope
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { GoogleGenAI, ThinkingLevel, GenerateContentResponse } from "@google/genai";
import { Mnemonic, Question, SymptomData, VideoData, Section, Setting, Patient, OSCEScenario, Subject, Topic, NewsItem, JournalItem, initialFanlar, initialSettings, initialNews, initialJournals } from './data';
import { explainMedicalTopic } from './services/aiService';
import { quizData } from './quizData';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

const getYouTubeEmbedUrl = (url: string) => {
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : url;
};

type Page = 'home' | 'mnemonics' | 'videos' | 'symptoms' | 'quiz' | 'admin' | 'ai' | 'library' | 'patients' | 'osce' | 'tutor' | 'pharma' | 'fanlar' | 'news' | 'journals' | 'profile';

export function Modal({ isOpen, title, content, onClose, onConfirm, confirmText = "Tasdiqlash", cancelText = "Bekor qilish" }: { isOpen: boolean, title: string, content: string, onClose: () => void, onConfirm?: () => void, confirmText?: string, cancelText?: string }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card w-full max-w-md rounded-3xl shadow-md border border-border overflow-hidden"
      >
        <div className="p-6">
          <h3 className="text-xl font-medium text-foreground mb-2">{title}</h3>
          <p className="text-foreground/70">{content}</p>
        </div>
        <div className="p-4 bg-secondary/50 border-t border-border flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-medium text-sm text-foreground/70 hover:bg-secondary transition-all">
            {onConfirm ? cancelText : 'Yopish'}
          </button>
          {onConfirm && (
            <button onClick={() => { onConfirm(); onClose(); }} className="px-5 py-2.5 rounded-xl font-medium text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
              {confirmText}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

import { ProfilePage } from './components/ProfilePage';
import { useTranslation, Language } from './i18n';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('meduz_dark_mode') === 'true');
  const [themeColor, setThemeColor] = useState(() => localStorage.getItem('meduz_theme') || '#2563eb');
  const [user, setUser] = useState<any>(null);
  
  const { t, language, setLanguage } = useTranslation();

  const updateProgress = async (field: 'quizScore' | 'videosWatched' | 'mnemonicsRead' | 'symptomsChecked', value: number | ((prev: number) => number)) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const currentProgress = userDoc.data().progress || { quizScore: 0, videosWatched: 0, mnemonicsRead: 0, symptomsChecked: 0 };
        const newValue = typeof value === 'function' ? value(currentProgress[field] || 0) : value;
        await updateDoc(userRef, {
          [`progress.${field}`]: newValue
        });
      }
    } catch (error) {
      console.error("Error updating progress:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Initialize user progress document if it doesn't exist
        const userRef = doc(db, 'users', currentUser.uid);
        getDoc(userRef).then((docSnap) => {
          if (!docSnap.exists()) {
            setDoc(userRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              role: 'user',
              progress: {
                quizScore: 0,
                videosWatched: 0,
                mnemonicsRead: 0,
                symptomsChecked: 0
              }
            });
          }
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Google login error:', error);
      alert("Tizimga kirishda xatolik yuz berdi.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('meduz_dark_mode', isDarkMode.toString());
  }, [isDarkMode]);

  useEffect(() => {
    document.documentElement.style.setProperty('--primary', themeColor);
    localStorage.setItem('meduz_theme', themeColor);
  }, [themeColor]);
  
  const [mnemonicsData, setMnemonicsData] = useState<Mnemonic[]>([]);
  const [questionsData, setQuestionsData] = useState<Question[]>([]);
  const [symptomsData, setSymptomsData] = useState<SymptomData[]>([]);
  const [videosData, setVideosData] = useState<VideoData[]>([]);
  const [patientsData, setPatientsData] = useState<Patient[]>([]);
  const [osceScenarios, setOsceScenarios] = useState<OSCEScenario[]>([]);
  const [sectionsData, setSectionsData] = useState<Section[]>([]);
  const [settingsData, setSettingsData] = useState<Setting[]>([]);
  const [libraryData, setLibraryData] = useState<any>(() => {
    const saved = localStorage.getItem('meduz_library');
    return saved ? JSON.parse(saved) : initialMedicalData;
  });

  const [fanlarData, setFanlarData] = useState<Subject[]>(initialFanlar);

  const [appSettings, setAppSettings] = useState(() => {
    const saved = localStorage.getItem('meduz_app_settings');
    return saved ? JSON.parse(saved) : initialSettings;
  });

  const [newsData, setNewsData] = useState<NewsItem[]>(() => {
    const saved = localStorage.getItem('meduz_news');
    return saved ? JSON.parse(saved) : initialNews;
  });

  const [journalsData, setJournalsData] = useState<JournalItem[]>(() => {
    const saved = localStorage.getItem('meduz_journals');
    return saved ? JSON.parse(saved) : initialJournals;
  });

  useEffect(() => {
    localStorage.setItem('meduz_news', JSON.stringify(newsData));
  }, [newsData]);

  useEffect(() => {
    localStorage.setItem('meduz_journals', JSON.stringify(journalsData));
  }, [journalsData]);

  useEffect(() => {
    const saveFanlar = async () => {
      if (user && (user.email === 'muhammadboburolimjonov2@gmail.com' || user.email === 'olimjonovmuhammadbobur0@gmail.com')) {
        try {
          await setDoc(doc(db, 'fanlar', 'main'), { data: fanlarData });
        } catch (error) {
          console.error('Error saving fanlar to Firestore:', error);
        }
      }
    };
    saveFanlar();
  }, [fanlarData, user]);

  useEffect(() => {
    localStorage.setItem('meduz_app_settings', JSON.stringify(appSettings));
  }, [appSettings]);

  useEffect(() => {
    const autoRestore = async () => {
      const hardcodedAdmins = ["muhammadboburolimjonov2@gmail.com", "olimjonovmuhammadbobur0@gmail.com"];
      if (user && hardcodedAdmins.includes(user.email || '') && questionsData.length === 0) {
        console.log('Auto-restoring tests for admin...');
        try {
          let updatedFanlar = [...fanlarData];
          for (const subject of quizData.subjects) {
            let existingSubject = updatedFanlar.find(f => f.title === subject.name);
            if (!existingSubject) {
              existingSubject = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                title: subject.name,
                description: subject.name + ' fanidan testlar',
                icon: subject.icon || 'BookOpen',
                topics: []
              };
              updatedFanlar.push(existingSubject);
            }
            
            for (const topic of subject.topics) {
              let existingTopic = existingSubject.topics.find(t => t.title === topic.name);
              if (!existingTopic) {
                existingTopic = {
                  id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                  title: topic.name,
                  videos: [],
                  guides: []
                };
                existingSubject.topics.push(existingTopic);
              }
              
              for (const q of topic.questions) {
                const questionData = {
                  subject: subject.name,
                  topic: topic.name,
                  difficulty: 'medium',
                  question: q.text,
                  options: q.options,
                  correct: q.correct,
                  explanation: (q as any).explanation || ''
                };
                await addDoc(collection(db, 'questions'), questionData);
              }
            }
          }
          setFanlarData(updatedFanlar);
          fetchAllData();
        } catch (error) {
          console.error('Auto-restore error:', error);
        }
      }
    };
    if (questionsData.length === 0 && user) {
      autoRestore();
    }
  }, [user, questionsData.length]);

  const handleUpdateLibrary = async (data: any) => {
    setLibraryData(data);
    try {
      await setDoc(doc(db, 'library', 'main'), { data });
    } catch (error) {
      console.error('Error updating library:', error);
    }
  };
  const [modal, setModal] = useState<{ isOpen: boolean, title: string, content: string, onConfirm?: () => void, confirmText?: string, cancelText?: string }>({
    isOpen: false,
    title: '',
    content: ''
  });

  const showAlert = (title: string, content: string) => {
    setModal({ isOpen: true, title, content });
  };

  const showConfirm = (title: string, content: string, onConfirm: () => void) => {
    setModal({ isOpen: true, title, content, onConfirm });
  };

  const [aiModal, setAiModal] = useState<{ isOpen: boolean, title: string, content: string, loading: boolean }>({
    isOpen: false,
    title: '',
    content: '',
    loading: false
  });

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const [isSearchEnabled, setIsSearchEnabled] = useState(true);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [chatMessages, isChatLoading]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = isThinkingMode ? 'gemini-3.1-pro-preview' : 'gemini-3-flash-preview';
      
      const config: any = {
        systemInstruction: "Siz MedUz tibbiy platformasining AI yordamchisiz. Tibbiy talabalarga o'zbek tilida aniq va ilmiy asoslangan javoblar bering.",
      };

      if (isThinkingMode) {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
      }

      if (isSearchEnabled) {
        config.tools = [{ googleSearch: {} }];
      }

      const response = await ai.models.generateContent({
        model,
        contents: [...chatMessages, { role: 'user', text: userMessage }].map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        })),
        config
      });

      setChatMessages(prev => [...prev, { role: 'model', text: response.text || "Kechirasiz, javob olishda xatolik yuz berdi." }]);
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages(prev => [...prev, { role: 'model', text: "Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleAIExplain = async (title: string, context: string) => {
    setAiModal({ isOpen: true, title, content: '', loading: true });
    const explanation = await explainMedicalTopic(title, context);
    setAiModal(prev => ({ ...prev, content: explanation, loading: false }));
  };

  const fetchAllData = async () => {
    try {
      console.log('Fetching all data from Firestore...');
      
      const getCollectionData = async (colName: string) => {
        const snapshot = await getDocs(collection(db, colName));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      };

      const [m, q, s, v, p, sec, sett, libDoc, osce, fanlarDoc] = await Promise.all([
        getCollectionData('mnemonics'),
        getCollectionData('questions'),
        getCollectionData('symptoms'),
        getCollectionData('videos'),
        getCollectionData('patients'),
        getCollectionData('sections'),
        getCollectionData('settings'),
        getDoc(doc(db, 'library', 'main')),
        getCollectionData('osce_scenarios'),
        getDoc(doc(db, 'fanlar', 'main'))
      ]);
      
      console.log('Patients data:', p);
      setMnemonicsData(m as any);
      setQuestionsData(q as any);
      setSymptomsData(s as any);
      setVideosData(v as any);
      setPatientsData(p as any);
      setSectionsData(sec as any);
      setSettingsData(sett as any);
      setOsceScenarios(osce as any);
      if (libDoc.exists()) {
        setLibraryData(libDoc.data().data);
      }
      if (fanlarDoc.exists()) {
        setFanlarData(fanlarDoc.data().data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  React.useEffect(() => {
    fetchAllData();
  }, []);

  const navigate = (page: Page) => {
    setCurrentPage(page);
    setIsMenuOpen(false);
    window.scrollTo(0, 0);
  };

  const handleTreatPatient = async (id: string, medication: string) => {
    const patient = patientsData.find(p => p.id === id);
    if (!patient) return;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Bemor: ${patient.name}, Yosh: ${patient.age}, Simptomlar: ${patient.symptoms}, Ahvoli: ${patient.condition}, Sog'liq: ${patient.healthScore}%. 
        Talaba yuborgan dori: ${medication}. 
        Ushbu dori bemor ahvolini qanday o'zgartiradi? Feedback bering va sog'liq ko'rsatkichini (0-100) qanchaga o'zgartirish kerakligini ayting. Javobni JSON formatida qaytaring: { "feedback": "...", "newHealthScore": number }`,
        config: { responseMimeType: "application/json" }
      });
      
      const result = JSON.parse(response.text || '{}');
      
      // Update patient in DB
      await updateDoc(doc(db, 'patients', id), {
        healthScore: result.newHealthScore,
        medications: patient.medications ? patient.medications + ', ' + medication : medication,
        aiAdvice: result.feedback
      });
      
      await fetchAllData();
      
      // Download feedback
      const blob = new Blob([result.feedback], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `feedback_${patient.name}.txt`;
      a.click();
      
      showAlert('Natija', result.feedback);
    } catch (error) {
      console.error('Treatment error:', error);
      showAlert('Xatolik', 'Davolashda xatolik yuz berdi.');
    }
  };

  const handleClearAdvice = async (id: string) => {
    try {
      await updateDoc(doc(db, 'patients', id), {
        aiAdvice: ''
      });
      await fetchAllData();
    } catch (error) {
      console.error('Error clearing advice:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-primary/20 transition-colors duration-300">
      {/* Floating Chatbot */}
      <div className="fixed bottom-6 left-6 z-[100]">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20, x: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20, x: -20 }}
              className="bg-card rounded-3xl shadow-md w-[350px] sm:w-[400px] h-[500px] flex flex-col overflow-hidden border border-border/40 mb-4 backdrop-blur-xl"
            >
              <div className="p-4 bg-primary text-primary-foreground flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 p-1.5 rounded-xl backdrop-blur-sm">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">MedUz AI Yordamchi</h3>
                    <p className="text-[10px] opacity-80">Tibbiy savollaringizga javob beraman</p>
                  </div>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="p-1 hover:bg-white/10 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-secondary/30">
                {chatMessages.length === 0 && (
                  <div className="text-center py-8 space-y-2">
                    <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                      <Sparkles className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-foreground/60 text-sm font-medium">Salom! Men MedUz AI yordamchisiman. Qanday yordam bera olaman?</p>
                  </div>
                )}
                {chatMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm shadow-md shadow-primary/20' : 'bg-card text-foreground shadow-sm border border-border/40 rounded-tl-sm'}`}>
                      <Markdown>{m.text}</Markdown>
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-card p-3.5 rounded-2xl shadow-sm border border-border/40 rounded-tl-sm flex items-center gap-3">
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      <span className="text-xs font-medium text-foreground/60">O'ylayapman...</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-border/40 bg-card/80 backdrop-blur-md space-y-3">
                <div className="flex items-center gap-4 px-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={isThinkingMode} 
                      onChange={(e) => setIsThinkingMode(e.target.checked)}
                      className="hidden"
                    />
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isThinkingMode ? 'bg-purple-600 border-purple-600' : 'border-border'}`}>
                      {isThinkingMode && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-foreground/50 group-hover:text-purple-600 transition-colors">Thinking Mode</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={isSearchEnabled} 
                      onChange={(e) => setIsSearchEnabled(e.target.checked)}
                      className="hidden"
                    />
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSearchEnabled ? 'bg-emerald-600 border-emerald-600' : 'border-border'}`}>
                      {isSearchEnabled && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-foreground/50 group-hover:text-emerald-600 transition-colors">Google Search</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Savolingizni yozing..."
                    className="flex-1 bg-secondary border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-foreground/40"
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={isChatLoading || !chatInput.trim()}
                    className="bg-primary text-primary-foreground p-2.5 rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-primary/20"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="bg-primary text-primary-foreground p-4 rounded-full shadow-sm shadow-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center group relative"
        >
          {isChatOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
          {!isChatOpen && (
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              AI Yordamchi
            </div>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-card/70 backdrop-blur-xl border-b border-border/40 shadow-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between min-h-[64px] py-2 items-center">
            <div 
              className="flex items-center gap-3 cursor-pointer group shrink-0" 
              onClick={() => navigate('home')}
            >
              <div className="relative flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl shadow-md shadow-primary/20 group-hover:scale-105 transition-transform overflow-hidden">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white z-10">
                  <path d="M4 19V7C4 5.89543 4.89543 5 6 5H18C19.1046 5 20 5.89543 20 7V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 11V15M16 11V15M12 9V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4 19H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 5V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="13" r="1.5" fill="currentColor"/>
                </svg>
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
              <span className="text-2xl font-bold tracking-tight text-foreground group-hover:text-accent transition-colors">Med<span className="text-accent">Uz</span></span>
            </div>

            {/* Desktop Nav Removed as requested */}
            
            <div className="hidden md:flex items-center gap-3 shrink-0">
              {user ? (
                <div className="flex items-center gap-3 bg-secondary px-3 py-1.5 rounded-xl border border-border/50">
                  <button 
                    onClick={() => navigate('profile')}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  >
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName} className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        {user.displayName?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div className="flex flex-col items-start">
                      <span className="text-xs font-semibold text-foreground">Salom, {user.displayName?.split(' ')[0]} 👋</span>
                    </div>
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors"
                    title="Chiqish"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleGoogleLogin}
                  className="flex items-center gap-2 bg-white text-gray-800 border border-gray-300 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google orqali kirish
                </button>
              )}
              
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="p-2 rounded-xl bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground transition-all outline-none cursor-pointer text-sm font-medium appearance-none text-center"
              >
                <option value="uz">UZ</option>
                <option value="ru">RU</option>
                <option value="en">EN</option>
              </select>

              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-xl bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground transition-all"
                title={isDarkMode ? "Kunduzgi rejim" : "Tungi rejim"}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              
              <button 
                onClick={() => navigate('admin')}
                className="p-2 rounded-xl bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground transition-all"
                title="Admin Panel"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-2">
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="p-2 rounded-xl bg-secondary text-foreground outline-none cursor-pointer text-sm font-medium appearance-none text-center"
              >
                <option value="uz">UZ</option>
                <option value="ru">RU</option>
                <option value="en">EN</option>
              </select>
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-xl bg-secondary text-foreground"
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-foreground hover:bg-secondary rounded-md"
              >
                {isMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-card border-t border-border overflow-hidden"
            >
              <div className="px-4 py-4 space-y-2">
                {user ? (
                  <div className="flex items-center justify-between bg-secondary px-4 py-3 rounded-xl border border-border/50 mb-4">
                    <button 
                      onClick={() => { navigate('profile'); setIsMenuOpen(false); }}
                      className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                    >
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                          {user.displayName?.charAt(0) || 'U'}
                        </div>
                      )}
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-semibold text-foreground">Salom, {user.displayName?.split(' ')[0]} 👋</span>
                        <span className="text-xs text-foreground/60">Profilni ko'rish</span>
                      </div>
                    </button>
                    <button 
                      onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                      className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors"
                      title="Chiqish"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => { handleGoogleLogin(); setIsMenuOpen(false); }}
                    className="w-full flex items-center justify-center gap-2 bg-white text-gray-800 border border-gray-300 px-4 py-3 rounded-xl text-base font-medium hover:bg-gray-50 transition-colors shadow-sm mb-4"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Google orqali kirish
                  </button>
                )}
                <MobileNavLink active={currentPage === 'library'} onClick={() => { navigate('library'); setIsMenuOpen(false); }}>{t('library')}</MobileNavLink>
                <MobileNavLink active={currentPage === 'mnemonics'} onClick={() => { navigate('mnemonics'); setIsMenuOpen(false); }}>{t('mnemonics')}</MobileNavLink>
                <MobileNavLink active={currentPage === 'videos'} onClick={() => { navigate('videos'); setIsMenuOpen(false); }}>{t('videos')}</MobileNavLink>
                <MobileNavLink active={currentPage === 'symptoms'} onClick={() => { navigate('symptoms'); setIsMenuOpen(false); }}>{t('symptoms')}</MobileNavLink>
                <MobileNavLink active={currentPage === 'patients'} onClick={() => { navigate('patients'); setIsMenuOpen(false); }}>{t('patients')}</MobileNavLink>
                <MobileNavLink active={currentPage === 'osce'} onClick={() => { navigate('osce'); setIsMenuOpen(false); }}>{t('osce')}</MobileNavLink>
                <MobileNavLink active={currentPage === 'quiz'} onClick={() => { navigate('quiz'); setIsMenuOpen(false); }}>{t('quiz')}</MobileNavLink>
                <MobileNavLink active={currentPage === 'tutor'} onClick={() => { navigate('tutor'); setIsMenuOpen(false); }}>{t('tutor')}</MobileNavLink>
                <MobileNavLink active={currentPage === 'pharma'} onClick={() => { navigate('pharma'); setIsMenuOpen(false); }}>{t('pharma')}</MobileNavLink>
                <MobileNavLink active={currentPage === 'fanlar'} onClick={() => { navigate('fanlar'); setIsMenuOpen(false); }}>{t('subjects')}</MobileNavLink>
                <MobileNavLink active={currentPage === 'news'} onClick={() => { navigate('news'); setIsMenuOpen(false); }}>{t('news_title')}</MobileNavLink>
                <MobileNavLink active={currentPage === 'journals'} onClick={() => { navigate('journals'); setIsMenuOpen(false); }}>Jurnallar</MobileNavLink>
                <MobileNavLink active={currentPage === 'ai'} onClick={() => { navigate('ai'); setIsMenuOpen(false); }}>{t('aiCenter')}</MobileNavLink>
                <MobileNavLink active={currentPage === 'admin'} onClick={() => { navigate('admin'); setIsMenuOpen(false); }}>{t('adminPanel')}</MobileNavLink>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main Content */}
      <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${currentPage === 'home' ? 'pt-0 pb-8' : 'py-8'}`}>
        {currentPage !== 'home' && (
          <button 
            onClick={() => navigate('home')}
            className="mb-6 flex items-center gap-2 text-foreground/70 hover:text-primary transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Orqaga qaytish
          </button>
        )}
        <AnimatePresence mode="wait">
          {currentPage === 'home' && <HomePage onNavigate={navigate} sections={sectionsData} showAlert={showAlert} appSettings={appSettings} />}
          {currentPage === 'mnemonics' && <MnemonicsPage data={mnemonicsData} handleAIExplain={handleAIExplain} updateProgress={updateProgress} />}
          {currentPage === 'videos' && <VideosPage data={videosData} handleAIExplain={handleAIExplain} updateProgress={updateProgress} />}
          {currentPage === 'symptoms' && <SymptomsPage data={symptomsData} handleAIExplain={handleAIExplain} updateProgress={updateProgress} />}
          {currentPage === 'patients' && <PatientsPage patients={patientsData} onTreat={handleTreatPatient} onClearAdvice={handleClearAdvice} />}
          {currentPage === 'osce' && <OSCEPage scenarios={osceScenarios} />}
          {currentPage === 'quiz' && <QuizPage handleAIExplain={handleAIExplain} showAlert={showAlert} user={user} updateProgress={updateProgress} fanlar={fanlarData} questions={questionsData} />}
          {currentPage === 'tutor' && <TutorPage />}
          {currentPage === 'pharma' && <PharmaPage />}
          {currentPage === 'fanlar' && <FanlarPage data={fanlarData} />}
          {currentPage === 'library' && <LibraryPage data={libraryData} handleAIExplain={handleAIExplain} />}
          {currentPage === 'ai' && <AIPage />}
          {currentPage === 'admin' && <AdminPage 
            mnemonics={mnemonicsData} 
            questions={questionsData} 
            symptoms={symptomsData} 
            videos={videosData}
            patients={patientsData}
            sections={sectionsData}
            settings={settingsData}
            library={libraryData}
            osceScenarios={osceScenarios}
            fanlar={fanlarData}
            setFanlar={setFanlarData}
            appSettings={appSettings}
            setAppSettings={setAppSettings}
            news={newsData}
            setNews={setNewsData}
            journals={journalsData}
            setJournals={setJournalsData}
            onUpdate={fetchAllData} 
            onUpdateLibrary={handleUpdateLibrary}
            themeColor={themeColor}
            setThemeColor={setThemeColor}
            showAlert={showAlert}
            showConfirm={showConfirm}
          />}
          {currentPage === 'news' && <NewsPage news={newsData} />}
          {currentPage === 'journals' && <JournalsPage journals={journalsData} />}
          {currentPage === 'profile' && <ProfilePage user={user} />}
        </AnimatePresence>
      </main>

      {/* Modal */}
      <Modal 
        isOpen={modal.isOpen}
        title={modal.title}
        content={modal.content}
        onClose={() => setModal({ ...modal, isOpen: false })}
        onConfirm={modal.onConfirm}
        confirmText={modal.confirmText}
        cancelText={modal.cancelText}
      />

      {/* AI Modal */}
      <AnimatePresence>
        {aiModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-2xl shadow-md w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col border border-border/40"
            >
              <div className="p-6 border-b border-border/40 flex justify-between items-center bg-secondary/30">
                <div className="flex items-center gap-3">
                  <div className="bg-primary p-2.5 rounded-xl shadow-md shadow-primary/20">
                    <Sparkles className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground leading-tight">{aiModal.title}</h3>
                    <p className="text-[10px] font-medium text-primary uppercase tracking-widest">AI Tibbiy Tushuntirish</p>
                  </div>
                </div>
                <button 
                  onClick={() => setAiModal(prev => ({ ...prev, isOpen: false }))}
                  className="p-2 hover:bg-secondary rounded-full transition-colors text-foreground/40 hover:text-foreground/80"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-card">
                {aiModal.loading ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="text-foreground/60 font-medium animate-pulse">AI ma'lumotlarni tahlil qilmoqda...</p>
                  </div>
                ) : (
                  <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground/80 prose-strong:text-foreground prose-ul:list-disc">
                    <Markdown>{aiModal.content}</Markdown>
                  </div>
                )}
              </div>
              
              <div className="p-4 bg-secondary/30 border-t border-border/40 text-center">
                <p className="text-[10px] text-foreground/40">
                  AI tomonidan yaratilgan ma'lumotlar xato bo'lishi mumkin. Har doim rasmiy darsliklarga tayanib ish ko'ring.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-card border-t border-border/40 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Heart className="w-5 h-5 text-primary" />
                <span className="text-xl font-medium text-primary">MedUz</span>
              </div>
              <p className="text-foreground/60 text-sm leading-relaxed">
                O'zbekiston tibbiyot talabalari uchun bepul va sifatli ta'lim platformasi. 
                Bizning maqsadimiz - bo'lajak shifokorlarga bilim olishda ko'maklashish.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Bo'limlar</h4>
              <ul className="space-y-2 text-sm text-foreground/60">
                <li><button onClick={() => navigate('mnemonics')} className="hover:text-primary transition-colors">Mnemonikalar</button></li>
                <li><button onClick={() => navigate('videos')} className="hover:text-primary transition-colors">Video darslar</button></li>
                <li><button onClick={() => navigate('symptoms')} className="hover:text-primary transition-colors">Simptomlar tekshiruvi</button></li>
                <li><button onClick={() => navigate('quiz')} className="hover:text-primary transition-colors">Kunlik testlar</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Aloqa</h4>
              <p className="text-sm text-foreground/60 mb-2">Savollar va takliflar uchun:</p>
              <div className="space-y-2">
                {settingsData.find(s => s.key === 'contact_email') && (
                  <a href={`mailto:${settingsData.find(s => s.key === 'contact_email')?.value}`} className="block text-primary text-sm font-medium hover:underline">
                    {settingsData.find(s => s.key === 'contact_email')?.value}
                  </a>
                )}
                {settingsData.find(s => s.key === 'contact_telegram') && (
                  <a href={`https://t.me/${settingsData.find(s => s.key === 'contact_telegram')?.value.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="block text-primary text-sm font-medium hover:underline">
                    Telegram: {settingsData.find(s => s.key === 'contact_telegram')?.value}
                  </a>
                )}
                {settingsData.find(s => s.key === 'contact_phone') && (
                  <p className="text-sm text-foreground/60">
                    Tel: {settingsData.find(s => s.key === 'contact_phone')?.value}
                  </p>
                )}
              </div>
              <div className="mt-4">
                <button 
                  onClick={() => navigate('admin')}
                  className="flex items-center gap-2 text-xs text-foreground/40 hover:text-primary transition-colors"
                >
                  <Settings className="w-3 h-3" /> Admin Panel
                </button>
              </div>
            </div>
          </div>
          <div className="border-t border-border/40 mt-12 pt-8 text-center text-foreground/40 text-xs">
            © {new Date().getFullYear()} MedUz. Barcha huquqlar himoyalangan.
          </div>
        </div>
      </footer>
    </div>
  );
}

function NavLink({ children, active, onClick }: { children: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors relative ${
        active 
          ? 'text-primary-foreground' 
          : 'text-foreground/70 hover:bg-secondary hover:text-foreground'
      }`}
    >
      <span className="relative z-10 flex items-center gap-1.5">{children}</span>
      {active && (
        <motion.div 
          layoutId="activeNavPill"
          className="absolute inset-0 rounded-full bg-primary"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
    </button>
  );
}

function MobileNavLink({ children, active, onClick }: { children: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`block w-full text-left px-4 py-3 rounded-xl text-base font-medium transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-foreground/70 hover:bg-secondary hover:text-primary'}`}
    >
      {children}
    </button>
  );
}

/* --- PAGES --- */

function HomePage({ onNavigate, sections, showAlert, appSettings }: { onNavigate: (page: Page) => void, sections: Section[], showAlert: (title: string, content: string) => void, appSettings: any }) {
  const { t } = useTranslation();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4 sm:space-y-6"
    >
      {/* Hero Section */}
      <section className="text-center space-y-4 sm:space-y-6 pt-2 sm:pt-6 pb-0 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 flex items-center justify-center opacity-20 dark:opacity-10">
          <div className="w-[800px] h-[800px] rounded-full blur-[150px]" style={{ background: `linear-gradient(to right, ${appSettings.gradientFrom}, ${appSettings.gradientTo})` }} />
        </div>

        <motion.h1 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
          className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-tight mt-2"
        >
          {t('heroTitle1')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">{t('heroTitle2')}</span> <br className="hidden md:block" /> {t('heroTitle3')}
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-base md:text-xl text-foreground/70 max-w-3xl mx-auto font-medium leading-relaxed"
        >
          {t('heroDesc')}
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
        >
          <button 
            onClick={() => onNavigate('quiz')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-accent text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 transition-all transform hover:-translate-y-1 active:translate-y-0"
          >
            <CheckSquare className="w-5 h-5" />
            {t('startQuiz')}
          </button>
          <button 
            onClick={() => onNavigate('mnemonics')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-card text-foreground border-2 border-border/50 px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-secondary hover:border-border transition-all shadow-sm hover:shadow-md"
          >
            <Brain className="w-5 h-5" />
            {t('viewMnemonics')}
          </button>
        </motion.div>
      </section>

      {/* Top Navigation Icons - Scrollable on mobile */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="w-full max-w-[90rem] mx-auto bg-card border border-border/40 shadow-sm rounded-[2.5rem] p-4 sm:p-6 overflow-hidden -mt-2 sm:-mt-4 relative z-10"
      >
        <div className="flex items-start justify-start sm:justify-between w-full gap-4 sm:gap-2 px-1 sm:px-2 overflow-x-auto custom-scrollbar pb-4 sm:pb-0 snap-x">
          {[
            { id: 'library', label: 'Kutubxona', icon: BookOpen, color: 'bg-[#1877F2]' },
            { id: 'quiz', label: 'Testlar', icon: Icons.ClipboardList, color: 'bg-[#E91E63]' },
            { id: 'osce', label: 'OSCE', icon: Stethoscope, color: 'bg-[#009688]' },
            { id: 'tutor', label: 'AI Tutor', icon: Icons.Bot, color: 'bg-[#00BFA5]' },
            { id: 'mnemonics', label: 'Mnemonikalar', icon: Brain, color: 'bg-[#9C27B0]' },
            { id: 'videos', label: 'Videolar', icon: Video, color: 'bg-[#1976D2]' },
            { id: 'symptoms', label: 'Simptomlar', icon: Icons.Activity, color: 'bg-[#FF9800]' },
            { id: 'patients', label: 'Bemorlar', icon: Icons.Users, color: 'bg-[#4CAF50]' },
            { id: 'pharma', label: 'Farmakologiya', icon: Icons.Pill, color: 'bg-[#E53935]' },
            { id: 'fanlar', label: 'Fanlar', icon: Icons.Dna, color: 'bg-[#F57C00]' },
            { id: 'journals', label: 'Jurnallar', icon: Icons.BookText, color: 'bg-[#D32F2F]' },
            { id: 'news', label: 'Global Health News', icon: Globe, color: 'bg-[#2196F3]' },
            { id: 'ai', label: 'AI Markazi', icon: Sparkles, color: 'bg-[#673AB7]' }
          ].map((item) => (
            <button 
              key={item.id} 
              onClick={() => onNavigate(item.id as Page)}
              className="flex flex-col items-center gap-2 group min-w-[76px] sm:min-w-0 sm:flex-1 snap-start"
            >
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-[1.25rem] flex items-center justify-center text-white shadow-md transition-transform duration-300 group-hover:scale-110 group-active:scale-95 ${item.color}`}>
                <item.icon className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2} />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold text-foreground/80 group-hover:text-foreground transition-colors text-center leading-tight whitespace-normal sm:whitespace-nowrap">{item.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Features Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <FeatureCard 
          title={t('featSubjectsTitle')}
          description={t('featSubjectsDesc')}
          onClick={() => onNavigate('fanlar')}
          color="emerald"
          icon={<BookOpen />}
        />
        <FeatureCard 
          title={t('featLibraryTitle')}
          description={t('featLibraryDesc')}
          onClick={() => onNavigate('library')}
          color="blue"
          icon={<BookOpen />}
        />
        <FeatureCard 
          title={t('featMnemonicsTitle')}
          description={t('featMnemonicsDesc')}
          onClick={() => onNavigate('mnemonics')}
          color="purple"
          icon={<Brain />}
        />
        <FeatureCard 
          title={t('featVideosTitle')}
          description={t('featVideosDesc')}
          onClick={() => onNavigate('videos')}
          color="red"
          icon={<Video />}
        />
        <FeatureCard 
          title={t('featSymptomsTitle')}
          description={t('featSymptomsDesc')}
          onClick={() => onNavigate('symptoms')}
          color="emerald"
          icon={<Stethoscope />}
        />
        <FeatureCard 
          title={t('featQuizTitle')}
          description={t('featQuizDesc')}
          onClick={() => onNavigate('quiz')}
          color="blue"
          icon={<CheckCircle2 />}
        />
        <FeatureCard 
          title={t('featAITitle')}
          description={t('featAIDesc')}
          onClick={() => onNavigate('ai')}
          color="purple"
          icon={<Sparkles />}
        />
        <FeatureCard 
          title={t('featOSCETitle')}
          description={t('featOSCEDesc')}
          onClick={() => onNavigate('osce')}
          color="emerald"
          icon={<Stethoscope />}
        />
        <FeatureCard 
          title={t('featNewsTitle')}
          description={t('featNewsDesc')}
          onClick={() => onNavigate('news')}
          color="blue"
          icon={<Globe />}
        />
        {sections.map((sec, idx) => {
          const Icon = (Icons[sec.icon as keyof typeof Icons] as React.ElementType) || Plus;
          return (
            <FeatureCard 
              key={sec.id || idx}
              title={sec.title}
              description={sec.content}
              onClick={() => showAlert(t('comingSoon'), `${t('comingSoonDesc')} ${sec.title}`)}
              color={sec.color}
              icon={<Icon />}
            />
          );
        })}
      </section>

      {/* Coming Soon Section */}
      <section className="bg-primary rounded-2xl p-8 md:p-12 text-primary-foreground overflow-hidden relative shadow-sm shadow-primary/20">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-block bg-white/20 backdrop-blur-md text-xs font-medium px-3 py-1.5 rounded-full mb-6 uppercase tracking-wider">Tez kunda</span>
          <h2 className="text-3xl md:text-4xl font-semibold mb-4 tracking-tight">Virtual Bemor Simulyatori</h2>
          <p className="text-primary-foreground/80 mb-8 text-lg leading-relaxed">
            Haqiqiy klinik holatlarni virtual muhitda boshqarish va qaror qabul qilish ko'nikmalarini rivojlantirish uchun yangi bo'lim ustida ishlayapmiz.
          </p>
          <div className="flex items-center gap-3 text-sm font-medium bg-black/10 w-fit px-4 py-2 rounded-xl backdrop-blur-sm">
            <Info className="w-4 h-4" />
            <span>Yangi yangiliklardan xabardor bo'lish uchun bizni kuzatib boring.</span>
          </div>
        </div>
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 opacity-10 pointer-events-none">
          <Stethoscope className="w-96 h-96" />
        </div>
      </section>

    </motion.div>
  );
}

const FeatureCard: React.FC<{ title: string, description: string, onClick: () => void, color: string, icon?: React.ReactNode }> = ({ title, description, onClick, color, icon }) => {
  const { t } = useTranslation();
  const colors: Record<string, string> = {
    purple: 'hover:border-purple-300 hover:bg-purple-50/50 dark:hover:bg-purple-900/20 text-purple-500',
    red: 'hover:border-red-300 hover:bg-red-50/50 dark:hover:bg-red-900/20 text-red-500',
    emerald: 'hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 text-emerald-500',
    blue: 'hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 text-blue-500',
  };

  const colorClass = colors[color] || colors.blue;

  return (
    <button 
      onClick={onClick}
      className={`text-left p-8 bg-card border border-border/40 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden`}
    >
      <div className={`absolute top-0 right-0 w-32 h-32 opacity-5 rounded-bl-full -z-10 transition-colors ${colorClass.split(' ')[0].replace('hover:border-', 'bg-')}`} />
      {icon && (
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 bg-secondary ${colorClass.split(' ').pop()}`}>
          {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-7 h-7' })}
        </div>
      )}
      <h3 className="text-2xl font-bold mb-3 text-foreground group-hover:text-primary transition-colors tracking-tight">{title}</h3>
      <p className="text-foreground/60 text-sm leading-relaxed mb-6 font-medium line-clamp-2">{description}</p>
      <div className="flex items-center text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0 duration-300">
        {t('details')} <ChevronRight className="w-4 h-4 ml-1" />
      </div>
    </button>
  );
};

function MnemonicsPage({ data, handleAIExplain, updateProgress }: { data: Mnemonic[], handleAIExplain: (title: string, context: string) => void, updateProgress?: (field: any, value: any) => void }) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(t('allCategories'));
  const [interactedMnemonics, setInteractedMnemonics] = useState<Set<number>>(new Set());

  const categories = [t('allCategories'), ...Array.from(new Set(data.map(m => m.category)))];

  const filteredMnemonics = data.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         m.mnemonic.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         m.explanation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === t('allCategories') || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Simple toast could be added here
  };

  const handleInteraction = (idx: number) => {
    if (!interactedMnemonics.has(idx)) {
      setInteractedMnemonics(prev => new Set(prev).add(idx));
      if (updateProgress) {
        updateProgress('mnemonicsRead', (prev: number) => prev + 1);
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-4xl font-semibold tracking-tight text-foreground">{t('mnemonics')}</h2>
          <p className="text-foreground/60 font-medium text-lg">{t('featMnemonicsDesc')}</p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
          <input 
            type="text" 
            placeholder={t('search')} 
            className="w-full pl-12 pr-4 py-3.5 bg-card border border-border/40 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm placeholder:text-foreground/40 text-foreground"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <button 
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${selectedCategory === cat ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105' : 'bg-card text-foreground/70 border border-border/40 hover:bg-secondary hover:text-foreground'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredMnemonics.map((m, idx) => (
          <motion.div 
            layout
            key={idx}
            onClick={() => handleInteraction(idx)}
            className="bg-card border border-border/40 rounded-2xl p-8 shadow-sm hover:shadow-sm hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
          >
            <div className="flex justify-between items-start mb-6">
              <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-lg uppercase tracking-wider">{m.category}</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleAIExplain(m.title, `Mnemonika: ${m.mnemonic}. Izoh: ${m.explanation}`)}
                  className="p-2.5 text-purple-500 hover:bg-purple-500/10 rounded-xl transition-all"
                  title={t('aiExplanation')}
                >
                  <Sparkles className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => copyToClipboard(m.mnemonic)}
                  className="p-2.5 text-foreground/40 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                  title={t('copy')}
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>
            </div>
            <h3 className="text-2xl font-medium mb-4 text-foreground tracking-tight">{m.title}</h3>
            <div className="bg-secondary/50 p-5 rounded-2xl mb-5 border-l-4 border-primary">
              <p className="text-xl font-mono font-medium text-primary">{m.mnemonic}</p>
            </div>
            <p className="text-foreground/70 text-sm leading-relaxed font-medium">{m.explanation}</p>
          </motion.div>
        ))}
      </div>

      {filteredMnemonics.length === 0 && (
        <div className="text-center py-24 bg-card rounded-2xl border border-border/40">
          <div className="bg-secondary w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="w-10 h-10 text-foreground/40" />
          </div>
          <h3 className="text-2xl font-medium text-foreground mb-2">{t('noResults')}</h3>
          <p className="text-foreground/60 font-medium">{t('tryAnotherSearch')}</p>
        </div>
      )}

      <div className="bg-foreground rounded-2xl p-12 text-background text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-50" />
        <div className="relative z-10">
          <h3 className="text-3xl font-semibold mb-4 tracking-tight">O'z mnemonikangiz bormi?</h3>
          <p className="text-background/70 mb-8 max-w-md mx-auto text-lg font-medium">Bizning platformaga o'z hissangizni qo'shing va boshqalarga yordam bering.</p>
          <a 
            href="mailto:muhammadboburolimjonov2@gmail.com?subject=Yangi Mnemonic Taklifi&body=Mnemonic nomi:%0A%0AMnemonic:%0A%0ATushuntirish:%0A"
            className="inline-block bg-background text-foreground px-8 py-4 rounded-2xl font-medium hover:bg-background/90 transition-all shadow-sm hover:-translate-y-1"
          >
            Yuborish
          </a>
        </div>
      </div>
    </motion.div>
  );
}

function VideosPage({ data, handleAIExplain, updateProgress }: { data: VideoData[], handleAIExplain: (title: string, context: string) => void, updateProgress?: (field: any, value: any) => void }) {
  const { t } = useTranslation();
  const [selectedFilter, setSelectedFilter] = useState(t('videosAll'));
  const [activeVideo, setActiveVideo] = useState<VideoData | null>(null);

  const filters = [t('videosAll'), ...Array.from(new Set(data.map(v => v.category)))];

  const filteredVideos = data.filter(v => selectedFilter === t('videosAll') || v.category === selectedFilter);

  const handleVideoClick = (v: VideoData) => {
    if (v.available) {
      setActiveVideo(v);
      if (updateProgress) {
        updateProgress('videosWatched', (prev: number) => prev + 1);
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-8"
    >
      <div className="space-y-2">
        <h2 className="text-4xl font-semibold tracking-tight text-foreground">{t('videosTitle')}</h2>
        <p className="text-foreground/60 font-medium text-lg">{t('videosDesc')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map(f => (
          <button 
            key={f}
            onClick={() => setSelectedFilter(f)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${selectedFilter === f ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105' : 'bg-card text-foreground/70 border border-border/40 hover:bg-secondary hover:text-foreground'}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVideos.map((v, idx) => (
          <div key={idx} className="group cursor-pointer" onClick={() => handleVideoClick(v)}>
            <div className="relative aspect-video rounded-3xl overflow-hidden mb-4 bg-secondary flex items-center justify-center border border-border/40 shadow-sm group-hover:shadow-sm group-hover:-translate-y-1 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary to-card" />
              <Video className="w-12 h-12 text-foreground/20 relative z-10" />
              {v.available ? (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm z-20">
                  <PlayCircle className="w-16 h-16 text-white" />
                </div>
              ) : (
                <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-md text-foreground text-[10px] font-semibold px-3 py-1.5 rounded-lg uppercase tracking-wider z-20 shadow-sm">
                  {t('videosComingSoon')}
                </div>
              )}
              <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md text-white text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 z-20">
                <Clock className="w-3.5 h-3.5" /> {v.duration}
              </div>
            </div>
            <h4 className={`text-lg font-medium leading-tight mb-1.5 tracking-tight ${!v.available ? 'text-foreground/40' : 'text-foreground group-hover:text-primary transition-colors'}`}>{v.title}</h4>
            <div className="flex justify-between items-center">
              <p className="text-sm text-foreground/60 font-medium">{v.category}</p>
              {v.available && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAIExplain(v.title, `Video dars mavzusi: ${v.title}. Kategoriya: ${v.category}`);
                  }}
                  className="p-2 text-purple-500 hover:bg-purple-500/10 rounded-xl transition-all"
                  title={t('aiExplanation')}
                >
                  <Sparkles className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
        {filteredVideos.length === 0 && (
          <div className="col-span-full text-center py-24 text-foreground/40 font-medium text-lg bg-card rounded-2xl border border-border/40">{t('videosNoVideos')}</div>
        )}
      </div>

      {/* Video Player Modal */}
      <AnimatePresence>
        {activeVideo && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-black rounded-2xl shadow-md w-full max-w-5xl aspect-video overflow-hidden relative ring-1 ring-white/10"
            >
              <button 
                onClick={() => setActiveVideo(null)}
                className="absolute top-6 right-6 z-20 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full transition-all text-white hover:scale-110"
              >
                <X className="w-6 h-6" />
              </button>
              <iframe 
                src={`${getYouTubeEmbedUrl(activeVideo.videoUrl)}?autoplay=1`}
                title={activeVideo.title}
                className="w-full h-full border-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SymptomsPage({ data, handleAIExplain, updateProgress }: { data: SymptomData[], handleAIExplain: (title: string, context: string) => void, updateProgress?: (field: any, value: any) => void }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [interactedSymptoms, setInteractedSymptoms] = useState<Set<string>>(new Set());
  
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const searchTerms = query.toLowerCase().split(/[\s,]+/).filter(t => t.length > 2);
    if (searchTerms.length === 0) return [];

    return data.filter(item => {
      return searchTerms.some(term => 
        item.symptoms.some(s => s.includes(term)) || 
        item.diagnosis.toLowerCase().includes(term)
      );
    });
  }, [query, data]);

  const handleInteraction = (diagnosis: string) => {
    if (!interactedSymptoms.has(diagnosis)) {
      setInteractedSymptoms(prev => new Set(prev).add(diagnosis));
      if (updateProgress) {
        updateProgress('symptomsChecked', (prev: number) => prev + 1);
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-3xl mx-auto space-y-8"
    >
      <div className="text-center space-y-4">
        <div className="bg-emerald-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <Stethoscope className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="text-4xl font-semibold tracking-tight text-foreground">{t('symptomsCheck')}</h2>
        <p className="text-foreground/60 font-medium text-lg">{t('symptomsDesc')}</p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-foreground/40" />
        <input 
          type="text" 
          placeholder={t('symptomsPlaceholder')} 
          className="w-full pl-14 pr-4 py-4 bg-card border border-border/40 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-lg placeholder:text-foreground/40 text-foreground"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="space-y-6">
        {results.map((res, idx) => (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            key={idx}
            onClick={() => handleInteraction(res.diagnosis)}
            className={`p-8 rounded-2xl border cursor-pointer ${res.redFlag ? 'bg-red-500/5 border-red-500/20 shadow-sm shadow-red-500/10' : 'bg-card border-border/40 shadow-sm hover:shadow-md'} transition-all duration-300`}
          >
            <div className="flex justify-between items-start mb-6">
              <h3 className={`text-2xl font-medium tracking-tight ${res.redFlag ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>{res.diagnosis}</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleAIExplain(res.diagnosis, `Simptomlar: ${res.symptoms.join(', ')}. Tashxis: ${res.diagnosis}`)}
                  className="p-2.5 text-purple-500 hover:bg-purple-500/10 rounded-xl transition-all"
                  title={t('aiExplanation')}
                >
                  <Sparkles className="w-5 h-5" />
                </button>
                {res.redFlag && (
                  <span className="flex items-center gap-1.5 text-xs font-semibold bg-red-500 text-white px-3 py-1.5 rounded-lg uppercase tracking-wider shadow-sm shadow-red-500/20">
                    <AlertTriangle className="w-4 h-4" /> {t('redFlag')}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-6">
              {res.symptoms.map((s, i) => (
                <span key={i} className="text-sm font-medium bg-secondary text-foreground/80 px-3 py-1.5 rounded-xl border border-border/40">{s}</span>
              ))}
            </div>
            {res.redFlag && (
              <p className="text-sm text-red-700 dark:text-red-300 font-medium bg-red-500/10 p-4 rounded-xl border border-red-500/20 leading-relaxed">
                <strong className="font-medium">{t('attention')}</strong> {t('emergency')}
              </p>
            )}
          </motion.div>
        ))}

        {query && results.length === 0 && (
          <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border/40">
            <p className="text-foreground/50 font-medium text-lg">{t('noDiagnosis')}</p>
          </div>
        )}
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 p-8 rounded-2xl flex gap-5">
        <Info className="w-8 h-8 text-amber-500 shrink-0" />
        <p className="text-sm text-amber-700 dark:text-amber-300 leading-relaxed font-medium">
          <strong className="font-medium">{t('disclaimer')}</strong> {t('disclaimerText')}
        </p>
      </div>
    </motion.div>
  );
}

function QuizPage({ handleAIExplain, showAlert, user, updateProgress, fanlar, questions }: { handleAIExplain: (title: string, context: string) => void, showAlert: (title: string, content: string) => void, user: any, updateProgress: (field: any, value: any) => void, fanlar: Subject[], questions: Question[] }) {
  const { t } = useTranslation();
  const [step, setStep] = useState<'subjects' | 'topics' | 'quiz' | 'result' | 'review'>('subjects');
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [timeTaken, setTimeTaken] = useState(0);
  
  const [scoreboard, setScoreboard] = useState<{name: string, surname: string, score: number, time: number, topic: string}[]>([]);

  const dynamicSubjects = useMemo(() => {
    return fanlar.map(f => {
      return {
        id: f.id,
        name: f.title,
        icon: f.icon || "📚",
        topics: f.topics.map(t => {
          const topicQuestions = questions.filter(q => q.subject === f.title && q.topic === t.title);
          return {
            id: t.id,
            name: t.title,
            questions: topicQuestions.map(q => ({
              id: q.id,
              text: q.question,
              options: q.options,
              correct: q.correct,
              explanation: q.explanation
            }))
          };
        }).filter(t => t.questions.length > 0)
      };
    }).filter(s => s.topics.length > 0);
  }, [fanlar, questions]);

  useEffect(() => {
    const saved = localStorage.getItem('meduz_quiz_scores');
    if (saved) setScoreboard(JSON.parse(saved));
  }, []);

  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);

  const handleSubjectSelect = (subject: any) => {
    setSelectedSubject(subject);
    setStep('topics');
  };

  const handleTopicSelect = (topic: any) => {
    setSelectedTopic(topic);
    setStep('quiz');
    setCurrentQuestionIdx(0);
    setScore(0);
    setStartTime(Date.now());
    setIsAnswered(false);
    setSelectedOption(null);
    setUserAnswers(new Array(topic.questions.length).fill(null));
  };

  const handleAnswer = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);
    
    const newUserAnswers = [...userAnswers];
    newUserAnswers[currentQuestionIdx] = idx;
    setUserAnswers(newUserAnswers);
    
    let isCorrect = idx === selectedTopic.questions[currentQuestionIdx].correct;
    if (isCorrect) {
      setScore(s => s + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIdx < selectedTopic.questions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      finishQuiz(score);
    }
  };

  const finishQuiz = (finalScore: number) => {
    const time = Math.floor((Date.now() - startTime) / 1000);
    setTimeTaken(time);
    
    if (user) {
      updateProgress('quizScore', (prev: number) => prev + finalScore);
    }
    
    const nameParts = user?.displayName?.split(' ') || ['Mehmon', ''];
    const newScore = { 
      name: nameParts[0] || 'Mehmon', 
      surname: nameParts.slice(1).join(' ') || '', 
      score: finalScore, 
      time,
      topic: selectedTopic.name
    };
    
    const newBoard = [...scoreboard, newScore]
      .sort((a, b) => b.score - a.score || a.time - b.time)
      .slice(0, 10);
      
    setScoreboard(newBoard);
    localStorage.setItem('meduz_quiz_scores', JSON.stringify(newBoard));
    
    // Update score state to final score so result screen shows correct score
    setScore(finalScore);
    setStep('result');
  };

  const resetQuiz = () => {
    setStep('subjects');
    setSelectedSubject(null);
    setSelectedTopic(null);
  };

  const totalQuestions = selectedTopic?.questions?.length || 1;
  const percentage = Math.round((score / totalQuestions) * 100);
  
  let resultMessage = "";
  let resultColor = "";
  let animationProps = {};
  
  if (percentage >= 80) {
    resultMessage = t('quizExcellent');
    resultColor = "text-emerald-600";
    animationProps = {
      animate: { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] },
      transition: { duration: 0.5, repeat: Infinity, repeatType: "reverse" }
    };
  } else if (percentage >= 60) {
    resultMessage = t('quizGood');
    resultColor = "text-amber-500";
    animationProps = {
      animate: { opacity: [0.5, 1, 0.5] },
      transition: { duration: 1.5, repeat: Infinity }
    };
  } else {
    resultMessage = t('quizKeepTrying');
    resultColor = "text-red-500";
  }

  const generatePDF = () => {
    import('jspdf').then(({ jsPDF }) => {
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const width = doc.internal.pageSize.getWidth();
      const height = doc.internal.pageSize.getHeight();

      // Background & Border
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, width, height, 'F');
      
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(4);
      doc.rect(10, 10, width - 20, height - 20);
      
      doc.setDrawColor(147, 197, 253);
      doc.setLineWidth(1);
      doc.rect(14, 14, width - 28, height - 28);

      // Title
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(36);
      doc.setFont("helvetica", "bold");
      doc.text("TEST NATIJASI", width / 2, 50, { align: "center" });

      // Name
      doc.setFontSize(28);
      doc.setTextColor(37, 99, 235);
      const displayName = user?.displayName || 'Mehmon';
      doc.text(displayName, width / 2, 80, { align: "center" });

      // Score
      doc.setFontSize(20);
      doc.setTextColor(71, 85, 105);
      doc.setFont("helvetica", "normal");
      doc.text(`Mavzu: ${selectedTopic?.name}`, width / 2, 100, { align: "center" });
      
      doc.setFontSize(24);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.text(`Natija: ${score} / ${totalQuestions} (${percentage}%)`, width / 2, 120, { align: "center" });

      // Message
      doc.setFontSize(18);
      doc.setFont("helvetica", "italic");
      if (percentage >= 80) doc.setTextColor(5, 150, 105);
      else if (percentage >= 60) doc.setTextColor(217, 119, 6);
      else doc.setTextColor(220, 38, 38);
      
      const splitMessage = doc.splitTextToSize(resultMessage, width - 40);
      doc.text(splitMessage, width / 2, 140, { align: "center" });

      // Date
      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "normal");
      const dateStr = new Date().toLocaleString('uz-UZ');
      doc.text(`Sana va vaqt: ${dateStr}`, width / 2, 180, { align: "center" });

      doc.save(`Natija_${displayName.replace(/\s+/g, '_')}.pdf`);
    });
  };

  useEffect(() => {
    if (step === 'result') {
      generatePDF();
    }
  }, [step]);

  if (step === 'subjects') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-6">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-primary/10 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto shadow-inner rotate-3 hover:rotate-0 transition-transform duration-500"
          >
            <BookOpen className="w-12 h-12 text-primary" />
          </motion.div>
          <div className="space-y-2">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">{t('quizSubjectsTitle')}</h2>
            <p className="text-foreground/60 font-medium text-lg max-w-2xl mx-auto">{t('quizSubjectsDesc')}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {dynamicSubjects.length > 0 ? dynamicSubjects.map((subject, idx) => {
            const IconComponent = (Icons as any)[subject.icon] || BookOpen;
            const gradients = [
              'from-blue-600 to-indigo-700',
              'from-emerald-600 to-teal-700',
              'from-rose-600 to-pink-700',
              'from-amber-600 to-orange-700',
              'from-purple-600 to-violet-700',
              'from-cyan-600 to-blue-700'
            ];
            const gradientClass = gradients[idx % gradients.length];

            return (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -10, scale: 1.02 }}
                onClick={() => handleSubjectSelect(subject)}
                className="relative group cursor-pointer overflow-hidden rounded-[2.5rem] p-1 shadow-xl hover:shadow-2xl transition-all duration-500"
              >
                {/* Background Gradient Layer */}
                <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass} opacity-90 group-hover:opacity-100 transition-opacity duration-500`} />
                
                {/* Glass Overlay */}
                <div className="absolute inset-0 backdrop-blur-[1px] bg-white/5 border border-white/20 rounded-[2.5rem]" />
                
                {/* Content Container */}
                <div className="relative p-10 flex flex-col items-center text-center text-white min-h-[320px] justify-center z-10">
                  {/* Icon with floating effect */}
                  <motion.div 
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="mb-8 p-6 rounded-3xl bg-white/20 backdrop-blur-md shadow-2xl border border-white/30 group-hover:scale-110 transition-transform duration-500"
                  >
                    <IconComponent className="w-12 h-12 text-white drop-shadow-lg" />
                  </motion.div>
                  
                  <div className="space-y-3">
                    <h3 className="text-3xl font-extrabold tracking-tight drop-shadow-md">
                      {subject.name}
                    </h3>
                    <p className="text-white/80 font-semibold text-lg">
                      {subject.topics.length} {t('quizTopicsTitle').toLowerCase()}
                    </p>
                  </div>

                  {/* Action Button */}
                  <div className="mt-10">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-white text-blue-700 px-10 py-4 rounded-2xl font-black text-lg shadow-2xl opacity-0 group-hover:opacity-100 translate-y-6 group-hover:translate-y-0 transition-all duration-500"
                    >
                      Testni boshlash
                    </motion.div>
                  </div>
                </div>

                {/* Decorative Blobs */}
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700" />
                <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-black/10 rounded-full blur-3xl group-hover:bg-black/20 transition-all duration-700" />
              </motion.div>
            );
          }) : (
            <div className="col-span-full text-center py-20 bg-secondary/20 rounded-3xl border border-dashed border-border/60">
              <div className="bg-background w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Hozircha testlar mavjud emas</h3>
              <p className="text-foreground/50 max-w-sm mx-auto">Admin panelidan testlar qo'shing yoki eski testlarni tiklang.</p>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  if (step === 'topics') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setStep('subjects')} className="p-3 hover:bg-secondary rounded-full transition-colors text-foreground/60 hover:text-foreground">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">{selectedSubject.name} <span className="text-primary mx-2">&rarr;</span> {t('quizTopicsTitle')}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {selectedSubject.topics.map((topic: any) => (
            <motion.button
              key={topic.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleTopicSelect(topic)}
              className="bg-card p-8 rounded-2xl border border-border/40 shadow-sm hover:shadow-sm transition-all text-left flex justify-between items-center group"
            >
              <div>
                <h3 className="text-xl font-medium text-foreground group-hover:text-primary transition-colors tracking-tight">{topic.name}</h3>
                <p className="text-sm text-foreground/50 mt-2 font-medium bg-secondary w-fit px-3 py-1 rounded-lg">{topic.questions.length} {t('quizQuestion').toLowerCase()}</p>
              </div>
              <ChevronRight className="w-6 h-6 text-foreground/30 group-hover:text-primary transition-colors group-hover:translate-x-1" />
            </motion.button>
          ))}
        </div>
      </motion.div>
    );
  }

  if (step === 'quiz') {
    const currentQ = selectedTopic.questions[currentQuestionIdx];
    const progress = ((currentQuestionIdx + 1) / selectedTopic.questions.length) * 100;

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-6">
        <div className="flex justify-between items-center bg-card p-4 rounded-2xl border border-border/40 shadow-sm">
          <div className="flex items-center gap-4 w-full">
            <div className="w-12 h-12 bg-primary text-primary-foreground rounded-xl flex items-center justify-center font-semibold text-lg shadow-inner">
              {currentQuestionIdx + 1}
            </div>
            <div className="flex-1 pr-4">
              <div className="flex justify-between items-end mb-2">
                <h2 className="font-medium text-foreground text-sm">{t('quizQuestion')} {currentQuestionIdx + 1} / {selectedTopic.questions.length}</h2>
                <span className="text-xs font-semibold text-primary">{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-primary" />
              </div>
            </div>
            <button 
              onClick={() => {
                if (window.confirm('Testni to\'xtatmoqchimisiz?')) {
                  resetQuiz();
                }
              }}
              className="p-2 hover:bg-red-500/10 text-foreground/40 hover:text-red-500 rounded-lg transition-colors"
              title="Testni to'xtatish"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="bg-card border border-border/40 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
          <h3 className="text-xl md:text-2xl font-semibold text-foreground leading-snug tracking-tight">{currentQ.text}</h3>
          
          <div className="grid grid-cols-1 gap-3">
            {currentQ.options.map((option: string, idx: number) => {
              let stateClass = "border-border/40 hover:border-primary/50 hover:bg-primary/5 text-foreground";
              if (isAnswered) {
                if (idx === currentQ.correct) stateClass = "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
                else if (idx === selectedOption) stateClass = "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400";
                else stateClass = "border-border/40 opacity-40 text-foreground";
              } else if (idx === selectedOption) {
                stateClass = "border-primary bg-primary/10 text-primary";
              }

              return (
                <button 
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={isAnswered}
                  className={`w-full text-left p-4 rounded-xl border-2 font-medium transition-all duration-200 flex justify-between items-center group ${stateClass}`}
                >
                  <span className="text-base">{option}</span>
                  {isAnswered && idx === currentQ.correct && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                  {isAnswered && idx === selectedOption && idx !== currentQ.correct && <X className="w-5 h-5 text-red-500" />}
                </button>
              );
            })}
          </div>

          {isAnswered && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 pt-4 border-t border-border/40"
            >
              {currentQ.explanation && (
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                  <div className="flex items-center gap-2 mb-2 text-primary">
                    <Info className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Tushuntirish</span>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed">{currentQ.explanation}</p>
                </div>
              )}
              
              <button 
                onClick={handleNextQuestion}
                className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
              >
                {currentQuestionIdx < selectedTopic.questions.length - 1 ? (
                  <>Keyingi savol <ChevronRight className="w-5 h-5" /></>
                ) : (
                  <>Natijani ko'rish <ChevronRight className="w-5 h-5" /></>
                )}
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  }

  if (step === 'result') {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto text-center space-y-8">
        <div className="bg-card p-12 rounded-2xl border border-border/40 shadow-md shadow-primary/10 space-y-8 relative overflow-hidden">
          {percentage >= 80 && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10">
              <Sparkles className="w-full h-full text-emerald-500" />
            </div>
          )}
          
          <motion.div {...(animationProps as any)} className="space-y-4 relative z-10">
            <h2 className={`text-5xl font-semibold tracking-tight ${resultColor}`}>{resultMessage}</h2>
            <p className="text-foreground/60 text-xl font-medium">{user?.displayName || 'Mehmon'}</p>
          </motion.div>
          
          <div className="grid grid-cols-2 gap-6 relative z-10">
            <div className="bg-secondary/50 p-6 rounded-2xl border border-border/40">
              <p className="text-foreground/50 text-sm font-medium mb-2 uppercase tracking-wider">{t('quizScore')}</p>
              <p className="text-5xl font-semibold text-foreground">{score} <span className="text-2xl text-foreground/40">/ {totalQuestions}</span></p>
            </div>
            <div className="bg-secondary/50 p-6 rounded-2xl border border-border/40">
              <p className="text-foreground/50 text-sm font-medium mb-2 uppercase tracking-wider">Foiz</p>
              <p className="text-5xl font-semibold text-foreground">{percentage}%</p>
            </div>
          </div>
          
          <div className="pt-6 relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button 
              onClick={() => setStep('review')}
              className="bg-secondary text-foreground px-8 py-4 rounded-2xl font-medium hover:bg-secondary/80 transition-all flex items-center justify-center gap-2"
            >
              <Eye className="w-5 h-5" /> Javoblarni ko'rish
            </button>
            <button 
              onClick={resetQuiz}
              className="bg-foreground text-background px-8 py-4 rounded-2xl font-medium hover:bg-foreground/90 transition-all shadow-sm hover:-translate-y-1"
            >
              {t('quizBackToSubjects')}
            </button>
          </div>
          <p className="text-xs font-medium text-foreground/40 mt-4">Natijangiz PDF formatida yuklab olinmoqda...</p>
        </div>
      </motion.div>
    );
  }

  if (step === 'review') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => setStep('result')} className="p-3 hover:bg-secondary rounded-full transition-colors text-foreground/60 hover:text-foreground">
              <ChevronRight className="w-6 h-6 rotate-180" />
            </button>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">Savollarni ko'rib chiqish</h2>
          </div>
          <div className="bg-primary/10 text-primary px-4 py-2 rounded-xl font-bold">
            {score} / {totalQuestions}
          </div>
        </div>

        <div className="space-y-6">
          {selectedTopic.questions.map((q: any, qIdx: number) => {
            const userAnswer = userAnswers[qIdx];
            const isCorrect = userAnswer === q.correct;

            return (
              <div key={qIdx} className="bg-card border border-border/40 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${isCorrect ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                    {qIdx + 1}
                  </div>
                  <h3 className="text-lg md:text-xl font-medium text-foreground leading-snug">{q.text}</h3>
                </div>

                <div className="grid grid-cols-1 gap-3 pl-14">
                  {q.options.map((option: string, oIdx: number) => {
                    let optionClass = "border-border/40 text-foreground/60";
                    if (oIdx === q.correct) optionClass = "border-emerald-500 bg-emerald-500/10 text-emerald-600 font-bold";
                    else if (oIdx === userAnswer && !isCorrect) optionClass = "border-red-500 bg-red-500/10 text-red-600 font-bold";

                    return (
                      <div key={oIdx} className={`p-4 rounded-xl border-2 flex justify-between items-center ${optionClass}`}>
                        <span className="text-base">{option}</span>
                        {oIdx === q.correct && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                        {oIdx === userAnswer && !isCorrect && <X className="w-5 h-5 text-red-500" />}
                      </div>
                    );
                  })}
                </div>

                {q.explanation && (
                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 ml-14">
                    <div className="flex items-center gap-2 mb-2 text-primary">
                      <Info className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Tushuntirish</span>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed">{q.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-center pt-8">
          <button 
            onClick={resetQuiz}
            className="bg-foreground text-background px-12 py-4 rounded-2xl font-medium hover:bg-foreground/90 transition-all shadow-lg hover:-translate-y-1"
          >
            {t('quizBackToSubjects')}
          </button>
        </div>
      </motion.div>
    );
  }

  return null;
}

function FanlarPage({ data }: { data: Subject[] }) {
  const { t } = useTranslation();
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [activeTab, setActiveTab] = useState<'videos' | 'guides'>('videos');

  if (selectedTopic) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-6"
      >
        <button 
          onClick={() => setSelectedTopic(null)}
          className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors bg-primary/10 px-4 py-2 rounded-xl font-medium w-fit"
        >
          <ArrowLeft className="w-5 h-5" />
          {t('fanlarBack')}
        </button>

        <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
          <h2 className="text-3xl font-bold text-foreground mb-4">{selectedTopic.title}</h2>
          <p className="text-foreground/60 text-lg leading-relaxed mb-8">{selectedTopic.description}</p>

          <div className="flex gap-4 border-b border-border mb-8">
            <button
              onClick={() => setActiveTab('videos')}
              className={`pb-4 px-4 font-medium transition-colors relative ${activeTab === 'videos' ? 'text-primary' : 'text-foreground/60 hover:text-foreground'}`}
            >
              {t('fanlarVideoLessons')}
              {activeTab === 'videos' && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('guides')}
              className={`pb-4 px-4 font-medium transition-colors relative ${activeTab === 'guides' ? 'text-primary' : 'text-foreground/60 hover:text-foreground'}`}
            >
              {t('fanlarGuides')}
              {activeTab === 'guides' && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeTab === 'videos' && selectedTopic.videos.map(video => (
              <div key={video.id} className="bg-secondary/30 rounded-2xl overflow-hidden border border-border group">
                <div className="aspect-video bg-black/5 relative group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <Play className="w-12 h-12 text-primary opacity-80 group-hover:scale-110 transition-transform" />
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-foreground text-lg mb-2">{video.title}</h3>
                  <p className="text-foreground/60 text-sm mb-4 line-clamp-2">{video.description}</p>
                  <a 
                    href={video.videoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary font-medium hover:text-primary/80 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {t('fanlarWatchVideo')}
                  </a>
                </div>
              </div>
            ))}

            {activeTab === 'guides' && selectedTopic.guides.map(guide => (
              <div key={guide.id} className="bg-secondary/30 rounded-2xl p-6 border border-border group hover:border-primary/30 transition-colors flex flex-col h-full">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-primary">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-foreground text-lg mb-2">{guide.title}</h3>
                <p className="text-foreground/60 text-sm mb-6 flex-grow">{guide.description}</p>
                <a 
                  href={guide.driveLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  {t('fanlarDownloadGuide')}
                </a>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  if (selectedSubject) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-6"
      >
        <button 
          onClick={() => setSelectedSubject(null)}
          className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors bg-primary/10 px-4 py-2 rounded-xl font-medium w-fit"
        >
          <ArrowLeft className="w-5 h-5" />
          {t('fanlarBack')}
        </button>

        <div className="bg-card border border-border rounded-3xl p-8 shadow-sm mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-4">{selectedSubject.title}</h2>
          <p className="text-foreground/60 text-lg leading-relaxed">{selectedSubject.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {selectedSubject.topics.map(topic => (
            <button
              key={topic.id}
              onClick={() => setSelectedTopic(topic)}
              className="text-left bg-card border border-border rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all group"
            >
              <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">{topic.title}</h3>
              <p className="text-foreground/60 text-sm line-clamp-2 mb-6">{topic.description}</p>
              <div className="flex items-center gap-4 text-sm font-medium text-foreground/50">
                <span className="flex items-center gap-1.5"><Video className="w-4 h-4" /> {topic.videos.length} {t('fanlarVideosCount')}</span>
                <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> {topic.guides.length} {t('fanlarGuidesCount')}</span>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-4xl font-bold text-foreground mb-4">{t('fanlarTitle')}</h1>
        <p className="text-lg text-foreground/60">{t('fanlarDesc')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.map(subject => {
          const Icon = (Icons[subject.icon as keyof typeof Icons] as React.ElementType) || BookOpen;
          return (
            <button
              key={subject.id}
              onClick={() => setSelectedSubject(subject)}
              className="text-left bg-card border border-border rounded-3xl p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10 group-hover:bg-primary/10 transition-colors" />
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                <Icon className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">{subject.title}</h3>
              <p className="text-foreground/60 leading-relaxed mb-6 line-clamp-2">{subject.description}</p>
              <div className="flex items-center gap-2 text-primary font-medium">
                <span>{subject.topics.length} {t('fanlarTopics')}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

function AdminPage({ mnemonics, questions, symptoms, videos, patients, sections, settings, library, osceScenarios, fanlar, setFanlar, appSettings, setAppSettings, news, setNews, journals, setJournals, onUpdate, onUpdateLibrary, themeColor, setThemeColor, showAlert, showConfirm }: { 
  mnemonics: Mnemonic[], 
  questions: Question[], 
  symptoms: SymptomData[], 
  videos: VideoData[],
  patients: Patient[],
  sections: Section[],
  settings: Setting[],
  library: any,
  osceScenarios: OSCEScenario[],
  fanlar: Subject[],
  setFanlar: (data: Subject[]) => void,
  appSettings: any,
  setAppSettings: (data: any) => void,
  news: NewsItem[],
  setNews: (data: NewsItem[]) => void,
  journals: JournalItem[],
  setJournals: (data: JournalItem[]) => void,
  onUpdate: () => void,
  onUpdateLibrary: (data: any) => void,
  themeColor: string,
  setThemeColor: (color: string) => void,
  showAlert: (title: string, content: string) => void,
  showConfirm: (title: string, content: string, onConfirm: () => void) => void
}) {
  const [activeTab, setActiveTab] = useState<'mnemonics' | 'questions' | 'symptoms' | 'videos' | 'patients' | 'sections' | 'settings' | 'library' | 'osce' | 'fanlar' | 'appSettings' | 'news' | 'journals'>('mnemonics');
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editingTopic, setEditingTopic] = useState<{ subjectId: string, topic: Topic } | null>(null);

  const toggleSubject = (subject: string) => setExpandedSubjects(prev => ({ ...prev, [subject]: !prev[subject] }));
  const toggleTopic = (topic: string) => setExpandedTopics(prev => ({ ...prev, [topic]: !prev[topic] }));
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      console.log("Logged in user UID:", user.uid);

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      console.log("User doc exists:", userDoc.exists());
      
      const hardcodedAdmins = ["muhammadboburolimjonov2@gmail.com", "olimjonovmuhammadbobur0@gmail.com"];
      const isHardcodedAdmin = hardcodedAdmins.includes(user.email || '');

      if ((userDoc.exists() && userDoc.data().role === 'admin') || isHardcodedAdmin) {
        setIsAdmin(true);
      } else {
        console.error("User document does not exist or not an admin:", userDoc.exists() ? userDoc.data() : "No doc");
        await signOut(auth);
        setError(`Sizda admin huquqlari yo'q. UID: ${user.uid}`);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError('Kirishda xatolik yuz berdi. Konsolni tekshiring.');
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (type: string, id: string) => {
    showConfirm('O\'chirish', 'Haqiqatan ham o\'chirmoqchimisiz?', async () => {
      try {
        await deleteDoc(doc(db, type, id));
        onUpdate();
      } catch (error) {
        console.error('Error deleting item:', error);
        showAlert('Xatolik', 'O\'chirishda xatolik yuz berdi.');
      }
    });
  };

  const updateItem = async (type: string, id: string, data: any) => {
    try {
      await updateDoc(doc(db, type, id), data);
      onUpdate();
      return true;
    } catch (error) {
      console.error('Error updating item:', error);
      showAlert('Xatolik', 'Tahrirlashda xatolik yuz berdi.');
      return false;
    }
  };

  const addItem = async (type: string, data: any) => {
    try {
      await addDoc(collection(db, type), data);
      onUpdate();
      return true;
    } catch (error) {
      console.error('Error adding:', error);
      showAlert('Xatolik', 'Tarmoq xatoligi yuz berdi yoki ruxsat yo\'q.');
      return false;
    }
  };

  const [isRestoring, setIsRestoring] = useState(false);
  const handleRestoreOldTests = async () => {
    if (isRestoring) return;
    setIsRestoring(true);
    try {
      let updatedFanlar = [...fanlar];
      
      // Get existing questions to avoid duplicates
      const existingQuestionsSnap = await getDocs(collection(db, 'questions'));
      const existingQuestionTexts = new Set(existingQuestionsSnap.docs.map(doc => doc.data().question));

      for (const subject of quizData.subjects) {
        let existingSubject = updatedFanlar.find(f => f.title === subject.name);
        if (!existingSubject) {
          existingSubject = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            title: subject.name,
            description: subject.name + ' fanidan testlar',
            icon: subject.icon || 'BookOpen',
            topics: []
          };
          updatedFanlar.push(existingSubject);
        }
        
        for (const topic of subject.topics) {
          let existingTopic = existingSubject.topics.find(t => t.title === topic.name);
          if (!existingTopic) {
            existingTopic = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              title: topic.name,
              videos: [],
              guides: []
            };
            existingSubject.topics.push(existingTopic);
          }
          
          for (const q of topic.questions) {
            if (existingQuestionTexts.has(q.text)) continue;

            const questionData = {
              subject: subject.name,
              topic: topic.name,
              difficulty: 'medium',
              question: q.text,
              options: q.options,
              correct: q.correct,
              explanation: (q as any).explanation || ''
            };
            await addDoc(collection(db, 'questions'), questionData);
            existingQuestionTexts.add(q.text);
          }
        }
      }
      setFanlar(updatedFanlar);
      onUpdate();
      showAlert('Muvaffaqiyatli', 'Eski testlar muvaffaqiyatli tiklandi!');
    } catch (error) {
      console.error('Error restoring tests:', error);
      showAlert('Xatolik', 'Testlarni tiklashda xatolik yuz berdi. Internet aloqasini tekshiring.');
    } finally {
      setIsRestoring(false);
    }
  };

  if (!isAdmin) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto mt-20 p-8 bg-card rounded-2xl shadow-sm border border-border"
      >
        <div className="flex justify-center mb-6">
          <div className="bg-primary/10 p-4 rounded-full">
            <Lock className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-medium text-center mb-6 text-foreground">Admin Kirish</h2>
        {error && <p className="text-red-500 text-sm font-medium text-center mb-4">{error}</p>}
        <button 
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
        >
          {loading ? 'Tekshirilmoqda...' : 'Google orqali kirish'}
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Navigation */}
        <aside className="lg:w-72 flex-shrink-0">
          <div className="bg-card border border-border rounded-2xl p-4 sticky top-24 space-y-1 shadow-sm">
            <div className="px-4 py-4 mb-2">
              <h2 className="text-2xl font-medium text-foreground">Admin Panel</h2>
              <p className="text-xs text-foreground/40 font-medium mt-1">Ma'lumotlarni boshqarish</p>
            </div>
            
            <div className="space-y-1">
              {[
                { id: 'mnemonics', label: 'Mnemonikalar', icon: Brain },
                { id: 'questions', label: 'Testlar', icon: CheckCircle2 },
                { id: 'symptoms', label: 'Simptomlar', icon: Stethoscope },
                { id: 'videos', label: 'Videolar', icon: Video },
                { id: 'patients', label: 'Bemorlar', icon: Heart },
                { id: 'library', label: 'Kutubxona', icon: BookOpen },
                { id: 'osce', label: 'OSCE Ssenariylari', icon: Stethoscope },
                { id: 'sections', label: 'Bo\'limlar', icon: Plus },
                { id: 'fanlar', label: 'Fanlar', icon: BookOpen },
                { id: 'news', label: 'Yangiliklar', icon: Globe },
                { id: 'journals', label: 'Jurnallar', icon: BookOpen },
                { id: 'appSettings', label: 'Ilova Sozlamalari', icon: Settings },
                { id: 'settings', label: 'Sozlamalar', icon: Settings },
              ].map(tab => {
                const Icon = tab.icon;
                const label = tab.label;
                const id = tab.id as any;
                
                return (
                  <button 
                    key={id}
                    onClick={() => { setActiveTab(id); setEditingQuestion(null); setEditingSubject(null); setEditingTopic(null); }}
                    className={`w-full px-4 py-3.5 rounded-2xl text-sm font-medium transition-all flex items-center gap-3.5 ${activeTab === id ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-foreground/60 hover:bg-secondary hover:text-primary'}`}
                  >
                    <Icon className={`w-5 h-5 ${activeTab === id ? 'text-primary-foreground' : 'text-foreground/40'}`} />
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="pt-4 mt-4 border-t border-border space-y-2">
              <button 
                onClick={() => {
                  showConfirm('Tiklash', 'Boshlang\'ich ma\'lumotlarni tiklashni xohlaysizmi?', async () => {
                    try {
                      const { mnemonics, questions, symptomCheckerData, osceScenarios } = await import('./data');
                      for (const m of mnemonics) await addDoc(collection(db, 'mnemonics'), m);
                      for (const q of questions) await addDoc(collection(db, 'questions'), q);
                      for (const s of symptomCheckerData) await addDoc(collection(db, 'symptoms'), s);
                      for (const o of osceScenarios) await addDoc(collection(db, 'osce_scenarios'), o);
                      showAlert('Muvaffaqiyat', 'Ma\'lumotlar muvaffaqiyatli tiklandi!');
                      onUpdate();
                    } catch(e) {
                      console.error(e);
                      showAlert('Xatolik', 'Xatolik yuz berdi');
                    }
                  });
                }}
                className="w-full px-4 py-3.5 rounded-2xl text-sm font-medium text-emerald-600 hover:bg-emerald-50 transition-all flex items-center gap-3.5"
              >
                <RefreshCw className="w-5 h-5" /> Ma'lumotlarni tiklash
              </button>
              <button 
                onClick={() => signOut(auth)}
                className="w-full px-4 py-3.5 rounded-2xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all flex items-center gap-3.5"
              >
                <LogOut className="w-5 h-5" /> Chiqish
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 space-y-8">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 bg-card border border-border rounded-2xl overflow-hidden shadow-sm h-fit">
              <div className="px-6 py-5 border-b border-border bg-secondary/50 flex justify-between items-center">
                <h3 className="font-medium text-foreground flex items-center gap-2">
                  {activeTab === 'mnemonics' ? <Brain className="w-5 h-5 text-primary" /> : activeTab === 'questions' ? <CheckCircle2 className="w-5 h-5 text-primary" /> : activeTab === 'symptoms' ? <Stethoscope className="w-5 h-5 text-primary" /> : activeTab === 'videos' ? <Video className="w-5 h-5 text-primary" /> : activeTab === 'patients' ? <Heart className="w-5 h-5 text-primary" /> : activeTab === 'library' ? <BookOpen className="w-5 h-5 text-primary" /> : activeTab === 'osce' ? <Stethoscope className="w-5 h-5 text-primary" /> : activeTab === 'sections' ? <Plus className="w-5 h-5 text-primary" /> : activeTab === 'fanlar' ? <BookOpen className="w-5 h-5 text-primary" /> : activeTab === 'news' ? <Globe className="w-5 h-5 text-primary" /> : activeTab === 'journals' ? <BookOpen className="w-5 h-5 text-primary" /> : <Settings className="w-5 h-5 text-primary" />}
                  {activeTab === 'mnemonics' ? 'Mnemonikalar Ro\'yxati' : activeTab === 'questions' ? 'Testlar Ro\'yxati' : activeTab === 'symptoms' ? 'Simptomlar Ro\'yxati' : activeTab === 'videos' ? 'Videolar Ro\'yxati' : activeTab === 'patients' ? 'Bemorlar Ro\'yxati' : activeTab === 'library' ? 'Kutubxona Strukturasi' : activeTab === 'osce' ? 'OSCE Ssenariylari' : activeTab === 'sections' ? 'Bo\'limlar Ro\'yxati' : activeTab === 'fanlar' ? 'Fanlar Ro\'yxati' : activeTab === 'news' ? 'Yangiliklar Ro\'yxati' : activeTab === 'journals' ? 'Jurnallar Ro\'yxati' : activeTab === 'appSettings' ? 'Ilova Sozlamalari' : 'Tizim Sozlamalari'}
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-1 rounded-full uppercase tracking-wider">
                    {(activeTab === 'mnemonics' ? mnemonics : activeTab === 'questions' ? questions : activeTab === 'symptoms' ? symptoms : activeTab === 'videos' ? videos : activeTab === 'patients' ? patients : activeTab === 'library' ? library.subjects : activeTab === 'osce' ? osceScenarios : activeTab === 'fanlar' ? fanlar : activeTab === 'news' ? news : activeTab === 'journals' ? journals : activeTab === 'appSettings' ? [] : sections).length} ta element
                  </span>
                  <button 
                    onClick={handleRestoreOldTests} 
                    disabled={isRestoring}
                    className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isRestoring ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    {isRestoring ? 'Tiklanmoqda...' : 'Eski testlarni tiklash'}
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-secondary/30 border-b border-border">
                    <tr>
                      <th className="px-6 py-4 text-xs font-medium text-foreground/50 uppercase tracking-wider">Ma'lumot</th>
                      <th className="px-6 py-4 text-xs font-medium text-foreground/50 uppercase tracking-wider w-24 text-right">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {activeTab === 'mnemonics' && mnemonics.map(m => (
                      <tr key={m.id} className="hover:bg-secondary/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-medium text-foreground group-hover:text-primary transition-colors">{m.title}</div>
                          <div className="text-[10px] text-primary font-medium uppercase tracking-widest mt-0.5">{m.category}</div>
                          <div className="text-sm text-foreground/60 mt-2 font-mono bg-secondary/50 p-2 rounded-lg border border-border">{m.mnemonic}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => deleteItem('mnemonics', m.id!)} className="p-2.5 text-foreground/40 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4.5 h-4.5" /></button>
                        </td>
                      </tr>
                    ))}
                    {activeTab === 'questions' && (
                      Object.entries(
                        questions.reduce((acc, q) => {
                          if (!acc[q.subject]) acc[q.subject] = {};
                          if (!acc[q.subject][q.topic]) acc[q.subject][q.topic] = [];
                          acc[q.subject][q.topic].push(q);
                          return acc;
                        }, {} as Record<string, Record<string, Question[]>>)
                      ).map(([subject, topics]) => (
                        <React.Fragment key={subject}>
                          <tr className="hover:bg-secondary/50 transition-colors group bg-secondary/10 cursor-pointer" onClick={() => toggleSubject(subject)}>
                            <td colSpan={2} className="px-6 py-4">
                              <div className="font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                                <ChevronRight className={`w-4 h-4 transition-transform ${expandedSubjects[subject] ? 'rotate-90' : ''}`} />
                                <BookOpen className="w-4 h-4" /> {subject}
                              </div>
                            </td>
                          </tr>
                          {expandedSubjects[subject] && Object.entries(topics).map(([topic, qs]) => (
                            <React.Fragment key={topic}>
                              <tr className="hover:bg-secondary/50 transition-colors group cursor-pointer" onClick={() => toggleTopic(topic)}>
                                <td colSpan={2} className="px-6 py-3 pl-12 border-l-2 border-primary/20">
                                  <div className="font-medium text-foreground/90 group-hover:text-primary transition-colors flex items-center gap-2">
                                    <ChevronRight className={`w-3 h-3 transition-transform ${expandedTopics[topic] ? 'rotate-90' : ''}`} />
                                    {topic}
                                  </div>
                                </td>
                              </tr>
                              {expandedTopics[topic] && qs.map(q => (
                                <tr key={q.id} className="hover:bg-secondary/50 transition-colors group">
                                  <td className="px-6 py-2 pl-20 border-l-2 border-primary/20">
                                    <div className="text-sm text-foreground/80 group-hover:text-primary transition-colors flex items-center gap-2">
                                      <CheckCircle2 className="w-3 h-3" /> {q.question}
                                    </div>
                                    <div className="text-[10px] text-foreground/50 mt-1 ml-5">{q.difficulty}</div>
                                  </td>
                                  <td className="px-6 py-2 text-right flex justify-end gap-1">
                                    <button onClick={(e) => { e.stopPropagation(); setEditingQuestion(q); }} className="p-1.5 text-foreground/40 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"><Edit2 className="w-3.5 h-3.5" /></button>
                                    <button onClick={(e) => { e.stopPropagation(); deleteItem('questions', q.id!); }} className="p-1.5 text-foreground/40 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
                          ))}
                        </React.Fragment>
                      ))
                    )}
                    {activeTab === 'symptoms' && symptoms.map(s => (
                      <tr key={s.id} className="hover:bg-secondary/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-medium text-foreground group-hover:text-primary transition-colors">{s.diagnosis}</div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {s.symptoms.map((sym, i) => (
                              <span key={i} className="text-[10px] bg-secondary px-2 py-0.5 rounded-full text-foreground/60 border border-border">{sym}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => deleteItem('symptoms', s.id!)} className="p-2.5 text-foreground/40 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4.5 h-4.5" /></button>
                        </td>
                      </tr>
                    ))}
                    {activeTab === 'videos' && videos.map(v => (
                      <tr key={v.id} className="hover:bg-secondary/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-medium text-foreground group-hover:text-primary transition-colors">{v.title}</div>
                          <div className="text-xs text-foreground/60 mt-1">{v.category} • {v.duration}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => deleteItem('videos', v.id!)} className="p-2.5 text-foreground/40 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4.5 h-4.5" /></button>
                        </td>
                      </tr>
                    ))}
                    {activeTab === 'patients' && patients.map(p => (
                      <tr key={p.id} className="hover:bg-secondary/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-medium text-foreground group-hover:text-primary transition-colors">{p.name} ({p.age} yosh)</div>
                          <div className="text-xs text-foreground/60 mt-1">{p.symptoms} • {p.condition} • {p.healthScore}%</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => deleteItem('patients', p.id!)} className="p-2.5 text-foreground/40 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4.5 h-4.5" /></button>
                        </td>
                      </tr>
                    ))}
                    {activeTab === 'library' && library.subjects.map((sub: any) => (
                      <tr key={sub.id} className="hover:bg-secondary/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-medium text-foreground group-hover:text-primary transition-colors">{sub.name}</div>
                          <div className="text-xs text-foreground/60 mt-1">{sub.topics.length} ta mavzu</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => {
                              showConfirm('O\'chirish', 'Ushbu fanni va uning barcha mavzularini o\'chirmoqchimisiz?', () => {
                                const newSubjects = library.subjects.filter((s: any) => s.id !== sub.id);
                                onUpdateLibrary({ ...library, subjects: newSubjects });
                              });
                            }} 
                            className="p-2.5 text-foreground/40 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {activeTab === 'sections' && sections.map(sec => (
                      <tr key={sec.id} className="hover:bg-secondary/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-medium text-foreground group-hover:text-primary transition-colors">{sec.title}</div>
                          <div className="text-xs text-foreground/60 mt-1 line-clamp-1">{sec.content}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => deleteItem('sections', sec.id!)} className="p-2.5 text-foreground/40 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4.5 h-4.5" /></button>
                        </td>
                      </tr>
                    ))}
                    {activeTab === 'osce' && osceScenarios.map(osce => (
                      <tr key={osce.id} className="hover:bg-secondary/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-medium text-foreground group-hover:text-primary transition-colors">{osce.title}</div>
                          <div className="text-xs text-foreground/60 mt-1 line-clamp-1">{osce.description}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => deleteItem('osce_scenarios', osce.id!)} className="p-2.5 text-foreground/40 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4.5 h-4.5" /></button>
                        </td>
                      </tr>
                    ))}
                    {activeTab === 'fanlar' && fanlar.map(fan => (
                      <React.Fragment key={fan.id}>
                        <tr className="hover:bg-secondary/50 transition-colors group bg-secondary/10">
                          <td className="px-6 py-4">
                            <div className="font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                              <BookOpen className="w-4 h-4" /> {fan.title}
                            </div>
                            <div className="text-xs text-foreground/60 mt-1 line-clamp-1">{fan.description}</div>
                          </td>
                          <td className="px-6 py-4 text-right flex justify-end gap-1">
                            <button onClick={() => setEditingSubject(fan)} className="p-2.5 text-foreground/40 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"><Edit2 className="w-4.5 h-4.5" /></button>
                            <button onClick={() => {
                              showConfirm('O\'chirish', 'Ushbu fanni o\'chirmoqchimisiz?', () => {
                                setFanlar(fanlar.filter(f => f.id !== fan.id));
                              });
                            }} className="p-2.5 text-foreground/40 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4.5 h-4.5" /></button>
                          </td>
                        </tr>
                        {fan.topics.map(topic => (
                          <React.Fragment key={topic.id}>
                            <tr className="hover:bg-secondary/50 transition-colors group">
                              <td className="px-6 py-3 pl-12 border-l-2 border-primary/20">
                                <div className="font-medium text-foreground/90 group-hover:text-primary transition-colors flex items-center gap-2">
                                  <ChevronRight className="w-3 h-3" /> {topic.title}
                                </div>
                              </td>
                              <td className="px-6 py-3 text-right flex justify-end gap-1">
                                <button onClick={() => setEditingTopic({ subjectId: fan.id!, topic })} className="p-2 text-foreground/40 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => {
                                  showConfirm('O\'chirish', 'Ushbu mavzuni o\'chirmoqchimisiz?', () => {
                                    setFanlar(fanlar.map(f => f.id === fan.id ? { ...f, topics: f.topics.filter(t => t.id !== topic.id) } : f));
                                  });
                                }} className="p-2 text-foreground/40 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                              </td>
                            </tr>
                            {topic.videos.map(video => (
                              <tr key={video.id} className="hover:bg-secondary/50 transition-colors group">
                                <td className="px-6 py-2 pl-20 border-l-2 border-primary/20">
                                  <div className="text-sm text-foreground/80 group-hover:text-primary transition-colors flex items-center gap-2">
                                    <Video className="w-3 h-3" /> {video.title}
                                  </div>
                                </td>
                                <td className="px-6 py-2 text-right">
                                  <button onClick={() => {
                                    showConfirm('O\'chirish', 'Ushbu videoni o\'chirmoqchimisiz?', () => {
                                      setFanlar(fanlar.map(f => f.id === fan.id ? { ...f, topics: f.topics.map(t => t.id === topic.id ? { ...t, videos: t.videos.filter(v => v.id !== video.id) } : t) } : f));
                                    });
                                  }} className="p-1.5 text-foreground/40 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                                </td>
                              </tr>
                            ))}
                            {topic.guides.map(guide => (
                              <tr key={guide.id} className="hover:bg-secondary/50 transition-colors group">
                                <td className="px-6 py-2 pl-20 border-l-2 border-primary/20">
                                  <div className="text-sm text-foreground/80 group-hover:text-primary transition-colors flex items-center gap-2">
                                    <FileText className="w-3 h-3" /> {guide.title}
                                  </div>
                                </td>
                                <td className="px-6 py-2 text-right">
                                  <button onClick={() => {
                                    showConfirm('O\'chirish', 'Ushbu qo\'llanmani o\'chirmoqchimisiz?', () => {
                                      setFanlar(fanlar.map(f => f.id === fan.id ? { ...f, topics: f.topics.map(t => t.id === topic.id ? { ...t, guides: t.guides.filter(g => g.id !== guide.id) } : t) } : f));
                                    });
                                  }} className="p-1.5 text-foreground/40 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </React.Fragment>
                    ))}
                    {activeTab === 'news' && news.map(item => (
                      <tr key={item.id} className="hover:bg-secondary/50 transition-colors group border-b border-border/50 last:border-0">
                        <td className="px-6 py-4">
                          <div className="font-medium text-foreground group-hover:text-primary transition-colors">{item.title}</div>
                          <div className="text-xs text-foreground/60 mt-1 line-clamp-1">{item.category} • {item.date}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => showConfirm('O\'chirish', 'Rostdan ham bu yangilikni o\'chirmoqchimisiz?', () => setNews(news.filter(n => n.id !== item.id)))} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {activeTab === 'journals' && journals.map(item => (
                      <tr key={item.id} className="hover:bg-secondary/50 transition-colors group border-b border-border/50 last:border-0">
                        <td className="px-6 py-4">
                          <div className="font-medium text-foreground group-hover:text-primary transition-colors">{item.title}</div>
                          <div className="text-xs text-foreground/60 mt-1 line-clamp-1">{item.category} • {item.date}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => showConfirm('O\'chirish', 'Rostdan ham bu jurnalni o\'chirmoqchimisiz?', () => setJournals(journals.filter(n => n.id !== item.id)))} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {activeTab === 'appSettings' && (
                      <tr className="hover:bg-secondary/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-medium text-foreground group-hover:text-primary transition-colors">Ilova Yaratuvchisi</div>
                          <div className="text-xs text-foreground/60 mt-1 line-clamp-1">{appSettings.creatorName}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-8 shadow-sm h-fit sticky top-24">
              <h3 className="font-medium text-foreground mb-8 flex items-center gap-3 text-xl">
                <div className="bg-primary p-2 rounded-xl">
                  <Plus className="w-5 h-5 text-primary-foreground" />
                </div>
                {activeTab === 'settings' ? 'Tizimni Sozlash' : 'Yangi Qo\'shish'}
              </h3>
              
              <div className="space-y-6">
                {activeTab === 'mnemonics' && <MnemonicForm onAdd={(data) => addItem('mnemonics', data)} />}
                {activeTab === 'questions' && <QuestionForm onAdd={(data) => addItem('questions', data)} onEdit={(id, data) => updateItem('questions', id, data)} onCancelEdit={() => setEditingQuestion(null)} editData={editingQuestion} fanlar={fanlar} />}
                {activeTab === 'symptoms' && <SymptomForm onAdd={(data) => addItem('symptoms', data)} />}
                {activeTab === 'videos' && <VideoForm onAdd={(data) => addItem('videos', data)} />}
                {activeTab === 'patients' && <PatientForm onAdd={(data) => addItem('patients', data)} />}
                {activeTab === 'sections' && <SectionForm onAdd={(data) => addItem('sections', data)} />}
                {activeTab === 'osce' && <OSCEForm onAdd={(data) => addItem('osce_scenarios', data)} />}
                {activeTab === 'library' && <LibraryForm library={library} onUpdate={onUpdateLibrary} />}
                {activeTab === 'fanlar' && <FanlarForm fanlar={fanlar} setFanlar={setFanlar} editSubjectData={editingSubject} editTopicData={editingTopic} onCancelEditSubject={() => setEditingSubject(null)} onCancelEditTopic={() => setEditingTopic(null)} />}
                {activeTab === 'news' && <NewsForm onAdd={async (data) => { setNews([...news, { ...data, id: Date.now().toString() }]); return true; }} />}
                {activeTab === 'journals' && <JournalForm onAdd={async (data) => { setJournals([...journals, { ...data, id: Date.now().toString() }]); return true; }} />}
                {activeTab === 'appSettings' && <AppSettingsForm appSettings={appSettings} setAppSettings={setAppSettings} />}
                {activeTab === 'settings' && <SettingsForm settings={settings} onUpdate={onUpdate} themeColor={themeColor} setThemeColor={setThemeColor} showAlert={showAlert} />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AppSettingsForm({ appSettings, setAppSettings }: { appSettings: any, setAppSettings: (data: any) => void }) {
  const [formData, setFormData] = useState(appSettings);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppSettings(formData);
    alert('Sozlamalar saqlandi!');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Ilova Yaratuvchisi</label>
        <input
          type="text"
          value={formData.creatorName}
          onChange={e => setFormData({ ...formData, creatorName: e.target.value })}
          className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Yaratuvchi Rasmi (URL)</label>
        <input
          type="url"
          value={formData.creatorImage}
          onChange={e => setFormData({ ...formData, creatorImage: e.target.value })}
          className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Gradient Boshlanishi</label>
          <input
            type="color"
            value={formData.gradientFrom}
            onChange={e => setFormData({ ...formData, gradientFrom: e.target.value })}
            className="w-full h-10 rounded-xl cursor-pointer"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Gradient Tugashi</label>
          <input
            type="color"
            value={formData.gradientTo}
            onChange={e => setFormData({ ...formData, gradientTo: e.target.value })}
            className="w-full h-10 rounded-xl cursor-pointer"
          />
        </div>
      </div>
      <button type="submit" className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
        Saqlash
      </button>
    </form>
  );
}

function FanlarForm({ fanlar, setFanlar, editSubjectData, editTopicData, onCancelEditSubject, onCancelEditTopic }: { fanlar: Subject[], setFanlar: (data: Subject[]) => void, editSubjectData?: Subject | null, editTopicData?: { subjectId: string, topic: Topic } | null, onCancelEditSubject?: () => void, onCancelEditTopic?: () => void }) {
  const [newSubject, setNewSubject] = useState({ title: '', description: '', icon: 'BookOpen' });
  const [newTopic, setNewTopic] = useState({ subjectId: '', title: '', description: '' });
  const [newVideo, setNewVideo] = useState({ subjectId: '', topicId: '', title: '', description: '', videoUrl: '' });
  const [newGuide, setNewGuide] = useState({ subjectId: '', topicId: '', title: '', description: '', driveLink: '' });

  useEffect(() => {
    if (editSubjectData) {
      setNewSubject({ title: editSubjectData.title, description: editSubjectData.description, icon: editSubjectData.icon });
    } else {
      setNewSubject({ title: '', description: '', icon: 'BookOpen' });
    }
  }, [editSubjectData]);

  useEffect(() => {
    if (editTopicData) {
      setNewTopic({ subjectId: editTopicData.subjectId, title: editTopicData.topic.title, description: editTopicData.topic.description });
    } else {
      setNewTopic({ subjectId: '', title: '', description: '' });
    }
  }, [editTopicData]);

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.title) return;
    
    if (editSubjectData) {
      const updatedFanlar = fanlar.map(sub => {
        if (sub.id === editSubjectData.id) {
          return { ...sub, title: newSubject.title, description: newSubject.description, icon: newSubject.icon };
        }
        return sub;
      });
      setFanlar(updatedFanlar);
      if (onCancelEditSubject) onCancelEditSubject();
      alert('Fan tahrirlandi!');
    } else {
      const subject: Subject = {
        id: Date.now().toString(),
        title: newSubject.title,
        description: newSubject.description,
        icon: newSubject.icon,
        topics: []
      };
      setFanlar([...fanlar, subject]);
      setNewSubject({ title: '', description: '', icon: 'BookOpen' });
      alert('Fan qo\'shildi!');
    }
  };

  const handleAddTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.subjectId || !newTopic.title) return;
    
    if (editTopicData) {
      const updatedFanlar = fanlar.map(sub => {
        if (sub.id === editTopicData.subjectId) {
          return {
            ...sub,
            topics: sub.topics.map(top => {
              if (top.id === editTopicData.topic.id) {
                return { ...top, title: newTopic.title, description: newTopic.description };
              }
              return top;
            })
          };
        }
        return sub;
      });
      setFanlar(updatedFanlar);
      if (onCancelEditTopic) onCancelEditTopic();
      alert('Mavzu tahrirlandi!');
    } else {
      const updatedFanlar = fanlar.map(sub => {
        if (sub.id === newTopic.subjectId) {
          return {
            ...sub,
            topics: [
              ...sub.topics,
              {
                id: Date.now().toString(),
                title: newTopic.title,
                description: newTopic.description,
                videos: [],
                guides: []
              }
            ]
          };
        }
        return sub;
      });
      setFanlar(updatedFanlar);
      setNewTopic({ subjectId: '', title: '', description: '' });
      alert('Mavzu qo\'shildi!');
    }
  };

  const handleAddVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVideo.subjectId || !newVideo.topicId || !newVideo.title || !newVideo.videoUrl) return;
    const updatedFanlar = fanlar.map(sub => {
      if (sub.id === newVideo.subjectId) {
        return {
          ...sub,
          topics: sub.topics.map(top => {
            if (top.id === newVideo.topicId) {
              return {
                ...top,
                videos: [
                  ...top.videos,
                  {
                    id: Date.now().toString(),
                    title: newVideo.title,
                    description: newVideo.description,
                    videoUrl: newVideo.videoUrl
                  }
                ]
              };
            }
            return top;
          })
        };
      }
      return sub;
    });
    setFanlar(updatedFanlar);
    setNewVideo({ subjectId: '', topicId: '', title: '', description: '', videoUrl: '' });
    alert('Video qo\'shildi!');
  };

  const handleAddGuide = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuide.subjectId || !newGuide.topicId || !newGuide.title || !newGuide.driveLink) return;
    const updatedFanlar = fanlar.map(sub => {
      if (sub.id === newGuide.subjectId) {
        return {
          ...sub,
          topics: sub.topics.map(top => {
            if (top.id === newGuide.topicId) {
              return {
                ...top,
                guides: [
                  ...top.guides,
                  {
                    id: Date.now().toString(),
                    title: newGuide.title,
                    description: newGuide.description,
                    driveLink: newGuide.driveLink
                  }
                ]
              };
            }
            return top;
          })
        };
      }
      return sub;
    });
    setFanlar(updatedFanlar);
    setNewGuide({ subjectId: '', topicId: '', title: '', description: '', driveLink: '' });
    alert('Qo\'llanma qo\'shildi!');
  };

  const selectedSubjectForTopic = fanlar.find(s => s.id === newTopic.subjectId);
  const selectedSubjectForVideo = fanlar.find(s => s.id === newVideo.subjectId);
  const selectedSubjectForGuide = fanlar.find(s => s.id === newGuide.subjectId);

  return (
    <div className="space-y-10">
      {/* Add Subject */}
      <form onSubmit={handleAddSubject} className="space-y-4 p-6 bg-secondary/30 rounded-2xl border border-border">
        <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> Yangi Fan Qo'shish
        </h4>
        <div className="grid grid-cols-1 gap-4">
          <input 
            type="text" 
            placeholder="Fan nomi" 
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary"
            value={newSubject.title}
            onChange={e => setNewSubject({...newSubject, title: e.target.value})}
            required
          />
          <textarea 
            placeholder="Fan tavsifi" 
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
            value={newSubject.description}
            onChange={e => setNewSubject({...newSubject, description: e.target.value})}
            required
          />
          <input 
            type="text" 
            placeholder="Ikonka (Lucide React nomi, masalan: BookOpen)" 
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary"
            value={newSubject.icon}
            onChange={e => setNewSubject({...newSubject, icon: e.target.value})}
            required
          />
          <div className="flex gap-2">
            <button type="submit" className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
              {editSubjectData ? 'Fanni Saqlash' : 'Fanni Qo\'shish'}
            </button>
            {editSubjectData && (
              <button type="button" onClick={onCancelEditSubject} className="flex-1 py-2.5 bg-secondary text-foreground rounded-xl text-sm font-medium hover:bg-secondary/80 transition-colors">
                Bekor qilish
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Add Topic */}
      <form onSubmit={handleAddTopic} className="space-y-4 p-6 bg-secondary/30 rounded-2xl border border-border">
        <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> {editTopicData ? 'Mavzuni Tahrirlash' : 'Yangi Mavzu Qo\'shish'}
        </h4>
        <div className="grid grid-cols-1 gap-4">
          <select 
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary"
            value={newTopic.subjectId}
            onChange={e => setNewTopic({...newTopic, subjectId: e.target.value})}
            required
          >
            <option value="">Fanni tanlang...</option>
            {fanlar.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
          <input 
            type="text" 
            placeholder="Mavzu nomi" 
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary"
            value={newTopic.title}
            onChange={e => setNewTopic({...newTopic, title: e.target.value})}
            required
          />
          <textarea 
            placeholder="Mavzu tavsifi" 
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
            value={newTopic.description}
            onChange={e => setNewTopic({...newTopic, description: e.target.value})}
            required
          />
          <div className="flex gap-2">
            <button type="submit" className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
              {editTopicData ? 'Mavzuni Saqlash' : 'Mavzuni Qo\'shish'}
            </button>
            {editTopicData && (
              <button type="button" onClick={onCancelEditTopic} className="flex-1 py-2.5 bg-secondary text-foreground rounded-xl text-sm font-medium hover:bg-secondary/80 transition-colors">
                Bekor qilish
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Add Video */}
      <form onSubmit={handleAddVideo} className="space-y-4 p-6 bg-secondary/30 rounded-2xl border border-border">
        <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Video className="w-4 h-4 text-primary" /> Yangi Video Dars Qo'shish
        </h4>
        <div className="grid grid-cols-1 gap-4">
          <select 
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary"
            value={newVideo.subjectId}
            onChange={e => setNewVideo({...newVideo, subjectId: e.target.value, topicId: ''})}
            required
          >
            <option value="">Fanni tanlang...</option>
            {fanlar.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
          <select 
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary"
            value={newVideo.topicId}
            onChange={e => setNewVideo({...newVideo, topicId: e.target.value})}
            required
            disabled={!newVideo.subjectId}
          >
            <option value="">Mavzuni tanlang...</option>
            {selectedSubjectForVideo?.topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          <input 
            type="text" 
            placeholder="Video nomi" 
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary"
            value={newVideo.title}
            onChange={e => setNewVideo({...newVideo, title: e.target.value})}
            required
          />
          <textarea 
            placeholder="Video tavsifi" 
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
            value={newVideo.description}
            onChange={e => setNewVideo({...newVideo, description: e.target.value})}
            required
          />
          <input 
            type="url" 
            placeholder="Video URL (YouTube)" 
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary"
            value={newVideo.videoUrl}
            onChange={e => setNewVideo({...newVideo, videoUrl: e.target.value})}
            required
          />
          <button type="submit" className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
            Videoni Saqlash
          </button>
        </div>
      </form>

      {/* Add Guide */}
      <form onSubmit={handleAddGuide} className="space-y-4 p-6 bg-secondary/30 rounded-2xl border border-border">
        <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" /> Yangi Qo'llanma Qo'shish
        </h4>
        <div className="grid grid-cols-1 gap-4">
          <select 
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary"
            value={newGuide.subjectId}
            onChange={e => setNewGuide({...newGuide, subjectId: e.target.value, topicId: ''})}
            required
          >
            <option value="">Fanni tanlang...</option>
            {fanlar.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
          <select 
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary"
            value={newGuide.topicId}
            onChange={e => setNewGuide({...newGuide, topicId: e.target.value})}
            required
            disabled={!newGuide.subjectId}
          >
            <option value="">Mavzuni tanlang...</option>
            {selectedSubjectForGuide?.topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          <input 
            type="text" 
            placeholder="Qo'llanma nomi" 
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary"
            value={newGuide.title}
            onChange={e => setNewGuide({...newGuide, title: e.target.value})}
            required
          />
          <textarea 
            placeholder="Qo'llanma tavsifi" 
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
            value={newGuide.description}
            onChange={e => setNewGuide({...newGuide, description: e.target.value})}
            required
          />
          <input 
            type="url" 
            placeholder="Google Drive URL" 
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary"
            value={newGuide.driveLink}
            onChange={e => setNewGuide({...newGuide, driveLink: e.target.value})}
            required
          />
          <button type="submit" className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
            Qo'llanmani Saqlash
          </button>
        </div>
      </form>
    </div>
  );
}

function LibraryForm({ library, onUpdate }: { library: any, onUpdate: (data: any) => void }) {
  const [newSubject, setNewSubject] = useState({ name: '', icon: 'Stethoscope' });
  const [newTopic, setNewTopic] = useState({ subjectId: '', name: '', manuals: '', cases: '', questions: '' });

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.name) return;
    
    const subject = {
      id: Date.now(),
      name: newSubject.name,
      icon: newSubject.icon,
      topics: []
    };
    
    onUpdate({ ...library, subjects: [...library.subjects, subject] });
    setNewSubject({ name: '', icon: 'Stethoscope' });
  };

  const handleAddTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.subjectId || !newTopic.name) return;
    
    const updatedSubjects = library.subjects.map((sub: any) => {
      if (sub.id === Number(newTopic.subjectId)) {
        return {
          ...sub,
          topics: [
            ...sub.topics,
            {
              id: Date.now(),
              name: newTopic.name,
              resources: {
                manuals: newTopic.manuals.split('\n').filter(i => i.trim()),
                cases: newTopic.cases.split('\n').filter(i => i.trim()),
                questions: newTopic.questions.split('\n').filter(i => i.trim())
              }
            }
          ]
        };
      }
      return sub;
    });
    
    onUpdate({ ...library, subjects: updatedSubjects });
    setNewTopic({ subjectId: '', name: '', manuals: '', cases: '', questions: '' });
  };

  return (
    <div className="space-y-10">
      {/* Add Subject */}
      <form onSubmit={handleAddSubject} className="space-y-4 p-6 bg-secondary/30 rounded-2xl border border-border">
        <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> Yangi Fan Qo'shish
        </h4>
        <div className="grid grid-cols-1 gap-4">
          <input 
            type="text" 
            placeholder="Fan nomi (masalan: Kardiologiya)" 
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary"
            value={newSubject.name}
            onChange={e => setNewSubject({ ...newSubject, name: e.target.value })}
          />
          <select 
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary"
            value={newSubject.icon}
            onChange={e => setNewSubject({ ...newSubject, icon: e.target.value })}
          >
            <option value="Stethoscope">Stetoskop</option>
            <option value="Brain">Miya</option>
            <option value="Heart">Yurak</option>
            <option value="BookOpen">Kitob</option>
            <option value="Activity">Faollik</option>
            <option value="Thermometer">Termometr</option>
          </select>
          <button className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-medium text-sm hover:bg-primary/90 transition-all">
            Fanni saqlash
          </button>
        </div>
      </form>

      {/* Add Topic */}
      <form onSubmit={handleAddTopic} className="space-y-4 p-6 bg-secondary/30 rounded-2xl border border-border">
        <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> Yangi Mavzu Qo'shish
        </h4>
        <div className="space-y-4">
          <select 
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary"
            value={newTopic.subjectId}
            onChange={e => setNewTopic({ ...newTopic, subjectId: e.target.value })}
          >
            <option value="">Fanni tanlang</option>
            {library.subjects.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <input 
            type="text" 
            placeholder="Mavzu nomi" 
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary"
            value={newTopic.name}
            onChange={e => setNewTopic({ ...newTopic, name: e.target.value })}
          />
          <textarea 
            placeholder="Qo'llanmalar (har biri yangi qatorda)" 
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary h-24"
            value={newTopic.manuals}
            onChange={e => setNewTopic({ ...newTopic, manuals: e.target.value })}
          />
          <textarea 
            placeholder="Klinik caselar (har biri yangi qatorda)" 
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary h-24"
            value={newTopic.cases}
            onChange={e => setNewTopic({ ...newTopic, cases: e.target.value })}
          />
          <textarea 
            placeholder="Savollar (har biri yangi qatorda)" 
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary h-24"
            value={newTopic.questions}
            onChange={e => setNewTopic({ ...newTopic, questions: e.target.value })}
          />
          <button className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-medium text-sm hover:bg-primary/90 transition-all">
            Mavzuni saqlash
          </button>
        </div>
      </form>
    </div>
  );
}

function SettingsForm({ settings, onUpdate, themeColor, setThemeColor, showAlert }: { settings: Setting[], onUpdate: () => void, themeColor: string, setThemeColor: (color: string) => void, showAlert: (title: string, content: string) => void }) {
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    const data: Record<string, string> = {};
    settings.forEach(s => data[s.key] = s.value);
    setFormData(data);
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await Promise.all(Object.entries(formData).map(([key, value]) => 
        setDoc(doc(db, 'settings', key), { key, value })
      ));
      onUpdate();
      showAlert("Muvaffaqiyat", "Sozlamalar saqlandi!");
    } catch (error) {
      console.error('Error saving settings:', error);
      showAlert("Xatolik", "Sozlamalarni saqlashda xatolik yuz berdi.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-foreground border-b border-border pb-2">Mavzu rangi</h4>
        <div className="flex gap-3">
          {[
            { name: 'Ko\'k', color: '#007bff' },
            { name: 'Yashil', color: '#28a745' },
            { name: 'Binafsha', color: '#6f42c1' },
            { name: 'To\'q sariq', color: '#fd7e14' },
            { name: 'Yashil-ko\'k', color: '#20c997' }
          ].map((c) => (
            <button
              key={c.color}
              onClick={() => setThemeColor(c.color)}
              className={`w-10 h-10 rounded-full border-2 transition-all ${themeColor === c.color ? 'border-background ring-2 ring-primary scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c.color }}
              title={c.name}
            />
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <h4 className="text-sm font-medium text-foreground border-b border-border pb-2">Aloqa ma'lumotlari</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1">Email</label>
            <input 
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" 
              value={formData['contact_email'] || ''} 
              onChange={e => setFormData({...formData, 'contact_email': e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1">Telegram (username)</label>
            <input 
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" 
              value={formData['contact_telegram'] || ''} 
              onChange={e => setFormData({...formData, 'contact_telegram': e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1">Telefon</label>
            <input 
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" 
              value={formData['contact_phone'] || ''} 
              onChange={e => setFormData({...formData, 'contact_phone': e.target.value})} 
            />
          </div>
        </div>
        <button className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
          Saqlash
        </button>
      </form>
    </div>
  );
}

function MnemonicForm({ onAdd }: { onAdd: (data: any) => Promise<boolean> }) {
  const [formData, setFormData] = useState({ category: '', title: '', mnemonic: '', explanation: '' });
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await onAdd(formData)) setFormData({ category: '', title: '', mnemonic: '', explanation: '' });
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input placeholder="Kategoriya" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} required />
      <input placeholder="Sarlavha" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
      <input placeholder="Mnemonika" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" value={formData.mnemonic} onChange={e => setFormData({...formData, mnemonic: e.target.value})} required />
      <textarea placeholder="Tushuntirish" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary h-24" value={formData.explanation} onChange={e => setFormData({...formData, explanation: e.target.value})} required />
      <button className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-medium text-sm hover:bg-primary/90 transition-all">Qo'shish</button>
    </form>
  );
}

function QuestionForm({ onAdd, onEdit, onCancelEdit, editData, fanlar }: { onAdd: (data: any) => Promise<boolean>, onEdit?: (id: string, data: any) => Promise<boolean>, onCancelEdit?: () => void, editData?: Question | null, fanlar: Subject[] }) {
  const [formData, setFormData] = useState({ subject: fanlar[0]?.title || '', topic: fanlar[0]?.topics[0]?.title || '', difficulty: 'medium', question: '', options: ['', '', '', ''], correct: 0, explanation: '' });
  
  useEffect(() => {
    if (editData) {
      setFormData({
        subject: editData.subject,
        topic: editData.topic,
        difficulty: editData.difficulty,
        question: editData.question,
        options: editData.options,
        correct: editData.correct,
        explanation: editData.explanation
      });
    } else {
      setFormData({ subject: fanlar[0]?.title || '', topic: fanlar[0]?.topics[0]?.title || '', difficulty: 'medium', question: '', options: ['', '', '', ''], correct: 0, explanation: '' });
    }
  }, [editData, fanlar]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editData && onEdit) {
      if (await onEdit(editData.id!, formData)) {
        setFormData({ subject: fanlar[0]?.title || '', topic: fanlar[0]?.topics[0]?.title || '', difficulty: 'medium', question: '', options: ['', '', '', ''], correct: 0, explanation: '' });
        if (onCancelEdit) onCancelEdit();
      }
    } else {
      if (await onAdd(formData)) setFormData({ subject: fanlar[0]?.title || '', topic: fanlar[0]?.topics[0]?.title || '', difficulty: 'medium', question: '', options: ['', '', '', ''], correct: 0, explanation: '' });
    }
  };

  const selectedSubject = fanlar.find(s => s.title === formData.subject) || fanlar[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <select className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" value={formData.subject} onChange={e => {
          const newSubject = fanlar.find(s => s.title === e.target.value);
          setFormData({...formData, subject: e.target.value, topic: newSubject?.topics[0]?.title || ''});
        }}>
          {fanlar.map(s => (
            <option key={s.id} value={s.title}>{s.title}</option>
          ))}
        </select>
        <select className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})}>
          {selectedSubject?.topics.map(t => (
            <option key={t.id} value={t.title}>{t.title}</option>
          ))}
        </select>
      </div>
      <select className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" value={formData.difficulty} onChange={e => setFormData({...formData, difficulty: e.target.value})}>
        <option value="easy">Oson</option>
        <option value="medium">O'rta</option>
        <option value="hard">Qiyin</option>
      </select>
      <textarea placeholder="Savol" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary h-24" value={formData.question} onChange={e => setFormData({...formData, question: e.target.value})} required />
      {formData.options.map((opt, i) => (
        <input key={i} placeholder={`Variant ${i+1}`} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" value={opt} onChange={e => {
          const newOpts = [...formData.options];
          newOpts[i] = e.target.value;
          setFormData({...formData, options: newOpts});
        }} required />
      ))}
      <select className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" value={formData.correct} onChange={e => setFormData({...formData, correct: parseInt(e.target.value)})}>
        {formData.options.map((_, i) => <option key={i} value={i}>To'g'ri javob: Variant {i+1}</option>)}
      </select>
      <textarea placeholder="Tushuntirish" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary h-24" value={formData.explanation} onChange={e => setFormData({...formData, explanation: e.target.value})} required />
      <div className="flex gap-2">
        <button type="submit" className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl font-medium text-sm hover:bg-primary/90 transition-all">
          {editData ? 'Saqlash' : 'Qo\'shish'}
        </button>
        {editData && (
          <button type="button" onClick={onCancelEdit} className="flex-1 bg-secondary text-foreground py-2.5 rounded-xl font-medium text-sm hover:bg-secondary/80 transition-all">
            Bekor qilish
          </button>
        )}
      </div>
    </form>
  );
}

function SymptomForm({ onAdd }: { onAdd: (data: any) => Promise<boolean> }) {
  const [formData, setFormData] = useState({ symptoms: '', diagnosis: '', redFlag: false });
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...formData, symptoms: formData.symptoms.split(',').map(s => s.trim()) };
    if (await onAdd(data)) setFormData({ symptoms: '', diagnosis: '', redFlag: false });
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input placeholder="Simptomlar (vergul bilan ajrating)" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" value={formData.symptoms} onChange={e => setFormData({...formData, symptoms: e.target.value})} required />
      <input placeholder="Tashxis" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" value={formData.diagnosis} onChange={e => setFormData({...formData, diagnosis: e.target.value})} required />
      <label className="flex items-center gap-2 text-sm font-medium text-foreground/70">
        <input type="checkbox" className="rounded border-border text-primary focus:ring-primary" checked={formData.redFlag} onChange={e => setFormData({...formData, redFlag: e.target.checked})} /> Qizil bayroq
      </label>
      <button className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-medium text-sm hover:bg-primary/90 transition-all">Qo'shish</button>
    </form>
  );
}

function VideoForm({ onAdd }: { onAdd: (data: any) => Promise<boolean> }) {
  const [formData, setFormData] = useState({ title: '', duration: '', category: '', videoUrl: '', available: true });
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await onAdd(formData)) setFormData({ title: '', duration: '', category: '', videoUrl: '', available: true });
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input placeholder="Sarlavha" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
      <input placeholder="Davomiyligi (masalan: 12:45)" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} required />
      <input placeholder="Kategoriya" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} required />
      <input placeholder="Video URL (YouTube)" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" value={formData.videoUrl} onChange={e => setFormData({...formData, videoUrl: e.target.value})} required />
      <label className="flex items-center gap-2 text-sm font-medium text-foreground/70">
        <input type="checkbox" className="rounded border-border text-primary focus:ring-primary" checked={formData.available} onChange={e => setFormData({...formData, available: e.target.checked})} /> Mavjud
      </label>
      <button className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-medium text-sm hover:bg-primary/90 transition-all">Qo'shish</button>
    </form>
  );
}

function SectionForm({ onAdd }: { onAdd: (data: any) => Promise<boolean> }) {
  const [formData, setFormData] = useState({ title: '', content: '', icon: '⭐', color: 'blue' });
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await onAdd(formData)) setFormData({ title: '', content: '', icon: '⭐', color: 'blue' });
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input placeholder="Sarlavha" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
      <textarea placeholder="Tavsif" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary h-24" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} required />
      <input placeholder="Emoji Icon (masalan: ⭐)" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" value={formData.icon} onChange={e => setFormData({...formData, icon: e.target.value})} required />
      <select className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})}>
        <option value="blue">Ko'k</option>
        <option value="purple">Binafsha</option>
        <option value="red">Qizil</option>
        <option value="emerald">Yashil</option>
      </select>
      <button className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-medium text-sm hover:bg-primary/90 transition-all">Qo'shish</button>
    </form>
  );
}

function OSCEForm({ onAdd }: { onAdd: (data: any) => Promise<boolean> }) {
  const [formData, setFormData] = useState({ title: '', description: '', systemInstruction: '', initialMessage: '' });
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await onAdd(formData)) setFormData({ title: '', description: '', systemInstruction: '', initialMessage: '' });
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input placeholder="Ssenariy nomi" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
      <textarea placeholder="Qisqacha tavsif" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary h-24" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required />
      <textarea placeholder="AI uchun tizim ko'rsatmalari (System Instruction)" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary h-48" value={formData.systemInstruction} onChange={e => setFormData({...formData, systemInstruction: e.target.value})} required />
      <textarea placeholder="Bemorning birinchi gapi" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary h-24" value={formData.initialMessage} onChange={e => setFormData({...formData, initialMessage: e.target.value})} required />
      <button className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-medium text-sm hover:bg-primary/90 transition-all">Qo'shish</button>
    </form>
  );
}

function NewsForm({ onAdd }: { onAdd: (data: any) => Promise<boolean> }) {
  const [formData, setFormData] = useState({ title: '', excerpt: '', date: new Date().toISOString().split('T')[0], category: 'Global Health Updates', imageUrl: '', link: '' });
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await onAdd(formData)) setFormData({ title: '', excerpt: '', date: new Date().toISOString().split('T')[0], category: 'Global Health Updates', imageUrl: '', link: '' });
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input placeholder="Sarlavha" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
      <textarea placeholder="Qisqacha matn (Excerpt)" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary h-24" value={formData.excerpt} onChange={e => setFormData({...formData, excerpt: e.target.value})} required />
      <div className="grid grid-cols-2 gap-4">
        <input type="date" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
        <select className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} required>
          <option value="Global Health Updates">Global Health Updates</option>
          <option value="WHO Guidelines">WHO Guidelines</option>
          <option value="CDC Vaccination Protocols">CDC Vaccination Protocols</option>
          <option value="Infection Monitoring">Infection Monitoring</option>
        </select>
      </div>
      <input placeholder="Rasm URL manzili" type="url" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} required />
      <input placeholder="Batafsil o'qish uchun havola (URL)" type="url" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} required />
      <button className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-medium text-sm hover:bg-primary/90 transition-all">Qo'shish</button>
    </form>
  );
}

function JournalForm({ onAdd }: { onAdd: (data: any) => Promise<boolean> }) {
  const [formData, setFormData] = useState({ title: '', description: '', date: new Date().toISOString().split('T')[0], category: 'Umumiy Tibbiyot', imageUrl: '', pdfUrl: '' });
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await onAdd(formData)) setFormData({ title: '', description: '', date: new Date().toISOString().split('T')[0], category: 'Umumiy Tibbiyot', imageUrl: '', pdfUrl: '' });
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input placeholder="Jurnal nomi" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
      <textarea placeholder="Jurnal tavsifi" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary h-24" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required />
      <div className="grid grid-cols-2 gap-4">
        <input type="date" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
        <select className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} required>
          <option value="Umumiy Tibbiyot">Umumiy Tibbiyot</option>
          <option value="Xirurgiya">Xirurgiya</option>
          <option value="Kardiologiya">Kardiologiya</option>
          <option value="Nevrologiya">Nevrologiya</option>
          <option value="Pediatriya">Pediatriya</option>
        </select>
      </div>
      <input placeholder="Jurnal muqovasi (Rasm URL)" type="url" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} required />
      <input placeholder="Jurnal PDF fayli (URL)" type="url" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" value={formData.pdfUrl} onChange={e => setFormData({...formData, pdfUrl: e.target.value})} required />
      <button className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-medium text-sm hover:bg-primary/90 transition-all">Qo'shish</button>
    </form>
  );
}

function PharmaPage() {
  const { t, language } = useTranslation();
  const [drugName, setDrugName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!drugName.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `You are a virtual pharmacology assistant that provides complete and accurate information about medications searched by a medical student.

RULES:

1. The student will search for a drug by name. You must always respond in **${language === 'uz' ? 'Uzbek' : language === 'ru' ? 'Russian' : 'English'} language**. Never respond in any other language.
2. For each drug, provide the following information clearly:
   - Drug name
   - Indications
   - Dosage (adult/children)
   - Side effects
   - Contraindications
   - Warnings / Additional information
3. Keep the response concise, professional, and easy to understand for a medical student.
4. The output must be in a **format suitable for PDF export**.
5. Never provide unnecessary extra information. Focus only on the requested drug.
6. Always ensure the information is accurate and evidence-based.

OUTPUT EXAMPLE:

Dori nomi: Aspirin  
Indikatsiya: Yurak kasalliklarini oldini olish, og‘riqni kamaytirish  
Doza: 75–100 mg kuniga 1 marta (profilaktika)  
Yon ta’siri: Oshqozon bezovtaligi, qon ketish xavfi  
Kontrendikatsiya: Oshqozon yarasi, allergiya  
Ogohlantirishlar: Suv bilan qabul qilish, bolalarda shifokor nazorati talab qilinadi

---
QIDIRILAYOTGAN DORI:
${drugName}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt
      });
      setResult(response.text || t('pharmaNotFound'));
    } catch (error) {
      console.error(error);
      setResult(t('pharmaError'));
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!result || !drugName) return;
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF('p', 'mm', 'a4');
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxLineWidth = pageWidth - margin * 2;
      
      let y = margin;
      
      const addText = (text: string, fontSize: number, isBold: boolean = false, color: number[] = [0, 0, 0]) => {
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        doc.setTextColor(color[0], color[1], color[2]);
        
        const lines = doc.splitTextToSize(text, maxLineWidth);
        
        for (let i = 0; i < lines.length; i++) {
          if (y > pageHeight - margin) {
            doc.addPage();
            y = margin;
          }
          doc.text(lines[i], margin, y);
          y += fontSize * 0.5;
        }
        y += 5;
      };

      addText(t('pharmaPDFTitle', { drugName }), 24, true, [37, 99, 235]);
      y += 5;
      
      const dateStr = new Date().toLocaleDateString('uz-UZ', { 
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
      addText(t('pharmaPDFDate', { date: dateStr }), 10, false, [100, 116, 139]);
      y += 10;
      
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

      const cleanText = result.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#/g, '');
      addText(cleanText, 12, false, [51, 65, 85]);
      
      doc.save(`${drugName}-malumot.pdf`);
    } catch (error) {
      console.error("PDF yaratishda xatolik:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4 md:p-8">
      <div className="text-center space-y-4 mb-12">
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-4">
          <Pill className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-4xl font-semibold tracking-tight text-foreground">{t('pharmaTitle')}</h2>
        <p className="text-foreground/60 font-medium text-lg max-w-2xl mx-auto">
          {t('pharmaDesc')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-card p-6 rounded-3xl border border-border shadow-sm space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Search className="w-4 h-4 text-primary" />
              {t('pharmaDrugNameLabel')}
            </label>
            <input
              type="text"
              value={drugName}
              onChange={(e) => setDrugName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={t('pharmaDrugNamePlaceholder')}
              className="w-full px-4 py-3 bg-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-foreground"
            />
          </div>

          <button
            onClick={handleSearch}
            disabled={loading || !drugName.trim()}
            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-primary/20"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {t('pharmaSearchBtn')}
          </button>
        </div>

        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card p-8 rounded-3xl border border-border shadow-sm"
          >
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-3 rounded-2xl">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">{t('pharmaResultTitle')}</h3>
                  <p className="text-sm text-foreground/60">{t('pharmaResultDesc', { drugName })}</p>
                </div>
              </div>
              <button onClick={downloadPDF} className="px-4 py-2 bg-secondary text-foreground rounded-xl text-sm font-medium hover:bg-secondary/80 transition-all flex items-center gap-2">
                <Upload className="w-4 h-4" />
                {t('pharmaDownloadPDF')}
              </button>
            </div>
            <div className="markdown-body prose prose-neutral dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground/80 prose-strong:text-foreground prose-ul:list-disc">
              <Markdown>{result}</Markdown>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function TutorPage() {
  const { t, language } = useTranslation();
  const [caseText, setCaseText] = useState('');
  const [answerText, setAnswerText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleEvaluate = async () => {
    if (!caseText.trim() || !answerText.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `You are an advanced AI tutor designed to help medical students improve their clinical reasoning and medical knowledge.

IMPORTANT LANGUAGE RULE:
All responses must be written ONLY in ${language === 'uz' ? 'Uzbek' : language === 'ru' ? 'Russian' : 'English'} language.
Never respond in any other language.

YOUR TASK:

When a student submits an answer to a clinical case, you must:

1. Analyze the student's reasoning.
2. Evaluate the accuracy of the diagnosis.
3. Evaluate the treatment plan.
4. Identify mistakes clearly.
5. Provide personalized learning recommendations.

SCORING SYSTEM:

Clinical Reasoning: score from 1 to 10
Diagnosis Accuracy: score from 1 to 10
Treatment Planning: score from 1 to 10

OUTPUT FORMAT (always follow this structure):

Klinik fikrlash bahosi: X/10  
Tashxis aniqligi: X/10  
Davolash rejasi: X/10  

Asosiy xatolar:
- mistake 1
- mistake 2

Talaba yaxshi bajargan jihatlar:
- point 1
- point 2

Tavsiya etilgan o‘qish mavzulari:
- topic 1
- topic 2
- topic 3

RESPONSE STYLE:

- Be clear and educational
- Encourage clinical thinking
- Keep explanations concise but helpful

---
KLINIK HOLAT:
${caseText}

TALABA JAVOBI:
${answerText}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt
      });
      setResult(response.text || t('tutorError'));
    } catch (error) {
      console.error(error);
      setResult(t('tutorError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4 md:p-8">
      <div className="text-center space-y-4 mb-12">
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-4">
          <GraduationCap className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-4xl font-semibold tracking-tight text-foreground">{t('tutorTitle')}</h2>
        <p className="text-foreground/60 font-medium text-lg max-w-2xl mx-auto">
          {t('tutorDesc')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-card p-6 rounded-3xl border border-border shadow-sm space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              {t('tutorCaseLabel')}
            </label>
            <textarea
              value={caseText}
              onChange={(e) => setCaseText(e.target.value)}
              placeholder={t('tutorCasePlaceholder')}
              className="w-full h-32 px-4 py-3 bg-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-foreground resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-primary" />
              {t('tutorAnswerLabel')}
            </label>
            <textarea
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder={t('tutorAnswerPlaceholder')}
              className="w-full h-40 px-4 py-3 bg-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-foreground resize-none"
            />
          </div>

          <button
            onClick={handleEvaluate}
            disabled={loading || !caseText.trim() || !answerText.trim()}
            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-primary/20"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {t('tutorEvaluateBtn')}
          </button>
        </div>

        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card p-8 rounded-3xl border border-border shadow-sm"
          >
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border">
              <div className="bg-primary/10 p-3 rounded-2xl">
                <CheckCircle2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">{t('tutorResultTitle')}</h3>
                <p className="text-sm text-foreground/60">{t('tutorResultDesc')}</p>
              </div>
            </div>
            <div className="markdown-body prose prose-neutral dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground/80 prose-strong:text-foreground prose-ul:list-disc">
              <Markdown>{result}</Markdown>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function AIPage() {
  const [activeTool, setActiveTool] = useState<'analysis' | 'image_search' | 'medical_search'>('analysis');
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleAnalysis = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-preview',
          contents: [
            {
              parts: [
                { text: prompt || "Ushbu tibbiy tasvirni tahlil qiling va muhim jihatlarini tushuntiring." },
                { inlineData: { data: base64Data, mimeType: file.type } }
              ]
            }
          ]
        });
        setResult(response.text || "Tahlil natijasi topilmadi.");
        setLoading(false);
      };
    } catch (error) {
      console.error(error);
      setResult("Xatolik yuz berdi.");
      setLoading(false);
    }
  };

  const handleImageSearch = async () => {
    if (!prompt) return;
    setLoading(true);
    setResult(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Qidiruv so'rovi: "${prompt}". Iltimos, ushbu mavzuga oid 6 ta yuqori sifatli va aniq rasmlarni toping. Natijani faqat Markdown formatida, rasmlar ro'yxati ko'rinishida qaytaring. Har bir rasm uchun: ![Rasm nomi](rasm_url) formatidan foydalaning. Hech qanday qo'shimcha matn yozmang, faqat rasmlar bo'lsin.`,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      
      setResult(response.text || "Rasmlar topilmadi.");
      setLoading(false);
    } catch (error) {
      console.error(error);
      setResult("Xatolik yuz berdi.");
      setLoading(false);
    }
  };

  const handleMedicalSearch = async () => {
    if (!prompt) return;
    setLoading(true);
    setResult(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Qidiruv so'rovi: "${prompt}". Iltimos, ushbu tibbiy mavzu yoki atama haqida batafsil, ishonchli va tushunarli ma'lumot bering. Javobni Markdown formatida qaytaring.`,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      
      setResult(response.text || "Ma'lumot topilmadi.");
      setLoading(false);
    } catch (error) {
      console.error(error);
      setResult("Xatolik yuz berdi.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-semibold tracking-tight text-foreground">AI Markazi</h2>
        <p className="text-foreground/60 font-medium text-lg">Tibbiy ta'lim uchun sun'iy intellekt imkoniyatlaridan foydalaning</p>
      </div>

      <div className="flex justify-center gap-4 flex-wrap">
        <button onClick={() => { setActiveTool('analysis'); setResult(null); setPrompt(''); }} className={`px-6 py-3 rounded-2xl font-medium flex items-center gap-2 transition-all ${activeTool === 'analysis' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-card text-foreground/60 hover:bg-secondary border border-border/40'}`}>
          <Search className="w-5 h-5" /> Tahlil
        </button>
        <button onClick={() => { setActiveTool('image_search'); setResult(null); setPrompt(''); }} className={`px-6 py-3 rounded-2xl font-medium flex items-center gap-2 transition-all ${activeTool === 'image_search' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'bg-card text-foreground/60 hover:bg-secondary border border-border/40'}`}>
          <ImageIcon className="w-5 h-5" /> Rasm qidiruvi
        </button>
        <button onClick={() => { setActiveTool('medical_search'); setResult(null); setPrompt(''); }} className={`px-6 py-3 rounded-2xl font-medium flex items-center gap-2 transition-all ${activeTool === 'medical_search' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-card text-foreground/60 hover:bg-secondary border border-border/40'}`}>
          <BookOpen className="w-5 h-5" /> Tibbiy qidiruv
        </button>
      </div>

      <div className="bg-card rounded-2xl p-8 border border-border/40 shadow-sm shadow-primary/5 space-y-6">
        {activeTool === 'analysis' && (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-border rounded-2xl p-12 text-center space-y-4 hover:border-primary/50 transition-colors cursor-pointer relative bg-secondary/30">
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setFile(e.target.files?.[0] || null)} />
              <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Upload className="w-10 h-10 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground text-lg">{file ? file.name : "Rasm yoki video yuklang"}</p>
                <p className="text-sm text-foreground/60 font-medium mt-1">Rentgen, MRT yoki boshqa tibbiy tasvirlar</p>
              </div>
            </div>
            <textarea placeholder="AI ga savol bering (ixtiyoriy)..." className="w-full p-5 rounded-2xl border border-border/40 bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/50 h-32 shadow-inner placeholder:text-foreground/40" value={prompt} onChange={e => setPrompt(e.target.value)} />
            <button onClick={handleAnalysis} disabled={loading || !file} className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-medium hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm shadow-primary/20 hover:-translate-y-1">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />} Tahlilni boshlash
            </button>
          </div>
        )}

        {activeTool === 'image_search' && (
          <div className="space-y-6">
            <textarea placeholder="Qanday rasm qidirmoqchisiz? (masalan: Cardiovascular system, Brain anatomy)" className="w-full p-5 rounded-2xl border border-border/40 bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/50 h-32 shadow-inner placeholder:text-foreground/40" value={prompt} onChange={e => setPrompt(e.target.value)} />
            <button onClick={handleImageSearch} disabled={loading || !prompt} className="w-full py-4 rounded-2xl font-medium text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm hover:-translate-y-1 bg-purple-600 hover:bg-purple-700 shadow-purple-600/20">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />} Rasm qidirish
            </button>
          </div>
        )}

        {activeTool === 'medical_search' && (
          <div className="space-y-6">
            <textarea placeholder="Qanday tibbiy mavzu yoki atamani qidirmoqchisiz? (masalan: Qandli diabet, Gipertoniya, EKG asoslari)" className="w-full p-5 rounded-2xl border border-border/40 bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/50 h-32 shadow-inner placeholder:text-foreground/40" value={prompt} onChange={e => setPrompt(e.target.value)} />
            <button onClick={handleMedicalSearch} disabled={loading || !prompt} className="w-full py-4 rounded-2xl font-medium text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm hover:-translate-y-1 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <BookOpen className="w-5 h-5" />} Ma'lumot qidirish
            </button>
          </div>
        )}

        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-8 bg-secondary/50 rounded-2xl border border-border/40 shadow-inner">
            <h4 className="font-medium text-foreground mb-6 flex items-center gap-3 text-xl">
              <div className="bg-primary/10 p-2 rounded-xl">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              Natija:
            </h4>
            <div className="prose prose-neutral max-w-none text-foreground/80 prose-img:rounded-2xl prose-img:shadow-lg prose-img:w-full prose-img:object-cover prose-img:max-h-[400px]">
              <Markdown>{result}</Markdown>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

 const initialMedicalData = {
  subjects: [
    {
      id: 1,
      name: "Ichki kasalliklar",
      icon: "Stethoscope",
      topics: [
        {
          id: 101,
          name: "Arterial gipertenziya",
          resources: {
            manuals: ["AG bo'yicha qo'llanma (PDF)", "2024 yilgi protokol"],
            cases: ["45 yoshli ayol, bosh og'rig'i, BP 160/100", "52 yoshli erkak, bosh aylanishi"],
            questions: ["AG ning asosiy sababi?", "Birinchi tanlov dori?"]
          }
        },
        {
          id: 102,
          name: "Yurak yetishmovchiligi",
          resources: {
            manuals: ["CHF bo'yicha protokol", "NYHA klassifikatsiyasi"],
            cases: ["60 yoshli erkak, hansirash, shishlar", "70 yoshli ayol, ortopnoe"],
            questions: ["CHF da qanday dorilar qo'llanadi?", "Echokardiyografiya ko'rsatkichlari?"]
          }
        }
      ]
    },
    {
      id: 2,
      name: "Xirurgiya",
      icon: "Scissors",
      topics: [
        {
          id: 201,
          name: "O'tkir appenditsit",
          resources: {
            manuals: ["Appenditsit diagnostikasi", "Alvarado shkalasi"],
            cases: ["20 yoshli qiz, qorinda og'riq, ko'ngil aynishi"],
            questions: ["Koxer simptomi nima?", "Differentsial diagnostika?"]
          }
        }
      ]
    },
    {
      id: 3,
      name: "Pediatriya",
      icon: "Baby",
      topics: [
        {
          id: 301,
          name: "Bolalarda pneumoniya",
          resources: {
            manuals: ["Pneumoniya tasnifi", "Antibiotik terapiyasi"],
            cases: ["3 yoshli bola, yo'tal, isitma"],
            questions: ["Bolalarda taxipnoe mezonlari?"]
          }
        }
      ]
    },
    {
      id: 4,
      name: "Nevrologiya",
      icon: "Brain",
      topics: [
        {
          id: 401,
          name: "Insult",
          resources: {
            manuals: ["Ishemik insult protokoli", "NIHSS shkalasi"],
            cases: ["65 yoshli erkak, yarim parez", "70 yoshli ayol, afaziya"],
            questions: ["TOAST klassifikatsiyasi?", "Tromboliz ko'rsatmalari?"]
          }
        }
      ]
    },
    {
      id: 5,
      name: "Kardiologiya",
      icon: "Heart",
      topics: [
        {
          id: 501,
          name: "O'tkir koronar sindrom",
          resources: {
            manuals: ["O'KS diagnostikasi", "Troponin mezonlari"],
            cases: ["55 yoshli erkak, sternum orti og'rig'i"],
            questions: ["GRACE skori?", "Dual antiagregant terapiya?"]
          }
        }
      ]
    }
  ]
};

const SubjectIcon = ({ name, className }: { name: string, className?: string }) => {
  switch (name) {
    case 'Stethoscope': return <Stethoscope className={className} />;
    case 'Scissors': return <Scissors className={className} />;
    case 'Baby': return <Baby className={className} />;
    case 'Brain': return <Brain className={className} />;
    case 'Heart': return <Heart className={className} />;
    default: return <BookOpen className={className} />;
  }
};

function LibraryPage({ data, handleAIExplain }: { data: any, handleAIExplain: (title: string, content: string) => void }) {
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);

  return (
    <div className="flex flex-col md:flex-row gap-8 min-h-[600px]">
      {/* Sidebar: Subjects */}
      <aside className="w-full md:w-64 space-y-4">
        <h3 className="text-lg font-medium text-foreground mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          Fanlar
        </h3>
        <div className="space-y-2">
          {data.subjects.map((subject: any) => (
            <button
              key={subject.id}
              onClick={() => {
                setSelectedSubject(subject);
                setSelectedTopic(null);
              }}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between group ${
                selectedSubject?.id === subject.id
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'bg-card text-foreground hover:bg-secondary border border-border'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={selectedSubject?.id === subject.id ? 'text-primary-foreground' : 'text-primary'}>
                  <SubjectIcon name={subject.icon} className="w-5 h-5" />
                </span>
                <span className="font-medium">{subject.name}</span>
              </div>
              <ChevronRight className={`w-4 h-4 transition-transform ${selectedSubject?.id === subject.id ? 'rotate-90' : 'group-hover:translate-x-1'}`} />
            </button>
          ))}
        </div>
      </aside>

      {/* Main Content: Topics and Resources */}
      <main className="flex-1 space-y-8">
        {!selectedSubject ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 bg-card rounded-2xl border border-border p-12">
            <div className="bg-primary/10 p-4 rounded-2xl">
              <BookOpen className="w-12 h-12 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-medium text-foreground">Kutubxonaga xush kelibsiz</h3>
              <p className="text-foreground/60 max-w-xs mx-auto mt-2">O'rganishni boshlash uchun chap tomondagi menyudan fanni tanlang.</p>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            key={selectedSubject.id}
            className="space-y-8"
          >
            <div className="flex items-center gap-3 border-b border-border pb-6">
              <div className="bg-primary p-2 rounded-xl">
                <SubjectIcon name={selectedSubject.icon} className="w-6 h-6 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-medium text-foreground">{selectedSubject.name}</h2>
            </div>

            {/* Topics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {selectedSubject.topics.map((topic: any) => (
                <button
                  key={topic.id}
                  onClick={() => setSelectedTopic(topic)}
                  className={`p-6 rounded-2xl border text-left transition-all ${
                    selectedTopic?.id === topic.id
                      ? 'bg-primary/5 border-primary ring-2 ring-primary/10'
                      : 'bg-card border-border hover:border-primary/50 hover:shadow-md'
                  }`}
                >
                  <h4 className="font-medium text-foreground mb-1">{topic.name}</h4>
                  <p className="text-xs text-foreground/50 uppercase tracking-widest font-medium">
                    {Object.values(topic.resources).flat().length} ta resurs
                  </p>
                </button>
              ))}
            </div>

            {/* Resources Section */}
            <AnimatePresence mode="wait">
              {selectedTopic && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  key={selectedTopic.id}
                  className="bg-card rounded-2xl p-8 border border-border shadow-sm space-y-8"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-medium text-foreground">{selectedTopic.name}</h3>
                    <button onClick={() => setSelectedTopic(null)} className="text-foreground/40 hover:text-foreground/60">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Manuals */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-primary">
                        <BookOpen className="w-5 h-5" />
                        <h5 className="font-medium uppercase tracking-wider text-xs">Qo'llanmalar</h5>
                      </div>
                      <div className="space-y-3">
                        {selectedTopic.resources.manuals.map((item: string, i: number) => (
                          <div key={i} className="group p-4 bg-secondary rounded-2xl border border-border hover:border-primary/20 hover:bg-primary/5 transition-all">
                            <div className="flex items-start gap-3">
                              <div className="mt-1 w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0">
                                {i + 1}
                              </div>
                              <div className="flex-1 space-y-3">
                                <p className="text-sm text-foreground/80 font-medium leading-relaxed">{item}</p>
                                <button 
                                  onClick={() => handleAIExplain(item, `Mavzu: ${selectedTopic.name}\nQo'llanma: ${item}\n\nIltimos, ushbu mavzu bo'yicha qisqacha konspekt va asosiy tushunchalarni tushuntirib bering.`)}
                                  className="flex items-center gap-1.5 text-[11px] font-medium text-primary hover:text-primary/80 uppercase tracking-wider transition-colors"
                                >
                                  <Sparkles className="w-3 h-3" />
                                  AI Konspekt
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Clinical Cases */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-emerald-600">
                        <Stethoscope className="w-5 h-5" />
                        <h5 className="font-medium uppercase tracking-wider text-xs">Klinik caselar</h5>
                      </div>
                      <div className="space-y-3">
                        {selectedTopic.resources.cases.map((item: string, i: number) => (
                          <div key={i} className="group p-4 bg-secondary rounded-2xl border border-border hover:border-emerald-200 hover:bg-emerald-50/30 transition-all">
                            <div className="flex items-start gap-3">
                              <div className="mt-1 w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0">
                                {i + 1}
                              </div>
                              <div className="flex-1 space-y-3">
                                <p className="text-sm text-foreground/80 font-medium leading-relaxed">{item}</p>
                                <button 
                                  onClick={() => handleAIExplain("Klinik Case Tahlili", `Mavzu: ${selectedTopic.name}\nCase: ${item}\n\nIltimos, ushbu klinik holatni tahlil qiling, taxminiy tashxis qo'ying va davolash rejasini tushuntiring.`)}
                                  className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 hover:text-emerald-700 uppercase tracking-wider transition-colors"
                                >
                                  <Sparkles className="w-3 h-3" />
                                  Case tahlili (AI)
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Questions */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-purple-600">
                        <Brain className="w-5 h-5" />
                        <h5 className="font-medium uppercase tracking-wider text-xs">Savollar</h5>
                      </div>
                      <div className="space-y-3">
                        {selectedTopic.resources.questions.map((item: string, i: number) => (
                          <div key={i} className="group p-4 bg-secondary rounded-2xl border border-border hover:border-purple-200 hover:bg-purple-50/30 transition-all">
                            <div className="flex items-start gap-3">
                              <div className="mt-1 w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0">
                                {i + 1}
                              </div>
                              <div className="flex-1 space-y-3">
                                <p className="text-sm text-foreground/80 font-medium leading-relaxed">{item}</p>
                                <button 
                                  onClick={() => handleAIExplain(item, `Mavzu: ${selectedTopic.name}\nSavol: ${item}\n\nIltimos, ushbu savolga batafsil tibbiy javob bering va tushuntirib bering.`)}
                                  className="flex items-center gap-1.5 text-[11px] font-medium text-purple-600 hover:text-purple-700 uppercase tracking-wider transition-colors"
                                >
                                  <Sparkles className="w-3 h-3" />
                                  Javobni ko'rish (AI)
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </main>
    </div>
  );
}

function PatientsPage({ patients, onTreat, onClearAdvice }: { patients: Patient[], onTreat: (id: string, medication: string) => Promise<void>, onClearAdvice: (id: string) => Promise<void> }) {
  const [treatingId, setTreatingId] = useState<string | null>(null);
  const [clearingId, setClearingId] = useState<string | null>(null);

  const handleTreat = async (id: string, medication: string) => {
    setTreatingId(id);
    await onTreat(id, medication);
    setTreatingId(null);
  };

  const handleClear = async (id: string) => {
    setClearingId(id);
    await onClearAdvice(id);
    setClearingId(null);
  };

  return (
    <div className="p-8 space-y-8">
      <h2 className="text-3xl font-medium text-foreground">Bemorlar</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {patients.map(p => (
          <div key={p.id} className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <h3 className="text-xl font-medium text-foreground">{p.name} ({p.age} yosh)</h3>
            <p className="text-sm text-foreground/70 mt-2">Simptomlar: {p.symptoms}</p>
            <p className="text-sm font-medium mt-4 text-foreground">Ahvoli: <span className="text-primary">{p.condition}</span></p>
            <p className="text-sm font-medium text-foreground mt-1">Sog'liq: <span className="text-emerald-500">{p.healthScore}%</span></p>
            
            {treatingId === p.id ? (
              <div className="mt-4 bg-primary/10 p-4 rounded-xl border border-primary/20 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <span className="text-sm font-medium text-primary">AI tahlil qilmoqda...</span>
              </div>
            ) : p.aiAdvice ? (
              <div className="mt-4 bg-primary/10 p-4 rounded-xl border border-primary/20 relative">
                <button 
                  onClick={() => handleClear(p.id!)} 
                  disabled={clearingId === p.id}
                  className="absolute top-2 right-2 p-1 text-foreground/50 hover:text-foreground transition-colors disabled:opacity-50"
                  title="Maslahatni tozalash"
                >
                  {clearingId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                </button>
                <div className="flex items-center gap-2 mb-2 pr-6">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">AI Tahlili va Maslahat</span>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">{p.aiAdvice}</p>
              </div>
            ) : null}
            
            <input 
              type="text" 
              placeholder="Dori yuborish (Enter bosing)" 
              disabled={treatingId === p.id}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim() !== '') {
                  handleTreat(p.id!, e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }} 
              className="w-full px-4 py-2.5 mt-4 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary transition-all disabled:opacity-50" 
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function OSCEPage({ scenarios }: { scenarios: OSCEScenario[] }) {
  const { t, language } = useTranslation();
  const [selectedScenario, setSelectedScenario] = useState<OSCEScenario | null>(null);
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [timer, setTimer] = useState(0);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (selectedScenario && !evaluation) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [selectedScenario, evaluation]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const startScenario = (scenario: OSCEScenario) => {
    setSelectedScenario(scenario);
    setMessages([{ role: 'model', text: scenario.initialMessage }]);
    setEvaluation(null);
    setTimer(0);
  };

  const handleSend = async () => {
    if (!input.trim() || loading || evaluating || evaluation) return;
    
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const systemInstruction = selectedScenario!.systemInstruction + `
      
IMPORTANT INSTRUCTION FOR ENDING CONSULTATION:
If the student clearly explains the diagnosis and proposed treatment plan, you MUST end the consultation by praising the student in ${language === 'uz' ? 'Uzbek' : language === 'ru' ? 'Russian' : 'English'} (e.g., "Rahmat doktor, juda tushunarli qilib tushuntirdingiz. Ajoyib ishladingiz!") AND you MUST include the exact string "[END_CONSULTATION]" at the very end of your response.

IMPORTANT LANGUAGE RULE:
All responses must be written ONLY in ${language === 'uz' ? 'Uzbek' : language === 'ru' ? 'Russian' : 'English'} language.
Never respond in any other language.`;

      const contents = messages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));
      contents.push({ role: 'user', parts: [{ text: userMessage }] });

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: contents,
        config: {
          systemInstruction,
        }
      });

      const responseText = response.text || t('osce_patient_fallback');
      
      if (responseText.includes('[END_CONSULTATION]')) {
        const cleanText = responseText.replace('[END_CONSULTATION]', '').trim();
        setMessages(prev => [...prev, { role: 'model', text: cleanText }]);
        await handleEvaluate([...messages, { role: 'user', text: userMessage }, { role: 'model', text: cleanText }]);
      } else {
        setMessages(prev => [...prev, { role: 'model', text: responseText }]);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: t('osce_patient_error') }]);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async (currentMessages = messages) => {
    setEvaluating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const transcript = currentMessages.map(m => `${m.role === 'user' ? t('student') : t('patient')}: ${m.text}`).join('\n');
      
      const prompt = `You are an expert medical examiner evaluating a medical student's OSCE performance.
Here is the transcript of the consultation:

${transcript}

Based on this interaction, generate a structured clinical report and evaluation in ${language === 'uz' ? 'Uzbek' : language === 'ru' ? 'Russian' : 'English'} language.
Format the output EXACTLY as follows using Markdown:

# ${t('osce_report_title')}

## 1. ${t('osce_patient_info')}
[Ma'lumot]

## 2. ${t('osce_chief_complaint')}
[Shikoyat]

## 3. ${t('osce_history_present_illness')}
[Tarix]

## 4. ${t('osce_past_medical_history')}
[Tarix]

## 5. ${t('osce_risk_factors')}
[Omillar]

## 6. ${t('osce_provisional_diagnosis')}
[Tashxis]

## 7. ${t('osce_differential_diagnosis')}
[Tashxislar]

## 8. ${t('osce_recommended_tests')}
[Tekshiruvlar]

## 9. ${t('osce_treatment_plan')}
[Reja]

## 10. ${t('osce_feedback')}
**${t('osce_strengths')}:**
- ...

**${t('osce_areas_improvement')}:**
- ...

## 11. ${t('osce_final_score')}
- ${t('osce_score_history')}: [X] / 30
- ${t('osce_score_symptoms')}: [X] / 20
- ${t('osce_score_clinical')}: [X] / 20
- ${t('osce_score_communication')}: [X] / 15
- ${t('osce_score_treatment')}: [X] / 15

**${t('osce_overall_score')}: [X] / 100**`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt
      });

      setEvaluation(response.text || t('osce_evaluation_error'));
    } catch (error) {
      console.error(error);
      setEvaluation(t('osce_evaluation_error'));
    } finally {
      setEvaluating(false);
    }
  };

  const downloadPDF = async () => {
    if (!evaluation || !selectedScenario) return;
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF('p', 'mm', 'a4');
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxLineWidth = pageWidth - margin * 2;
      
      let y = margin;
      
      // Title
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42); // Slate 900
      doc.text(t('osce_result_title'), margin, y);
      y += 10;
      
      // Subtitle
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139); // Slate 500
      
      const titleLines = doc.splitTextToSize(selectedScenario.title, maxLineWidth);
      doc.text(titleLines, margin, y);
      y += titleLines.length * 7 + 10;
      
      // Content
      doc.setTextColor(15, 23, 42);
      const lines = evaluation.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) {
          y += 4;
          continue;
        }
        
        let isBold = false;
        let fontSize = 11;
        let indent = 0;
        
        if (line.startsWith('# ')) {
          fontSize = 18;
          isBold = true;
          line = line.replace('# ', '');
          y += 6;
        } else if (line.startsWith('## ')) {
          fontSize = 14;
          isBold = true;
          line = line.replace('## ', '');
          y += 6;
        } else if (line.startsWith('### ')) {
          fontSize = 12;
          isBold = true;
          line = line.replace('### ', '');
          y += 4;
        } else if (line.startsWith('- ')) {
          fontSize = 11;
          line = '•  ' + line.replace('- ', '');
          indent = 5;
        } else if (line.match(/^\d+\.\s/)) {
          fontSize = 11;
          indent = 5;
        }
        
        // Handle bold text markers
        if (line.startsWith('**') && line.endsWith('**')) {
          isBold = true;
          line = line.replace(/\*\*/g, '');
        } else {
          line = line.replace(/\*\*/g, ''); // Strip bold markers inside text
        }
        
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        
        const splitLines = doc.splitTextToSize(line, maxLineWidth - indent);
        
        // Check page break
        if (y + (splitLines.length * (fontSize * 0.4)) > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        
        doc.text(splitLines, margin + indent, y);
        y += splitLines.length * (fontSize * 0.5) + 2;
      }
      
      doc.save(t('osce_pdf_filename'));
    } catch (error) {
      console.error('PDF generation failed', error);
      alert(t('osce_pdf_error'));
    }
  };

  if (!selectedScenario) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 p-4 md:p-8">
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-4">
            <Stethoscope className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-4xl font-semibold tracking-tight text-foreground">{t('osce_virtual_patient')}</h2>
          <p className="text-foreground/60 font-medium text-lg max-w-2xl mx-auto">
            {t('osce_virtual_patient_desc')}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scenarios.map(scenario => (
            <motion.div 
              whileHover={{ y: -4 }}
              key={scenario.id} 
              className="bg-card p-6 rounded-3xl border border-border shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col h-full" 
              onClick={() => startScenario(scenario)}
            >
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                <Heart className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">{scenario.title}</h3>
              <p className="text-sm text-foreground/70 line-clamp-3 mb-6 flex-1">{scenario.description}</p>
              <div className="flex items-center text-primary font-medium text-sm mt-auto">
                Ssenariyni boshlash <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </motion.div>
          ))}
          {scenarios.length === 0 && (
            <div className="col-span-full text-center py-16 bg-secondary/30 rounded-3xl border border-dashed border-border">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-foreground/40" />
              </div>
              <p className="text-foreground/60 font-medium">Hozircha ssenariylar yo'q. Admin paneldan qo'shing.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto flex flex-col p-4 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <button 
            onClick={() => setSelectedScenario(null)} 
            className="p-2 sm:p-2.5 bg-secondary text-foreground rounded-xl hover:bg-secondary/80 transition-all flex-shrink-0"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 rotate-180" />
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground line-clamp-1">{selectedScenario.title}</h2>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-foreground/60 mt-1">
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 sm:w-4 h-4" /> {formatTime(timer)}</span>
              <span>•</span>
              <span>Virtual Bemor</span>
            </div>
          </div>
        </div>
        {evaluation && (
          <button onClick={downloadPDF} className="w-full sm:w-auto px-4 py-2 sm:px-5 sm:py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
            <Upload className="w-4 h-4" />
            PDF Yuklab olish
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Patient Info */}
        <div className="hidden lg:flex flex-col gap-6 col-span-1">
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
              <Baby className="w-10 h-10 text-foreground/40" />
            </div>
            <h3 className="text-center font-semibold text-lg text-foreground mb-2">Bemor Ma'lumotlari</h3>
            <p className="text-sm text-foreground/70 text-center mb-6">{selectedScenario.description}</p>
            
            <div className="space-y-4">
              <div className="bg-secondary/50 p-4 rounded-2xl">
                <div className="text-xs text-foreground/50 font-medium uppercase tracking-wider mb-1">Vazifa</div>
                <div className="text-sm font-medium text-foreground">Anamnez yig'ish, tashxis qo'yish va davolash rejasini tushuntirish.</div>
              </div>
              <div className="bg-emerald-500/10 p-4 rounded-2xl">
                <div className="text-xs text-emerald-600/70 font-medium uppercase tracking-wider mb-1">Holat</div>
                <div className="text-sm font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Suhbat davom etmoqda
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Area - Chat or Evaluation */}
        <div className="col-span-1 lg:col-span-3 flex flex-col bg-card border border-border rounded-2xl lg:rounded-3xl shadow-sm overflow-hidden h-[calc(100vh-220px)] lg:h-[65vh] lg:min-h-[500px] lg:max-h-[800px]">
          {!evaluation ? (
            <>
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 custom-scrollbar">
                {messages.map((msg, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={idx} 
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-2 sm:gap-3 max-w-[90%] sm:max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground/60'}`}>
                        {msg.role === 'user' ? <Stethoscope className="w-3 h-3 sm:w-4 sm:h-4" /> : <Baby className="w-3 h-3 sm:w-4 sm:h-4" />}
                      </div>
                      <div className={`p-3 sm:p-4 rounded-2xl ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm shadow-md shadow-primary/10' : 'bg-secondary text-foreground rounded-tl-sm'}`}>
                        <p className="whitespace-pre-wrap leading-relaxed text-[14px] sm:text-[15px]">{msg.text}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {loading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <div className="flex gap-2 sm:gap-3 max-w-[90%] sm:max-w-[85%]">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                        <Baby className="w-3 h-3 sm:w-4 sm:h-4 text-foreground/60" />
                      </div>
                      <div className="bg-secondary text-foreground p-3 sm:p-4 rounded-2xl rounded-tl-sm flex items-center gap-2 h-[44px] sm:h-[52px]">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-foreground/40 rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
              
              <div className="p-3 sm:p-4 bg-background/50 border-t border-border backdrop-blur-md">
                <div className="flex gap-2 sm:gap-3">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Bemorga savol bering..."
                    className="flex-1 px-4 py-3 sm:px-5 sm:py-3.5 bg-card border border-border rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-foreground shadow-sm text-sm sm:text-base"
                    disabled={loading || evaluating}
                  />
                  <button
                    onClick={handleSend}
                    disabled={loading || evaluating || !input.trim()}
                    className="px-4 py-3 sm:px-6 sm:py-3.5 bg-primary text-primary-foreground rounded-xl sm:rounded-2xl font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-primary/20"
                  >
                    <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline">Yuborish</span>
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-center mt-3 sm:mt-4 px-1 sm:px-2 gap-3 sm:gap-0">
                  <p className="text-[10px] sm:text-xs text-foreground/40 font-medium text-center sm:text-left">
                    Tashxisni aytganingizdan so'ng, AI suhbatni avtomatik yakunlaydi.
                  </p>
                  <button
                    onClick={() => handleEvaluate()}
                    disabled={loading || evaluating || messages.length < 3}
                    className="w-full sm:w-auto px-4 py-2 sm:py-2.5 bg-emerald-500/10 text-emerald-600 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium hover:bg-emerald-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {evaluating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Suhbatni yakunlash
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-secondary/10">
              <div ref={reportRef} className="bg-card border border-border text-foreground p-6 sm:p-8 md:p-12 rounded-2xl sm:rounded-3xl shadow-sm max-w-4xl mx-auto">
                <div className="flex items-center gap-3 mb-6 sm:mb-8 pb-4 sm:pb-6 border-b border-border">
                  <div className="bg-primary/10 p-2 sm:p-3 rounded-xl sm:rounded-2xl">
                    <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-foreground">OSCE Natijasi</h3>
                    <p className="text-sm sm:text-base text-foreground/60 font-medium">{selectedScenario.title}</p>
                  </div>
                </div>
                <div className="markdown-body prose prose-sm sm:prose-base prose-neutral dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground/80 prose-strong:text-foreground prose-ul:list-disc">
                  <Markdown>{evaluation}</Markdown>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function JournalsPage({ journals }: { journals: JournalItem[] }) {
  const [category, setCategory] = useState('Barchasi');

  const categories = [
    { id: 'Barchasi', label: 'Barchasi' },
    { id: 'Umumiy Tibbiyot', label: 'Umumiy Tibbiyot' },
    { id: 'Xirurgiya', label: 'Xirurgiya' },
    { id: 'Kardiologiya', label: 'Kardiologiya' },
    { id: 'Nevrologiya', label: 'Nevrologiya' },
    { id: 'Pediatriya', label: 'Pediatriya' },
  ];

  const filteredJournals = category === 'Barchasi' 
    ? journals 
    : journals.filter(item => item.category === category);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-7xl mx-auto"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Tibbiyot Jurnallari</h1>
          <p className="text-foreground/60">Eng so'nggi tibbiyot jurnallari va maqolalar to'plami</p>
        </div>
        
        <div className="flex overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:pb-0 w-full md:w-auto gap-2 hide-scrollbar">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${
                category === cat.id
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                  : 'bg-card text-foreground/70 hover:bg-secondary border border-border'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredJournals.map(journal => (
          <div key={journal.id} className="bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-all group flex flex-col">
            <div className="relative h-64 overflow-hidden bg-secondary/30">
              <img 
                src={journal.imageUrl} 
                alt={journal.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-primary">
                {journal.category}
              </div>
            </div>
            <div className="p-6 flex flex-col flex-1">
              <div className="text-xs text-foreground/50 mb-3">{journal.date}</div>
              <h3 className="text-lg font-bold text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors">{journal.title}</h3>
              <p className="text-foreground/70 text-sm mb-6 line-clamp-3 flex-1">{journal.description}</p>
              <a href={journal.pdfUrl} target="_blank" rel="noopener noreferrer" className="w-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground font-medium text-sm py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all mt-auto">
                <BookOpen className="w-4 h-4" /> PDF formatda o'qish
              </a>
            </div>
          </div>
        ))}
        {filteredJournals.length === 0 && (
          <div className="col-span-full py-12 text-center text-foreground/50">
            Bu kategoriyada hozircha jurnallar yo'q.
          </div>
        )}
      </div>
    </motion.div>
  );
}

function NewsPage({ news }: { news: NewsItem[] }) {
  const { t } = useTranslation();
  const [newsCategory, setNewsCategory] = useState('Barchasi');

  const categories = [
    { id: 'Barchasi', label: 'Barchasi' },
    { id: 'Global Health Updates', label: t('news_cat_global') },
    { id: 'WHO Guidelines', label: t('news_cat_who') },
    { id: 'CDC Vaccination Protocols', label: t('news_cat_cdc') },
    { id: 'Infection Monitoring', label: t('news_cat_infection') },
  ];

  const filteredNews = newsCategory === 'Barchasi' 
    ? news 
    : news.filter(item => item.category === newsCategory);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-6xl mx-auto flex flex-col p-4 md:p-6"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
          <Globe className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('news_title')}</h2>
          <p className="text-foreground/60">{t('news_desc')}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setNewsCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              newsCategory === cat.id 
                ? 'bg-primary text-primary-foreground shadow-md' 
                : 'bg-secondary text-foreground hover:bg-secondary/80'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredNews.map(news => (
          <div key={news.id} className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col">
            <div className="relative h-48 overflow-hidden">
              <img 
                src={news.imageUrl} 
                alt={news.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-primary">
                {news.category}
              </div>
            </div>
            <div className="p-6 flex flex-col flex-1">
              <div className="text-xs text-foreground/50 mb-3">{news.date}</div>
              <h3 className="text-xl font-bold text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors">{news.title}</h3>
              <p className="text-foreground/70 text-sm mb-6 line-clamp-3 flex-1">{news.excerpt}</p>
              <a href={news.link} target="_blank" rel="noopener noreferrer" className="text-primary font-medium text-sm flex items-center gap-2 hover:gap-3 transition-all mt-auto w-fit">
                Batafsil o'qish <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        ))}
        {filteredNews.length === 0 && (
          <div className="col-span-full py-12 text-center text-foreground/50">
            Bu kategoriyada hozircha yangiliklar yo'q.
          </div>
        )}
      </div>
    </motion.div>
  );
}
