import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, doc, getDoc, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Trophy, Medal, Award, User, Star, ArrowLeft, Crown, Calendar, Swords } from 'lucide-react';
import { motion } from 'framer-motion';
import { quizData } from '../quizData';

import { Question, Subject } from '../data';

interface LeaderboardUser {
  id: string;
  displayName: string;
  photoURL: string;
  score: number;
}

interface LeaderboardProps {
  onBack: () => void;
  currentUser?: any;
  onStartDuel?: (duelId: string) => void;
  questions?: Question[];
  fanlar?: Subject[];
}

export function Leaderboard({ onBack, currentUser, onStartDuel, questions = [], fanlar = [] }: LeaderboardProps) {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const [challengingUser, setChallengingUser] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsRef = doc(db, 'settings', 'leaderboard');
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          setSettings(settingsSnap.data());
        }
      } catch (error) {
        console.error("Error fetching leaderboard settings:", error);
      }
    };
    fetchSettings();

    const q = query(
      collection(db, 'leaderboard'),
      orderBy('score', 'desc'),
      limit(50)
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedUsers: LeaderboardUser[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedUsers.push({
          id: doc.id,
          displayName: data.displayName || 'Anonim foydalanuvchi',
          photoURL: data.photoURL || '',
          score: data.score || 0,
        });
      });
      setUsers(fetchedUsers);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching leaderboard:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleChallenge = async (opponent: LeaderboardUser) => {
    if (!currentUser || !onStartDuel) return;
    setChallengingUser(opponent.id);
    
    try {
      // Collect all questions based on isDuelEnabled flag
      let allQuestions: any[] = [];
      const duelEnabledTopics = new Set<string>();
      
      if (fanlar && fanlar.length > 0) {
        fanlar.forEach(subject => {
          subject.topics.forEach(topic => {
            if (topic.isDuelEnabled) {
              duelEnabledTopics.add(`${subject.title}::${topic.title}`);
            }
          });
        });
      }

      if (duelEnabledTopics.size > 0) {
        allQuestions = questions.filter(q => duelEnabledTopics.has(`${q.subject}::${q.topic}`) && q.type !== 'case');
      } else {
        // Fallback to all test questions if none are specifically enabled
        allQuestions = questions.filter(q => q.type !== 'case');
      }

      if (allQuestions.length === 0) {
        alert("Duel uchun testlar topilmadi. Iltimos, admin panelidan mavzularni duel uchun ruxsat bering (yoki testlar qo'shing).");
        setChallengingUser(null);
        return;
      }
      
      const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
      const selectedQuestions = shuffled.slice(0, 5).map(q => ({
        question: q.question || '',
        options: q.options || [],
        correctAnswer: q.correct !== undefined ? q.correct : 0
      }));

      const randomSubject = shuffled[0]?.subject || 'Aralash';

      const duelData = {
        challengerId: currentUser.uid,
        challengerName: currentUser.displayName || 'Anonim',
        opponentId: opponent.id,
        opponentName: opponent.displayName || 'Anonim',
        status: 'pending',
        subject: randomSubject,
        questions: selectedQuestions,
        challengerScore: null,
        opponentScore: null,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'duels'), duelData);
      onStartDuel(docRef.id);
    } catch (error) {
      console.error("Error creating duel:", error);
      alert("Duel yaratishda xatolik yuz berdi.");
    } finally {
      setChallengingUser(null);
    }
  };

  const top3 = users.slice(0, 3);
  const restUsers = users.slice(3);

  // Reorder top 3 for podium: 2nd, 1st, 3rd
  const podiumUsers = [
    top3[1] || null,
    top3[0] || null,
    top3[2] || null,
  ];

  const getPodiumStyles = (position: number) => {
    switch (position) {
      case 0: // 2nd place
        return { height: 'h-32', bg: 'bg-gradient-to-t from-slate-300/20 to-slate-400/40', border: 'border-slate-300', text: 'text-slate-300', delay: 0.2 };
      case 1: // 1st place
        return { height: 'h-40', bg: 'bg-gradient-to-t from-yellow-400/20 to-yellow-500/40', border: 'border-yellow-400', text: 'text-yellow-400', delay: 0.1 };
      case 2: // 3rd place
        return { height: 'h-28', bg: 'bg-gradient-to-t from-amber-600/20 to-amber-700/40', border: 'border-amber-600', text: 'text-amber-600', delay: 0.3 };
      default:
        return { height: 'h-24', bg: 'bg-secondary', border: 'border-border', text: 'text-foreground', delay: 0 };
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('uz-UZ', { day: 'numeric', month: 'long' }).format(date);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 bg-card/50 backdrop-blur-sm border border-border/50 hover:bg-secondary rounded-xl transition-all shadow-sm shrink-0"
          >
            <ArrowLeft className="w-6 h-6 text-foreground/80" />
          </button>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary tracking-tight uppercase drop-shadow-sm">
              Reyting
            </h1>
            <p className="text-foreground/60 font-medium tracking-wide text-sm uppercase mt-1">Eng kuchli shifokorlar (Top 50)</p>
          </div>
        </div>
        
        {settings?.startDate && settings?.endDate && (
          <div className="flex items-center gap-2 bg-secondary/50 px-4 py-2 rounded-xl border border-border/50 self-start md:self-auto">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground/80">
              {formatDate(settings.startDate)} - {formatDate(settings.endDate)}
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(var(--primary),0.5)]"></div>
          <p className="text-primary font-bold tracking-widest uppercase animate-pulse">Yuklanmoqda...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="py-20 text-center bg-card/30 backdrop-blur-md rounded-3xl border border-border/50">
          <Award className="w-20 h-20 text-foreground/20 mx-auto mb-4" />
          <p className="text-xl font-bold text-foreground/60">Hozircha reytingda hech kim yo'q</p>
          <p className="text-foreground/40 mt-2">Birinchi bo'lib test ishlashni boshlang!</p>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Podium Section */}
          {top3.length > 0 && (
            <div className="flex justify-center items-end gap-2 sm:gap-4 md:gap-6 pt-12 px-2">
              {podiumUsers.map((user, index) => {
                if (!user) return <div key={index} className="w-24 sm:w-32" />;
                const styles = getPodiumStyles(index);
                const rank = index === 0 ? 2 : index === 1 ? 1 : 3;
                
                return (
                  <motion.div 
                    key={user.id}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: styles.delay, type: 'spring', stiffness: 100 }}
                    className="flex flex-col items-center relative w-28 sm:w-36 md:w-44"
                  >
                    {rank === 1 && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5, type: 'spring' }}
                        className="absolute -top-10 z-20 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]"
                      >
                        <Crown className="w-10 h-10 fill-yellow-400" />
                      </motion.div>
                    )}
                    
                    <div className={`relative z-10 mb-[-20px] rounded-full p-1 bg-background shadow-xl border-4 ${styles.border}`}>
                      <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-secondary">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary">
                            <User className="w-8 h-8 sm:w-10 sm:h-10" />
                          </div>
                        )}
                      </div>
                      <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black text-background border-2 border-background shadow-lg ${rank === 1 ? 'bg-yellow-400' : rank === 2 ? 'bg-slate-300' : 'bg-amber-600'}`}>
                        {rank}
                      </div>
                    </div>
                    
                    <div className={`w-full ${styles.height} ${styles.bg} border-t-2 border-x-2 ${styles.border} rounded-t-2xl flex flex-col items-center justify-end pb-4 px-2 shadow-[0_-10px_20px_rgba(0,0,0,0.1)] backdrop-blur-md relative overflow-hidden`}>
                      <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
                      <h3 className="font-bold text-foreground text-center truncate w-full text-xs sm:text-sm mb-1 drop-shadow-md">{user.displayName.split(' ')[0]}</h3>
                      <div className={`font-black text-lg sm:text-xl md:text-2xl ${styles.text} drop-shadow-md`}>
                        {user.score}
                      </div>
                      <div className="text-[9px] sm:text-[10px] font-bold text-foreground/50 uppercase tracking-widest mb-2">Ball</div>
                      
                      {currentUser && currentUser.uid !== user.id && (
                        <button
                          onClick={() => handleChallenge(user)}
                          disabled={challengingUser === user.id}
                          className="mt-1 p-1.5 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors z-20"
                          title="Duelga chorlash"
                        >
                          {challengingUser === user.id ? (
                            <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Swords className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* List Section */}
          {restUsers.length > 0 && (
            <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-3xl overflow-hidden shadow-xl">
              <div className="p-4 sm:p-6 border-b border-border/50 bg-secondary/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Star className="w-5 h-5 text-primary fill-primary" />
                  <h2 className="text-base sm:text-lg font-bold text-foreground uppercase tracking-wider">Boshqa ishtirokchilar</h2>
                </div>
              </div>
              <div className="divide-y divide-border/30">
                {restUsers.map((user, index) => {
                  const actualRank = index + 4;
                  return (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      key={user.id} 
                      className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4 hover:bg-white/5 transition-colors group"
                    >
                      <div className="w-8 sm:w-10 flex justify-center shrink-0">
                        <span className="font-black text-foreground/40 text-lg sm:text-xl group-hover:text-primary transition-colors">{actualRank}</span>
                      </div>
                      
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden shrink-0 border-2 border-border/50 group-hover:border-primary/50 transition-colors">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-secondary text-foreground/50">
                            <User className="w-5 h-5 sm:w-6 sm:h-6" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm sm:text-base text-foreground truncate group-hover:text-primary transition-colors">{user.displayName}</h3>
                        <p className="text-[10px] sm:text-xs text-foreground/40 font-medium tracking-wider">ID: {user.id.substring(0, 8)}</p>
                      </div>
                      
                      {currentUser && currentUser.uid !== user.id && (
                        <button
                          onClick={() => handleChallenge(user)}
                          disabled={challengingUser === user.id}
                          className="shrink-0 p-2 rounded-xl bg-gradient-to-r from-red-500/10 to-orange-500/10 text-red-500 hover:from-red-500/20 hover:to-orange-500/20 border border-red-500/20 transition-all mr-2"
                          title="Duelga chorlash"
                        >
                          {challengingUser === user.id ? (
                            <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Swords className="w-5 h-5" />
                          )}
                        </button>
                      )}

                      <div className="text-right shrink-0 bg-secondary/50 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-border/50 group-hover:bg-primary/10 group-hover:border-primary/30 transition-all">
                        <div className="text-base sm:text-lg font-black text-foreground group-hover:text-primary transition-colors">{user.score}</div>
                        <div className="text-[8px] sm:text-[10px] font-bold text-foreground/50 uppercase tracking-widest">Ball</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
