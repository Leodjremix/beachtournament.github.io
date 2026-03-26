import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuthStore } from '../store/useAuthStore';
import { Calendar, Trophy, Clock } from 'lucide-react';

interface PlayerProfile {
  displayName: string;
  avatarUrl: string;
  email: string;
}

const PlayerDashboard = () => {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as PlayerProfile);
        }
      }
    };
    fetchProfile();
  }, [user]);

  if (!profile) return (
    <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-blue"></div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-8 animate-fade-in">
      
      {/* Header Profilo */}
      <section className="glass-panel p-8 flex flex-col md:flex-row items-center gap-6 border-l-[4px] border-l-neon-blue relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-neon-blue opacity-5 blur-[100px] rounded-full pointer-events-none"></div>
        
        <img 
          src={profile.avatarUrl} 
          alt="Avatar" 
          className="w-24 h-24 rounded-full border-2 border-neon-blue p-1 bg-[#1f2833]"
        />
        
        <div className="text-center md:text-left z-10">
          <h1 className="text-3xl font-bold text-white mb-1">{profile.displayName}</h1>
          <span className="px-3 py-1 bg-[rgba(0,243,255,0.1)] text-neon-blue rounded-full text-xs font-medium border border-[rgba(0,243,255,0.2)]">
            Giocatore
          </span>
        </div>
      </section>

      {/* Grid Calendario e Statistiche */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Colonna di sinistra (Storico/Stats - In attesa di dati) */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="glass-panel p-6 border-t-[3px] border-t-neon-orange">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-neon-orange" />
              I Miei Tornei
            </h2>
            <div className="flex flex-col items-center justify-center py-10 text-gray-500 bg-[rgba(0,0,0,0.2)] rounded-lg border border-dashed border-gray-700">
                <p className="text-sm">Nessun torneo registrato al momento.</p>
            </div>
          </div>
        </div>

        {/* Colonna di destra (Calendario Personale - In attesa di dati) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="glass-panel p-6 border-t-[3px] border-t-neon-blue">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-neon-blue" />
              Prossimi Incontri
            </h2>
            
            <div className="flex flex-col gap-4">
                {/* Esempio di Empty State */}
                <div className="flex flex-col items-center justify-center py-12 text-gray-500 bg-[rgba(0,243,255,0.02)] rounded-lg border border-dashed border-[rgba(0,243,255,0.2)]">
                    <Clock className="w-8 h-8 mb-2 opacity-50 text-neon-blue" />
                    <p className="text-sm font-medium text-gray-400">Nessuna partita programmata</p>
                    <p className="text-xs mt-1">L'Admin non ha ancora assegnato slot temporali per i tuoi incontri.</p>
                </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PlayerDashboard;
