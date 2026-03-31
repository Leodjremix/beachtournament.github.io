import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuthStore } from '../store/useAuthStore';
import { Calendar, Trophy, Clock, LayoutDashboard } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';

interface PlayerProfile {
  displayName: string;
  avatarUrl: string;
  email: string;
}

const PlayerDashboard = () => {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [publicTournaments, setPublicTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileAndTournaments = async () => {
      try {
        if (user) {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data() as PlayerProfile);
          }
        }

        // Fetch public tournaments which contain embedded matches
        const querySnapshot = await getDocs(collection(db, 'public_tournaments'));
        const list = querySnapshot.docs.map(doc => doc.data());
        setPublicTournaments(list);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndTournaments();
  }, [user]);

  if (loading || !profile) return (
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

      {/* Logic to find matches for this player */}
      {(() => {
        // Find all teams across all tournaments where this player is a member
        // In this MVP, player names are stored as strings in the team's `players` array.
        // We'll try to match the display name, but this is a naive check.
        // A more robust system would link user.uid to a team member ID.
        const playerName = profile.displayName.toLowerCase();

        const myMatches: any[] = [];
        const myTournaments: any[] = [];

        publicTournaments.forEach(t => {
            // Find team(s) this player belongs to
            const myTeamsInT = (t.groups || []).flatMap((g: any) => g.teams || []).filter((team: any) =>
               (team.players || []).some((p: string) => p.toLowerCase() === playerName)
            );

            if (myTeamsInT.length > 0) {
               myTournaments.push(t);

               // Find matches for these teams
               myTeamsInT.forEach((myTeam: any) => {
                   const teamMatches = (t.matches || []).filter((m: any) => m.team1Id === myTeam.id || m.team2Id === myTeam.id);
                   teamMatches.forEach((m: any) => {
                       // Find opponent
                       const opponentId = m.team1Id === myTeam.id ? m.team2Id : m.team1Id;
                       let opponentName = "TBD";

                       // Search for opponent name in groups (or it might be a bye)
                       if (opponentId === 'dummy_bye') opponentName = "BYE";
                       else if (opponentId) {
                           const oppTeam = (t.groups || []).flatMap((g: any) => g.teams || []).find((team: any) => team.id === opponentId);
                           if (oppTeam) opponentName = oppTeam.name;
                       }

                       myMatches.push({
                           tournamentName: t.name,
                           match: m,
                           myTeamName: myTeam.name,
                           opponentName: opponentName
                       });
                   });
               });
            }
        });

        // Filter and sort matches
        const scheduledMatches = myMatches
            .filter(m => m.match.status !== 'finished' && !m.match.isFinished)
            .sort((a, b) => {
                const dateA = a.match.scheduledAt ? new Date(a.match.scheduledAt).getTime() : Infinity;
                const dateB = b.match.scheduledAt ? new Date(b.match.scheduledAt).getTime() : Infinity;
                return dateA - dateB;
            });

        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Colonna di sinistra (Storico/Stats) */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              <div className="glass-panel p-6 border-t-[3px] border-t-neon-orange">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-neon-orange" />
                  I Miei Tornei
                </h2>

                {myTournaments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-500 bg-[rgba(0,0,0,0.2)] rounded-lg border border-dashed border-gray-700">
                      <p className="text-sm">Nessun torneo registrato al momento.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                     {myTournaments.map(t => (
                        <div key={t.id} className="p-3 bg-[#1f2833] rounded border border-gray-700 flex items-center gap-3 hover:border-neon-orange transition-colors">
                            <LayoutDashboard className="w-4 h-4 text-neon-orange" />
                            <span className="text-sm text-gray-300 font-medium">{t.name}</span>
                        </div>
                     ))}
                  </div>
                )}
              </div>
            </div>

            {/* Colonna di destra (Calendario Personale) */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="glass-panel p-6 border-t-[3px] border-t-neon-blue">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-neon-blue" />
                  Prossimi Incontri
                </h2>

                <div className="flex flex-col gap-4">
                    {scheduledMatches.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500 bg-[rgba(0,243,255,0.02)] rounded-lg border border-dashed border-[rgba(0,243,255,0.2)]">
                            <Clock className="w-8 h-8 mb-2 opacity-50 text-neon-blue" />
                            <p className="text-sm font-medium text-gray-400">Nessuna partita programmata</p>
                            <p className="text-xs mt-1">L'Admin non ha ancora assegnato slot temporali per i tuoi incontri.</p>
                        </div>
                    ) : (
                        scheduledMatches.map((item, idx) => (
                           <div key={idx} className="bg-[#0b0c10]/80 p-4 rounded-xl border-l-4 border-neon-blue relative hover:bg-[#1f2833] transition-colors">
                              <div className="flex justify-between items-start mb-2 border-b border-gray-800 pb-2">
                                 <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{item.tournamentName}</span>
                                 {item.match.status === 'live' ? (
                                    <span className="text-xs bg-red-500/20 text-red-500 font-bold px-2 py-1 rounded flex items-center gap-1 animate-pulse">
                                       LIVE
                                    </span>
                                 ) : (
                                    <span className="text-xs bg-neon-blue/10 text-neon-blue px-2 py-1 rounded font-mono flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> {item.match.scheduledAt ? new Date(item.match.scheduledAt).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'}) : (item.match.scheduledTime || 'DA DEFINIRE')}
                                    </span>
                                 )}
                              </div>
                              <div className="flex items-center justify-between mt-3">
                                  <div className="flex-1 text-center font-bold text-white md:text-lg">{item.myTeamName}</div>
                                  <div className="px-4 text-xs text-gray-500 font-bold bg-gray-800 rounded mx-2 py-1">VS</div>
                                  <div className="flex-1 text-center font-medium text-gray-300 md:text-lg">{item.opponentName}</div>
                              </div>
                           </div>
                        ))
                    )}
                </div>
              </div>
            </div>

          </div>
        );
      })()}
    </div>
  );
};

export default PlayerDashboard;
