import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Play, Clock, Trophy, ArrowLeft, CheckCircle2, XCircle, LogIn, Plus, Percent, Smile, Phone, BarChart2, X } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, getDocs, writeBatch, setDoc } from 'firebase/firestore';

export function BattlePage({ user, showAlert, showConfirm, fanlar }: { user: any, showAlert: (title: string, content: string) => void, showConfirm: (title: string, content: string, onConfirm: () => void) => void, fanlar: any[] }) {
  const [view, setView] = useState<'menu' | 'host_setup' | 'host_waiting' | 'host_active' | 'participant_join' | 'participant_waiting' | 'participant_active' | 'participant_completed'>('menu');
  
  // Host States
  const [tests, setTests] = useState<any[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [hostPermission, setHostPermission] = useState<any>(null);
  const [isRequestingHost, setIsRequestingHost] = useState(false);

  // Participant States
  const [roomCode, setRoomCode] = useState('');
  const [groupName, setGroupName] = useState('');
  const [participantId, setParticipantId] = useState<string>('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Lifeline States
  const [usedLifelines, setUsedLifelines] = useState({
    fiftyFifty: false,
    nasriddin: false,
    phoneFriend: false,
    audience: false
  });
  const [hiddenOptions, setHiddenOptions] = useState<string[]>([]);
  const [activeLifelineModal, setActiveLifelineModal] = useState<'nasriddin' | 'phone' | 'audience' | null>(null);
  const [lifelineData, setLifelineData] = useState<any>(null);

  // Reset hidden options when question changes
  useEffect(() => {
    setHiddenOptions([]);
  }, [currentQuestionIndex]);

  // Fetch host permission
  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = onSnapshot(doc(db, 'host_permissions', user.uid), (docSnap) => {
        if (docSnap.exists()) {
          setHostPermission({ id: docSnap.id, ...docSnap.data() });
        } else {
          setHostPermission(null);
        }
      }, (error) => {
        console.error("Error fetching host permission:", error);
      });
      return () => unsubscribe();
    }
  }, [user]);

  // Fetch published tests for host
  useEffect(() => {
    if (view === 'host_setup' && hostPermission?.status === 'approved') {
      const q = query(
        collection(db, 'battle_tests'), 
        where('isPublished', '==', true),
        where('subjectId', '==', hostPermission.subjectId)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setTests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        console.error("Error fetching battle tests:", error);
      });
      return () => unsubscribe();
    }
  }, [view, hostPermission]);

  const handleRequestHost = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await setDoc(doc(db, 'host_permissions', user.uid), {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        subjectId: formData.get('subjectId'),
        status: 'pending',
        requestedAt: Date.now(),
        updatedAt: Date.now()
      });
      showAlert("Muvaffaqiyatli", "So'rov yuborildi. Admin tasdiqlashini kuting.");
    } catch (error: any) {
      showAlert("Xatolik", error.message);
    }
  };

  // Listen to current session and participants
  useEffect(() => {
    if (!currentSession?.id) return;
    
    const sessionUnsub = onSnapshot(doc(db, 'battle_sessions', currentSession.id), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setCurrentSession({ id: doc.id, ...data });
        
        // Handle participant view transitions based on session status
        if (view === 'participant_waiting' && data.status === 'active') {
          setView('participant_active');
        } else if (view === 'participant_active' && data.status === 'completed') {
          handleFinishTest(true); // Auto finish if host ends
        }
      } else {
        // Session deleted
        if (view.startsWith('participant')) {
          showAlert("Xatolik", "Sessiya o'chirildi.");
          setView('menu');
        }
      }
    }, (error) => {
      console.error("Error fetching battle session:", error);
    });

    const participantsQ = query(collection(db, 'battle_participants'), where('sessionId', '==', currentSession.id));
    const participantsUnsub = onSnapshot(participantsQ, (snapshot) => {
      setParticipants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)).sort((a: any, b: any) => (b.totalScore || 0) - (a.totalScore || 0)));
    }, (error) => {
      console.error("Error fetching battle participants:", error);
    });

    return () => {
      sessionUnsub();
      participantsUnsub();
    };
  }, [currentSession?.id, view]);

  // Fetch questions when participant becomes active
  useEffect(() => {
    if (view === 'participant_active' && currentSession?.testId && questions.length === 0) {
      const q = query(collection(db, 'battle_questions'), where('testId', '==', currentSession.testId));
      getDocs(q).then(snapshot => {
        setQuestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => a.orderIndex - b.orderIndex));
      }).catch(err => {
        console.error("Error fetching questions:", err);
        showAlert("Xatolik", "Savollarni yuklashda xatolik yuz berdi.");
      });
    }
  }, [view, currentSession?.testId, questions.length]);

  // Timer logic for participant
  useEffect(() => {
    if (view === 'participant_active' && currentSession?.startTime && currentSession?.duration) {
      const durationMs = currentSession.duration * 60 * 1000;
      const startTimeMs = currentSession.startTime.toMillis ? currentSession.startTime.toMillis() : Date.now();
      const endTimeMs = startTimeMs + durationMs;

      const interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((endTimeMs - now) / 1000));
        setTimeLeft(remaining);

        if (remaining === 0) {
          clearInterval(interval);
          handleFinishTest(true);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [view, currentSession?.startTime, currentSession?.duration]);

  const generateRoomCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleCreateSession = async () => {
    if (!selectedTestId) {
      showAlert("Xatolik", "Iltimos, testni tanlang.");
      return;
    }
    
    const selectedTest = tests.find(t => t.id === selectedTestId);
    if (!selectedTest) return;

    try {
      const code = generateRoomCode();
      const sessionRef = await addDoc(collection(db, 'battle_sessions'), {
        hostId: user.uid,
        testId: selectedTestId,
        roomCode: code,
        status: 'waiting',
        duration: selectedTest.timeLimit,
        createdAt: serverTimestamp(),
        testTitle: selectedTest.title
      });
      
      setCurrentSession({ id: sessionRef.id, roomCode: code, status: 'waiting', testTitle: selectedTest.title, duration: selectedTest.timeLimit });
      setView('host_waiting');
    } catch (error: any) {
      showAlert("Xatolik", "Sessiya yaratishda xatolik: " + error.message);
    }
  };

  const handleStartBattle = async () => {
    if (!currentSession) return;
    try {
      await updateDoc(doc(db, 'battle_sessions', currentSession.id), {
        status: 'active',
        startTime: serverTimestamp()
      });
      setView('host_active');
    } catch (error: any) {
      showAlert("Xatolik", "Boshlashda xatolik: " + error.message);
    }
  };

  const handleEndBattle = async () => {
    if (!currentSession) return;
    showConfirm("Yakunlash", "Rostdan ham bellashuvni yakunlamoqchimisiz?", async () => {
      try {
        await updateDoc(doc(db, 'battle_sessions', currentSession.id), {
          status: 'completed',
          endTime: serverTimestamp()
        });
        setView('menu');
        setCurrentSession(null);
        showAlert("Muvaffaqiyatli", "Bellashuv yakunlandi.");
      } catch (error: any) {
        showAlert("Xatolik", "Yakunlashda xatolik: " + error.message);
      }
    });
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode || !groupName) return;

    try {
      const q = query(collection(db, 'battle_sessions'), where('roomCode', '==', roomCode), where('status', '==', 'waiting'));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        showAlert("Xatolik", "Xona topilmadi yoki bellashuv allaqachon boshlangan.");
        return;
      }

      const sessionDoc = snapshot.docs[0];
      const sessionData = sessionDoc.data();

      // Check if group name already exists
      const participantsQ = query(collection(db, 'battle_participants'), where('sessionId', '==', sessionDoc.id), where('groupName', '==', groupName));
      const participantsSnapshot = await getDocs(participantsQ);
      if (!participantsSnapshot.empty) {
        showAlert("Xatolik", "Bu guruh nomi allaqachon band. Iltimos, boshqa nom tanlang.");
        return;
      }

      const participantRef = await addDoc(collection(db, 'battle_participants'), {
        sessionId: sessionDoc.id,
        userId: user.uid,
        groupName: groupName,
        totalScore: 0
      });

      setCurrentSession({ id: sessionDoc.id, ...sessionData });
      setParticipantId(participantRef.id);
      setView('participant_waiting');
    } catch (error: any) {
      showAlert("Xatolik", "Xonaga qo'shilishda xatolik: " + error.message);
    }
  };

  const handle5050 = () => {
    if (usedLifelines.fiftyFifty) return;
    const currentQ = questions[currentQuestionIndex];
    if (!currentQ.options || currentQ.options.length < 4) return;
    
    const correct = currentQ.correctAnswer;
    const incorrects = currentQ.options.filter((opt: string) => opt !== correct);
    // Pick 2 random incorrects to hide
    const shuffled = [...incorrects].sort(() => 0.5 - Math.random());
    const toHide = shuffled.slice(0, 2);
    
    setHiddenOptions(toHide);
    setUsedLifelines(prev => ({ ...prev, fiftyFifty: true }));
  };

  const handleNasriddin = () => {
    if (usedLifelines.nasriddin) return;
    const currentQ = questions[currentQuestionIndex];
    const correct = currentQ.correctAnswer;
    
    const jokes = [
      `Xo'ja Nasriddin eshagini teskari minib keldi va dedi: "Odamlar, bu savolning javobi aniq '${correct}', agar ishonmasangiz eshagimdan so'rang!"`,
      `Xo'ja Nasriddin bozorda aylanib yurib shunday dedi: "Kimki '${correct}' deb javob bersa, unga bir xumcha tilla... yo'q, bir kosa qatiq beraman!"`,
      `"Ey barakalla!" dedi Xo'ja Nasriddin sallasini to'g'rilab, "Buning javobi '${correct}' bo'lmasa, men Xo'ja emasman!"`
    ];
    const joke = jokes[Math.floor(Math.random() * jokes.length)];
    
    setLifelineData(joke);
    setActiveLifelineModal('nasriddin');
    setUsedLifelines(prev => ({ ...prev, nasriddin: true }));
  };

  const handlePhoneFriend = () => {
    if (usedLifelines.phoneFriend) return;
    const currentQ = questions[currentQuestionIndex];
    if (!currentQ.options) return;
    
    const correct = currentQ.correctAnswer;
    const stats = currentQ.options.map((opt: string) => {
      if (opt === correct) return { option: opt, percent: Math.floor(Math.random() * 20) + 60 }; // 60-80%
      return { option: opt, percent: Math.floor(Math.random() * 15) };
    });
    
    // Normalize to 100%
    const total = stats.reduce((sum: number, item: any) => sum + item.percent, 0);
    stats.forEach((item: any) => item.percent = Math.round((item.percent / total) * 100));
    
    setLifelineData(stats.sort((a: any, b: any) => b.percent - a.percent));
    setActiveLifelineModal('phone');
    setUsedLifelines(prev => ({ ...prev, phoneFriend: true }));
  };

  const handleAudience = () => {
    if (usedLifelines.audience) return;
    const currentQ = questions[currentQuestionIndex];
    if (!currentQ.options) return;
    
    const correct = currentQ.correctAnswer;
    const stats = currentQ.options.map((opt: string) => {
      if (opt === correct) return { option: opt, percent: Math.floor(Math.random() * 30) + 40 }; // 40-70%
      return { option: opt, percent: Math.floor(Math.random() * 20) };
    });
    
    // Normalize to 100%
    const total = stats.reduce((sum: number, item: any) => sum + item.percent, 0);
    stats.forEach((item: any) => item.percent = Math.round((item.percent / total) * 100));
    
    setLifelineData(stats.sort((a: any, b: any) => b.percent - a.percent));
    setActiveLifelineModal('audience');
    setUsedLifelines(prev => ({ ...prev, audience: true }));
  };

  const handleSelectOption = (questionId: string, option: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  // Real-time score update
  useEffect(() => {
    if (!participantId || !currentSession || view !== 'participant_active') return;
    
    const timeoutId = setTimeout(async () => {
      let currentScore = 0;
      questions.forEach(q => {
        if (answers[q.id] === q.correctAnswer) {
          currentScore += (q.points || 10);
        }
      });

      try {
        await updateDoc(doc(db, 'battle_participants', participantId), {
          totalScore: currentScore
        });
      } catch (e) {
        console.error("Error updating real-time score", e);
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeoutId);
  }, [answers, participantId, currentSession, view, questions]);

  const handleFinishTest = async (autoFinish = false) => {
    const submitTest = async () => {
      if (isSubmitting) return;
      setIsSubmitting(true);

      try {
        let score = 0;
        const batch = writeBatch(db);

        questions.forEach(q => {
          const selected = answers[q.id];
          const isCorrect = selected === q.correctAnswer;
          if (isCorrect) score += (q.points || 10);

          if (selected) {
            const answerRef = doc(collection(db, 'battle_answers'));
            batch.set(answerRef, {
              sessionId: currentSession.id,
              participantId: participantId,
              userId: user.uid,
              questionId: q.id,
              selectedOption: selected,
              isCorrect: isCorrect,
              answeredAt: Date.now()
            });
          }
        });

        const participantRef = doc(db, 'battle_participants', participantId);
        batch.update(participantRef, {
          totalScore: score,
          completedAt: Date.now()
        });

        await batch.commit();
        setView('participant_completed');
      } catch (error: any) {
        console.error("Error submitting test:", error);
        showAlert("Xatolik", "Natijalarni saqlashda xatolik yuz berdi.");
      } finally {
        setIsSubmitting(false);
      }
    };

    if (!autoFinish) {
      showConfirm("Yakunlash", "Testni yakunlamoqchimisiz?", submitTest);
    } else {
      submitTest();
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto p-4 md:p-6"
    >
      {view === 'menu' && (
        <div className="bg-card rounded-3xl p-8 text-center shadow-sm border border-border">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-4">Zakovat Bellashuvi</h2>
          <p className="text-foreground/60 max-w-lg mx-auto mb-10">
            Jamoaviy test bellashuvlari! O'qituvchi sifatida xona yarating yoki ishtirokchi sifatida xonaga qo'shiling.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <button
              onClick={() => setView('host_setup')}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 p-8 border border-primary/20 hover:border-primary/50 transition-all text-left"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
              <Plus className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-2">Bellashuv yaratish</h3>
              <p className="text-sm text-foreground/60">O'qituvchilar uchun: Yangi xona yarating va testni boshqaring.</p>
            </button>

            <button
              onClick={() => setView('participant_join')}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-secondary to-secondary/50 p-8 border border-border hover:border-primary/30 transition-all text-left"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-foreground/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
              <LogIn className="w-8 h-8 text-foreground/70 mb-4 group-hover:text-primary transition-colors" />
              <h3 className="text-xl font-bold text-foreground mb-2">Xonaga qo'shilish</h3>
              <p className="text-sm text-foreground/60">Ishtirokchilar uchun: Kod orqali xonaga kiring va testni ishlang.</p>
            </button>
          </div>
        </div>
      )}

      {view === 'host_setup' && (
        <div className="bg-card rounded-3xl p-6 md:p-8 border border-border shadow-sm">
          <button onClick={() => setView('menu')} className="flex items-center gap-2 text-foreground/60 hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Orqaga
          </button>
          
          {hostPermission?.status === 'approved' ? (
            <>
              <h2 className="text-2xl font-bold text-foreground mb-6">Yangi bellashuv yaratish</h2>
              
              <div className="space-y-6 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Testni tanlang</label>
                  {tests.length === 0 ? (
                    <div className="p-4 bg-yellow-500/10 text-yellow-600 rounded-xl border border-yellow-500/20 text-sm">
                      Sizning yo'nalishingiz bo'yicha faol testlar topilmadi.
                    </div>
                  ) : (
                    <select 
                      value={selectedTestId} 
                      onChange={(e) => setSelectedTestId(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl p-3.5 text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    >
                      <option value="" className="bg-card text-foreground">-- Testni tanlang --</option>
                      {tests.map(t => (
                        <option key={t.id} value={t.id} className="bg-card text-foreground">{t.title} ({t.timeLimit} daq)</option>
                      ))}
                    </select>
                  )}
                </div>
                
                <button 
                  onClick={handleCreateSession}
                  disabled={!selectedTestId}
                  className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" /> Xona yaratish
                </button>
              </div>
            </>
          ) : hostPermission?.status === 'pending' ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-yellow-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-4">So'rov yuborilgan</h2>
              <p className="text-foreground/60 max-w-md mx-auto">
                Sizning so'rovingiz admin tomonidan ko'rib chiqilmoqda. Tasdiqlangandan so'ng bellashuv yarata olasiz.
              </p>
            </div>
          ) : hostPermission?.status === 'revoked' ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-4">Ruxsat bekor qilingan</h2>
              <p className="text-foreground/60 max-w-md mx-auto">
                Sizning bellashuv yaratish huquqingiz admin tomonidan bekor qilingan.
              </p>
            </div>
          ) : (
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl font-bold text-foreground mb-2 text-center">O'qituvchi sifatida ro'yxatdan o'tish</h2>
              <p className="text-foreground/60 mb-6 text-center">Bellashuv yaratish uchun avval o'zingiz haqingizda ma'lumot qoldiring.</p>
              
              <form onSubmit={handleRequestHost} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Ism</label>
                  <input type="text" name="firstName" required className="w-full bg-background border border-border rounded-xl p-3 text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Familiya</label>
                  <input type="text" name="lastName" required className="w-full bg-background border border-border rounded-xl p-3 text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Yo'nalish (Fan)</label>
                  <select name="subjectId" required className="w-full bg-background border border-border rounded-xl p-3 text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                    <option value="" className="bg-card text-foreground">-- Tanlang --</option>
                    {fanlar.map(f => (
                      <option key={f.id} value={f.id} className="bg-card text-foreground">{f.title || f.name}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="w-full py-3.5 mt-4 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors">
                  So'rov yuborish
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {view === 'host_waiting' && currentSession && (
        <div className="bg-card rounded-3xl p-6 md:p-8 border border-border shadow-sm text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">{currentSession.testTitle}</h2>
          <p className="text-foreground/60 mb-8">Ishtirokchilar qo'shilishini kuting...</p>
          
          <div className="inline-block bg-secondary/50 p-6 rounded-3xl border border-border mb-8">
            <p className="text-sm font-medium text-foreground/60 uppercase tracking-widest mb-2">Xona kodi</p>
            <div className="text-5xl md:text-7xl font-black tracking-[0.2em] text-primary">
              {currentSession.roomCode}
            </div>
          </div>
          
          <div className="max-w-2xl mx-auto mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">Ishtirokchilar ({participants.length})</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {participants.map(p => (
                <div key={p.id} className="bg-background border border-border rounded-xl p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {p.groupName.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-foreground truncate">{p.groupName}</span>
                </div>
              ))}
              {participants.length === 0 && (
                <div className="col-span-full py-8 text-foreground/40 border border-dashed border-border rounded-xl">
                  Hali hech kim qo'shilmadi
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-center gap-4">
            <button onClick={() => {
              showConfirm("Yopish", "Xonani yopmoqchimisiz?", () => {
                updateDoc(doc(db, 'battle_sessions', currentSession.id), { status: 'completed' });
                setView('menu');
              });
            }} className="px-6 py-3 bg-secondary text-foreground rounded-xl font-medium hover:bg-secondary/80 transition-colors">
              Bekor qilish
            </button>
            <button 
              onClick={handleStartBattle}
              disabled={participants.length === 0}
              className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Play className="w-5 h-5" /> Boshlash
            </button>
          </div>
        </div>
      )}

      {view === 'host_active' && currentSession && (
        <div className="space-y-6">
          <div className="bg-card rounded-3xl p-6 border border-border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">{currentSession.testTitle}</h2>
              <div className="flex items-center gap-2 text-foreground/60 mt-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Bellashuv davom etmoqda
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-xl font-medium text-foreground">
                <Clock className="w-5 h-5 text-primary" />
                {currentSession.duration} daqiqa
              </div>
              <button onClick={handleEndBattle} className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl font-medium transition-colors">
                Yakunlash
              </button>
            </div>
          </div>

          <div className="bg-card rounded-3xl p-6 border border-border shadow-sm">
            <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" /> Jonli Reyting
            </h3>
            <div className="space-y-3">
              {participants.map((p, index) => (
                <div key={p.id} className="flex items-center justify-between p-4 bg-background rounded-2xl border border-border">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-yellow-500/20 text-yellow-600' : index === 1 ? 'bg-gray-300/50 text-gray-600' : index === 2 ? 'bg-amber-700/20 text-amber-700' : 'bg-secondary text-foreground/60'}`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-bold text-foreground">{p.groupName}</div>
                      <div className="text-xs text-foreground/60">{p.completedAt ? 'Yakunladi' : 'Jarayonda'}</div>
                    </div>
                  </div>
                  <div className="text-xl font-black text-primary">
                    {p.totalScore} <span className="text-sm font-medium text-foreground/40">ball</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === 'participant_join' && (
        <div className="bg-card rounded-3xl p-6 md:p-8 border border-border shadow-sm max-w-md mx-auto">
          <button onClick={() => setView('menu')} className="flex items-center gap-2 text-foreground/60 hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Orqaga
          </button>
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Xonaga qo'shilish</h2>
          
          <form onSubmit={handleJoinRoom} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Xona kodi</label>
              <input 
                type="text" 
                maxLength={6}
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="123456"
                required 
                className="w-full bg-background border border-border rounded-xl p-3.5 text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all text-center text-2xl tracking-widest font-bold uppercase" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Guruh nomi</label>
              <input 
                type="text" 
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Guruh nomini kiriting"
                required 
                className="w-full bg-background border border-border rounded-xl p-3.5 text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
              />
            </div>
            <button 
              type="submit"
              disabled={roomCode.length < 6 || !groupName}
              className="w-full py-3.5 mt-4 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <LogIn className="w-5 h-5" /> Qo'shilish
            </button>
          </form>
        </div>
      )}

      {view === 'participant_waiting' && currentSession && (
        <div className="bg-card rounded-3xl p-8 text-center shadow-sm border border-border max-w-md mx-auto">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-primary animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Kutish xonasi</h2>
          <p className="text-foreground/60 mb-8">
            Siz <strong>{currentSession.testTitle}</strong> bellashuviga muvaffaqiyatli qo'shildingiz. O'qituvchi testni boshlashini kuting...
          </p>
          <div className="p-4 bg-secondary/50 rounded-xl border border-border">
            <p className="text-sm text-foreground/60 mb-1">Sizning guruhingiz:</p>
            <p className="font-bold text-lg text-foreground">{groupName}</p>
          </div>
        </div>
      )}

      {view === 'participant_active' && currentSession && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 relative">
          <div className="xl:col-span-3 space-y-6">
            {/* Lifelines Bar */}
            <div className="flex flex-wrap justify-center gap-4 mb-6">
            <button 
              onClick={handle5050}
              disabled={usedLifelines.fiftyFifty || !questions[currentQuestionIndex]?.options || questions[currentQuestionIndex]?.options.length < 4}
              className={`relative flex items-center justify-center w-16 h-12 rounded-full border-2 font-bold transition-all ${usedLifelines.fiftyFifty ? 'border-border bg-secondary/50 text-foreground/30 cursor-not-allowed' : 'border-amber-500 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 hover:shadow-[0_0_15px_rgba(245,158,11,0.4)]'}`}
              title="50/50"
            >
              <Percent className="w-5 h-5" />
              {usedLifelines.fiftyFifty && <div className="absolute inset-0 flex items-center justify-center"><X className="w-8 h-8 text-red-500/70" /></div>}
            </button>
            <button 
              onClick={handleNasriddin}
              disabled={usedLifelines.nasriddin}
              className={`relative flex items-center justify-center w-16 h-12 rounded-full border-2 font-bold transition-all ${usedLifelines.nasriddin ? 'border-border bg-secondary/50 text-foreground/30 cursor-not-allowed' : 'border-emerald-500 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]'}`}
              title="Xo'ja Nasriddin"
            >
              <Smile className="w-6 h-6" />
              {usedLifelines.nasriddin && <div className="absolute inset-0 flex items-center justify-center"><X className="w-8 h-8 text-red-500/70" /></div>}
            </button>
            <button 
              onClick={handlePhoneFriend}
              disabled={usedLifelines.phoneFriend || !questions[currentQuestionIndex]?.options}
              className={`relative flex items-center justify-center w-16 h-12 rounded-full border-2 font-bold transition-all ${usedLifelines.phoneFriend ? 'border-border bg-secondary/50 text-foreground/30 cursor-not-allowed' : 'border-blue-500 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 hover:shadow-[0_0_15px_rgba(59,130,246,0.4)]'}`}
              title="Do'stimga qo'ng'iroq"
            >
              <Phone className="w-5 h-5" />
              {usedLifelines.phoneFriend && <div className="absolute inset-0 flex items-center justify-center"><X className="w-8 h-8 text-red-500/70" /></div>}
            </button>
            <button 
              onClick={handleAudience}
              disabled={usedLifelines.audience || !questions[currentQuestionIndex]?.options}
              className={`relative flex items-center justify-center w-16 h-12 rounded-full border-2 font-bold transition-all ${usedLifelines.audience ? 'border-border bg-secondary/50 text-foreground/30 cursor-not-allowed' : 'border-purple-500 bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]'}`}
              title="Zaldan yordam"
            >
              <Users className="w-5 h-5" />
              {usedLifelines.audience && <div className="absolute inset-0 flex items-center justify-center"><X className="w-8 h-8 text-red-500/70" /></div>}
            </button>
          </div>

          <div className="bg-slate-900 rounded-[2rem] p-4 md:p-6 border-2 border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.15)] flex justify-between items-center sticky top-4 z-10">
            <div>
              <div className="text-sm text-indigo-200/60">Guruh: <span className="font-bold text-indigo-100">{groupName}</span></div>
              <div className="font-bold text-indigo-400">Savol: {currentQuestionIndex + 1} / {questions.length}</div>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold border ${timeLeft !== null && timeLeft < 60 ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-indigo-950 text-indigo-200 border-indigo-500/30'}`}>
              <Clock className="w-5 h-5" />
              {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
            </div>
          </div>

          {questions.length > 0 && currentQuestionIndex < questions.length ? (
            <div className="bg-slate-900 rounded-[2rem] p-6 md:p-8 border-2 border-indigo-500/30 shadow-[0_0_40px_rgba(99,102,241,0.1)] relative overflow-hidden">
              {/* Background glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-indigo-500/5 blur-[100px] pointer-events-none rounded-full"></div>
              
              <div className="relative z-10">
                <div className="bg-indigo-950/50 border border-indigo-500/30 rounded-3xl p-6 md:p-10 mb-8 text-center shadow-[inset_0_0_20px_rgba(99,102,241,0.1)]">
                  <h3 className="text-xl md:text-3xl font-bold text-white leading-relaxed">
                    {questions[currentQuestionIndex].text}
                  </h3>
                </div>
                
                {questions[currentQuestionIndex].imageUrl && (
                  <div className="mb-8 flex justify-center">
                    <img src={questions[currentQuestionIndex].imageUrl} alt="Question" className="max-h-64 md:max-h-96 rounded-2xl border-2 border-indigo-500/30 object-contain bg-black/50 shadow-[0_0_20px_rgba(0,0,0,0.5)]" />
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {questions[currentQuestionIndex].options?.map((opt: string, i: number) => {
                    const isHidden = hiddenOptions.includes(opt);
                    const isSelected = answers[questions[currentQuestionIndex].id] === opt;
                    const letters = ['A', 'B', 'C', 'D'];
                    
                    if (isHidden) {
                      return <div key={i} className="w-full p-4 rounded-2xl border-2 border-transparent opacity-0"></div>;
                    }
                    
                    return (
                      <button
                        key={i}
                        onClick={() => handleSelectOption(questions[currentQuestionIndex].id, opt)}
                        className={`group w-full text-left p-4 md:p-5 rounded-2xl border-2 transition-all relative overflow-hidden ${isSelected ? 'border-amber-400 bg-amber-500/20 shadow-[0_0_20px_rgba(251,191,36,0.3)]' : 'border-indigo-500/40 hover:border-indigo-400 bg-indigo-950/40 hover:bg-indigo-900/60'}`}
                      >
                        <div className="flex items-center gap-4 relative z-10">
                          <span className={`font-bold text-lg ${isSelected ? 'text-amber-400' : 'text-indigo-400 group-hover:text-indigo-300'}`}>{letters[i]}:</span>
                          <span className={`font-medium text-lg ${isSelected ? 'text-white' : 'text-indigo-100'}`}>{opt}</span>
                        </div>
                      </button>
                    );
                  })}
                  
                  {(!questions[currentQuestionIndex].options || questions[currentQuestionIndex].options.length === 0) && (
                    <div className="col-span-1 md:col-span-2">
                      <input 
                        type="text"
                        placeholder="Javobingizni kiriting..."
                        value={answers[questions[currentQuestionIndex].id] || ''}
                        onChange={(e) => handleSelectOption(questions[currentQuestionIndex].id, e.target.value)}
                        className="w-full bg-indigo-950/40 border-2 border-indigo-500/40 rounded-2xl p-5 text-white focus:border-amber-400 focus:shadow-[0_0_20px_rgba(251,191,36,0.2)] outline-none transition-all font-medium text-lg text-center"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-6 border-t border-indigo-500/20">
                  <button
                    onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentQuestionIndex === 0}
                    className="px-6 py-3 bg-indigo-950 text-indigo-200 border border-indigo-500/30 rounded-xl font-medium hover:bg-indigo-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Oldingi
                  </button>
                  
                  {currentQuestionIndex === questions.length - 1 ? (
                    <button
                      onClick={() => handleFinishTest(false)}
                      disabled={isSubmitting}
                      className="px-8 py-3 bg-amber-500 text-amber-950 rounded-xl font-bold hover:bg-amber-400 transition-colors disabled:opacity-50 shadow-[0_0_15px_rgba(245,158,11,0.4)] flex items-center gap-2"
                    >
                      {isSubmitting ? 'Saqlanmoqda...' : 'Yakunlash'}
                    </button>
                  ) : (
                    <button
                      onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-500 transition-colors shadow-[0_0_15px_rgba(79,70,229,0.4)]"
                    >
                      Keyingi
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-foreground/60">Savollar yuklanmoqda...</div>
          )}
          </div>

          {/* Mini Leaderboard */}
          <div className="xl:col-span-1">
            <div className="bg-slate-900 rounded-[2rem] p-6 border-2 border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.15)] sticky top-4">
              <h3 className="font-bold text-indigo-100 mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                Jonli Natijalar
              </h3>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {participants.map((p, index) => (
                  <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border ${p.id === participantId ? 'bg-indigo-500/20 border-indigo-500/50' : 'bg-indigo-950/40 border-indigo-500/20'}`}>
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${index === 0 ? 'bg-amber-400 text-amber-950' : index === 1 ? 'bg-slate-300 text-slate-800' : index === 2 ? 'bg-amber-700 text-amber-100' : 'bg-indigo-900 text-indigo-300'}`}>
                        {index + 1}
                      </div>
                      <span className={`font-medium truncate text-sm ${p.id === participantId ? 'text-white' : 'text-indigo-200'}`}>
                        {p.groupName}
                      </span>
                    </div>
                    <span className="font-bold text-amber-400 ml-2 shrink-0">{p.totalScore || 0}</span>
                  </div>
                ))}
                {participants.length === 0 && (
                  <div className="text-center py-4 text-indigo-300/50 text-sm">
                    Hozircha natijalar yo'q
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Lifeline Modals */}
          <AnimatePresence>
            {activeLifelineModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                  onClick={() => setActiveLifelineModal(null)}
                />
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  className={`relative z-10 w-full max-w-md rounded-3xl border-2 p-6 md:p-8 shadow-2xl ${
                    activeLifelineModal === 'nasriddin' ? 'bg-emerald-950 border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.3)]' :
                    activeLifelineModal === 'phone' ? 'bg-blue-950 border-blue-500/50 shadow-[0_0_40px_rgba(59,130,246,0.3)]' :
                    'bg-purple-950 border-purple-500/50 shadow-[0_0_40px_rgba(168,85,247,0.3)]'
                  }`}
                >
                  <button 
                    onClick={() => setActiveLifelineModal(null)}
                    className="absolute top-4 right-4 p-2 text-white/50 hover:text-white bg-black/20 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  {activeLifelineModal === 'nasriddin' && (
                    <div className="text-center">
                      <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/50">
                        <Smile className="w-10 h-10 text-emerald-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-6">Xo'ja Nasriddin yordami</h3>
                      <div className="bg-black/30 rounded-2xl p-6 border border-emerald-500/20">
                        <p className="text-lg text-emerald-100 italic leading-relaxed">
                          {lifelineData}
                        </p>
                      </div>
                      <button onClick={() => setActiveLifelineModal(null)} className="mt-8 px-8 py-3 bg-emerald-500 text-emerald-950 font-bold rounded-xl hover:bg-emerald-400 transition-colors w-full">
                        Rahmat, Xo'ja!
                      </button>
                    </div>
                  )}

                  {activeLifelineModal === 'phone' && (
                    <div className="text-center">
                      <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-500/50">
                        <Phone className="w-10 h-10 text-blue-400 animate-pulse" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-6">Do'stimga qo'ng'iroq</h3>
                      <p className="text-blue-200 mb-6">"Menimcha to'g'ri javob shunday..."</p>
                      <div className="space-y-4">
                        {lifelineData?.map((item: any, idx: number) => (
                          <div key={idx} className="relative">
                            <div className="flex justify-between text-sm text-blue-100 mb-1 font-medium">
                              <span>{item.option}</span>
                              <span>{item.percent}%</span>
                            </div>
                            <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-blue-500/20">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${item.percent}%` }}
                                transition={{ duration: 1, delay: 0.2 }}
                                className={`h-full rounded-full ${idx === 0 ? 'bg-blue-400' : 'bg-blue-600/50'}`}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => setActiveLifelineModal(null)} className="mt-8 px-8 py-3 bg-blue-500 text-blue-950 font-bold rounded-xl hover:bg-blue-400 transition-colors w-full">
                        Tushunarli
                      </button>
                    </div>
                  )}

                  {activeLifelineModal === 'audience' && (
                    <div className="text-center">
                      <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-purple-500/50">
                        <Users className="w-10 h-10 text-purple-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-6">Zaldan yordam</h3>
                      <p className="text-purple-200 mb-6">Tomoshabinlar ovoz berishdi:</p>
                      <div className="flex items-end justify-center gap-4 h-48 mb-6 bg-black/20 rounded-2xl p-4 border border-purple-500/20">
                        {lifelineData?.map((item: any, idx: number) => (
                          <div key={idx} className="flex flex-col items-center flex-1">
                            <span className="text-xs text-purple-200 font-bold mb-2">{item.percent}%</span>
                            <div className="w-full bg-black/40 rounded-t-lg relative flex items-end justify-center h-full">
                              <motion.div 
                                initial={{ height: 0 }}
                                animate={{ height: `${item.percent}%` }}
                                transition={{ duration: 1, delay: 0.2 }}
                                className={`w-full rounded-t-lg ${idx === 0 ? 'bg-purple-400' : 'bg-purple-600/50'}`}
                              />
                            </div>
                            <span className="text-xs text-purple-300 mt-2 font-medium truncate w-full text-center px-1" title={item.option}>
                              {item.option.length > 10 ? item.option.substring(0, 8) + '...' : item.option}
                            </span>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => setActiveLifelineModal(null)} className="mt-4 px-8 py-3 bg-purple-500 text-purple-950 font-bold rounded-xl hover:bg-purple-400 transition-colors w-full">
                        Yopish
                      </button>
                    </div>
                  )}
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {view === 'participant_completed' && (
        <div className="bg-card rounded-3xl p-8 text-center shadow-sm border border-border max-w-md mx-auto">
          <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-12 h-12 text-green-500" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-2">Tabriklaymiz!</h2>
          <p className="text-foreground/60 mb-8">
            Siz testni muvaffaqiyatli yakunladingiz.
          </p>
          
          <div className="bg-secondary/50 rounded-2xl p-6 mb-8 border border-border">
            <p className="text-sm font-medium text-foreground/60 uppercase tracking-widest mb-2">Sizning natijangiz</p>
            <div className="text-5xl font-black text-primary">
              {participants.find(p => p.id === participantId)?.totalScore || 0} <span className="text-xl text-foreground/40">ball</span>
            </div>
          </div>

          <button onClick={() => setView('menu')} className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors">
            Bosh sahifaga qaytish
          </button>
        </div>
      )}
    </motion.div>
  );
}
