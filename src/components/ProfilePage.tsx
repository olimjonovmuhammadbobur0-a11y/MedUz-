import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Trophy, PlayCircle, Brain, Activity, User, Mail, Star, Award } from 'lucide-react';

export function ProfilePage({ user }: { user: any }) {
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      const unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          setProgress(docSnap.data().progress || {
            quizScore: 0,
            videosWatched: 0,
            mnemonicsRead: 0,
            symptomsChecked: 0
          });
        }
        setLoading(false);
      }, (error) => {
        console.error("Error fetching user progress:", error);
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, [user]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <User className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Profilga kiring</h2>
        <p className="text-muted-foreground">O'z natijalaringizni ko'rish uchun tizimga kiring.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Profile Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-3xl p-8 border border-border shadow-sm flex flex-col md:flex-row items-center gap-6"
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt={user.displayName} className="w-24 h-24 rounded-full border-4 border-primary/20" referrerPolicy="no-referrer" />
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

      {/* Progress Stats */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Star className="w-6 h-6 text-accent" />
          Mening Natijalarim
        </h2>
        
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-card rounded-2xl p-6 border border-border h-32 animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              icon={<Trophy className="w-6 h-6 text-yellow-500" />}
              title="Testlar"
              value={progress?.quizScore || 0}
              subtitle="To'g'ri javoblar"
              color="bg-yellow-500/10"
            />
            <StatCard 
              icon={<PlayCircle className="w-6 h-6 text-blue-500" />}
              title="Videolar"
              value={progress?.videosWatched || 0}
              subtitle="Ko'rilgan videolar"
              color="bg-blue-500/10"
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
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, subtitle, color }: { icon: React.ReactNode, title: string, value: number, subtitle: string, color: string }) {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="bg-card rounded-2xl p-6 border border-border shadow-sm flex flex-col"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-3 rounded-xl ${color}`}>
          {icon}
        </div>
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>
      <div className="mt-auto">
        <div className="text-3xl font-bold text-foreground mb-1">{value}</div>
        <div className="text-sm text-muted-foreground">{subtitle}</div>
      </div>
    </motion.div>
  );
}
