/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
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
  Sun
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { GoogleGenAI, ThinkingLevel, GenerateContentResponse } from "@google/genai";
import { Mnemonic, Question, SymptomData, VideoData, Section, Setting } from './data';
import { explainMedicalTopic } from './services/aiService';
import { quizData } from './quizData';

const getYouTubeEmbedUrl = (url: string) => {
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : url;
};

type Page = 'home' | 'mnemonics' | 'videos' | 'symptoms' | 'quiz' | 'admin' | 'ai' | 'library';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('meduz_dark_mode') === 'true');
  const [themeColor, setThemeColor] = useState(() => localStorage.getItem('meduz_theme') || '#2563eb');

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
  const [sectionsData, setSectionsData] = useState<Section[]>([]);
  const [settingsData, setSettingsData] = useState<Setting[]>([]);
  const [libraryData, setLibraryData] = useState<any>(() => {
    const saved = localStorage.getItem('meduz_library');
    return saved ? JSON.parse(saved) : initialMedicalData;
  });

  useEffect(() => {
    localStorage.setItem('meduz_library', JSON.stringify(libraryData));
  }, [libraryData]);
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
      const [mRes, qRes, sRes, vRes, secRes, setRes] = await Promise.all([
        fetch('/api/mnemonics'),
        fetch('/api/questions'),
        fetch('/api/symptoms'),
        fetch('/api/videos'),
        fetch('/api/sections'),
        fetch('/api/settings')
      ]);
      const [m, q, s, v, sec, sett] = await Promise.all([
        mRes.json(), 
        qRes.json(), 
        sRes.json(),
        vRes.json(),
        secRes.json(),
        setRes.json()
      ]);
      setMnemonicsData(m);
      setQuestionsData(q);
      setSymptomsData(s);
      setVideosData(v);
      setSectionsData(sec);
      setSettingsData(sett);
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

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Floating Chatbot */}
      <div className="fixed bottom-6 left-6 z-[100]">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20, x: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20, x: -20 }}
              className="bg-white rounded-3xl shadow-2xl w-[350px] sm:w-[400px] h-[500px] flex flex-col overflow-hidden border border-slate-200 mb-4"
            >
              <div className="p-4 bg-blue-600 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 p-1.5 rounded-lg">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">MedUz AI Yordamchi</h3>
                    <p className="text-[10px] opacity-80">Tibbiy savollaringizga javob beraman</p>
                  </div>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="p-1 hover:bg-white/10 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50">
                {chatMessages.length === 0 && (
                  <div className="text-center py-8 space-y-2">
                    <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                      <Sparkles className="w-6 h-6 text-blue-600" />
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Salom! Men MedUz AI yordamchisiman. Qanday yordam bera olaman?</p>
                  </div>
                )}
                {chatMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-700 shadow-sm border border-slate-100 rounded-tl-none'}`}>
                      <Markdown>{m.text}</Markdown>
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 rounded-tl-none flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                      <span className="text-xs text-slate-500">O'ylayapman...</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 bg-white space-y-2">
                <div className="flex items-center gap-4 px-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={isThinkingMode} 
                      onChange={(e) => setIsThinkingMode(e.target.checked)}
                      className="hidden"
                    />
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isThinkingMode ? 'bg-purple-600 border-purple-600' : 'border-slate-300'}`}>
                      {isThinkingMode && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-purple-600 transition-colors">Thinking Mode</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={isSearchEnabled} 
                      onChange={(e) => setIsSearchEnabled(e.target.checked)}
                      className="hidden"
                    />
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSearchEnabled ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'}`}>
                      {isSearchEnabled && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-emerald-600 transition-colors">Google Search</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Savolingizni yozing..."
                    className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={isChatLoading || !chatInput.trim()}
                    className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
          className="bg-blue-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center group relative"
        >
          {isChatOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
          {!isChatOpen && (
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              AI Yordamchi
            </div>
          )}
        </button>
      </div>

      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 bg-white/80 backdrop-blur-md p-2 rounded-full shadow-2xl border border-white/20">
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
            className={`w-10 h-10 rounded-full border-2 transition-all hover:scale-110 active:scale-95 ${themeColor === c.color ? 'border-white ring-4 ring-slate-200 shadow-lg' : 'border-transparent'}`}
            style={{ backgroundColor: c.color }}
            title={c.name}
          />
        ))}
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-card border-b border-border shadow-sm backdrop-blur-md bg-card/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div 
              className="flex items-center gap-2 cursor-pointer" 
              onClick={() => navigate('home')}
            >
              <div className="bg-primary p-1.5 rounded-lg">
                <Heart className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-primary">MedUz</span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-6">
              <NavLink active={currentPage === 'library'} onClick={() => navigate('library')}>Kutubxona</NavLink>
              <NavLink active={currentPage === 'mnemonics'} onClick={() => navigate('mnemonics')}>Mnemonikalar</NavLink>
              <NavLink active={currentPage === 'videos'} onClick={() => navigate('videos')}>Videolar</NavLink>
              <NavLink active={currentPage === 'symptoms'} onClick={() => navigate('symptoms')}>Simptomlar</NavLink>
              <NavLink active={currentPage === 'quiz'} onClick={() => navigate('quiz')}>Testlar</NavLink>
              <NavLink active={currentPage === 'ai'} onClick={() => navigate('ai')}>
                <div className="flex items-center gap-1.5 text-accent font-bold">
                  <Sparkles className="w-4 h-4" />
                  AI Markazi
                </div>
              </NavLink>
              
              <div className="h-6 w-px bg-border mx-2" />
              
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
                <MobileNavLink active={currentPage === 'library'} onClick={() => { navigate('library'); setIsMenuOpen(false); }}>Kutubxona</MobileNavLink>
                <MobileNavLink active={currentPage === 'mnemonics'} onClick={() => { navigate('mnemonics'); setIsMenuOpen(false); }}>Mnemonikalar</MobileNavLink>
                <MobileNavLink active={currentPage === 'videos'} onClick={() => { navigate('videos'); setIsMenuOpen(false); }}>Videolar</MobileNavLink>
                <MobileNavLink active={currentPage === 'symptoms'} onClick={() => { navigate('symptoms'); setIsMenuOpen(false); }}>Simptomlar</MobileNavLink>
                <MobileNavLink active={currentPage === 'quiz'} onClick={() => { navigate('quiz'); setIsMenuOpen(false); }}>Testlar</MobileNavLink>
                <MobileNavLink active={currentPage === 'ai'} onClick={() => { navigate('ai'); setIsMenuOpen(false); }}>AI Markazi</MobileNavLink>
                <MobileNavLink active={currentPage === 'admin'} onClick={() => { navigate('admin'); setIsMenuOpen(false); }}>Admin Panel</MobileNavLink>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {currentPage === 'home' && <HomePage onNavigate={navigate} sections={sectionsData} />}
          {currentPage === 'mnemonics' && <MnemonicsPage data={mnemonicsData} handleAIExplain={handleAIExplain} />}
          {currentPage === 'videos' && <VideosPage data={videosData} handleAIExplain={handleAIExplain} />}
          {currentPage === 'symptoms' && <SymptomsPage data={symptomsData} handleAIExplain={handleAIExplain} />}
          {currentPage === 'quiz' && <QuizPage handleAIExplain={handleAIExplain} />}
          {currentPage === 'library' && <LibraryPage data={libraryData} handleAIExplain={handleAIExplain} />}
          {currentPage === 'ai' && <AIPage />}
          {currentPage === 'admin' && <AdminPage 
            mnemonics={mnemonicsData} 
            questions={questionsData} 
            symptoms={symptomsData} 
            videos={videosData}
            sections={sectionsData}
            settings={settingsData}
            library={libraryData}
            onUpdate={fetchAllData} 
            onUpdateLibrary={setLibraryData}
            themeColor={themeColor}
            setThemeColor={setThemeColor}
          />}
        </AnimatePresence>
      </main>

      {/* AI Modal */}
      <AnimatePresence>
        {aiModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-purple-50/50">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-600 p-2 rounded-xl">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 leading-tight">{aiModal.title}</h3>
                    <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">AI Tibbiy Tushuntirish</p>
                  </div>
                </div>
                <button 
                  onClick={() => setAiModal(prev => ({ ...prev, isOpen: false }))}
                  className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-8 overflow-y-auto custom-scrollbar">
                {aiModal.loading ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
                    <p className="text-slate-500 font-medium animate-pulse">AI ma'lumotlarni tahlil qilmoqda...</p>
                  </div>
                ) : (
                  <div className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-p:text-slate-600 prose-strong:text-slate-900 prose-ul:list-disc">
                    <Markdown>{aiModal.content}</Markdown>
                  </div>
                )}
              </div>
              
              <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                <p className="text-[10px] text-slate-400">
                  AI tomonidan yaratilgan ma'lumotlar xato bo'lishi mumkin. Har doim rasmiy darsliklarga tayanib ish ko'ring.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Heart className="w-5 h-5 text-blue-600" />
                <span className="text-xl font-bold text-blue-600">MedUz</span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">
                O'zbekiston tibbiyot talabalari uchun bepul va sifatli ta'lim platformasi. 
                Bizning maqsadimiz - bo'lajak shifokorlarga bilim olishda ko'maklashish.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Bo'limlar</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><button onClick={() => navigate('mnemonics')} className="hover:text-blue-600">Mnemonikalar</button></li>
                <li><button onClick={() => navigate('videos')} className="hover:text-blue-600">Video darslar</button></li>
                <li><button onClick={() => navigate('symptoms')} className="hover:text-blue-600">Simptomlar tekshiruvi</button></li>
                <li><button onClick={() => navigate('quiz')} className="hover:text-blue-600">Kunlik testlar</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Aloqa</h4>
              <p className="text-sm text-slate-500 mb-2">Savollar va takliflar uchun:</p>
              <div className="space-y-2">
                {settingsData.find(s => s.key === 'contact_email') && (
                  <a href={`mailto:${settingsData.find(s => s.key === 'contact_email')?.value}`} className="block text-blue-600 text-sm font-medium hover:underline">
                    {settingsData.find(s => s.key === 'contact_email')?.value}
                  </a>
                )}
                {settingsData.find(s => s.key === 'contact_telegram') && (
                  <a href={`https://t.me/${settingsData.find(s => s.key === 'contact_telegram')?.value.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="block text-blue-600 text-sm font-medium hover:underline">
                    Telegram: {settingsData.find(s => s.key === 'contact_telegram')?.value}
                  </a>
                )}
                {settingsData.find(s => s.key === 'contact_phone') && (
                  <p className="text-sm text-slate-500">
                    Tel: {settingsData.find(s => s.key === 'contact_phone')?.value}
                  </p>
                )}
              </div>
              <div className="mt-4">
                <button 
                  onClick={() => navigate('admin')}
                  className="flex items-center gap-2 text-xs text-slate-400 hover:text-blue-600 transition-colors"
                >
                  <Settings className="w-3 h-3" /> Admin Panel
                </button>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-100 mt-12 pt-8 text-center text-slate-400 text-xs">
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
      className={`text-sm font-medium transition-colors hover:text-blue-600 ${active ? 'text-blue-600' : 'text-slate-600'}`}
    >
      {children}
    </button>
  );
}

function MobileNavLink({ children, active, onClick }: { children: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`block w-full text-left px-4 py-2 rounded-lg text-base font-medium transition-colors ${active ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
    >
      {children}
    </button>
  );
}

/* --- PAGES --- */

function HomePage({ onNavigate, sections }: { onNavigate: (page: Page) => void, sections: Section[] }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-16"
    >
      {/* Hero Section */}
      <section className="text-center space-y-6 py-12">
        <motion.h1 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900"
        >
          MedUz – <span className="text-blue-600">Barcha tibbiyot</span> <br className="hidden md:block" /> talabalari uchun
        </motion.h1>
        <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto">
          Bepul, o'zbek tilida, sifatli tibbiyot ta'limi. Bilimingizni mustahkamlang va imtihonlarga tayyorlaning.
        </p>
        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <button 
            onClick={() => onNavigate('quiz')}
            className="bg-blue-600 text-white px-8 py-3 rounded-full font-semibold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all transform hover:-translate-y-1"
          >
            Testni boshlash
          </button>
          <button 
            onClick={() => onNavigate('mnemonics')}
            className="bg-white text-slate-700 border border-slate-200 px-8 py-3 rounded-full font-semibold hover:bg-slate-50 transition-all"
          >
            Mnemonikalarni ko'rish
          </button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <FeatureCard 
          icon={<BookOpen className="w-8 h-8 text-blue-600" />}
          title="Kutubxona"
          description="Fanlar, mavzular va resurslarning iyerarxik to'plami."
          onClick={() => onNavigate('library')}
          color="blue"
        />
        <FeatureCard 
          icon={<Brain className="w-8 h-8 text-purple-500" />}
          title="Mnemonikalar"
          description="Murakkab mavzularni oson eslab qolish uchun maxsus iboralar to'plami."
          onClick={() => onNavigate('mnemonics')}
          color="purple"
        />
        <FeatureCard 
          icon={<Video className="w-8 h-8 text-red-500" />}
          title="Video Kutubxona"
          description="Klinik ko'nikmalar va amaliyotlar bo'yicha video darslar."
          onClick={() => onNavigate('videos')}
          color="red"
        />
        <FeatureCard 
          icon={<Stethoscope className="w-8 h-8 text-emerald-500" />}
          title="Simptomlar"
          description="Simptomlar asosida taxminiy tashxislar va 'Qizil bayroqlar'."
          onClick={() => onNavigate('symptoms')}
          color="emerald"
        />
        <FeatureCard 
          icon={<CheckCircle2 className="w-8 h-8 text-blue-500" />}
          title="Kunlik Test"
          description="Bilimingizni sinash uchun har kuni yangi savollar to'plami."
          onClick={() => onNavigate('quiz')}
          color="blue"
        />
        <FeatureCard 
          icon={<Sparkles className="w-8 h-8 text-purple-600" />}
          title="AI Markazi"
          description="Sun'iy intellekt yordamida tahlil va media yaratish."
          onClick={() => onNavigate('ai')}
          color="purple"
        />
        {sections.map((sec, idx) => (
          <FeatureCard 
            key={sec.id || idx}
            icon={<div className="text-3xl">{sec.icon}</div>}
            title={sec.title}
            description={sec.content}
            onClick={() => alert(`Bu bo'lim tez kunda ishga tushadi: ${sec.title}`)}
            color={sec.color}
          />
        ))}
      </section>

      {/* Coming Soon Section */}
      <section className="bg-blue-600 rounded-3xl p-8 md:p-12 text-white overflow-hidden relative">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-block bg-blue-500 text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">Tez kunda</span>
          <h2 className="text-3xl font-bold mb-4">Virtual Bemor Simulyatori</h2>
          <p className="text-blue-100 mb-8">
            Haqiqiy klinik holatlarni virtual muhitda boshqarish va qaror qabul qilish ko'nikmalarini rivojlantirish uchun yangi bo'lim ustida ishlayapmiz.
          </p>
          <div className="flex items-center gap-2 text-sm font-medium">
            <Info className="w-4 h-4" />
            <span>Yangi yangiliklardan xabardor bo'lish uchun bizni kuzatib boring.</span>
          </div>
        </div>
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 opacity-10">
          <Stethoscope className="w-96 h-96" />
        </div>
      </section>
    </motion.div>
  );
}

const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, description: string, onClick: () => void, color: string }> = ({ icon, title, description, onClick, color }) => {
  const colors: Record<string, string> = {
    purple: 'hover:border-purple-200 hover:bg-purple-50',
    red: 'hover:border-red-200 hover:bg-red-50',
    emerald: 'hover:border-emerald-200 hover:bg-emerald-50',
    blue: 'hover:border-blue-200 hover:bg-blue-50',
  };

  const colorClass = colors[color] || colors.blue;

  return (
    <button 
      onClick={onClick}
      className={`text-left p-8 bg-white border border-slate-100 rounded-2xl shadow-sm transition-all duration-300 group ${colorClass}`}
    >
      <div className="mb-6 transform transition-transform group-hover:scale-110 duration-300">{icon}</div>
      <h3 className="text-xl font-bold mb-2 group-hover:text-slate-900">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed mb-4">{description}</p>
      <div className="flex items-center text-blue-600 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
        Batafsil <ChevronRight className="w-4 h-4 ml-1" />
      </div>
    </button>
  );
};

function MnemonicsPage({ data, handleAIExplain }: { data: Mnemonic[], handleAIExplain: (title: string, context: string) => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Barchasi');

  const categories = ['Barchasi', ...Array.from(new Set(data.map(m => m.category)))];

  const filteredMnemonics = data.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         m.mnemonic.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         m.explanation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Barchasi' || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Simple toast could be added here
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
          <h2 className="text-3xl font-bold">Tibbiy Mnemonikalar</h2>
          <p className="text-slate-500">Murakkab tushunchalarni oson eslab qolishga yordam beruvchi iboralar.</p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Qidirish..." 
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${selectedCategory === cat ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
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
            className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md uppercase tracking-wider">{m.category}</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleAIExplain(m.title, `Mnemonika: ${m.mnemonic}. Izoh: ${m.explanation}`)}
                  className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                  title="AI tushuntirishi"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => copyToClipboard(m.mnemonic)}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  title="Nusxa olish"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <h3 className="text-xl font-bold mb-3">{m.title}</h3>
            <div className="bg-slate-50 p-4 rounded-xl mb-4 border-l-4 border-blue-500">
              <p className="text-lg font-mono font-bold text-blue-700">{m.mnemonic}</p>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed">{m.explanation}</p>
          </motion.div>
        ))}
      </div>

      {filteredMnemonics.length === 0 && (
        <div className="text-center py-20">
          <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Hech narsa topilmadi</h3>
          <p className="text-slate-500">Boshqa kalit so'z bilan qidirib ko'ring.</p>
        </div>
      )}

      <div className="bg-slate-900 rounded-2xl p-8 text-white text-center">
        <h3 className="text-xl font-bold mb-2">O'z mnemonikangiz bormi?</h3>
        <p className="text-slate-400 mb-6 max-w-md mx-auto">Bizning platformaga o'z hissangizni qo'shing va boshqalarga yordam bering.</p>
        <button className="bg-white text-slate-900 px-6 py-2 rounded-full font-bold hover:bg-slate-100 transition-all">
          Yuborish
        </button>
      </div>
    </motion.div>
  );
}

function VideosPage({ data, handleAIExplain }: { data: VideoData[], handleAIExplain: (title: string, context: string) => void }) {
  const [selectedFilter, setSelectedFilter] = useState('Barchasi');
  const [activeVideo, setActiveVideo] = useState<VideoData | null>(null);

  const filters = ['Barchasi', ...Array.from(new Set(data.map(v => v.category)))];

  const filteredVideos = data.filter(v => selectedFilter === 'Barchasi' || v.category === selectedFilter);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-8"
    >
      <div className="space-y-2">
        <h2 className="text-3xl font-bold">Video Kutubxona</h2>
        <p className="text-slate-500">Klinik ko'nikmalarni vizual tarzda o'rganing.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map(f => (
          <button 
            key={f}
            onClick={() => setSelectedFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${selectedFilter === f ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVideos.map((v, idx) => (
          <div key={idx} className="group cursor-pointer" onClick={() => v.available && setActiveVideo(v)}>
            <div className="relative aspect-video rounded-2xl overflow-hidden mb-3 bg-slate-200 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200" />
              <Video className="w-12 h-12 text-slate-300 relative z-10" />
              {v.available ? (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 z-20">
                  <PlayCircle className="w-12 h-12 text-white" />
                </div>
              ) : (
                <div className="absolute top-3 right-3 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider z-20">
                  Tez kunda
                </div>
              )}
              <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1 z-20">
                <Clock className="w-3 h-3" /> {v.duration}
              </div>
            </div>
            <h4 className={`font-bold leading-tight mb-1 ${!v.available ? 'text-slate-400' : 'text-slate-900'}`}>{v.title}</h4>
            <div className="flex justify-between items-center">
              <p className="text-xs text-slate-500 font-medium">{v.category}</p>
              {v.available && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAIExplain(v.title, `Video dars mavzusi: ${v.title}. Kategoriya: ${v.category}`);
                  }}
                  className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                  title="AI tushuntirishi"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
        {filteredVideos.length === 0 && (
          <div className="col-span-full text-center py-20 text-slate-400">Hozircha videolar mavjud emas.</div>
        )}
      </div>

      {/* Video Player Modal */}
      <AnimatePresence>
        {activeVideo && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-black rounded-3xl shadow-2xl w-full max-w-5xl aspect-video overflow-hidden relative"
            >
              <button 
                onClick={() => setActiveVideo(null)}
                className="absolute top-4 right-4 z-20 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white"
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

function SymptomsPage({ data, handleAIExplain }: { data: SymptomData[], handleAIExplain: (title: string, context: string) => void }) {
  const [query, setQuery] = useState('');
  
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

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-3xl mx-auto space-y-8"
    >
      <div className="text-center space-y-4">
        <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
          <Stethoscope className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-3xl font-bold">Simptomlar Tekshiruvi</h2>
        <p className="text-slate-500">Simptomlarni kiriting va ehtimoliy tashxislarni ko'ring.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
        <input 
          type="text" 
          placeholder="Masalan: ko'krak og'rig'i, isitma..." 
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-lg"
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
            className={`p-6 rounded-2xl border ${res.redFlag ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100 shadow-sm'}`}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className={`text-xl font-bold ${res.redFlag ? 'text-red-700' : 'text-slate-900'}`}>{res.diagnosis}</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleAIExplain(res.diagnosis, `Simptomlar: ${res.symptoms.join(', ')}. Tashxis: ${res.diagnosis}`)}
                  className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                  title="AI tushuntirishi"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
                {res.redFlag && (
                  <span className="flex items-center gap-1 text-xs font-bold bg-red-600 text-white px-2 py-1 rounded-md uppercase tracking-wider">
                    <AlertTriangle className="w-3 h-3" /> Qizil bayroq
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {res.symptoms.map((s, i) => (
                <span key={i} className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{s}</span>
              ))}
            </div>
            {res.redFlag && (
              <p className="text-sm text-red-600 font-medium bg-red-100/50 p-3 rounded-lg">
                <strong>Diqqat:</strong> Bu holat shoshilinch tibbiy yordam talab qilishi mumkin. Darhol shifokorga murojaat qiling!
              </p>
            )}
          </motion.div>
        ))}

        {query && results.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
            <p className="text-slate-500 italic">Ma'lumotlar bazasidan mos keladigan tashxis topilmadi.</p>
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl flex gap-4">
        <Info className="w-6 h-6 text-amber-600 shrink-0" />
        <p className="text-sm text-amber-800 leading-relaxed">
          <strong>Rad etish:</strong> Ushbu vosita faqat ta'lim maqsadlari uchun mo'ljallangan. 
          U professional tibbiy maslahat, tashxis yoki davolash o'rnini bosa olmaydi. 
          Har qanday tibbiy holat bo'yicha har doim shifokoringiz bilan maslahatlashing.
        </p>
      </div>
    </motion.div>
  );
}

function QuizPage({ handleAIExplain }: { handleAIExplain: (title: string, context: string) => void }) {
  const [step, setStep] = useState<'subjects' | 'topics' | 'quiz' | 'enter_name' | 'result'>('subjects');
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  
  const [userName, setUserName] = useState('');
  const [userSurname, setUserSurname] = useState('');
  
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [timeTaken, setTimeTaken] = useState(0);
  
  const [scoreboard, setScoreboard] = useState<{name: string, surname: string, score: number, time: number, topic: string}[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('meduz_quiz_scores');
    if (saved) setScoreboard(JSON.parse(saved));
  }, []);

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
  };

  const handleAnswer = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
  };

  const checkAnswer = () => {
    if (selectedOption === null || isAnswered) return;
    setIsAnswered(true);
    if (selectedOption === selectedTopic.questions[currentQuestionIdx].correct) {
      setScore(s => s + 1);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIdx < selectedTopic.questions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setStep('enter_name');
    }
  };

  const finishQuiz = () => {
    if (!userName.trim() || !userSurname.trim()) {
      alert("Iltimos, ism va familiyangizni kiriting.");
      return;
    }
    const time = Math.floor((Date.now() - startTime) / 1000);
    setTimeTaken(time);
    
    const newScore = { 
      name: userName, 
      surname: userSurname, 
      score, 
      time,
      topic: selectedTopic.name
    };
    
    const newBoard = [...scoreboard, newScore]
      .sort((a, b) => b.score - a.score || a.time - b.time)
      .slice(0, 10);
      
    setScoreboard(newBoard);
    localStorage.setItem('meduz_quiz_scores', JSON.stringify(newBoard));
    setStep('result');
  };

  const resetQuiz = () => {
    setStep('subjects');
    setSelectedSubject(null);
    setSelectedTopic(null);
    setUserName('');
    setUserSurname('');
  };

  const totalQuestions = selectedTopic?.questions?.length || 1;
  const percentage = Math.round((score / totalQuestions) * 100);
  
  let resultMessage = "";
  let resultColor = "";
  let animationProps = {};
  
  if (percentage >= 80) {
    resultMessage = "Barakalla! Siz juda yaxshi natija ko'rsatdingiz.";
    resultColor = "text-emerald-600";
    animationProps = {
      animate: { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] },
      transition: { duration: 0.5, repeat: Infinity, repeatType: "reverse" }
    };
  } else if (percentage >= 60) {
    resultMessage = "Yaxshi natija, lekin yanada yaxshiroq bo'lishi mumkin.";
    resultColor = "text-amber-500";
    animationProps = {
      animate: { opacity: [0.5, 1, 0.5] },
      transition: { duration: 1.5, repeat: Infinity }
    };
  } else {
    resultMessage = "Harakatda davom eting! Keyingi safar albatta yaxshiroq natija bo'ladi.";
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
      doc.text(`${userName} ${userSurname}`, width / 2, 80, { align: "center" });

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

      doc.save(`Natija_${userName}_${userSurname}.pdf`);
    });
  };

  useEffect(() => {
    if (step === 'result') {
      generatePDF();
    }
  }, [step]);

  if (step === 'subjects') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold">Fanlar sahifasi</h2>
          <p className="text-slate-500">Test ishlash uchun fanni tanlang</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizData.subjects.map(subject => (
            <motion.button
              key={subject.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSubjectSelect(subject)}
              className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center gap-4 text-center"
            >
              <div className="text-4xl">{subject.icon}</div>
              <h3 className="text-xl font-bold text-slate-800">{subject.name}</h3>
            </motion.button>
          ))}
        </div>
      </motion.div>
    );
  }

  if (step === 'topics') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setStep('subjects')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <h2 className="text-3xl font-bold">{selectedSubject.name} &rarr; Mavzular</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {selectedSubject.topics.map((topic: any) => (
            <motion.button
              key={topic.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleTopicSelect(topic)}
              className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all text-left flex justify-between items-center"
            >
              <div>
                <h3 className="text-xl font-bold text-slate-800">{topic.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{topic.questions.length} ta savol</p>
              </div>
              <ChevronRight className="w-6 h-6 text-slate-400" />
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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold">
              {currentQuestionIdx + 1}
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Savol {currentQuestionIdx + 1} / {selectedTopic.questions.length}</h2>
              <div className="w-32 h-2 bg-slate-100 rounded-full mt-1 overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-blue-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm space-y-8">
          <h3 className="text-2xl font-bold text-slate-900 leading-tight">{currentQ.text}</h3>
          
          <div className="grid grid-cols-1 gap-4">
            {currentQ.options.map((option: string, idx: number) => {
              let stateClass = "border-slate-100 hover:border-blue-200 hover:bg-blue-50";
              if (isAnswered) {
                if (idx === currentQ.correct) stateClass = "border-emerald-500 bg-emerald-50 text-emerald-700";
                else if (idx === selectedOption) stateClass = "border-red-500 bg-red-50 text-red-700";
                else stateClass = "border-slate-100 opacity-50";
              } else if (idx === selectedOption) {
                stateClass = "border-blue-500 bg-blue-50 text-blue-700";
              }

              return (
                <button 
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={isAnswered}
                  className={`w-full text-left p-5 rounded-2xl border-2 font-medium transition-all flex justify-between items-center ${stateClass}`}
                >
                  <span>{option}</span>
                  {isAnswered && idx === currentQ.correct && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                  {isAnswered && idx === selectedOption && idx !== currentQ.correct && <X className="w-5 h-5 text-red-500" />}
                </button>
              );
            })}
          </div>

          <AnimatePresence>
            {isAnswered && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pt-6 border-t border-slate-100">
                <button 
                  onClick={nextQuestion}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                  {currentQuestionIdx === selectedTopic.questions.length - 1 ? 'Natijani ko\'rish' : 'Keyingi'}
                  <ChevronRight className="w-5 h-5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {!isAnswered && (
            <button 
              onClick={checkAnswer}
              disabled={selectedOption === null}
              className={`w-full py-4 rounded-2xl font-bold transition-all ${selectedOption !== null ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 hover:bg-blue-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            >
              Javobni tasdiqlash
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  if (step === 'enter_name') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-3xl font-bold">Test yakunlandi!</h2>
          <p className="text-slate-500">Natijani ko'rish va sertifikat yuklab olish uchun ismingizni kiriting</p>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Ismingiz</label>
              <input 
                type="text" 
                value={userName}
                onChange={e => setUserName(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ismingizni kiriting"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Familiyangiz</label>
              <input 
                type="text" 
                value={userSurname}
                onChange={e => setUserSurname(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Familiyangizni kiriting"
              />
            </div>
          </div>
          <button 
            onClick={finishQuiz}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
          >
            Natijani ko'rish
          </button>
        </div>
      </motion.div>
    );
  }

  if (step === 'result') {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto text-center space-y-8">
        <div className="bg-white p-12 rounded-3xl border border-slate-100 shadow-xl space-y-8 relative overflow-hidden">
          {percentage >= 80 && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-20">
              <Sparkles className="w-full h-full text-emerald-500" />
            </div>
          )}
          
          <motion.div {...(animationProps as any)} className="space-y-4 relative z-10">
            <h2 className={`text-4xl font-bold ${resultColor}`}>{resultMessage}</h2>
            <p className="text-slate-600 text-lg">{userName} {userSurname}</p>
          </motion.div>
          
          <div className="grid grid-cols-2 gap-6 relative z-10">
            <div className="bg-slate-50 p-6 rounded-2xl">
              <p className="text-slate-500 text-sm font-bold mb-1">To'g'ri javoblar</p>
              <p className="text-4xl font-bold text-slate-900">{score} / {totalQuestions}</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl">
              <p className="text-slate-500 text-sm font-bold mb-1">Foiz</p>
              <p className="text-4xl font-bold text-slate-900">{percentage}%</p>
            </div>
          </div>
          
          <div className="pt-4 relative z-10 space-y-4">
            <p className="text-sm text-slate-500">Natijangiz PDF formatida yuklab olinmoqda...</p>
            <button 
              onClick={resetQuiz}
              className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all"
            >
              Boshqa mavzu
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
}

function AdminPage({ mnemonics, questions, symptoms, videos, sections, settings, library, onUpdate, onUpdateLibrary, themeColor, setThemeColor }: { 
  mnemonics: Mnemonic[], 
  questions: Question[], 
  symptoms: SymptomData[], 
  videos: VideoData[],
  sections: Section[],
  settings: Setting[],
  library: any,
  onUpdate: () => void,
  onUpdateLibrary: (data: any) => void,
  themeColor: string,
  setThemeColor: (color: string) => void
}) {
  const [activeTab, setActiveTab] = useState<'mnemonics' | 'questions' | 'symptoms' | 'videos' | 'sections' | 'settings' | 'library'>('mnemonics');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (res.ok) {
        setIsLoggedIn(true);
        setError('');
      } else {
        setError('Noto\'g\'ri parol');
      }
    } catch (err) {
      setError('Xatolik yuz berdi');
    }
  };

  const deleteItem = async (type: string, id: number) => {
    if (!confirm('Haqiqatan ham o\'chirmoqchimisiz?')) return;
    try {
      await fetch(`/api/${type}/${id}`, { 
        method: 'DELETE',
        headers: { 'x-admin-password': password }
      });
      onUpdate();
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const addItem = async (type: string, data: any) => {
    try {
      const res = await fetch(`/api/${type}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-password': password 
        },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        onUpdate();
        return true;
      }
    } catch (error) {
      console.error('Error adding:', error);
    }
    return false;
  };

  if (!isLoggedIn) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto mt-20 p-8 bg-card rounded-[32px] shadow-xl border border-border"
      >
        <div className="flex justify-center mb-6">
          <div className="bg-primary/10 p-4 rounded-full">
            <Lock className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center mb-6 text-foreground">Admin Kirish</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-foreground/70 mb-1">Parol</label>
            <input 
              type="password" 
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
          <button className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
            Kirish
          </button>
        </form>
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
          <div className="bg-card border border-border rounded-[32px] p-4 sticky top-24 space-y-1 shadow-sm">
            <div className="px-4 py-4 mb-2">
              <h2 className="text-2xl font-bold text-foreground">Admin Panel</h2>
              <p className="text-xs text-foreground/40 font-medium mt-1">Ma'lumotlarni boshqarish</p>
            </div>
            
            <div className="space-y-1">
              {[
                { id: 'mnemonics', label: 'Mnemonikalar', icon: Brain },
                { id: 'questions', label: 'Savollar', icon: CheckCircle2 },
                { id: 'symptoms', label: 'Simptomlar', icon: Stethoscope },
                { id: 'videos', label: 'Videolar', icon: Video },
                { id: 'library', label: 'Kutubxona', icon: BookOpen },
                { id: 'sections', label: 'Bo\'limlar', icon: Plus },
                { id: 'settings', label: 'Sozlamalar', icon: Settings },
              ].map(tab => {
                const Icon = tab.icon;
                const label = tab.label;
                const id = tab.id as any;
                
                return (
                  <button 
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`w-full px-4 py-3.5 rounded-2xl text-sm font-bold transition-all flex items-center gap-3.5 ${activeTab === id ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-foreground/60 hover:bg-secondary hover:text-primary'}`}
                  >
                    <Icon className={`w-5 h-5 ${activeTab === id ? 'text-primary-foreground' : 'text-foreground/40'}`} />
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="pt-4 mt-4 border-t border-border">
              <button 
                onClick={() => setIsLoggedIn(false)}
                className="w-full px-4 py-3.5 rounded-2xl text-sm font-bold text-red-600 hover:bg-red-50 transition-all flex items-center gap-3.5"
              >
                <LogOut className="w-5 h-5" /> Chiqish
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 space-y-8">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 bg-card border border-border rounded-[32px] overflow-hidden shadow-sm h-fit">
              <div className="px-6 py-5 border-b border-border bg-secondary/50 flex justify-between items-center">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  {activeTab === 'mnemonics' ? <Brain className="w-5 h-5 text-primary" /> : activeTab === 'questions' ? <CheckCircle2 className="w-5 h-5 text-primary" /> : activeTab === 'symptoms' ? <Stethoscope className="w-5 h-5 text-primary" /> : activeTab === 'videos' ? <Video className="w-5 h-5 text-primary" /> : activeTab === 'library' ? <BookOpen className="w-5 h-5 text-primary" /> : activeTab === 'sections' ? <Plus className="w-5 h-5 text-primary" /> : <Settings className="w-5 h-5 text-primary" />}
                  {activeTab === 'mnemonics' ? 'Mnemonikalar Ro\'yxati' : activeTab === 'questions' ? 'Savollar Ro\'yxati' : activeTab === 'symptoms' ? 'Simptomlar Ro\'yxati' : activeTab === 'videos' ? 'Videolar Ro\'yxati' : activeTab === 'library' ? 'Kutubxona Strukturasi' : activeTab === 'sections' ? 'Bo\'limlar Ro\'yxati' : 'Tizim Sozlamalari'}
                </h3>
                <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-1 rounded-full uppercase tracking-wider">
                  {(activeTab === 'mnemonics' ? mnemonics : activeTab === 'questions' ? questions : activeTab === 'symptoms' ? symptoms : activeTab === 'videos' ? videos : activeTab === 'library' ? library.subjects : sections).length} ta element
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-secondary/30 border-b border-border">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-foreground/50 uppercase tracking-wider">Ma'lumot</th>
                      <th className="px-6 py-4 text-xs font-bold text-foreground/50 uppercase tracking-wider w-24 text-right">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {activeTab === 'mnemonics' && mnemonics.map(m => (
                      <tr key={m.id} className="hover:bg-secondary/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-bold text-foreground group-hover:text-primary transition-colors">{m.title}</div>
                          <div className="text-[10px] text-primary font-bold uppercase tracking-widest mt-0.5">{m.category}</div>
                          <div className="text-sm text-foreground/60 mt-2 font-mono bg-secondary/50 p-2 rounded-lg border border-border">{m.mnemonic}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => deleteItem('mnemonics', m.id!)} className="p-2.5 text-foreground/40 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4.5 h-4.5" /></button>
                        </td>
                      </tr>
                    ))}
                    {activeTab === 'questions' && questions.map(q => (
                      <tr key={q.id} className="hover:bg-secondary/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-bold text-foreground group-hover:text-primary transition-colors">{q.question}</div>
                          <div className="text-[10px] text-primary font-bold uppercase tracking-wider mt-1">{q.subject} • {q.topic} • {q.difficulty}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => deleteItem('questions', q.id!)} className="p-2.5 text-foreground/40 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4.5 h-4.5" /></button>
                        </td>
                      </tr>
                    ))}
                    {activeTab === 'symptoms' && symptoms.map(s => (
                      <tr key={s.id} className="hover:bg-secondary/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-bold text-foreground group-hover:text-primary transition-colors">{s.diagnosis}</div>
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
                          <div className="font-bold text-foreground group-hover:text-primary transition-colors">{v.title}</div>
                          <div className="text-xs text-foreground/60 mt-1">{v.category} • {v.duration}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => deleteItem('videos', v.id!)} className="p-2.5 text-foreground/40 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4.5 h-4.5" /></button>
                        </td>
                      </tr>
                    ))}
                    {activeTab === 'library' && library.subjects.map((sub: any) => (
                      <tr key={sub.id} className="hover:bg-secondary/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-bold text-foreground group-hover:text-primary transition-colors">{sub.name}</div>
                          <div className="text-xs text-foreground/60 mt-1">{sub.topics.length} ta mavzu</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => {
                              if(confirm('Ushbu fanni va uning barcha mavzularini o\'chirmoqchimisiz?')) {
                                const newSubjects = library.subjects.filter((s: any) => s.id !== sub.id);
                                onUpdateLibrary({ ...library, subjects: newSubjects });
                              }
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
                          <div className="font-bold text-foreground group-hover:text-primary transition-colors">{sec.title}</div>
                          <div className="text-xs text-foreground/60 mt-1 line-clamp-1">{sec.content}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => deleteItem('sections', sec.id!)} className="p-2.5 text-foreground/40 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4.5 h-4.5" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-card border border-border rounded-[32px] p-8 shadow-sm h-fit sticky top-24">
              <h3 className="font-bold text-foreground mb-8 flex items-center gap-3 text-xl">
                <div className="bg-primary p-2 rounded-xl">
                  <Plus className="w-5 h-5 text-primary-foreground" />
                </div>
                {activeTab === 'settings' ? 'Tizimni Sozlash' : 'Yangi Qo\'shish'}
              </h3>
              
              <div className="space-y-6">
                {activeTab === 'mnemonics' && <MnemonicForm onAdd={(data) => addItem('mnemonics', data)} />}
                {activeTab === 'questions' && <QuestionForm onAdd={(data) => addItem('questions', data)} />}
                {activeTab === 'symptoms' && <SymptomForm onAdd={(data) => addItem('symptoms', data)} />}
                {activeTab === 'videos' && <VideoForm onAdd={(data) => addItem('videos', data)} />}
                {activeTab === 'sections' && <SectionForm onAdd={(data) => addItem('sections', data)} />}
                {activeTab === 'library' && <LibraryForm library={library} onUpdate={onUpdateLibrary} />}
                {activeTab === 'settings' && <SettingsForm settings={settings} onUpdate={onUpdate} password={password} themeColor={themeColor} setThemeColor={setThemeColor} />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
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
        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
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
          <button className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all">
            Fanni saqlash
          </button>
        </div>
      </form>

      {/* Add Topic */}
      <form onSubmit={handleAddTopic} className="space-y-4 p-6 bg-secondary/30 rounded-2xl border border-border">
        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
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
          <button className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all">
            Mavzuni saqlash
          </button>
        </div>
      </form>
    </div>
  );
}

function SettingsForm({ settings, onUpdate, password, themeColor, setThemeColor }: { settings: Setting[], onUpdate: () => void, password: string, themeColor: string, setThemeColor: (color: string) => void }) {
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
        fetch('/api/settings', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-admin-password': password 
          },
          body: JSON.stringify({ key, value })
        })
      ));
      onUpdate();
      alert('Sozlamalar saqlandi!');
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-slate-900 border-b pb-2">Mavzu rangi</h4>
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
              className={`w-10 h-10 rounded-full border-2 transition-all ${themeColor === c.color ? 'border-white ring-2 ring-blue-500 scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c.color }}
              title={c.name}
            />
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <h4 className="text-sm font-bold text-slate-900 border-b pb-2">Aloqa ma'lumotlari</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
            <input 
              className="w-full p-2 border rounded-lg" 
              value={formData['contact_email'] || ''} 
              onChange={e => setFormData({...formData, 'contact_email': e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Telegram (username)</label>
            <input 
              className="w-full p-2 border rounded-lg" 
              value={formData['contact_telegram'] || ''} 
              onChange={e => setFormData({...formData, 'contact_telegram': e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Telefon</label>
            <input 
              className="w-full p-2 border rounded-lg" 
              value={formData['contact_phone'] || ''} 
              onChange={e => setFormData({...formData, 'contact_phone': e.target.value})} 
            />
          </div>
        </div>
        <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
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
      <input placeholder="Kategoriya" className="w-full p-2 border rounded-lg" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} required />
      <input placeholder="Sarlavha" className="w-full p-2 border rounded-lg" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
      <input placeholder="Mnemonika" className="w-full p-2 border rounded-lg" value={formData.mnemonic} onChange={e => setFormData({...formData, mnemonic: e.target.value})} required />
      <textarea placeholder="Tushuntirish" className="w-full p-2 border rounded-lg" value={formData.explanation} onChange={e => setFormData({...formData, explanation: e.target.value})} required />
      <button className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold">Qo'shish</button>
    </form>
  );
}

function QuestionForm({ onAdd }: { onAdd: (data: any) => Promise<boolean> }) {
  const [formData, setFormData] = useState({ subject: 'internal', topic: 'yurak', difficulty: 'medium', question: '', options: ['', '', '', ''], correct: 0, explanation: '' });
  
  const topics: Record<string, string[]> = {
    internal: ["yurak", "opka", "jigar", "buyrak", "oshqozon-ichak"],
    surgery: ["appenditsit", "xoletsistit", "pankreatit", "travma", "onkologiya"],
    pediatrics: ["raxit", "infeksiyalar", "yuqumli kasalliklar", "nevrologiya"],
    obstetrics: ["homiladorlik", "tug'ruq", "asoratlar"],
    neurology: ["bosh_miya", "o'murtqa", "periferik_nervlar"]
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await onAdd(formData)) setFormData({ subject: 'internal', topic: 'yurak', difficulty: 'medium', question: '', options: ['', '', '', ''], correct: 0, explanation: '' });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <select className="w-full p-2 border rounded-lg text-sm" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value, topic: topics[e.target.value][0]})}>
          <option value="internal">Ichki kasalliklar</option>
          <option value="surgery">Xirurgiya</option>
          <option value="pediatrics">Pediatriya</option>
          <option value="obstetrics">Akusherlik</option>
          <option value="neurology">Nevrologiya</option>
        </select>
        <select className="w-full p-2 border rounded-lg text-sm" value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})}>
          {topics[formData.subject]?.map(t => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ')}</option>
          ))}
        </select>
      </div>
      <select className="w-full p-2 border rounded-lg text-sm" value={formData.difficulty} onChange={e => setFormData({...formData, difficulty: e.target.value})}>
        <option value="easy">Oson</option>
        <option value="medium">O'rta</option>
        <option value="hard">Qiyin</option>
      </select>
      <textarea placeholder="Savol" className="w-full p-2 border rounded-lg" value={formData.question} onChange={e => setFormData({...formData, question: e.target.value})} required />
      {formData.options.map((opt, i) => (
        <input key={i} placeholder={`Variant ${i+1}`} className="w-full p-2 border rounded-lg" value={opt} onChange={e => {
          const newOpts = [...formData.options];
          newOpts[i] = e.target.value;
          setFormData({...formData, options: newOpts});
        }} required />
      ))}
      <select className="w-full p-2 border rounded-lg" value={formData.correct} onChange={e => setFormData({...formData, correct: parseInt(e.target.value)})}>
        {formData.options.map((_, i) => <option key={i} value={i}>To'g'ri javob: Variant {i+1}</option>)}
      </select>
      <textarea placeholder="Tushuntirish" className="w-full p-2 border rounded-lg" value={formData.explanation} onChange={e => setFormData({...formData, explanation: e.target.value})} required />
      <button className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold">Qo'shish</button>
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
      <input placeholder="Simptomlar (vergul bilan ajrating)" className="w-full p-2 border rounded-lg" value={formData.symptoms} onChange={e => setFormData({...formData, symptoms: e.target.value})} required />
      <input placeholder="Tashxis" className="w-full p-2 border rounded-lg" value={formData.diagnosis} onChange={e => setFormData({...formData, diagnosis: e.target.value})} required />
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input type="checkbox" checked={formData.redFlag} onChange={e => setFormData({...formData, redFlag: e.target.checked})} /> Qizil bayroq
      </label>
      <button className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold">Qo'shish</button>
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
      <input placeholder="Sarlavha" className="w-full p-2 border rounded-lg" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
      <input placeholder="Davomiyligi (masalan: 12:45)" className="w-full p-2 border rounded-lg" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} required />
      <input placeholder="Kategoriya" className="w-full p-2 border rounded-lg" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} required />
      <input placeholder="Video URL (YouTube)" className="w-full p-2 border rounded-lg" value={formData.videoUrl} onChange={e => setFormData({...formData, videoUrl: e.target.value})} required />
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input type="checkbox" checked={formData.available} onChange={e => setFormData({...formData, available: e.target.checked})} /> Mavjud
      </label>
      <button className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold">Qo'shish</button>
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
      <input placeholder="Sarlavha" className="w-full p-2 border rounded-lg" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
      <textarea placeholder="Tavsif" className="w-full p-2 border rounded-lg" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} required />
      <input placeholder="Emoji Icon (masalan: ⭐)" className="w-full p-2 border rounded-lg" value={formData.icon} onChange={e => setFormData({...formData, icon: e.target.value})} required />
      <select className="w-full p-2 border rounded-lg" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})}>
        <option value="blue">Ko'k</option>
        <option value="purple">Binafsha</option>
        <option value="red">Qizil</option>
        <option value="emerald">Yashil</option>
      </select>
      <button className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold">Qo'shish</button>
    </form>
  );
}

function AIPage() {
  const [activeTool, setActiveTool] = useState<'analysis' | 'image' | 'video'>('analysis');
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [generatedMedia, setGeneratedMedia] = useState<string | null>(null);

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

  const handleImageGen = async () => {
    if (!prompt) return;
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: { imageConfig: { aspectRatio: "1:1" } }
      });
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          setGeneratedMedia(`data:image/png;base64,${part.inlineData.data}`);
          break;
        }
      }
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const handleVideoGen = async () => {
    if (!prompt) return;
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
      });
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }
      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      const response = await fetch(downloadLink!, {
        method: 'GET',
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY! },
      });
      const blob = await response.blob();
      setGeneratedMedia(URL.createObjectURL(blob));
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-slate-900">AI Markazi</h2>
        <p className="text-slate-500">Tibbiy ta'lim uchun sun'iy intellekt imkoniyatlaridan foydalaning</p>
      </div>

      <div className="flex justify-center gap-4">
        <button onClick={() => setActiveTool('analysis')} className={`px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all ${activeTool === 'analysis' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
          <Search className="w-5 h-5" /> Tahlil
        </button>
        <button onClick={() => setActiveTool('image')} className={`px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all ${activeTool === 'image' ? 'bg-purple-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
          <ImageIcon className="w-5 h-5" /> Rasm yaratish
        </button>
        <button onClick={() => setActiveTool('video')} className={`px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all ${activeTool === 'video' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
          <Film className="w-5 h-5" /> Video yaratish
        </button>
      </div>

      <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl space-y-6">
        {activeTool === 'analysis' && (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-4 hover:border-blue-400 transition-colors cursor-pointer relative">
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setFile(e.target.files?.[0] || null)} />
              <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto">
                <Upload className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <p className="font-bold text-slate-900">{file ? file.name : "Rasm yoki video yuklang"}</p>
                <p className="text-sm text-slate-500">Rentgen, MRT yoki boshqa tibbiy tasvirlar</p>
              </div>
            </div>
            <textarea placeholder="AI ga savol bering (ixtiyoriy)..." className="w-full p-4 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-blue-600/20 outline-none h-32" value={prompt} onChange={e => setPrompt(e.target.value)} />
            <button onClick={handleAnalysis} disabled={loading || !file} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />} Tahlilni boshlash
            </button>
          </div>
        )}

        {(activeTool === 'image' || activeTool === 'video') && (
          <div className="space-y-6">
            <textarea placeholder={activeTool === 'image' ? "Qanday rasm yaratmoqchisiz? (masalan: Yurak anatomiyasi 3D)" : "Qanday video yaratmoqchisiz? (masalan: Qon aylanish jarayoni)"} className="w-full p-4 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-blue-600/20 outline-none h-32" value={prompt} onChange={e => setPrompt(e.target.value)} />
            <button onClick={activeTool === 'image' ? handleImageGen : handleVideoGen} disabled={loading || !prompt} className={`w-full py-4 rounded-2xl font-bold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${activeTool === 'image' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />} {activeTool === 'image' ? "Rasm yaratish" : "Video yaratish"}
            </button>
          </div>
        )}

        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
            <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-600" /> Tahlil natijasi:
            </h4>
            <div className="prose prose-slate max-w-none">
              <Markdown>{result}</Markdown>
            </div>
          </motion.div>
        )}

        {generatedMedia && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl overflow-hidden border border-slate-100 shadow-lg">
            {activeTool === 'video' ? (
              <video src={generatedMedia} controls className="w-full" />
            ) : (
              <img src={generatedMedia} alt="Generated" className="w-full" />
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
        <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
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
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 bg-card rounded-[32px] border border-border p-12">
            <div className="bg-primary/10 p-4 rounded-2xl">
              <BookOpen className="w-12 h-12 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Kutubxonaga xush kelibsiz</h3>
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
              <h2 className="text-2xl font-bold text-foreground">{selectedSubject.name}</h2>
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
                  <h4 className="font-bold text-foreground mb-1">{topic.name}</h4>
                  <p className="text-xs text-foreground/50 uppercase tracking-widest font-bold">
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
                  className="bg-card rounded-[32px] p-8 border border-border shadow-xl space-y-8"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-foreground">{selectedTopic.name}</h3>
                    <button onClick={() => setSelectedTopic(null)} className="text-foreground/40 hover:text-foreground/60">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Manuals */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-primary">
                        <BookOpen className="w-5 h-5" />
                        <h5 className="font-bold uppercase tracking-wider text-xs">Qo'llanmalar</h5>
                      </div>
                      <div className="space-y-3">
                        {selectedTopic.resources.manuals.map((item: string, i: number) => (
                          <div key={i} className="group p-4 bg-secondary rounded-2xl border border-border hover:border-primary/20 hover:bg-primary/5 transition-all">
                            <div className="flex items-start gap-3">
                              <div className="mt-1 w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                {i + 1}
                              </div>
                              <div className="flex-1 space-y-3">
                                <p className="text-sm text-foreground/80 font-medium leading-relaxed">{item}</p>
                                <button 
                                  onClick={() => handleAIExplain(item, `Mavzu: ${selectedTopic.name}\nQo'llanma: ${item}\n\nIltimos, ushbu mavzu bo'yicha qisqacha konspekt va asosiy tushunchalarni tushuntirib bering.`)}
                                  className="flex items-center gap-1.5 text-[11px] font-bold text-primary hover:text-primary/80 uppercase tracking-wider transition-colors"
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
                        <h5 className="font-bold uppercase tracking-wider text-xs">Klinik caselar</h5>
                      </div>
                      <div className="space-y-3">
                        {selectedTopic.resources.cases.map((item: string, i: number) => (
                          <div key={i} className="group p-4 bg-secondary rounded-2xl border border-border hover:border-emerald-200 hover:bg-emerald-50/30 transition-all">
                            <div className="flex items-start gap-3">
                              <div className="mt-1 w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                {i + 1}
                              </div>
                              <div className="flex-1 space-y-3">
                                <p className="text-sm text-foreground/80 font-medium leading-relaxed">{item}</p>
                                <button 
                                  onClick={() => handleAIExplain("Klinik Case Tahlili", `Mavzu: ${selectedTopic.name}\nCase: ${item}\n\nIltimos, ushbu klinik holatni tahlil qiling, taxminiy tashxis qo'ying va davolash rejasini tushuntiring.`)}
                                  className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-wider transition-colors"
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
                        <h5 className="font-bold uppercase tracking-wider text-xs">Savollar</h5>
                      </div>
                      <div className="space-y-3">
                        {selectedTopic.resources.questions.map((item: string, i: number) => (
                          <div key={i} className="group p-4 bg-secondary rounded-2xl border border-border hover:border-purple-200 hover:bg-purple-50/30 transition-all">
                            <div className="flex items-start gap-3">
                              <div className="mt-1 w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                {i + 1}
                              </div>
                              <div className="flex-1 space-y-3">
                                <p className="text-sm text-foreground/80 font-medium leading-relaxed">{item}</p>
                                <button 
                                  onClick={() => handleAIExplain(item, `Mavzu: ${selectedTopic.name}\nSavol: ${item}\n\nIltimos, ushbu savolga batafsil tibbiy javob bering va tushuntirib bering.`)}
                                  className="flex items-center gap-1.5 text-[11px] font-bold text-purple-600 hover:text-purple-700 uppercase tracking-wider transition-colors"
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
