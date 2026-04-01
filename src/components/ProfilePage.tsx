import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, onSnapshot, updateDoc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Trophy, PlayCircle, Brain, Activity, User, Mail, Star, Award, ChevronRight, Calendar, Trash2, Edit2, Save, X, MessageCircle } from 'lucide-react';
import { Modal } from '../App';

export function ProfilePage({ user }: { user: any }) {
  const [progress, setProgress] = useState<any>(null);
  const [testHistory, setTestHistory] = useState<any[]>([]);
  const [videoHistory, setVideoHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'tests' | 'videos' | 'personal'>('stats');
  
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    university: '',
    major: '',
    course: '',
    group: ''
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [winnerNotification, setWinnerNotification] = useState<{ message: string, telegram: string } | null>(null);

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, type: 'test' | 'video' | null, index: number | null }>({ isOpen: false, type: null, index: null });
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean, title: string, content: string }>({ isOpen: false, title: '', content: '' });

  useEffect(() => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      const unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProgress(data.progress_v2 || {
            quizScore: 0,
            videosWatched: 0,
            mnemonicsRead: 0,
            symptomsChecked: 0
          });
          setTestHistory(data.testHistory_v2 || []);
          setVideoHistory(data.videoHistory_v2 || []);
          setProfileData({
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            university: data.university || '',
            major: data.major || '',
            course: data.course || '',
            group: data.group || ''
          });
        }
        setLoading(false);
      }, (error) => {
        console.error("Error fetching user progress:", error);
        setLoading(false);
      });

      // Check for winner notification
      const checkWinner = async () => {
        try {
          const settingsRef = doc(db, 'settings', 'leaderboard');
          const settingsSnap = await getDoc(settingsRef);
          if (settingsSnap.exists()) {
            const settings = settingsSnap.data();
            if (settings.endDate && new Date() > new Date(settings.endDate)) {
              // Period ended, check if current user is top 1
              const q = query(collection(db, 'leaderboard'), orderBy('score', 'desc'), limit(1));
              const lbSnap = await getDocs(q);
              if (!lbSnap.empty && lbSnap.docs[0].id === user.uid) {
                setWinnerNotification({
                  message: settings.winnerMessage || "Faol bo'lganingiz uchun men bilan bog'laning!",
                  telegram: settings.telegramUsername || ""
                });
              }
            }
          }
        } catch (err) {
          console.error("Error checking winner status", err);
        }
      };
      checkWinner();

      return () => {
        unsubscribe();
      };
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, profileData);
      setIsEditingProfile(false);
      setAlertModal({ isOpen: true, title: "Muvaffaqiyat", content: "Profil ma'lumotlari saqlandi!" });
    } catch (error) {
      console.error("Error updating profile:", error);
      setAlertModal({ isOpen: true, title: "Xatolik", content: "Xatolik yuz berdi. Iltimos qaytadan urinib ko'ring." });
    }
  };

  const confirmDelete = (type: 'test' | 'video', index: number) => {
    setDeleteModal({ isOpen: true, type, index });
  };

  const handleDeleteHistory = async () => {
    if (!user || deleteModal.type === null || deleteModal.index === null) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      if (deleteModal.type === 'test') {
        const newHistory = [...testHistory];
        newHistory.splice(deleteModal.index, 1);
        await updateDoc(userRef, { testHistory_v2: newHistory });
      } else {
        const newHistory = [...videoHistory];
        newHistory.splice(deleteModal.index, 1);
        await updateDoc(userRef, { videoHistory_v2: newHistory });
      }
    } catch (error) {
      console.error("Error deleting history:", error);
      setAlertModal({ isOpen: true, title: "Xatolik", content: "Xatolik yuz berdi. Iltimos qaytadan urinib ko'ring." });
    } finally {
      setDeleteModal({ isOpen: false, type: null, index: null });
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <User className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Profilga kiring</h2>
        <p className="text-muted-foreground">O'z natijalaringizni ko'rish uchun tizimga kiring.</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('uz-UZ', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Profile Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-3xl p-8 border border-border shadow-sm flex flex-col md:flex-row items-center gap-6"
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt={user.displayName} className="w-24 h-24 rounded-full border-4 border-primary/20 object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-24 h-24 rounded-full bg-primary/10 text-primary flex items-center justify-center text-3xl font-bold">
            {user.displayName?.charAt(0) || 'U'}
          </div>
        )}
        <div className="text-center md:text-left flex-1">
          <h1 className="text-3xl font-bold text-foreground mb-2">{user.displayName}</h1>
          <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground">
            <Mail className="w-4 h-4" />
            <span>{user.email}</span>
          </div>
        </div>
        <div className="bg-primary/10 px-6 py-4 rounded-2xl flex flex-col items-center">
          <Award className="w-8 h-8 text-primary mb-1" />
          <span className="text-sm font-medium text-primary">Faol Talaba</span>
        </div>
      </motion.div>

      {winnerNotification && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-3xl p-6 md:p-8 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Trophy className="w-32 h-32 text-yellow-500" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            <div className="bg-yellow-500/20 p-4 rounded-full shrink-0">
              <Trophy className="w-10 h-10 text-yellow-600" />
            </div>
            <div className="text-center md:text-left flex-1">
              <h3 className="text-2xl font-bold text-yellow-600 mb-2">Tabriklaymiz, Siz G'olibsiz!</h3>
              <p className="text-foreground/80 font-medium">{winnerNotification.message}</p>
            </div>
            {winnerNotification.telegram && (
              <a 
                href={`https://t.me/${winnerNotification.telegram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 flex items-center gap-2 bg-[#0088cc] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#0077b3] transition-colors shadow-lg shadow-[#0088cc]/20"
              >
                <MessageCircle className="w-5 h-5" />
                Bog'lanish
              </a>
            )}
          </div>
        </motion.div>
      )}

      {/* Progress Stats */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Star className="w-6 h-6 text-accent" />
            Mening Natijalarim
          </h2>
          <div className="flex flex-wrap gap-2 bg-secondary/50 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('stats')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'stats' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Umumiy
            </button>
            <button 
              onClick={() => setActiveTab('tests')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'tests' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Testlar tarixi
            </button>
            <button 
              onClick={() => setActiveTab('videos')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'videos' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Videolar tarixi
            </button>
            <button 
              onClick={() => setActiveTab('personal')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'personal' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Shaxsiy ma'lumotlar
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-card rounded-2xl p-6 border border-border h-32 animate-pulse"></div>
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'stats' && (
              <motion.div 
                key="stats"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
              >
                <StatCard 
                  icon={<Trophy className="w-6 h-6 text-yellow-500" />}
                  title="Testlar"
                  value={progress?.quizScore || 0}
                  subtitle="To'g'ri javoblar"
                  color="bg-yellow-500/10"
                  onClick={() => setActiveTab('tests')}
                />
                <StatCard 
                  icon={<PlayCircle className="w-6 h-6 text-blue-500" />}
                  title="Videolar"
                  value={progress?.videosWatched || 0}
                  subtitle="Ko'rilgan videolar"
                  color="bg-blue-500/10"
                  onClick={() => setActiveTab('videos')}
                />
                <StatCard 
                  icon={<Brain className="w-6 h-6 text-purple-500" />}
                  title="Mnemonikalar"
                  value={progress?.mnemonicsRead || 0}
                  subtitle="O'rganilgan"
                  color="bg-purple-500/10"
                />
                <StatCard 
                  icon={<Activity className="w-6 h-6 text-green-500" />}
                  title="Simptomlar"
                  value={progress?.symptomsChecked || 0}
                  subtitle="Tekshirilgan"
                  color="bg-green-500/10"
                />
              </motion.div>
            )}

            {activeTab === 'tests' && (
              <motion.div 
                key="tests"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-card border border-border rounded-2xl overflow-hidden"
              >
                {testHistory.length > 0 ? (
                  <div className="divide-y divide-border/50">
                    {testHistory.map((test, idx) => (
                      <div key={idx} className="p-4 sm:p-6 hover:bg-secondary/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="bg-yellow-500/10 p-3 rounded-xl shrink-0">
                            <Trophy className="w-6 h-6 text-yellow-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground text-lg">{test.topic}</h4>
                            <p className="text-muted-foreground text-sm">{test.subject}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                              <Calendar className="w-3 h-3" />
                              {formatDate(test.date)}
                            </div>
                          </div>
                        </div>
                        <div className="bg-secondary px-4 py-2 rounded-xl border border-border/50 text-center shrink-0 flex flex-col items-center justify-center gap-2">
                          <div>
                            <div className="text-2xl font-bold text-foreground">{test.score} <span className="text-sm text-muted-foreground font-medium">/ {test.total}</span></div>
                            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">To'g'ri javob</div>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); confirmDelete('test', idx); }}
                            className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="O'chirish"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center text-muted-foreground">
                    <Trophy className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>Hali hech qanday test ishlanmagan.</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'videos' && (
              <motion.div 
                key="videos"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-card border border-border rounded-2xl overflow-hidden"
              >
                {videoHistory.length > 0 ? (
                  <div className="divide-y divide-border/50">
                    {videoHistory.map((video, idx) => (
                      <div key={idx} className="p-4 sm:p-6 hover:bg-secondary/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="bg-blue-500/10 p-3 rounded-xl shrink-0">
                            <PlayCircle className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground text-lg">{video.title}</h4>
                            <p className="text-muted-foreground text-sm">{video.category}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                              <Calendar className="w-3 h-3" />
                              {formatDate(video.date)}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0 self-start sm:self-auto">
                          <div className="bg-emerald-500/10 text-emerald-600 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider">
                            Ko'rilgan
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); confirmDelete('video', idx); }}
                            className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="O'chirish"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center text-muted-foreground">
                    <PlayCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>Hali hech qanday video ko'rilmagan.</p>
                  </div>
                )}
              </motion.div>
            )}
            {activeTab === 'personal' && (
              <motion.div 
                key="personal"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-card border border-border rounded-2xl p-6 sm:p-8 overflow-hidden"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-foreground">Shaxsiy ma'lumotlar</h3>
                  {!isEditingProfile ? (
                    <button 
                      onClick={() => setIsEditingProfile(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl font-medium hover:bg-primary/20 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      Tahrirlash
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setIsEditingProfile(false)}
                        className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-xl font-medium hover:bg-secondary/80 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Bekor qilish
                      </button>
                      <button 
                        onClick={handleSaveProfile}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        Saqlash
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Ism</label>
                    <input 
                      type="text" 
                      value={profileData.firstName}
                      onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                      disabled={!isEditingProfile}
                      placeholder="Ismingizni kiriting"
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary disabled:opacity-70 disabled:bg-secondary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Familiya</label>
                    <input 
                      type="text" 
                      value={profileData.lastName}
                      onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                      disabled={!isEditingProfile}
                      placeholder="Familiyangizni kiriting"
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary disabled:opacity-70 disabled:bg-secondary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Universitet</label>
                    <input 
                      type="text" 
                      value={profileData.university}
                      onChange={(e) => setProfileData({...profileData, university: e.target.value})}
                      disabled={!isEditingProfile}
                      placeholder="Masalan: TMA, SamDTI..."
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary disabled:opacity-70 disabled:bg-secondary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Yo'nalish</label>
                    <input 
                      type="text" 
                      value={profileData.major}
                      onChange={(e) => setProfileData({...profileData, major: e.target.value})}
                      disabled={!isEditingProfile}
                      placeholder="Masalan: Davolash ishi"
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary disabled:opacity-70 disabled:bg-secondary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Kurs</label>
                    <input 
                      type="text" 
                      value={profileData.course}
                      onChange={(e) => setProfileData({...profileData, course: e.target.value})}
                      disabled={!isEditingProfile}
                      placeholder="Masalan: 3-kurs"
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary disabled:opacity-70 disabled:bg-secondary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Guruh</label>
                    <input 
                      type="text" 
                      value={profileData.group}
                      onChange={(e) => setProfileData({...profileData, group: e.target.value})}
                      disabled={!isEditingProfile}
                      placeholder="Masalan: 301-guruh"
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary disabled:opacity-70 disabled:bg-secondary/50"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      <Modal
        isOpen={deleteModal.isOpen}
        title="Natijani o'chirish"
        content="Ushbu natijani o'chirib tashlashni xohlaysizmi? Bu amalni ortga qaytarib bo'lmaydi."
        onClose={() => setDeleteModal({ isOpen: false, type: null, index: null })}
        onConfirm={handleDeleteHistory}
        confirmText="O'chirish"
      />

      <Modal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        content={alertModal.content}
        onClose={() => setAlertModal({ isOpen: false, title: '', content: '' })}
      />
    </div>
  );
}

function StatCard({ icon, title, value, subtitle, color, onClick }: { icon: React.ReactNode, title: string, value: number, subtitle: string, color: string, onClick?: () => void }) {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      onClick={onClick}
      className={`bg-card rounded-2xl p-6 border border-border shadow-sm flex flex-col ${onClick ? 'cursor-pointer hover:border-primary/30 hover:shadow-md transition-all' : ''}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${color}`}>
            {icon}
          </div>
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>
        {onClick && <ChevronRight className="w-4 h-4 text-muted-foreground opacity-50" />}
      </div>
      <div className="mt-auto">
        <div className="text-3xl font-bold text-foreground mb-1">{value}</div>
        <div className="text-sm text-muted-foreground">{subtitle}</div>
      </div>
    </motion.div>
  );
}
