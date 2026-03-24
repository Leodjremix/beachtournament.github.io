import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTournamentStore } from '../store/useTournamentStore';
import type { Match } from '../store/useTournamentStore';
import { useAuthStore } from '../store/useAuthStore';
import { ArrowLeft, Copy, Check, Lock } from 'lucide-react';
import GroupStandings from '../components/GroupStandings';
import LiveScore from '../components/LiveScore';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';

const TournamentView = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<'standings' | 'matches'>('standings');
  const [copied, setCopied] = useState(false);

  const { currentTournament, setCurrentTournament, updateMatchScoreRealtime } = useTournamentStore();
  const { userRole } = useAuthStore();
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    if (!id) return;

    // Ascolto in tempo reale per il documento principale del torneo
    const unsubTournament = onSnapshot(doc(db, 'tournaments', id), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();

        // Ascolto in tempo reale per le partite del torneo
        const unsubMatches = onSnapshot(collection(db, `tournaments/${id}/matches`), (querySnapshot) => {
          const matches: Match[] = [];
          querySnapshot.forEach((matchDoc) => {
            matches.push(matchDoc.data() as Match);
          });

          setCurrentTournament({
            ...data,
            id: data.id,
            name: data.name,
            scoringSystem: data.scoringSystem,
            playoffScoringSystem: data.playoffScoringSystem,
            groups: data.groups,
            matches: matches,
            apiKey: data.apiKey,
            isArchived: data.isArchived
          } as any);
        });

        return () => unsubMatches();
      }
    });

    return () => unsubTournament();
  }, [id, setCurrentTournament]);

  if (!currentTournament) return <div className="text-white">Caricamento in corso o torneo non trovato...</div>;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentTournament.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleScoreUpdate = async (matchId: string, team1Score: number[], team2Score: number[], isFinished: boolean, groupId?: string) => {
    if(!isAdmin) return; // Protezione client-side extra

    if(groupId) {
        await updateMatchScoreRealtime(
            matchId,
            team1Score,
            team2Score,
            isFinished,
            groupId,
            currentTournament.id,
            currentTournament.apiKey,
            currentTournament.scoringSystem
        );
    }
  };

  return (
    <div className="w-full max-w-6xl animate-fade-in pb-20">
      <Link to="/" className="inline-flex items-center text-neon-blue hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Torna alla Dashboard
      </Link>

      <div className="glass-panel p-6 md:p-8 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{currentTournament.name}</h1>
          <div className="text-gray-400 text-sm flex gap-4">
            <span>Gironi: {currentTournament.scoringSystem === 'single_set' ? 'Set Unico (21)' : 'Best of 3'}</span>
            <span>•</span>
            <span>Fasi Finali: {currentTournament.playoffScoringSystem === 'single_set' ? 'Set Unico (21)' : 'Best of 3'}</span>
          </div>
        </div>

        {isAdmin && (
          <div className="bg-[#0b0c10]/80 p-3 rounded-xl border border-neon-blue/30 flex flex-col gap-2 min-w-[200px]">
            <div className="text-xs text-neon-blue font-semibold uppercase tracking-wider flex items-center gap-1">
              <Lock className="w-3 h-3" /> Serverless API Key
            </div>
            <div className="flex items-center justify-between bg-[#1f2833] rounded px-3 py-2 border border-gray-700">
              <code className="text-neon-blue text-sm truncate mr-2">
                {currentTournament.apiKey.substring(0, 8)}...
              </code>
              <button onClick={handleCopy} className="text-gray-400 hover:text-white transition-colors" title="Copia Chiave">
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-6 bg-[#1f2833]/50 p-1 rounded-lg border border-gray-800 backdrop-blur-sm">
        <button
          onClick={() => setActiveTab('standings')}
          className={`flex-1 py-3 px-4 rounded-md font-medium text-sm transition-all ${
            activeTab === 'standings' ? 'bg-neon-blue text-[#0b0c10] shadow-[0_0_15px_rgba(102,252,241,0.3)]' : 'text-gray-400 hover:text-white'
          }`}
        >
          Gironi e Classifiche
        </button>
        <button
          onClick={() => setActiveTab('matches')}
          className={`flex-1 py-3 px-4 rounded-md font-medium text-sm transition-all ${
            activeTab === 'matches' ? 'bg-neon-orange text-[#0b0c10] shadow-[0_0_15px_rgba(255,101,47,0.3)]' : 'text-gray-400 hover:text-white'
          }`}
        >
          Calendario e Risultati Live
        </button>
      </div>

      <div className="mt-8">
        {activeTab === 'standings' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {currentTournament.groups.map(group => (
              <GroupStandings key={group.id} group={group} />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white mb-4">Partite in Programma</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {currentTournament.matches.map(match => {
                const group = currentTournament.groups.find(g => g.id === match.groupId);
                const team1 = group?.teams.find(t => t.id === match.team1Id);
                const team2 = group?.teams.find(t => t.id === match.team2Id);

                if (!team1 || !team2) return null;

                return (
                  <LiveScore
                    key={match.id}
                    match={match}
                    team1Name={`${team1.player1} & ${team1.player2}`}
                    team2Name={`${team2.player1} & ${team2.player2}`}
                    groupName={group?.name}
                    isAdmin={isAdmin}
                    onUpdate={(mId, s1, s2, isFinished) => handleScoreUpdate(mId, s1, s2, isFinished, group?.id)}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentView;
