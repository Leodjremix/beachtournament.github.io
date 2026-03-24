import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTournamentStore } from '../store/useTournamentStore';
import GroupStandings from '../components/GroupStandings';
import LiveScore from '../components/LiveScore';
import { ArrowLeft, KeyRound, Copy, Check } from 'lucide-react';

export default function TournamentView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentTournament = useTournamentStore(state => state.currentTournament);
  const isAdmin = useTournamentStore(state => state.isAdmin);

  const [activeTab, setActiveTab] = useState<'standings' | 'matches'>('standings');
  const [copied, setCopied] = useState(false);

  // In a real app we'd fetch by ID from Firestore here,
  // for now we just show the current one if it matches.
  if (!currentTournament || (id && currentTournament.id !== id)) {
    return (
      <div className="glass-panel p-8 text-center text-red-400 font-bold border-red-500">
        Torneo non trovato o non accessibile.
      </div>
    );
  }

  const handleCopyApi = () => {
    navigator.clipboard.writeText(currentTournament.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in w-full max-w-6xl mx-auto">

      <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" /> Torna alla Dashboard
      </button>

      <div className="glass-panel p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-[4px] border-l-neon-blue">
        <div>
          <h1 className="text-3xl font-bold text-white drop-shadow-md">{currentTournament.name}</h1>
          <div className="flex gap-4 mt-2 text-sm text-gray-400">
            <span>{currentTournament.scoringSystem === 'single_set' ? 'Gironi: Set Unico (21)' : 'Gironi: Best of 3'}</span>
            <span>•</span>
            <span>{currentTournament.playoffScoringSystem === 'single_set' ? 'Fasi Finali: Set Unico (21)' : 'Fasi Finali: Best of 3'}</span>
          </div>
        </div>

        {isAdmin && currentTournament.apiKey && (
          <div className="flex flex-col items-end gap-1 bg-[rgba(0,0,0,0.3)] p-3 rounded-xl border border-[rgba(255,255,255,0.05)]">
            <span className="text-xs text-gray-400 font-bold tracking-wider flex items-center gap-1"><KeyRound className="w-3 h-3 text-neon-blue"/> SERVERLESS API KEY</span>
            <div className="flex items-center gap-2 bg-black px-3 py-1.5 rounded-md font-mono text-sm text-neon-blue border border-[rgba(0,243,255,0.2)]">
              {currentTournament.apiKey.substring(0,8)}...
              <button onClick={handleCopyApi} className="text-gray-400 hover:text-white transition-colors ml-2" title="Copia API Key">
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex w-full mt-4 bg-[rgba(0,0,0,0.3)] rounded-xl p-1 border border-[rgba(255,255,255,0.05)]">
        <button
          onClick={() => setActiveTab('standings')}
          className={`flex-1 py-3 text-center font-bold rounded-lg transition-all ${activeTab === 'standings' ? 'bg-neon-blue text-[#0b0c10] shadow-[0_0_15px_rgba(0,243,255,0.4)]' : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)]'}`}
        >
          Gironi e Classifiche
        </button>
        <button
          onClick={() => setActiveTab('matches')}
          className={`flex-1 py-3 text-center font-bold rounded-lg transition-all ${activeTab === 'matches' ? 'bg-neon-orange text-[#0b0c10] shadow-[0_0_15px_rgba(255,94,0,0.4)]' : 'text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)]'}`}
        >
          Calendario e Risultati Live
        </button>
      </div>

      <div className="mt-4">
        {activeTab === 'standings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {currentTournament.groups.map(group => (
              <GroupStandings key={group.id} group={group} />
            ))}
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="flex flex-col gap-6">
            <h2 className="text-2xl font-bold text-white border-b border-[rgba(255,255,255,0.1)] pb-2">Partite in Programma</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentTournament.matches.map(match => (
                <LiveScore key={match.id} match={match} />
              ))}

              {currentTournament.matches.length === 0 && (
                <div className="col-span-full p-8 text-center text-gray-400 glass-panel">
                  Nessuna partita generata ancora.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
