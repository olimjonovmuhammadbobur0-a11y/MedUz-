import React, { useState, useEffect } from 'react';
import { collection, doc, getDoc, updateDoc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Clock, CheckCircle2, XCircle, AlertCircle, ArrowLeft, User } from 'lucide-react';
import { quizData } from '../quizData';

interface DuelArenaProps {
  duelId: string;
  currentUser: any;
  onBack: () => void;
}

export function DuelArena({ duelId, currentUser, onBack }: DuelArenaProps) {
  const [duel, setDuel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [localScore, setLocalScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'duels', duelId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDuel(data);
        
        // Check if current user has already finished
        const isChallenger = data.challengerId === currentUser.uid;
        if (isChallenger && data.challengerScore !== null) {
          setIsFinished(true);
          setLocalScore(data.challengerScore);
        } else if (!isChallenger && data.opponentScore !== null) {
          setIsFinished(true);
          setLocalScore(data.opponentScore);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [duelId, currentUser.uid]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!duel) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground">Duel topilmadi</h2>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-xl">Orqaga</button>
      </div>
    );
  }

  const isChallenger = duel.challengerId === currentUser.uid;
  const questions = duel.questions || [];
  const currentQuestion = questions[currentQuestionIndex];

  const handleAnswer = (index: number) => {
    if (isAnswerChecked || isFinished) return;
    setSelectedAnswer(index);
    setIsAnswerChecked(true);

    const isCorrect = Array.isArray(currentQuestion.correctAnswer) 
      ? currentQuestion.correctAnswer.includes(index)
      : index === currentQuestion.correctAnswer;
    if (isCorrect) {
      setLocalScore(prev => prev + 10); // 10 points per correct answer
    }

    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setIsAnswerChecked(false);
      } else {
        finishDuel(localScore + (isCorrect ? 10 : 0));
      }
    }, 1500);
  };

  const finishDuel = async (finalScore: number) => {
    setIsFinished(true);
    const duelRef = doc(db, 'duels', duelId);
    
    const updateData: any = {};
    if (isChallenger) {
      updateData.challengerScore = finalScore;
    } else {
      updateData.opponentScore = finalScore;
    }

    // Determine winner if both have finished
    const otherScore = isChallenger ? duel.opponentScore : duel.challengerScore;
    if (otherScore !== null) {
      updateData.status = 'completed';
      if (finalScore > otherScore) {
        updateData.winnerId = currentUser.uid;
      } else if (finalScore < otherScore) {
        updateData.winnerId = isChallenger ? duel.opponentId : duel.challengerId;
      } else {
        updateData.winnerId = 'tie';
      }
    }

    await updateDoc(duelRef, updateData);
  };

  const opponentName = isChallenger ? duel.opponentName : duel.challengerName;
  const opponentScore = isChallenger ? duel.opponentScore : duel.challengerScore;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between bg-card p-4 rounded-2xl border border-border shadow-sm">
        <button onClick={onBack} className="p-2 hover:bg-secondary rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-sm font-bold text-primary">Siz</span>
            <span className="text-2xl font-black text-foreground">{localScore}</span>
          </div>
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg border-4 border-background z-10">
            <Swords className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-bold text-red-500">{opponentName}</span>
            <span className="text-2xl font-black text-foreground">{opponentScore !== null ? opponentScore : '?'}</span>
          </div>
        </div>
      </div>

      {!isFinished ? (
        <div className="bg-card rounded-3xl p-6 md:p-8 shadow-sm border border-border">
          <div className="flex justify-between items-center mb-6">
            <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
              {currentQuestionIndex + 1} / {questions.length}
            </span>
            <span className="text-sm font-medium text-foreground/60">{duel.subject}</span>
          </div>

          <h3 className="text-xl md:text-2xl font-bold text-foreground mb-8 leading-relaxed">
            {currentQuestion?.question}
          </h3>

          <div className="space-y-3">
            {currentQuestion?.options.map((option: string, index: number) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = Array.isArray(currentQuestion.correctAnswer) 
                ? currentQuestion.correctAnswer.includes(index)
                : index === currentQuestion.correctAnswer;
              
              let buttonClass = "w-full text-left p-4 rounded-2xl border-2 transition-all duration-300 font-medium text-base ";
              
              if (!isAnswerChecked) {
                buttonClass += "border-border/50 bg-secondary/30 hover:bg-secondary hover:border-primary/30 text-foreground";
              } else {
                if (isCorrect) {
                  buttonClass += "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400";
                } else if (isSelected) {
                  buttonClass += "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400";
                } else {
                  buttonClass += "border-border/20 bg-secondary/10 text-foreground/40";
                }
              }

              return (
                <button
                  key={index}
                  onClick={() => handleAnswer(index)}
                  disabled={isAnswerChecked}
                  className={buttonClass}
                >
                  <div className="flex justify-between items-center">
                    <span>{option}</span>
                    {isAnswerChecked && isCorrect && <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />}
                    {isAnswerChecked && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-500 shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-3xl p-8 text-center shadow-sm border border-border">
          <TrophyResult duel={duel} currentUser={currentUser} localScore={localScore} opponentScore={opponentScore} />
          <button onClick={onBack} className="mt-8 px-8 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors">
            Reytingga qaytish
          </button>
        </div>
      )}
    </div>
  );
}

function TrophyResult({ duel, currentUser, localScore, opponentScore }: any) {
  if (duel.status !== 'completed') {
    return (
      <div className="space-y-4">
        <Clock className="w-20 h-20 text-amber-500 mx-auto animate-pulse" />
        <h2 className="text-2xl font-black text-foreground">Kutilmoqda...</h2>
        <p className="text-foreground/60">Siz o'z natijangizni qayd etdingiz ({localScore} ball). Raqibingiz tugatishini kuting.</p>
      </div>
    );
  }

  const isWinner = duel.winnerId === currentUser.uid;
  const isTie = duel.winnerId === 'tie';

  return (
    <div className="space-y-6">
      <motion.div 
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", bounce: 0.5 }}
      >
        {isWinner ? (
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(250,204,21,0.5)]">
            <Swords className="w-16 h-16 text-white" />
          </div>
        ) : isTie ? (
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-slate-300 to-slate-500 rounded-full flex items-center justify-center shadow-lg">
            <Swords className="w-16 h-16 text-white" />
          </div>
        ) : (
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center shadow-lg">
            <XCircle className="w-16 h-16 text-white" />
          </div>
        )}
      </motion.div>

      <div>
        <h2 className={`text-3xl font-black mb-2 ${isWinner ? 'text-yellow-500' : isTie ? 'text-slate-500' : 'text-red-500'}`}>
          {isWinner ? 'G\'ALABA!' : isTie ? 'DURANG!' : 'MAG\'LUBIYAT'}
        </h2>
        <p className="text-foreground/60 text-lg">
          Siz {localScore} ball, raqibingiz {opponentScore} ball to'pladi.
        </p>
        <div className="mt-4 inline-block bg-secondary px-4 py-2 rounded-xl text-sm font-bold text-foreground">
          {isWinner ? '+50 Bonus ball' : '+10 Ishtirok uchun ball'}
        </div>
      </div>
    </div>
  );
}
