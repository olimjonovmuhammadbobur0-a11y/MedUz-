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
  Microscope,
  Mic
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { GoogleGenAI, ThinkingLevel, GenerateContentResponse } from "@google/genai";
import { Mnemonic, Question, SymptomData, VideoData, Section, Setting, Patient, OSCEScenario, Subject, Topic, NewsItem, JournalItem, initialFanlar, initialSettings, initialNews, initialJournals } from './data';
import { explainMedicalTopic } from './services/aiService';
import { LiveAudioChat } from './components/LiveAudioChat';
import { quizData } from './quizData';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, setDoc, writeBatch, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { auth, db } from './firebase';

const getYouTubeEmbedUrl = (url: string) => {
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : url;
};

type Page = 'home' | 'mnemonics' | 'videos' | 'symptoms' | 'quiz' | 'admin' | 'ai' | 'library' | 'patients' | 'osce' | 'tutor' | 'pharma' | 'fanlar' | 'news' | 'journals' | 'profile' | 'laboratory';

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
import { LaboratoryPage } from './components/LaboratoryPage';
import { useTranslation, Language } from './i18n';

function getPatientAvatar(patientInfo?: { age: number, gender: 'male' | 'female' }, className: string = "w-10 h-10 text-foreground/40") {
  if (!patientInfo) return <Icons.User className={className} />;
  
  const { age, gender } = patientInfo;
  
  let emoji = '🧑';
  if (age <= 2) emoji = '👶';
  else if (age <= 12) emoji = gender === 'male' ? '👦' : '👧';
  else if (age <= 60) emoji = gender === 'male' ? '👨' : '👩';
  else emoji = gender === 'male' ? '👴' : '👵';

  const isSmall = className.includes('w-3') || className.includes('w-4');
  const fontSize = isSmall ? '1rem' : '2.5rem';

  return <span className="leading-none" style={{ fontSize }}>{emoji}</span>;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
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
        const currentProgress = userDoc.data().progress_v2 || { quizScore: 0, videosWatched: 0, mnemonicsRead: 0, symptomsChecked: 0 };
        const newValue = typeof value === 'function' ? value(currentProgress[field] || 0) : value;
        await updateDoc(userRef, {
          [`progress_v2.${field}`]: newValue
        });
      }
    } catch (error) {
      console.error("Error updating progress:", error);
    }
  };

  const saveActivity = async (type: 'test' | 'video', details: any) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        const historyField = type === 'test' ? 'testHistory_v2' : 'videoHistory_v2';
        const currentHistory = data[historyField] || [];
        
        const newHistory = [{
          ...details,
          date: new Date().toISOString()
        }, ...currentHistory].slice(0, 50); // Keep last 50 items
        
        await updateDoc(userRef, {
          [historyField]: newHistory
        });
      }
    } catch (error) {
      console.error("Error saving activity:", error);
    }
  };

  const handleSetFanlar = async (newData: Subject[]) => {
    setFanlarData(newData);
    if (user && (user.email === 'muhammadboburolimjonov2@gmail.com' || user.email === 'olimjonovmuhammadbobur0@gmail.com')) {
      try {
        await setDoc(doc(db, 'fanlar', 'main'), { data: newData });
      } catch (error) {
        console.error('Error saving fanlar to Firestore:', error);
      }
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
              progress_v2: {
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    localStorage.setItem('meduz_app_settings', JSON.stringify(appSettings));
  }, [appSettings]);

  useEffect(() => {
    const autoRestore = async () => {
      const hardcodedAdmins = ["muhammadboburolimjonov2@gmail.com", "olimjonovmuhammadbobur0@gmail.com"];
      const hasRestored = localStorage.getItem('meduz_auto_restored_v2');
      
      if (user && hardcodedAdmins.includes(user.email || '') && !hasRestored) {
        console.log('Auto-restoring tests for admin...');
        localStorage.setItem('meduz_auto_restored_v2', 'true');
        try {
          let updatedFanlar = [...fanlarData];
          let batch = writeBatch(db);
          let operationCount = 0;

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
                // Create a deterministic ID to prevent duplicates and "Document already exists" errors on retry
                const docId = btoa(encodeURIComponent(q.text.substring(0, 50))).replace(/[/+=]/g, '_').substring(0, 50);
                batch.set(doc(db, 'questions', docId), questionData);
                operationCount++;

                if (operationCount >= 450) {
                  await batch.commit();
                  batch = writeBatch(db);
                  operationCount = 0;
                }
              }
            }
          }
          
          if (operationCount > 0) {
            await batch.commit();
          }

          await handleSetFanlar(updatedFanlar);
          fetchAllData();
        } catch (error) {
          console.error('Auto-restore error:', error);
          localStorage.removeItem('meduz_auto_restored_v2');
        }
      }
    };
    if (user) {
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
        systemInstruction: "Siz MedUz tibbiy platformasining bosh o'qituvchisi (AI Professor)siz. Tibbiyot talabalariga o'zbek tilida aniq, ilmiy asoslangan va xalqaro standartlarga (WHO, EBM) mos keladigan javoblar bering. Hech qachon taxmin qilmang. Agar bemor holati so'ralsa, klinik fikrlashni (clinical reasoning) qadamma-qadam tushuntiring.",
        temperature: 0.2,
        topP: 0.8
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
      
      // Merge questions from Firestore and hardcoded quizData
      const mergedQuestions: any[] = [...q];
      quizData.subjects.forEach(subject => {
        subject.topics.forEach(topic => {
          topic.questions.forEach(question => {
            if (!mergedQuestions.find((mq: any) => mq.question === question.text)) {
              mergedQuestions.push({
                id: question.id.toString(),
                subject: subject.name,
                topic: topic.name,
                difficulty: 'medium',
                question: question.text,
                options: question.options,
                correct: question.correct,
                explanation: (question as any).explanation || ''
              });
            }
          });
        });
      });
      setQuestionsData(mergedQuestions as any);

      setSymptomsData(s as any);
      setVideosData(v as any);
      setPatientsData(p as any);
      setSectionsData(sec as any);
      setSettingsData(sett as any);
      setOsceScenarios(osce as any);
      if (libDoc.exists()) {
        setLibraryData(libDoc.data().data);
      }
      
      // Merge fanlar from Firestore and hardcoded quizData
      let mergedFanlar = fanlarDoc.exists() ? fanlarDoc.data().data : [...initialFanlar];
      quizData.subjects.forEach(subject => {
        let existingSubject = mergedFanlar.find((f: any) => f.title === subject.name);
        if (!existingSubject) {
          existingSubject = {
            id: subject.id.toString(),
            title: subject.name,
            description: subject.name + ' fanidan testlar',
            icon: subject.icon || 'BookOpen',
            topics: []
          };
          mergedFanlar.push(existingSubject);
        }
        subject.topics.forEach(topic => {
          let existingTopic = existingSubject.topics.find((t: any) => t.title === topic.name);
          if (!existingTopic) {
            existingTopic = {
              id: topic.id.toString(),
              title: topic.name,
              videos: [],
              guides: []
            };
            existingSubject.topics.push(existingTopic);
          }
        });
      });
      setFanlarData(mergedFanlar);
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
                <div className="relative" ref={profileMenuRef}>
                  <button 
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="flex items-center gap-3 bg-card hover:bg-secondary px-3 py-2 rounded-2xl border border-border/50 transition-all shadow-sm hover:shadow-md"
                  >
                    <div className="relative">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName} className="w-9 h-9 rounded-full object-cover border-2 border-primary/20" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center text-sm font-bold shadow-inner">
                          {user.displayName?.charAt(0) || 'U'}
                        </div>
                      )}
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-card"></div>
                    </div>
                    <div className="flex flex-col items-start pr-2">
                      <span className="text-sm font-semibold text-foreground leading-tight">{user.displayName?.split(' ')[0]}</span>
                      <span className="text-[10px] text-foreground/60 font-medium uppercase tracking-wider">Shifokor</span>
                    </div>
                    <Icons.ChevronDown className={`w-4 h-4 text-foreground/50 transition-transform duration-300 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isProfileMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: -10, filter: "blur(10px)" }}
                        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, scale: 0.8, y: -10, filter: "blur(10px)" }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        style={{ transformOrigin: "top right" }}
                        className="absolute right-0 mt-2 w-64 bg-card rounded-2xl shadow-xl border border-border/50 overflow-hidden z-50"
                      >
                        <div className="p-4 border-b border-border/50 bg-secondary/30">
                          <p className="font-semibold text-foreground truncate">{user.displayName}</p>
                          <p className="text-xs text-foreground/60 truncate mt-0.5">{user.email}</p>
                        </div>
                        <div className="p-2 space-y-1">
                          <button
                            onClick={() => { navigate('profile'); setIsProfileMenuOpen(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground/80 hover:text-primary hover:bg-primary/10 transition-colors"
                          >
                            <Icons.User className="w-4 h-4" />
                            Mening profilim
                          </button>
                          <button
                            onClick={() => { navigate('laboratory'); setIsProfileMenuOpen(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground/80 hover:text-primary hover:bg-primary/10 transition-colors"
                          >
                            <Icons.Activity className="w-4 h-4" />
                            Laboratoriya
                          </button>
                        </div>
                        <div className="p-2 border-t border-border/50">
                          <button
                            onClick={() => { handleLogout(); setIsProfileMenuOpen(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors"
                          >
                            <Icons.LogOut className="w-4 h-4" />
                            Tizimdan chiqish
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
                  <div className="bg-secondary/50 rounded-2xl border border-border/50 mb-6 overflow-hidden">
                    <div className="p-4 flex items-center gap-4 border-b border-border/50 bg-card">
                      <div className="relative">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.displayName} className="w-12 h-12 rounded-full object-cover border-2 border-primary/20" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center text-lg font-bold shadow-inner">
                            {user.displayName?.charAt(0) || 'U'}
                          </div>
                        )}
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-card"></div>
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-base font-semibold text-foreground truncate">{user.displayName}</span>
                        <span className="text-xs text-foreground/60 truncate">{user.email}</span>
                      </div>
                    </div>
                    <div className="p-2 space-y-1">
                      <button
                        onClick={() => { navigate('profile'); setIsMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-foreground/80 hover:text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Icons.User className="w-5 h-5" />
                        Mening profilim
                      </button>
                      <button
                        onClick={() => { navigate('laboratory'); setIsMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-foreground/80 hover:text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Icons.Activity className="w-5 h-5" />
                        Laboratoriya
                      </button>
                      <button 
                        onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <Icons.LogOut className="w-5 h-5" />
                        Tizimdan chiqish
                      </button>
                    </div>
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
                <MobileNavLink active={currentPage === 'fanlar'} onClick={() => { navigate('fanlar'); setIsMenuOpen(false); }}>{t('subjects')}</MobileNavLink>
                <MobileNavLink active={currentPage === 'library'} onClick={() => { navigate('library'); setIsMenuOpen(false); }}>{t('library')}</MobileNavLink>
                <MobileNavLink active={currentPage === 'videos'} onClick={() => { navigate('videos'); setIsMenuOpen(false); }}>{t('videos')}</MobileNavLink>
                <MobileNavLink active={currentPage === 'mnemonics'} onClick={() => { navigate('mnemonics'); setIsMenuOpen(false); }}>{t('mnemonics')}</MobileNavLink>
                <MobileNavLink active={currentPage === 'symptoms'} onClick={() => { navigate('symptoms'); setIsMenuOpen(false); }}>{t('symptoms')}</MobileNavLink>
                <MobileNavLink active={currentPage === 'quiz'} onClick={() => { navigate('quiz'); setIsMenuOpen(false); }}>{t('quiz')}</MobileNavLink>
                <MobileNavLink active={currentPage === 'osce'} onClick={() => { navigate('osce'); setIsMenuOpen(false); }}>{t('osce')}</MobileNavLink>
                <MobileNavLink active={currentPage === 'patients'} onClick={() => { navigate('patients'); setIsMenuOpen(false); }}>{t('patients')}</MobileNavLink>
                <MobileNavLink active={currentPage === 'laboratory'} onClick={() => { navigate('laboratory'); setIsMenuOpen(false); }}>Laboratoriya</MobileNavLink>
                <MobileNavLink active={currentPage === 'pharma'} onClick={() => { navigate('pharma'); setIsMenuOpen(false); }}>{t('pharma')}</MobileNavLink>
                <MobileNavLink active={currentPage === 'journals'} onClick={() => { navigate('journals'); setIsMenuOpen(false); }}>Jurnallar</MobileNavLink>
                <MobileNavLink active={currentPage === 'news'} onClick={() => { navigate('news'); setIsMenuOpen(false); }}>{t('news_title')}</MobileNavLink>
                <MobileNavLink active={currentPage === 'tutor'} onClick={() => { navigate('tutor'); setIsMenuOpen(false); }}>{t('tutor')}</MobileNavLink>
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
          {currentPage === 'videos' && <VideosPage data={videosData} handleAIExplain={handleAIExplain} updateProgress={updateProgress} saveActivity={saveActivity} />}
          {currentPage === 'symptoms' && <SymptomsPage data={symptomsData} handleAIExplain={handleAIExplain} updateProgress={updateProgress} />}
          {currentPage === 'patients' && <PatientsPage patients={patientsData} onTreat={handleTreatPatient} onClearAdvice={handleClearAdvice} />}
          {currentPage === 'osce' && <OSCEPage scenarios={osceScenarios} />}
          {currentPage === 'quiz' && <QuizPage handleAIExplain={handleAIExplain} showAlert={showAlert} user={user} updateProgress={updateProgress} saveActivity={saveActivity} fanlar={fanlarData} questions={questionsData} />}
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
            setFanlar={handleSetFanlar}
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
          {currentPage === 'laboratory' && <LaboratoryPage />}
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
                <li><button onClick={() => navigate('mnemonics')} className="hover:text-primary transition-colors">Mnemonika</button></li>
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

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-4 md:px-8 max-w-7xl mx-auto">
        {/* Left Column */}
        <div className="space-y-8">
          {/* Core Learning */}
          <section>
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-[10px] md:text-xs font-bold text-foreground/80 tracking-widest uppercase">ASOSIY <span className="text-foreground/40 font-medium">(CORE LEARNING)</span></h2>
              <div className="flex-1 h-px bg-border/50"></div>
            </div>
            <div className="flex justify-between gap-2 overflow-x-auto custom-scrollbar pb-2">
              {[
                { id: 'fanlar', label: 'Fanlar', icon: Icons.Dna, color: 'bg-[#F57C00]' },
                { id: 'library', label: 'Kutubxona', icon: BookOpen, color: 'bg-[#1877F2]' },
                { id: 'videos', label: 'Videolar', icon: Video, color: 'bg-[#1976D2]' },
                { id: 'mnemonics', label: 'Mnemonika', icon: Brain, color: 'bg-[#9C27B0]' },
                { id: 'symptoms', label: 'Simptomlar', icon: Icons.Activity, color: 'bg-[#FF9800]' },
              ].map((item) => (
                <button 
                  key={item.id} 
                  onClick={() => onNavigate(item.id as Page)}
                  className="flex flex-col items-center gap-2 group min-w-[64px] flex-1"
                >
                  <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-white shadow-sm transition-transform duration-200 group-hover:scale-105 group-active:scale-95 ${item.color}`}>
                    <item.icon className="w-7 h-7 md:w-8 md:h-8" strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] md:text-xs font-medium text-foreground/80 group-hover:text-foreground transition-colors text-center">{item.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Practice & Assessment */}
          <section>
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-[10px] md:text-xs font-bold text-foreground/80 tracking-widest uppercase">AMALIYOT <span className="text-foreground/40 font-medium">(PRACTICE & ASSESSMENT)</span></h2>
              <div className="flex-1 h-px bg-border/50"></div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { id: 'quiz', label: 'Testlar', icon: Icons.ClipboardList, bgColor: 'bg-[#FFF3E0]', iconColor: 'text-[#FF9800]' },
                { id: 'osce', label: 'OSCE', icon: Stethoscope, bgColor: 'bg-[#E0F2F1]', iconColor: 'text-[#00BFA5]' },
                { id: 'patients', label: 'Bemorlar', icon: Icons.Users, bgColor: 'bg-[#F3E5F5]', iconColor: 'text-[#9C27B0]' },
                { id: 'laboratory', label: 'Laboratoriya', icon: Icons.FlaskConical, bgColor: 'bg-[#E3F2FD]', iconColor: 'text-[#2196F3]' },
              ].map((item) => (
                <button 
                  key={item.id} 
                  onClick={() => onNavigate(item.id as Page)}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className={`w-full aspect-square max-w-[80px] rounded-2xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105 group-active:scale-95 ${item.bgColor}`}>
                    <item.icon className={`w-8 h-8 md:w-10 md:h-10 ${item.iconColor}`} strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] md:text-xs font-medium text-foreground/80 group-hover:text-foreground transition-colors text-center">{item.label}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          {/* Clinical Tools & AI */}
          <section>
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-[10px] md:text-xs font-bold text-foreground/80 tracking-widest uppercase">KLINIKA <span className="text-foreground/40 font-medium">(CLINICAL TOOLS & AI)</span></h2>
              <div className="flex-1 h-px bg-border/50"></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'pharma', label: 'Farmakologiya', icon: Icons.Pill, iconColor: 'text-[#00BFA5]' },
                { id: 'journals', label: 'Jurnallar', icon: Icons.BookText, iconColor: 'text-[#78909C]' },
                { id: 'tutor', label: 'AI Tutor', icon: Icons.Bot, iconColor: 'text-[#2196F3]' },
                { id: 'news', label: 'Global Health News', icon: Globe, iconColor: 'text-[#78909C]' },
              ].map((item) => (
                <button 
                  key={item.id} 
                  onClick={() => onNavigate(item.id as Page)}
                  className="flex items-center gap-3 bg-card border border-border/60 p-4 rounded-2xl hover:bg-secondary/50 transition-colors group shadow-sm"
                >
                  <div className={`p-2 rounded-xl bg-secondary/50 group-hover:bg-background transition-colors ${item.iconColor}`}>
                    <item.icon className="w-6 h-6" strokeWidth={1.5} />
                  </div>
                  <span className="font-medium text-sm text-foreground/90">{item.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* AI Center */}
          <section>
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-[#00BFA5] text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> AI
              </div>
              <h2 className="text-[10px] md:text-xs font-bold text-foreground/80 tracking-widest uppercase">AI MARKAZI</h2>
              <div className="flex-1 h-px bg-border/50"></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button 
                onClick={() => onNavigate('ai')}
                className="flex items-center gap-3 bg-card border border-border/60 p-4 rounded-2xl hover:bg-secondary/50 transition-colors group shadow-sm"
              >
                <div className="p-2 rounded-xl bg-secondary/50 group-hover:bg-background transition-colors text-[#673AB7]">
                  <Sparkles className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <span className="font-medium text-sm text-foreground/90">AI Markazi</span>
              </button>
            </div>
          </section>
        </div>
      </div>

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

function VideosPage({ data, handleAIExplain, updateProgress, saveActivity }: { data: VideoData[], handleAIExplain: (title: string, context: string) => void, updateProgress?: (field: any, value: any) => void, saveActivity?: (type: 'test' | 'video', details: any) => void }) {
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
      if (saveActivity) {
        saveActivity('video', {
          title: v.title,
          category: v.category
        });
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

function QuizPage({ handleAIExplain, showAlert, user, updateProgress, saveActivity, fanlar, questions }: { handleAIExplain: (title: string, context: string) => void, showAlert: (title: string, content: string) => void, user: any, updateProgress: (field: any, value: any) => void, saveActivity?: (type: 'test' | 'video', details: any) => void, fanlar: Subject[], questions: Question[] }) {
  const { t } = useTranslation();
  const [step, setStep] = useState<'subjects' | 'topics' | 'quiz' | 'result' | 'review' | 'retry_request'>('subjects');
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [caseText, setCaseText] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [caseScores, setCaseScores] = useState<Record<number, { score: number, feedback: string }>>({});
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [timeTaken, setTimeTaken] = useState(0);
  const [cheatCount, setCheatCount] = useState(0);
  const [userAttempts, setUserAttempts] = useState<Record<string, number>>({});
  const [requestSent, setRequestSent] = useState<Record<string, boolean>>({});
  const [motivationalMessage, setMotivationalMessage] = useState<string | null>(null);
  
  const motivationalMessages = [
    "Siz juda to'g'ri topdingiz!",
    "Ajoyib natija!",
    "Barakalla, davom eting!",
    "Qoyilmaqom!",
    "Juda yaxshi, to'g'ri javob!",
    "Sizning bilimlaringiz tahsinga sazovor!",
    "Zo'r! Xuddi shunday davom eting!",
    "Mukammal javob!"
  ];
  
  const [scoreboard, setScoreboard] = useState<{name: string, surname: string, score: number, time: number, topic: string}[]>([]);

  useEffect(() => {
    if (user) {
      const fetchAttempts = async () => {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          setUserAttempts(userDoc.data().quizAttempts || {});
        }
        
        // Check requests
        const requestsQuery = await getDocs(collection(db, 'quizRequests'));
        const sent: Record<string, boolean> = {};
        requestsQuery.forEach(doc => {
          const data = doc.data();
          if (data.userId === user.uid && data.status === 'pending') {
            sent[data.topic] = true;
          }
        });
        setRequestSent(sent);
      };
      fetchAttempts();
    }
  }, [user, step]);

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
            timeLimit: t.timeLimit,
            questions: topicQuestions.map(q => ({
              id: q.id,
              type: q.type || 'test',
              scenario: q.scenario || '',
              imageUrl: q.imageUrl || '',
              text: q.question,
              options: q.options || [],
              correct: q.correct !== undefined ? q.correct : 0,
              explanation: q.explanation,
              aiAnswerGuide: q.aiAnswerGuide || ''
            }))
          };
        }).filter(t => t.questions.length > 0)
      };
    }).filter(s => s.topics.length > 0);
  }, [fanlar, questions]);

  useEffect(() => {
    const saved = localStorage.getItem('meduz_quiz_scores_v2');
    if (saved) setScoreboard(JSON.parse(saved));
  }, []);

  const [userAnswers, setUserAnswers] = useState<(number | number[] | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [shuffledOptionsMap, setShuffledOptionsMap] = useState<Record<number, number[]>>({});

  const handleSubjectSelect = (subject: any) => {
    setSelectedSubject(subject);
    setStep('topics');
  };

  const handleTopicSelect = (topic: any) => {
    setSelectedTopic(topic);
    if (userAttempts[topic.name] >= 3) {
      setStep('retry_request');
      return;
    }
    setStep('quiz');
    setCurrentQuestionIdx(0);
    setScore(0);
    setCheatCount(0);
    setStartTime(Date.now());
    setIsAnswered(false);
    setSelectedOptions([]);
    setCaseText('');
    setIsEvaluating(false);
    setCaseScores({});
    setUserAnswers(new Array(topic.questions.length).fill(null));
    
    const newShuffledMap: Record<number, number[]> = {};
    topic.questions.forEach((q: any, qIdx: number) => {
      const indices = q.options.map((_: any, i: number) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      newShuffledMap[qIdx] = indices;
    });
    setShuffledOptionsMap(newShuffledMap);

    if (topic.timeLimit) {
      setTimeLeft(topic.timeLimit * 60);
    } else {
      setTimeLeft(null);
    }
  };

  useEffect(() => {
    if (step === 'quiz' && timeLeft !== null && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev && prev <= 1) {
            clearInterval(timer);
            finishQuiz(score);
            showAlert("Vaqt tugadi", "Test ishlash uchun ajratilgan vaqt tugadi.");
            return 0;
          }
          return prev ? prev - 1 : 0;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, timeLeft, score]);

  useEffect(() => {
    const handleBlur = () => {
      if (step === 'quiz') {
        const newCheatCount = cheatCount + 1;
        setCheatCount(newCheatCount);
        
        if (newCheatCount >= 3) {
          showAlert("Test yakunlandi", "Siz 3 marta testdan chiqib ketdingiz. Test avtomatik tarzda yakunlandi.");
          finishQuiz(score);
        } else {
          showAlert("Ogohlantirish", `Test vaqtida boshqa oynaga o'tish taqiqlanadi! (Qoidabuzarlik: ${newCheatCount}/3). Joriy savol xato deb belgilandi.`);
          if (!isAnswered) {
            // Mark as incorrect and move to next
            const newUserAnswers = [...userAnswers];
            newUserAnswers[currentQuestionIdx] = -1; // -1 means skipped/incorrect due to cheating
            setUserAnswers(newUserAnswers);
            
            if (currentQuestionIdx < selectedTopic.questions.length - 1) {
              setCurrentQuestionIdx(prev => prev + 1);
              setSelectedOptions([]);
              setIsAnswered(false);
            } else {
              finishQuiz(score);
            }
          }
        }
      }
    };

    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [step, cheatCount, isAnswered, currentQuestionIdx, selectedTopic, score, userAnswers]);

  const handleAnswer = (idx: number) => {
    if (isAnswered) return;
    const currentQ = selectedTopic.questions[currentQuestionIdx];
    const isMultiple = Array.isArray(currentQ.correct) && currentQ.correct.length > 1;

    if (isMultiple) {
      setSelectedOptions(prev => 
        prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
      );
    } else {
      setSelectedOptions([idx]);
      submitAnswer([idx]);
    }
  };

  const submitAnswer = (selected: number[]) => {
    setIsAnswered(true);
    const currentQ = selectedTopic.questions[currentQuestionIdx];
    const isMultiple = Array.isArray(currentQ.correct) && currentQ.correct.length > 1;
    
    const newUserAnswers = [...userAnswers];
    newUserAnswers[currentQuestionIdx] = isMultiple ? selected : selected[0];
    setUserAnswers(newUserAnswers);
    
    let isCorrect = false;
    if (isMultiple) {
      const correctArr = currentQ.correct as number[];
      isCorrect = selected.length === correctArr.length && selected.every(s => correctArr.includes(s));
    } else {
      const correctVal = Array.isArray(currentQ.correct) ? currentQ.correct[0] : currentQ.correct;
      isCorrect = selected[0] === correctVal;
    }

    if (isCorrect) {
      setScore(s => s + 1);
      const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
      setMotivationalMessage(randomMessage);
    }
  };

  const handleCaseSubmit = async () => {
    if (!caseText.trim()) return;
    setIsEvaluating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const currentQ = selectedTopic.questions[currentQuestionIdx];
      const prompt = `You are an expert medical evaluator. Evaluate the student's answer to the following clinical case.
      
Clinical Scenario: ${currentQ.scenario}
Question: ${currentQ.question}
Expected AI Answer Guide / Rubric: ${currentQ.aiAnswerGuide}

Student's Answer: ${caseText}

Evaluate the student's answer based on the rubric.
1. Provide a score from 0 to 100.
2. Provide a brief feedback explaining what was good and what was missing.

Return ONLY a JSON object in this format:
{
  "score": number,
  "feedback": "string"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      
      const result = JSON.parse(response.text || '{}');
      
      setCaseScores(prev => ({
        ...prev,
        [currentQuestionIdx]: {
          score: result.score || 0,
          feedback: result.feedback || "Baholashda xatolik yuz berdi."
        }
      }));
      
      if (result.score >= 70) {
        const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
        setMotivationalMessage(randomMessage);
      }
      
      const newUserAnswers = [...userAnswers];
      newUserAnswers[currentQuestionIdx] = caseText as any;
      setUserAnswers(newUserAnswers);
      
      setIsAnswered(true);
    } catch (error) {
      console.error(error);
      showAlert("Xatolik", "Javobni baholashda xatolik yuz berdi.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIdx < selectedTopic.questions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
      setSelectedOptions([]);
      setIsAnswered(false);
      setCaseText('');
      setMotivationalMessage(null);
    } else {
      finishQuiz(score);
    }
  };

  const finishQuiz = (finalScore: number) => {
    const time = Math.floor((Date.now() - startTime) / 1000);
    setTimeTaken(time);
    
    const testQuestions = selectedTopic?.questions?.filter((q: any) => q.type === 'test') || [];
    const caseQuestions = selectedTopic?.questions?.filter((q: any) => q.type === 'case') || [];
    
    let finalPercentage = 0;
    let testPercentage = 0;
    let casePercentage = 0;

    if (testQuestions.length > 0) {
      testPercentage = (finalScore / testQuestions.length) * 100;
    }

    if (caseQuestions.length > 0) {
      const totalCaseScore = Object.values(caseScores).reduce((acc, curr) => acc + curr.score, 0);
      casePercentage = totalCaseScore / caseQuestions.length;
    }

    if (testQuestions.length > 0 && caseQuestions.length > 0) {
      finalPercentage = Math.round((testPercentage * 0.7) + (casePercentage * 0.3));
    } else if (testQuestions.length > 0) {
      finalPercentage = Math.round(testPercentage);
    } else if (caseQuestions.length > 0) {
      finalPercentage = Math.round(casePercentage);
    }

    if (user) {
      updateProgress('quizScore', (prev: number) => prev + finalScore);
      if (saveActivity) {
        saveActivity('test', {
          subject: selectedSubject.name,
          topic: selectedTopic.name,
          score: finalPercentage,
          total: 100
        });
      }
      
      // Update attempts
      const newAttempts = (userAttempts[selectedTopic.name] || 0) + 1;
      setUserAttempts(prev => ({ ...prev, [selectedTopic.name]: newAttempts }));
      const userRef = doc(db, 'users', user.uid);
      updateDoc(userRef, {
        [`quizAttempts.${selectedTopic.name}`]: newAttempts
      }).catch(console.error);
    }
    
    const nameParts = user?.displayName?.split(' ') || ['Mehmon', ''];
    const newScore = { 
      name: nameParts[0] || 'Mehmon', 
      surname: nameParts.slice(1).join(' ') || '', 
      score: finalPercentage, 
      time,
      topic: selectedTopic.name
    };
    
    const newBoard = [...scoreboard, newScore]
      .sort((a, b) => b.score - a.score || a.time - b.time)
      .slice(0, 10);
      
    setScoreboard(newBoard);
    localStorage.setItem('meduz_quiz_scores_v2', JSON.stringify(newBoard));
    
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
  const testQuestions = selectedTopic?.questions?.filter((q: any) => q.type === 'test') || [];
  const caseQuestions = selectedTopic?.questions?.filter((q: any) => q.type === 'case') || [];
  
  let percentage = 0;
  let testPercentage = 0;
  let casePercentage = 0;

  if (testQuestions.length > 0) {
    testPercentage = (score / testQuestions.length) * 100;
  }

  if (caseQuestions.length > 0) {
    const totalCaseScore = Object.values(caseScores).reduce((acc, curr) => acc + curr.score, 0);
    casePercentage = totalCaseScore / caseQuestions.length;
  }

  if (testQuestions.length > 0 && caseQuestions.length > 0) {
    percentage = Math.round((testPercentage * 0.7) + (casePercentage * 0.3));
  } else if (testQuestions.length > 0) {
    percentage = Math.round(testPercentage);
  } else if (caseQuestions.length > 0) {
    percentage = Math.round(casePercentage);
  }
  
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
      
      let scoreText = `Umumiy Foiz: ${percentage}%`;
      if (testQuestions.length > 0 && caseQuestions.length > 0) {
        scoreText += ` (Test: ${score}/${testQuestions.length}, Masala: ${Math.round(casePercentage)}/100)`;
      } else if (testQuestions.length > 0) {
        scoreText = `Natija: ${score} / ${testQuestions.length} (${percentage}%)`;
      } else if (caseQuestions.length > 0) {
        scoreText = `Natija: ${Math.round(casePercentage)} / 100 (${percentage}%)`;
      }
      
      doc.text(scoreText, width / 2, 120, { align: "center" });

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

  if (step === 'retry_request') {
    const handleRequestRetry = async () => {
      if (!user) return;
      try {
        await addDoc(collection(db, 'quizRequests'), {
          userId: user.uid,
          userEmail: user.email,
          userName: user.displayName || 'Mehmon',
          topic: selectedTopic.name,
          subject: selectedSubject.name,
          status: 'pending',
          createdAt: Date.now()
        });
        setRequestSent(prev => ({ ...prev, [selectedTopic.name]: true }));
        showAlert("So'rov yuborildi", "Sizning so'rovingiz adminga yuborildi. Ruxsat berilgach, testni qayta ishlashingiz mumkin.");
        
        // Open email client
        const subject = encodeURIComponent(`Testni qayta ishlash uchun so'rov: ${selectedTopic.name}`);
        const body = encodeURIComponent(`Salom Admin,\n\nMen "${selectedTopic.name}" mavzusi bo'yicha test ishlash limitini tugatdim. Iltimos, qayta ishlash uchun ruxsat bering.\n\nFoydalanuvchi: ${user.displayName || 'Mehmon'}\nEmail: ${user.email}\nUID: ${user.uid}`);
        window.location.href = `mailto:muhammadboburolimjonov62@gmail.com?subject=${subject}&body=${body}`;
        
      } catch (error) {
        console.error("Error sending request:", error);
        showAlert("Xatolik", "So'rov yuborishda xatolik yuz berdi.");
      }
    };

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto mt-20 p-8 bg-card rounded-3xl shadow-sm border border-border text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-4">Limit tugadi</h2>
        <p className="text-foreground/70 mb-8">
          Siz "{selectedTopic.name}" mavzusi bo'yicha test ishlash limitini (3 marta) tugatdingiz. Qayta ishlash uchun adminga so'rov yuborishingiz kerak.
        </p>
        
        {requestSent[selectedTopic.name] ? (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl font-medium">
            So'rov yuborilgan. Kuting...
          </div>
        ) : (
          <button
            onClick={handleRequestRetry}
            className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            Qayta ishlash uchun maxsus iltimos yo'llang
          </button>
        )}
        
        <button
          onClick={() => setStep('topics')}
          className="mt-4 w-full py-3 text-foreground/60 hover:text-foreground hover:bg-secondary rounded-xl transition-all font-medium"
        >
          Orqaga qaytish
        </button>
      </motion.div>
    );
  }

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
            {timeLeft !== null && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg font-mono text-sm font-semibold whitespace-nowrap">
                <Clock className="w-4 h-4" />
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </div>
            )}
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
          {currentQ.type === 'case' && currentQ.scenario && (
            <div className="bg-secondary/50 p-4 rounded-xl border border-border/40 mb-6">
              <h4 className="font-semibold text-primary mb-2">Klinik vaziyat:</h4>
              <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">{currentQ.scenario}</p>
            </div>
          )}
          
          {currentQ.imageUrl && (
            <div className="mb-6 rounded-xl overflow-hidden border border-border/40">
              <img src={currentQ.imageUrl} alt="Question" className="w-full h-auto max-h-96 object-contain bg-secondary/20" />
            </div>
          )}
          <h3 className="text-xl md:text-2xl font-semibold text-foreground leading-snug tracking-tight">{currentQ.text}</h3>
          
          {currentQ.type === 'test' ? (
            <div className="grid grid-cols-1 gap-3">
              {(shuffledOptionsMap[currentQuestionIdx] || currentQ.options.map((_: any, i: number) => i)).map((originalIdx: number) => {
                const option = currentQ.options[originalIdx];
                const idx = originalIdx;
                const isMultiple = Array.isArray(currentQ.correct) && currentQ.correct.length > 1;
                const correctArr = Array.isArray(currentQ.correct) ? currentQ.correct : [currentQ.correct];
                const isCorrectOption = correctArr.includes(idx);
                const isSelected = selectedOptions.includes(idx);

                let stateClass = "border-border/40 hover:border-primary/50 hover:bg-primary/5 text-foreground";
                if (isAnswered) {
                  if (isCorrectOption) stateClass = "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
                  else if (isSelected) stateClass = "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400";
                  else stateClass = "border-border/40 opacity-40 text-foreground";
                } else if (isSelected) {
                  stateClass = "border-primary bg-primary/10 text-primary";
                }

                return (
                  <button 
                    key={originalIdx}
                    onClick={() => handleAnswer(idx)}
                    disabled={isAnswered}
                    className={`w-full text-left p-4 rounded-xl border-2 font-medium transition-all duration-200 flex justify-between items-center group ${stateClass}`}
                  >
                    <div className="flex items-center gap-3">
                      {isMultiple && (
                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-border/60'}`}>
                          {isSelected && <CheckCircle2 className="w-3 h-3" />}
                        </div>
                      )}
                      <span className="text-base">{option}</span>
                    </div>
                    {isAnswered && isCorrectOption && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                    {isAnswered && isSelected && !isCorrectOption && <X className="w-5 h-5 text-red-500" />}
                  </button>
                );
              })}
              {!isAnswered && Array.isArray(currentQ.correct) && currentQ.correct.length > 1 && (
                <button
                  onClick={() => submitAnswer(selectedOptions)}
                  disabled={selectedOptions.length === 0}
                  className="mt-4 w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Javobni tasdiqlash
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <textarea
                value={caseText}
                onChange={(e) => setCaseText(e.target.value)}
                disabled={isAnswered || isEvaluating}
                placeholder="Javobingizni shu yerga yozing..."
                className="w-full h-40 p-4 rounded-xl border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary resize-none"
              />
              {!isAnswered && (
                <button
                  onClick={handleCaseSubmit}
                  disabled={!caseText.trim() || isEvaluating}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {isEvaluating ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Baholanmoqda...</>
                  ) : (
                    <>Javobni yuborish</>
                  )}
                </button>
              )}
              {isAnswered && caseScores[currentQuestionIdx] && (
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-primary">AI Bahosi:</h4>
                    <span className="text-lg font-bold text-primary">{caseScores[currentQuestionIdx].score} / 100</span>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{caseScores[currentQuestionIdx].feedback}</p>
                </div>
              )}
            </div>
          )}

          {isAnswered && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 pt-4 border-t border-border/40"
            >
              {motivationalMessage && (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-green-500/10 text-green-600 p-4 rounded-xl border border-green-500/20 flex items-center gap-3"
                >
                  <Sparkles className="w-5 h-5" />
                  <p className="font-medium">{motivationalMessage}</p>
                </motion.div>
              )}
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
            {testQuestions.length > 0 && (
              <div className="bg-secondary/50 p-6 rounded-2xl border border-border/40">
                <p className="text-foreground/50 text-sm font-medium mb-2 uppercase tracking-wider">{t('quizScore')}</p>
                <p className="text-5xl font-semibold text-foreground">{score} <span className="text-2xl text-foreground/40">/ {testQuestions.length}</span></p>
              </div>
            )}
            {caseQuestions.length > 0 && (
              <div className="bg-secondary/50 p-6 rounded-2xl border border-border/40">
                <p className="text-foreground/50 text-sm font-medium mb-2 uppercase tracking-wider">Vaziyatli Masala</p>
                <p className="text-5xl font-semibold text-foreground">{Math.round(casePercentage)} <span className="text-2xl text-foreground/40">/ 100</span></p>
              </div>
            )}
            <div className={`bg-secondary/50 p-6 rounded-2xl border border-border/40 ${testQuestions.length > 0 && caseQuestions.length > 0 ? 'col-span-2' : ''}`}>
              <p className="text-foreground/50 text-sm font-medium mb-2 uppercase tracking-wider">Umumiy Foiz</p>
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
            
            if (q.type === 'case') {
              const caseScore = caseScores[qIdx];
              return (
                <div key={qIdx} className="bg-card border border-border/40 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 bg-primary/10 text-primary">
                      {qIdx + 1}
                    </div>
                    <div className="space-y-4 flex-1">
                      <h3 className="text-lg md:text-xl font-medium text-foreground leading-snug">{q.scenario}</h3>
                      <p className="text-foreground/80 font-medium">{q.question}</p>
                    </div>
                  </div>

                  <div className="pl-14 space-y-4">
                    <div className="bg-secondary/30 p-4 rounded-xl border border-border/40">
                      <p className="text-sm font-medium text-foreground/50 mb-2 uppercase tracking-wider">Sizning javobingiz</p>
                      <p className="text-foreground whitespace-pre-wrap">{typeof userAnswer === 'string' ? userAnswer : 'Javob berilmagan'}</p>
                    </div>
                    
                    {caseScore && (
                      <div className="bg-primary/5 p-4 rounded-xl border border-primary/20">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-primary uppercase tracking-wider">AI Bahosi</p>
                          <span className="font-bold text-primary">{caseScore.score} / 100</span>
                        </div>
                        <p className="text-foreground/80 text-sm whitespace-pre-wrap">{caseScore.feedback}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            const isMultiple = Array.isArray(q.correct) && q.correct.length > 1;
            const correctArr = Array.isArray(q.correct) ? q.correct : [q.correct];
            const userArr = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
            const isCorrect = isMultiple 
              ? userArr.length === correctArr.length && userArr.every((s: any) => correctArr.includes(s))
              : userAnswer === q.correct;

            return (
              <div key={qIdx} className="bg-card border border-border/40 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${isCorrect ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                    {qIdx + 1}
                  </div>
                  <div className="flex-1">
                    {q.imageUrl && (
                      <div className="mb-4 rounded-xl overflow-hidden border border-border/40">
                        <img src={q.imageUrl} alt="Question" className="w-full h-auto max-h-64 object-contain bg-secondary/20" />
                      </div>
                    )}
                    <h3 className="text-lg md:text-xl font-medium text-foreground leading-snug">{q.text || q.question}</h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 pl-14">
                  {(shuffledOptionsMap[qIdx] || q.options?.map((_: any, i: number) => i) || []).map((originalIdx: number) => {
                    const option = q.options[originalIdx];
                    const oIdx = originalIdx;
                    const isCorrectOption = correctArr.includes(oIdx);
                    const isSelected = userArr.includes(oIdx);
                    
                    let optionClass = "border-border/40 text-foreground/60";
                    if (isCorrectOption) optionClass = "border-emerald-500 bg-emerald-500/10 text-emerald-600 font-bold";
                    else if (isSelected && !isCorrectOption) optionClass = "border-red-500 bg-red-500/10 text-red-600 font-bold";

                    return (
                      <div key={originalIdx} className={`p-4 rounded-xl border-2 flex justify-between items-center ${optionClass}`}>
                        <div className="flex items-center gap-3">
                          {isMultiple && (
                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-border/60'}`}>
                              {isSelected && <CheckCircle2 className="w-3 h-3" />}
                            </div>
                          )}
                          <span className="text-base">{option}</span>
                        </div>
                        {isCorrectOption && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                        {isSelected && !isCorrectOption && <X className="w-5 h-5 text-red-500" />}
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

  const [completedTopics, setCompletedTopics] = useState<string[]>(() => {
    const saved = localStorage.getItem('meduz_completed_topics');
    return saved ? JSON.parse(saved) : [];
  });
  const [filter, setFilter] = useState<'all' | 'completed' | 'incomplete' | 'has-videos' | 'has-guides'>('all');
  const [sort, setSort] = useState<'default' | 'videos-desc' | 'videos-asc' | 'guides-desc' | 'guides-asc'>('default');

  useEffect(() => {
    localStorage.setItem('meduz_completed_topics', JSON.stringify(completedTopics));
  }, [completedTopics]);

  const toggleTopicCompletion = (topicId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCompletedTopics(prev => 
      prev.includes(topicId) ? prev.filter(id => id !== topicId) : [...prev, topicId]
    );
  };

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
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-3xl font-bold text-foreground">{selectedTopic.title}</h2>
            <button
              onClick={(e) => toggleTopicCompletion(selectedTopic.id, e)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                completedTopics.includes(selectedTopic.id)
                  ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                  : 'bg-secondary text-foreground/70 hover:bg-secondary/80'
              }`}
            >
              {completedTopics.includes(selectedTopic.id) ? (
                <><Icons.CheckCircle2 className="w-5 h-5" /> Bajarilgan</>
              ) : (
                <><Icons.Circle className="w-5 h-5" /> Bajarilmagan</>
              )}
            </button>
          </div>
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
    let filteredTopics = selectedSubject.topics.filter(topic => {
      if (filter === 'completed') return completedTopics.includes(topic.id);
      if (filter === 'incomplete') return !completedTopics.includes(topic.id);
      if (filter === 'has-videos') return topic.videos.length > 0;
      if (filter === 'has-guides') return topic.guides.length > 0;
      return true;
    });

    filteredTopics.sort((a, b) => {
      if (sort === 'videos-desc') return b.videos.length - a.videos.length;
      if (sort === 'videos-asc') return a.videos.length - b.videos.length;
      if (sort === 'guides-desc') return b.guides.length - a.guides.length;
      if (sort === 'guides-asc') return a.guides.length - b.guides.length;
      return 0; // default
    });

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

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2 shadow-sm flex-1 sm:flex-none">
            <Icons.Filter className="w-4 h-4 text-foreground/50" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="bg-transparent border-none text-sm font-medium text-foreground focus:ring-0 outline-none w-full cursor-pointer"
            >
              <option value="all">Barcha mavzular</option>
              <option value="completed">Bajarilgan</option>
              <option value="incomplete">Bajarilmagan</option>
              <option value="has-videos">Videolar mavjud</option>
              <option value="has-guides">Qo'llanmalar mavjud</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2 shadow-sm flex-1 sm:flex-none">
            <Icons.ArrowDownUp className="w-4 h-4 text-foreground/50" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="bg-transparent border-none text-sm font-medium text-foreground focus:ring-0 outline-none w-full cursor-pointer"
            >
              <option value="default">Standart tartib</option>
              <option value="videos-desc">Videolar (ko'pdan kamga)</option>
              <option value="videos-asc">Videolar (kamdan ko'pga)</option>
              <option value="guides-desc">Qo'llanmalar (ko'pdan kamga)</option>
              <option value="guides-asc">Qo'llanmalar (kamdan ko'pga)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTopics.map(topic => (
            <button
              key={topic.id}
              onClick={() => setSelectedTopic(topic)}
              className="text-left bg-card border border-border rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all group relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors pr-8">{topic.title}</h3>
                <div 
                  onClick={(e) => toggleTopicCompletion(topic.id, e)}
                  className="absolute top-6 right-6 z-10 p-1 rounded-full hover:bg-secondary transition-colors"
                >
                  {completedTopics.includes(topic.id) ? (
                    <Icons.CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  ) : (
                    <Icons.Circle className="w-6 h-6 text-foreground/20 group-hover:text-foreground/40" />
                  )}
                </div>
              </div>
              <p className="text-foreground/60 text-sm line-clamp-2 mb-6">{topic.description}</p>
              <div className="flex items-center gap-4 text-sm font-medium text-foreground/50">
                <span className="flex items-center gap-1.5"><Video className="w-4 h-4" /> {topic.videos.length} {t('fanlarVideosCount')}</span>
                <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> {topic.guides.length} {t('fanlarGuidesCount')}</span>
              </div>
            </button>
          ))}
          {filteredTopics.length === 0 && (
            <div className="col-span-full text-center py-12 text-foreground/50">
              <Icons.Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Ushbu filtrlarga mos mavzular topilmadi.</p>
            </div>
          )}
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

function TopicTimeLimitEditor({ fanlar, setFanlar, subjectTitle, topicTitle, showAlert }: { fanlar: Subject[], setFanlar: (data: Subject[]) => void, subjectTitle: string, topicTitle: string, showAlert: (t: string, m: string) => void }) {
  const subject = fanlar.find(s => s.title === subjectTitle);
  const topic = subject?.topics.find(t => t.title === topicTitle);
  const [timeLimit, setTimeLimit] = useState(topic?.timeLimit ? topic.timeLimit.toString() : '');

  const handleSave = () => {
    const updatedFanlar = fanlar.map(s => {
      if (s.title === subjectTitle) {
        return {
          ...s,
          topics: s.topics.map(t => {
            if (t.title === topicTitle) {
              return { ...t, timeLimit: timeLimit ? parseInt(timeLimit) : undefined };
            }
            return t;
          })
        };
      }
      return s;
    });
    setFanlar(updatedFanlar);
    showAlert("Saqlandi", "Ushbu test uchun vaqt limiti muvaffaqiyatli saqlandi.");
  };

  return (
    <div className="flex items-center gap-2 mt-2 px-6 py-2 bg-secondary/20 border-y border-border">
      <span className="text-sm font-medium text-foreground/80">Ushbu test uchun vaqt limiti (daqiqa):</span>
      <input 
        type="number" 
        value={timeLimit} 
        onChange={e => setTimeLimit(e.target.value)} 
        className="w-24 px-3 py-1.5 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary"
        placeholder="Yo'q"
      />
      <button onClick={handleSave} className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
        Saqlash
      </button>
    </div>
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
  setFanlar: (data: Subject[]) => Promise<void> | void,
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
  const [activeTab, setActiveTab] = useState<'mnemonics' | 'questions' | 'symptoms' | 'videos' | 'patients' | 'sections' | 'settings' | 'library' | 'osce' | 'fanlar' | 'appSettings' | 'news' | 'journals' | 'quizRequests' | 'laboratory' | 'pharma' | 'tutor' | 'ai'>('videos');
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
  const [quizRequests, setQuizRequests] = useState<any[]>([]);

  useEffect(() => {
    if (isAdmin) {
      const fetchRequests = async () => {
        const q = query(collection(db, 'quizRequests'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setQuizRequests(reqs);
        });
        return unsubscribe;
      };
      fetchRequests();
    }
  }, [isAdmin]);

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

  const editQuestionSubject = async (oldSubject: string) => {
    const newSubject = prompt('Yangi fan nomini kiriting:', oldSubject);
    if (!newSubject || newSubject === oldSubject) return;

    showConfirm('Tahrirlash', `Barcha "${oldSubject}" faniga tegishli testlar "${newSubject}" faniga o'zgartiriladi. Davom etasizmi?`, async () => {
      try {
        setLoading(true);
        const q = query(collection(db, 'questions'), where('subject', '==', oldSubject));
        const snapshot = await getDocs(q);
        
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => {
          batch.update(doc.ref, { subject: newSubject });
        });
        
        await batch.commit();

        // Update fanlar
        const updatedFanlar = fanlar.map(f => f.title === oldSubject ? { ...f, title: newSubject } : f);
        await setFanlar(updatedFanlar);

        onUpdate();
        showAlert('Muvaffaqiyatli', 'Fan nomi o\'zgartirildi.');
      } catch (error) {
        console.error('Error updating question subject:', error);
        showAlert('Xatolik', 'Fanni tahrirlashda xatolik yuz berdi.');
      } finally {
        setLoading(false);
      }
    });
  };

  const deleteQuestionSubject = async (subject: string) => {
    showConfirm('O\'chirish', `Haqiqatan ham "${subject}" fanini va unga tegishli barcha testlarni o'chirmoqchimisiz?`, async () => {
      try {
        setLoading(true);
        const q = query(collection(db, 'questions'), where('subject', '==', subject));
        const snapshot = await getDocs(q);
        
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        await batch.commit();

        // Update fanlar
        const updatedFanlar = fanlar.filter(f => f.title !== subject);
        await setFanlar(updatedFanlar);

        onUpdate();
        showAlert('Muvaffaqiyatli', 'Fan va uning testlari o\'chirildi.');
      } catch (error) {
        console.error('Error deleting question subject:', error);
        showAlert('Xatolik', 'Fanni o\'chirishda xatolik yuz berdi.');
      } finally {
        setLoading(false);
      }
    });
  };

  const editQuestionTopic = async (subject: string, oldTopic: string) => {
    const newTopic = prompt('Yangi mavzu nomini kiriting:', oldTopic);
    if (!newTopic || newTopic === oldTopic) return;

    showConfirm('Tahrirlash', `Barcha "${oldTopic}" mavzusiga tegishli testlar "${newTopic}" mavzusiga o'zgartiriladi. Davom etasizmi?`, async () => {
      try {
        setLoading(true);
        const q = query(collection(db, 'questions'), where('subject', '==', subject), where('topic', '==', oldTopic));
        const snapshot = await getDocs(q);
        
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => {
          batch.update(doc.ref, { topic: newTopic });
        });
        
        await batch.commit();

        // Update fanlar
        const updatedFanlar = fanlar.map(f => {
          if (f.title === subject) {
            return {
              ...f,
              topics: f.topics.map(t => t.title === oldTopic ? { ...t, title: newTopic } : t)
            };
          }
          return f;
        });
        await setFanlar(updatedFanlar);

        onUpdate();
        showAlert('Muvaffaqiyatli', 'Mavzu nomi o\'zgartirildi.');
      } catch (error) {
        console.error('Error updating question topic:', error);
        showAlert('Xatolik', 'Mavzuni tahrirlashda xatolik yuz berdi.');
      } finally {
        setLoading(false);
      }
    });
  };

  const deleteQuestionTopic = async (subject: string, topic: string) => {
    showConfirm('O\'chirish', `Haqiqatan ham "${topic}" mavzusini va unga tegishli barcha testlarni o'chirmoqchimisiz?`, async () => {
      try {
        setLoading(true);
        const q = query(collection(db, 'questions'), where('subject', '==', subject), where('topic', '==', topic));
        const snapshot = await getDocs(q);
        
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        await batch.commit();

        // Update fanlar
        const updatedFanlar = fanlar.map(f => {
          if (f.title === subject) {
            return {
              ...f,
              topics: f.topics.filter(t => t.title !== topic)
            };
          }
          return f;
        });
        await setFanlar(updatedFanlar);

        onUpdate();
        showAlert('Muvaffaqiyatli', 'Mavzu va uning testlari o\'chirildi.');
      } catch (error) {
        console.error('Error deleting question topic:', error);
        showAlert('Xatolik', 'Mavzuni o\'chirishda xatolik yuz berdi.');
      } finally {
        setLoading(false);
      }
    });
  };

  const handleEditQuestion = async (id: string, data: any) => {
    try {
      let updatedFanlar = [...fanlar];
      let subjectExists = updatedFanlar.find(f => f.title === data.subject);
      let fanlarChanged = false;

      if (!subjectExists) {
        subjectExists = {
          id: Date.now().toString(),
          title: data.subject,
          description: '',
          icon: 'BookOpen',
          topics: []
        };
        updatedFanlar.push(subjectExists);
        fanlarChanged = true;
      }

      let topicExists = subjectExists.topics.find(t => t.title === data.topic);
      if (!topicExists) {
        subjectExists.topics.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          title: data.topic,
          description: '',
          videos: [],
          guides: []
        });
        fanlarChanged = true;
      }

      if (fanlarChanged) {
        await setFanlar(updatedFanlar);
      }

      await updateDoc(doc(db, 'questions', id), data);
      onUpdate();
      return true;
    } catch (error) {
      console.error('Error updating question:', error);
      showAlert('Xatolik', 'Savolni tahrirlashda xatolik yuz berdi.');
      return false;
    }
  };

  const handleAddQuestion = async (data: any) => {
    try {
      let updatedFanlar = [...fanlar];
      let subjectExists = updatedFanlar.find(f => f.title === data.subject);
      let fanlarChanged = false;

      if (!subjectExists) {
        subjectExists = {
          id: Date.now().toString(),
          title: data.subject,
          description: '',
          icon: 'BookOpen',
          topics: []
        };
        updatedFanlar.push(subjectExists);
        fanlarChanged = true;
      }

      let topicExists = subjectExists.topics.find(t => t.title === data.topic);
      if (!topicExists) {
        subjectExists.topics.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          title: data.topic,
          description: '',
          videos: [],
          guides: []
        });
        fanlarChanged = true;
      }

      if (fanlarChanged) {
        await setFanlar(updatedFanlar);
      }

      await addDoc(collection(db, 'questions'), data);
      onUpdate();
      return true;
    } catch (error) {
      console.error('Error adding question:', error);
      showAlert('Xatolik', 'Savolni qo\'shishda xatolik yuz berdi.');
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
      let batch = writeBatch(db);
      let operationCount = 0;
      
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
            const docId = btoa(encodeURIComponent(q.text.substring(0, 50))).replace(/[/+=]/g, '_').substring(0, 50);
            batch.set(doc(db, 'questions', docId), questionData);
            existingQuestionTexts.add(q.text);
            operationCount++;

            if (operationCount >= 450) {
              await batch.commit();
              batch = writeBatch(db);
              operationCount = 0;
            }
          }
        }
      }
      
      if (operationCount > 0) {
        await batch.commit();
      }

      await setFanlar(updatedFanlar);
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
                { id: 'fanlar', label: 'Fanlar', icon: BookOpen },
                { id: 'library', label: 'Kutubxona', icon: BookOpen },
                { id: 'videos', label: 'Videolar', icon: Video },
                { id: 'mnemonics', label: 'Mnemonika', icon: Brain },
                { id: 'symptoms', label: 'Simptomlar', icon: Stethoscope },
                { id: 'questions', label: 'Testlar', icon: CheckCircle2 },
                { id: 'osce', label: 'OSCE', icon: Stethoscope },
                { id: 'patients', label: 'Bemorlar', icon: Heart },
                { id: 'laboratory', label: 'Laboratoriya', icon: Icons.FlaskConical },
                { id: 'pharma', label: 'Farmakologiya', icon: Icons.Pill },
                { id: 'journals', label: 'Jurnallar', icon: BookOpen },
                { id: 'news', label: 'Global Health News', icon: Globe },
                { id: 'tutor', label: 'AI Tutor', icon: Icons.Bot },
                { id: 'ai', label: 'AI Markazi', icon: Sparkles },
                { id: 'sections', label: 'Bo\'limlar', icon: Plus },
                { id: 'quizRequests', label: 'Test So\'rovlari', icon: AlertTriangle },
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
                      let batch = writeBatch(db);
                      let operationCount = 0;

                      const addToBatch = async (collectionName: string, docId: string, data: any) => {
                        batch.set(doc(db, collectionName, docId), data);
                        operationCount++;
                        if (operationCount >= 450) {
                          await batch.commit();
                          batch = writeBatch(db);
                          operationCount = 0;
                        }
                      };

                      for (const m of mnemonics) {
                        const docId = btoa(encodeURIComponent(m.title.substring(0, 50))).replace(/[/+=]/g, '_').substring(0, 50);
                        await addToBatch('mnemonics', docId, m);
                      }
                      for (const q of questions) {
                        const docId = btoa(encodeURIComponent(q.question.substring(0, 50))).replace(/[/+=]/g, '_').substring(0, 50);
                        await addToBatch('questions', docId, q);
                      }
                      for (const s of symptomCheckerData) {
                        const docId = btoa(encodeURIComponent(s.diagnosis.substring(0, 50))).replace(/[/+=]/g, '_').substring(0, 50);
                        await addToBatch('symptoms', docId, s);
                      }
                      for (const o of osceScenarios) {
                        const docId = btoa(encodeURIComponent(o.title.substring(0, 50))).replace(/[/+=]/g, '_').substring(0, 50);
                        await addToBatch('osce_scenarios', docId, o);
                      }
                      
                      if (operationCount > 0) {
                        await batch.commit();
                      }

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
          {activeTab === 'quizRequests' ? (
            <QuizRequestsTab 
              requests={quizRequests} 
              onApprove={async (req) => {
                try {
                  // Update request status
                  await updateDoc(doc(db, 'quizRequests', req.id), { status: 'approved' });
                  // Reset attempts for user
                  const userRef = doc(db, 'users', req.userId);
                  await updateDoc(userRef, {
                    [`quizAttempts.${req.topic}`]: 0
                  });
                  showAlert("Muvaffaqiyatli", "Ruxsat berildi va limit nolga tushirildi.");
                } catch (e) {
                  console.error(e);
                  showAlert("Xatolik", "Xatolik yuz berdi.");
                }
              }}
              onReject={async (req) => {
                try {
                  await updateDoc(doc(db, 'quizRequests', req.id), { status: 'rejected' });
                  showAlert("Muvaffaqiyatli", "So'rov rad etildi.");
                } catch (e) {
                  console.error(e);
                  showAlert("Xatolik", "Xatolik yuz berdi.");
                }
              }}
            />
          ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 bg-card border border-border rounded-2xl overflow-hidden shadow-sm h-fit">
              <div className="px-6 py-5 border-b border-border bg-secondary/50 flex justify-between items-center">
                <h3 className="font-medium text-foreground flex items-center gap-2">
                  {activeTab === 'mnemonics' ? <Brain className="w-5 h-5 text-primary" /> : activeTab === 'questions' ? <CheckCircle2 className="w-5 h-5 text-primary" /> : activeTab === 'symptoms' ? <Stethoscope className="w-5 h-5 text-primary" /> : activeTab === 'videos' ? <Video className="w-5 h-5 text-primary" /> : activeTab === 'patients' ? <Heart className="w-5 h-5 text-primary" /> : activeTab === 'library' ? <BookOpen className="w-5 h-5 text-primary" /> : activeTab === 'osce' ? <Stethoscope className="w-5 h-5 text-primary" /> : activeTab === 'sections' ? <Plus className="w-5 h-5 text-primary" /> : activeTab === 'fanlar' ? <BookOpen className="w-5 h-5 text-primary" /> : activeTab === 'news' ? <Globe className="w-5 h-5 text-primary" /> : activeTab === 'journals' ? <BookOpen className="w-5 h-5 text-primary" /> : activeTab === 'laboratory' ? <Icons.FlaskConical className="w-5 h-5 text-primary" /> : activeTab === 'pharma' ? <Icons.Pill className="w-5 h-5 text-primary" /> : activeTab === 'tutor' ? <Icons.Bot className="w-5 h-5 text-primary" /> : activeTab === 'ai' ? <Sparkles className="w-5 h-5 text-primary" /> : <Settings className="w-5 h-5 text-primary" />}
                  {activeTab === 'mnemonics' ? 'Mnemonika Ro\'yxati' : activeTab === 'questions' ? 'Testlar Ro\'yxati' : activeTab === 'symptoms' ? 'Simptomlar Ro\'yxati' : activeTab === 'videos' ? 'Videolar Ro\'yxati' : activeTab === 'patients' ? 'Bemorlar Ro\'yxati' : activeTab === 'library' ? 'Kutubxona Strukturasi' : activeTab === 'osce' ? 'OSCE Ssenariylari' : activeTab === 'sections' ? 'Bo\'limlar Ro\'yxati' : activeTab === 'fanlar' ? 'Fanlar Ro\'yxati' : activeTab === 'news' ? 'Yangiliklar Ro\'yxati' : activeTab === 'journals' ? 'Jurnallar Ro\'yxati' : activeTab === 'appSettings' ? 'Ilova Sozlamalari' : activeTab === 'laboratory' ? 'Laboratoriya' : activeTab === 'pharma' ? 'Farmakologiya' : activeTab === 'tutor' ? 'AI Tutor' : activeTab === 'ai' ? 'AI Markazi' : 'Tizim Sozlamalari'}
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-1 rounded-full uppercase tracking-wider">
                    {(activeTab === 'mnemonics' ? mnemonics : activeTab === 'questions' ? questions : activeTab === 'symptoms' ? symptoms : activeTab === 'videos' ? videos : activeTab === 'patients' ? patients : activeTab === 'library' ? library.subjects : activeTab === 'osce' ? osceScenarios : activeTab === 'fanlar' ? fanlar : activeTab === 'news' ? news : activeTab === 'journals' ? journals : activeTab === 'appSettings' || activeTab === 'laboratory' || activeTab === 'pharma' || activeTab === 'tutor' || activeTab === 'ai' ? [] : sections).length} ta element
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
                    {activeTab === 'questions' && (() => {
                      const renderedQuestionIds = new Set<string>();
                      return (
                        <>
                          {fanlar.map(subject => {
                            const subjectQuestions = questions.filter(q => q.subject === subject.title);
                            return (
                              <React.Fragment key={subject.id}>
                                <tr className="hover:bg-secondary/50 transition-colors group bg-secondary/10 cursor-pointer" onClick={() => toggleSubject(subject.title)}>
                                  <td className="px-6 py-4">
                                    <div className="font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                                      <ChevronRight className={`w-4 h-4 transition-transform ${expandedSubjects[subject.title] ? 'rotate-90' : ''}`} />
                                      <BookOpen className="w-4 h-4" /> {subject.title}
                                      <span className="text-xs font-normal text-foreground/50 ml-2">({subjectQuestions.length} ta savol)</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-right flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => editQuestionSubject(subject.title)} className="p-2.5 text-foreground/40 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"><Edit2 className="w-4.5 h-4.5" /></button>
                                    <button onClick={() => deleteQuestionSubject(subject.title)} className="p-2.5 text-foreground/40 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4.5 h-4.5" /></button>
                                  </td>
                                </tr>
                                {expandedSubjects[subject.title] && subject.topics.map(topic => {
                                  const topicQuestions = subjectQuestions.filter(q => q.topic === topic.title);
                                  topicQuestions.forEach(q => renderedQuestionIds.add(q.id!));
                                  return (
                                    <React.Fragment key={topic.id}>
                                      <tr className="hover:bg-secondary/50 transition-colors group cursor-pointer" onClick={() => toggleTopic(topic.title)}>
                                        <td className="px-6 py-3 pl-12 border-l-2 border-primary/20">
                                          <div className="font-medium text-foreground/90 group-hover:text-primary transition-colors flex items-center gap-2">
                                            <ChevronRight className={`w-3 h-3 transition-transform ${expandedTopics[topic.title] ? 'rotate-90' : ''}`} />
                                            {topic.title}
                                            {topic.timeLimit && (
                                              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-2">
                                                {topic.timeLimit} min
                                              </span>
                                            )}
                                            <span className="text-xs font-normal text-foreground/50 ml-2">({topicQuestions.length} ta savol)</span>
                                          </div>
                                        </td>
                                        <td className="px-6 py-3 text-right flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                                          <button onClick={() => editQuestionTopic(subject.title, topic.title)} className="p-2 text-foreground/40 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"><Edit2 className="w-4 h-4" /></button>
                                          <button onClick={() => deleteQuestionTopic(subject.title, topic.title)} className="p-2 text-foreground/40 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                                        </td>
                                      </tr>
                                      {expandedTopics[topic.title] && (
                                        <>
                                          <tr>
                                            <td colSpan={2} className="p-0">
                                              <TopicTimeLimitEditor fanlar={fanlar} setFanlar={setFanlar} subjectTitle={subject.title} topicTitle={topic.title} showAlert={showAlert} />
                                            </td>
                                          </tr>
                                          {topicQuestions.map(q => (
                                            <tr key={q.id} className="hover:bg-secondary/50 transition-colors group">
                                              <td className="px-6 py-2 pl-20 border-l-2 border-primary/20">
                                                <div className="text-sm text-foreground/80 group-hover:text-primary transition-colors flex items-center gap-2">
                                                  {q.type === 'case' ? <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] uppercase">Vaziyatli</span> : <CheckCircle2 className="w-3 h-3" />}
                                                  {q.question}
                                                </div>
                                                <div className="text-[10px] text-foreground/50 mt-1 ml-5">{q.difficulty}</div>
                                              </td>
                                              <td className="px-6 py-2 text-right flex justify-end gap-1">
                                                <button onClick={(e) => { e.stopPropagation(); setEditingQuestion(q); }} className="p-1.5 text-foreground/40 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"><Edit2 className="w-3.5 h-3.5" /></button>
                                                <button onClick={(e) => { e.stopPropagation(); deleteItem('questions', q.id!); }} className="p-1.5 text-foreground/40 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                                              </td>
                                            </tr>
                                          ))}
                                        </>
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                              </React.Fragment>
                            );
                          })}
                          {(() => {
                            const orphanedQuestions = questions.filter(q => !renderedQuestionIds.has(q.id!));
                            if (orphanedQuestions.length === 0) return null;
                            return (
                              <React.Fragment>
                                <tr className="hover:bg-secondary/50 transition-colors group bg-red-50/50 cursor-pointer" onClick={() => toggleSubject('orphaned')}>
                                  <td className="px-6 py-4">
                                    <div className="font-bold text-red-600 flex items-center gap-2">
                                      <ChevronRight className={`w-4 h-4 transition-transform ${expandedSubjects['orphaned'] ? 'rotate-90' : ''}`} />
                                      <BookOpen className="w-4 h-4" /> Boshqa savollar (Fanga biriktirilmagan)
                                      <span className="text-xs font-normal ml-2">({orphanedQuestions.length} ta savol)</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-right"></td>
                                </tr>
                                {expandedSubjects['orphaned'] && orphanedQuestions.map(q => (
                                  <tr key={q.id} className="hover:bg-secondary/50 transition-colors group">
                                    <td className="px-6 py-2 pl-12 border-l-2 border-red-500/20">
                                      <div className="text-sm text-foreground/80 group-hover:text-primary transition-colors flex items-center gap-2">
                                        <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] uppercase">{q.subject} - {q.topic}</span>
                                        {q.type === 'case' ? <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] uppercase">Vaziyatli</span> : <CheckCircle2 className="w-3 h-3" />}
                                        {q.question}
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
                            );
                          })()}
                        </>
                      );
                    })()}
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
                    {(activeTab === 'laboratory' || activeTab === 'pharma' || activeTab === 'tutor' || activeTab === 'ai') && (
                      <tr>
                        <td colSpan={2} className="px-6 py-8 text-center text-foreground/60">
                          <p>Bu bo'lim hozircha admin paneldan boshqarilmaydi yoki tez orada qo'shiladi.</p>
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
                {activeTab === 'questions' && <QuestionForm onAdd={handleAddQuestion} onEdit={handleEditQuestion} onCancelEdit={() => setEditingQuestion(null)} editData={editingQuestion} fanlar={fanlar} />}
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
                {(activeTab === 'laboratory' || activeTab === 'pharma' || activeTab === 'tutor' || activeTab === 'ai') && (
                  <div className="text-center py-8 text-foreground/60">
                    <p>Ushbu bo'lim uchun sozlamalar mavjud emas.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          )}
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

function QuizRequestsTab({ requests, onApprove, onReject }: { requests: any[], onApprove: (req: any) => void, onReject: (req: any) => void }) {
  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h3 className="text-xl font-medium text-foreground mb-6 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" /> Test So'rovlari
        </h3>
        
        {requests.length === 0 ? (
          <div className="text-center py-12 bg-secondary/30 rounded-xl border border-dashed border-border">
            <p className="text-foreground/60">Hozircha so'rovlar yo'q</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map(req => (
              <div key={req.id} className="flex items-center justify-between p-4 bg-secondary/20 rounded-xl border border-border/50">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground">{req.userName}</span>
                    <span className="text-xs text-foreground/50">({req.userEmail})</span>
                  </div>
                  <div className="text-sm text-foreground/70">
                    <span className="font-medium">Fan:</span> {req.subject} <br/>
                    <span className="font-medium">Mavzu:</span> {req.topic}
                  </div>
                  <div className="text-xs text-foreground/40 mt-2">
                    {new Date(req.createdAt).toLocaleString()}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {req.status === 'pending' ? (
                    <>
                      <button 
                        onClick={() => onApprove(req)}
                        className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors"
                      >
                        Ruxsat berish
                      </button>
                      <button 
                        onClick={() => onReject(req)}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                      >
                        Rad etish
                      </button>
                    </>
                  ) : (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${req.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {req.status === 'approved' ? 'Ruxsat berilgan' : 'Rad etilgan'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
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
      setNewTopic({ subjectId: editTopicData.subjectId, title: editTopicData.topic.title, description: editTopicData.topic.description || '' });
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
  const [formData, setFormData] = useState({ 
    subject: fanlar[0]?.title || '', 
    topic: fanlar[0]?.topics[0]?.title || '', 
    difficulty: 'medium', 
    type: 'test' as 'test' | 'case',
    scenario: '',
    imageUrl: '',
    question: '', 
    options: ['', '', '', ''], 
    correct: [0] as number[], 
    explanation: '',
    aiAnswerGuide: '',
    caseQuestions: [{ question: '', aiAnswerGuide: '' }]
  });
  
  useEffect(() => {
    if (editData) {
      setFormData({
        subject: editData.subject,
        topic: editData.topic,
        difficulty: editData.difficulty,
        type: editData.type || 'test',
        scenario: editData.scenario || '',
        imageUrl: editData.imageUrl || '',
        question: editData.question,
        options: editData.options || ['', '', '', ''],
        correct: Array.isArray(editData.correct) ? editData.correct : [editData.correct ?? 0],
        explanation: editData.explanation || '',
        aiAnswerGuide: editData.aiAnswerGuide || '',
        caseQuestions: [{ question: editData.question || '', aiAnswerGuide: editData.aiAnswerGuide || '' }]
      });
    } else {
      setFormData(prev => {
        const newSubject = prev.subject || fanlar[0]?.title || '';
        const currentSubjectObj = fanlar.find(f => f.title === newSubject);
        const newTopic = prev.topic || currentSubjectObj?.topics[0]?.title || '';

        if (prev.subject === newSubject && prev.topic === newTopic) {
          return prev;
        }

        return {
          ...prev,
          subject: newSubject,
          topic: newTopic
        };
      });
    }
  }, [editData, fanlar]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editData && onEdit) {
      const submitData = { ...formData };
      if (formData.type === 'case') {
        submitData.question = formData.caseQuestions[0].question;
        submitData.aiAnswerGuide = formData.caseQuestions[0].aiAnswerGuide;
      }
      if (await onEdit(editData.id!, submitData)) {
        setFormData(prev => ({ ...prev, question: '', imageUrl: '', options: ['', '', '', ''], correct: [0], explanation: '', scenario: '', aiAnswerGuide: '', caseQuestions: [{ question: '', aiAnswerGuide: '' }] }));
        if (onCancelEdit) onCancelEdit();
      }
    } else {
      let success = true;
      if (formData.type === 'case') {
        for (const cq of formData.caseQuestions) {
          if (!cq.question.trim()) continue;
          const submitData = {
            ...formData,
            question: cq.question,
            aiAnswerGuide: cq.aiAnswerGuide
          };
          const res = await onAdd(submitData);
          if (!res) success = false;
        }
      } else {
        const submitData = { ...formData };
        success = await onAdd(submitData);
      }
      
      if (success) {
        setFormData(prev => ({ ...prev, question: '', imageUrl: '', options: ['', '', '', ''], correct: [0], explanation: '', scenario: '', aiAnswerGuide: '', caseQuestions: [{ question: '', aiAnswerGuide: '' }] }));
      }
    }
  };

  const selectedSubject = fanlar.find(s => s.title === formData.subject) || fanlar[0];

  const handleAddCaseQuestion = () => {
    setFormData(prev => ({
      ...prev,
      caseQuestions: [...prev.caseQuestions, { question: '', aiAnswerGuide: '' }]
    }));
  };

  const handleRemoveCaseQuestion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      caseQuestions: prev.caseQuestions.filter((_, i) => i !== index)
    }));
  };

  const handleCaseQuestionChange = (index: number, field: 'question' | 'aiAnswerGuide', value: string) => {
    setFormData(prev => {
      const newCaseQuestions = [...prev.caseQuestions];
      newCaseQuestions[index][field] = value;
      return { ...prev, caseQuestions: newCaseQuestions };
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddOption = () => {
    setFormData(prev => ({ ...prev, options: [...prev.options, ''] }));
  };

  const handleRemoveOption = (index: number) => {
    setFormData(prev => {
      const newOpts = prev.options.filter((_, i) => i !== index);
      const newCorrect = prev.correct.filter(c => c !== index).map(c => c > index ? c - 1 : c);
      return { ...prev, options: newOpts, correct: newCorrect.length ? newCorrect : [0] };
    });
  };

  const handleCorrectChange = (index: number) => {
    setFormData(prev => {
      const isCorrect = prev.correct.includes(index);
      let newCorrect;
      if (isCorrect) {
        newCorrect = prev.correct.filter(c => c !== index);
        if (newCorrect.length === 0) newCorrect = [0]; // Keep at least one correct answer
      } else {
        newCorrect = [...prev.correct, index];
      }
      return { ...prev, correct: newCorrect };
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <select
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary"
            value={fanlar.some(s => s.title === formData.subject) ? formData.subject : (formData.subject ? 'custom' : '')}
            onChange={e => {
              if (e.target.value === 'new') {
                const newSub = prompt('Yangi fan nomini kiriting:');
                if (newSub) setFormData({...formData, subject: newSub, topic: ''});
              } else if (e.target.value === 'custom') {
                // Do nothing
              } else {
                const newSubject = fanlar.find(s => s.title === e.target.value);
                setFormData({...formData, subject: e.target.value, topic: newSubject?.topics[0]?.title || ''});
              }
            }}
          >
            <option value="" disabled>Fanni tanlang</option>
            {fanlar.map(s => (
              <option key={s.id} value={s.title}>{s.title}</option>
            ))}
            {!fanlar.some(s => s.title === formData.subject) && formData.subject && (
              <option value="custom">{formData.subject}</option>
            )}
            <option value="new" className="text-primary font-medium">+ Yangi fan qo'shish</option>
          </select>
        </div>
        <div>
          <select
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary"
            value={selectedSubject?.topics.some(t => t.title === formData.topic) ? formData.topic : (formData.topic ? 'custom' : '')}
            onChange={e => {
              if (e.target.value === 'new') {
                const newTop = prompt('Yangi mavzu nomini kiriting:');
                if (newTop) setFormData({...formData, topic: newTop});
              } else if (e.target.value === 'custom') {
                // Do nothing
              } else {
                setFormData({...formData, topic: e.target.value});
              }
            }}
          >
            <option value="" disabled>Mavzuni tanlang</option>
            {selectedSubject?.topics.map(t => (
              <option key={t.id} value={t.title}>{t.title}</option>
            ))}
            {!selectedSubject?.topics.some(t => t.title === formData.topic) && formData.topic && (
              <option value="custom">{formData.topic}</option>
            )}
            <option value="new" className="text-primary font-medium">+ Yangi mavzu qo'shish</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <select className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as 'test' | 'case'})}>
          <option value="test">Oddiy test</option>
          <option value="case">Vaziyatli masala</option>
        </select>
        <select className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" value={formData.difficulty} onChange={e => setFormData({...formData, difficulty: e.target.value})}>
          <option value="easy">Oson</option>
          <option value="medium">O'rta</option>
          <option value="hard">Qiyin</option>
        </select>
      </div>

      {formData.type === 'case' && (
        <textarea placeholder="Klinik vaziyat" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary h-32" value={formData.scenario} onChange={e => setFormData({...formData, scenario: e.target.value})} required />
      )}

      {formData.type === 'test' ? (
        <>
          <div className="space-y-2">
            <textarea placeholder="Savol" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary h-24" value={formData.question} onChange={e => setFormData({...formData, question: e.target.value})} required />
            <div className="flex items-center gap-2">
              <input type="file" accept="image/*" onChange={handleImageUpload} className="text-sm text-foreground/70 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
              {formData.imageUrl && <img src={formData.imageUrl} alt="Preview" className="h-10 w-10 object-cover rounded-md" />}
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground">Variantlar va to'g'ri javoblar</h4>
              <button type="button" onClick={handleAddOption} className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Variant qo'shish
              </button>
            </div>
            {formData.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  checked={formData.correct.includes(i)} 
                  onChange={() => handleCorrectChange(i)}
                  className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                />
                <input 
                  placeholder={`Variant ${i+1}`} 
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" 
                  value={opt} 
                  onChange={e => {
                    const newOpts = [...formData.options];
                    newOpts[i] = e.target.value;
                    setFormData({...formData, options: newOpts});
                  }} 
                  required 
                />
                {formData.options.length > 2 && (
                  <button type="button" onClick={() => handleRemoveOption(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          {formData.caseQuestions.map((cq, index) => (
            <div key={index} className="p-4 border border-border rounded-xl bg-secondary/20 space-y-3 relative">
              {formData.caseQuestions.length > 1 && !editData && (
                <button type="button" onClick={() => handleRemoveCaseQuestion(index)} className="absolute top-2 right-2 p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <h4 className="text-sm font-medium text-foreground/70">Savol {index + 1}</h4>
              <textarea placeholder="Savol" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary h-20" value={cq.question} onChange={e => handleCaseQuestionChange(index, 'question', e.target.value)} required />
              <textarea placeholder="AI uchun yondashuv javoblari (talaba javobini baholash uchun mezonlar)" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary h-24" value={cq.aiAnswerGuide} onChange={e => handleCaseQuestionChange(index, 'aiAnswerGuide', e.target.value)} required />
            </div>
          ))}
          {!editData && (
            <button type="button" onClick={handleAddCaseQuestion} className="w-full py-2 border-2 border-dashed border-primary/30 text-primary rounded-xl font-medium text-sm hover:bg-primary/5 transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Yana savol qo'shish
            </button>
          )}
        </div>
      )}

      <textarea placeholder="Tushuntirish" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary h-24" value={formData.explanation} onChange={e => setFormData({...formData, explanation: e.target.value})} required={formData.type === 'test'} />
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
        contents: prompt,
        config: {
          systemInstruction: "Siz klinik farmakologsiz. Dorilar haqida faqat aniq, tasdiqlangan va xavfsiz tibbiy ma'lumotlarni taqdim eting. Eng so'nggi ma'lumotlarni internetdan qidirib, manbalari bilan bering.",
          temperature: 0.1,
          topP: 0.8,
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          tools: [{ googleSearch: {} }]
        }
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
        contents: prompt,
        config: {
          systemInstruction: "Siz qattiqqo'l va tajribali klinik ustozsiz (Clinical Tutor). Talabaning javobini xalqaro klinik protokollar (EBM) asosida baholang va unga xatolarini tushuntiring.",
          temperature: 0.2,
          topP: 0.8,
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
        }
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
  const [sources, setSources] = useState<any[]>([]);

  const handleAnalysis = async () => {
    if (!file) return;
    setLoading(true);
    setSources([]);
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
    setSources([]);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Qidiruv so'rovi: "${prompt}". Iltimos, ushbu tibbiy mavzuga oid 6 ta eng yaxshi, yuqori sifatli va aniq rasmlarni toping. Natijani faqat Markdown formatida qaytaring. Har bir rasm uchun faqat quyidagi formatdan foydalaning:
![Rasm nomi](rasm_url)
Hech qanday raqamlash, ro'yxat (bullet points) yoki qo'shimcha matn yozmang. Faqat rasmlar ketma-ketligi bo'lsin.`,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      
      setResult(response.text || "Rasmlar topilmadi.");
      
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        const extractedSources = chunks.map(chunk => chunk.web).filter(Boolean);
        setSources(extractedSources);
      }
      
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
    setSources([]);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Qidiruv so'rovi: "${prompt}". Iltimos, ushbu tibbiy mavzu yoki atama haqida batafsil, ishonchli va tushunarli ma'lumot bering. Ma'lumotni quyidagi tuzilmada taqdim eting:
1. Qisqacha ta'rif
2. Asosiy belgilari va sabablari (agar kasallik bo'lsa) yoki ishlash prinsipi (agar jarayon/qurilma bo'lsa)
3. Diagnostika va davolash usullari (yoki ahamiyati)
Javobni chiroyli Markdown formatida qaytaring.`,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      
      setResult(response.text || "Ma'lumot topilmadi.");
      
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        const extractedSources = chunks.map(chunk => chunk.web).filter(Boolean);
        setSources(extractedSources);
      }
      
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
            
            {activeTool === 'image_search' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <Markdown
                  components={{
                    img: ({node, ...props}) => (
                      <div className="relative group overflow-hidden rounded-2xl shadow-sm border border-border/50 bg-secondary/20 aspect-video">
                        <img {...props} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                          <p className="text-white text-sm font-medium truncate">{props.alt}</p>
                        </div>
                      </div>
                    ),
                    p: ({node, children}) => <>{children}</>
                  }}
                >
                  {result}
                </Markdown>
              </div>
            ) : (
              <div className="prose prose-neutral max-w-none text-foreground/80 prose-img:rounded-2xl prose-img:shadow-lg prose-img:w-full prose-img:object-cover prose-img:max-h-[400px]">
                <Markdown>{result}</Markdown>
              </div>
            )}

            {sources.length > 0 && (
              <div className="mt-8 pt-6 border-t border-border/40">
                <h5 className="font-medium text-foreground mb-4 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  Foydalanilgan manbalar:
                </h5>
                <div className="flex flex-wrap gap-2">
                  {sources.map((source, idx) => (
                    <a 
                      key={idx} 
                      href={source.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border/40 rounded-lg text-xs font-medium text-foreground/70 hover:text-primary hover:border-primary/30 transition-colors"
                    >
                      {source.title || new URL(source.uri).hostname}
                    </a>
                  ))}
                </div>
              </div>
            )}
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
  const [isVoiceMode, setIsVoiceMode] = useState(false);
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

  const startScenario = (scenario: OSCEScenario, voiceMode: boolean = false) => {
    setIsVoiceMode(voiceMode);
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
    if (!currentMessages || currentMessages.length === 0) {
      setEvaluation(t('osce_patient_error'));
      return;
    }
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
        contents: prompt,
        config: {
          systemInstruction: "Siz OSCE (Objective Structured Clinical Examination) imtihonining qattiqqo'l va adolatli tibbiyot professorisiz. Talabaning bemor bilan muloqotini, to'plagan anamnezini va qo'ygan tashxisini xalqaro klinik standartlar (EBM) asosida baholang.",
          temperature: 0.2,
          topP: 0.8,
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
        }
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
              className="bg-card p-6 rounded-3xl border border-border shadow-sm hover:shadow-xl transition-all flex flex-col h-full" 
            >
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                <Heart className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">{scenario.title}</h3>
              <p className="text-sm text-foreground/70 line-clamp-3 mb-6 flex-1">{scenario.description}</p>
              <div className="flex gap-2 mt-auto">
                <button onClick={() => startScenario(scenario, false)} className="flex-1 bg-secondary text-foreground py-2.5 rounded-xl text-sm font-medium hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Text
                </button>
                <button onClick={() => startScenario(scenario, true)} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                  <Mic className="w-4 h-4" /> Voice
                </button>
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
              {getPatientAvatar(selectedScenario.patientInfo, "w-10 h-10 text-foreground/40")}
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
            isVoiceMode ? (
              <LiveAudioChat 
                systemInstruction={selectedScenario.systemInstruction} 
                initialMessage={selectedScenario.initialMessage}
                onEnd={(transcript) => {
                  setMessages(transcript);
                  handleEvaluate(transcript);
                }} 
              />
            ) : (
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
                        {msg.role === 'user' ? <Stethoscope className="w-3 h-3 sm:w-4 sm:h-4" /> : getPatientAvatar(selectedScenario.patientInfo, "w-3 h-3 sm:w-4 sm:h-4 text-foreground/60")}
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
                        {getPatientAvatar(selectedScenario.patientInfo, "w-3 h-3 sm:w-4 sm:h-4 text-foreground/60")}
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
            )
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
