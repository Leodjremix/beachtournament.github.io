import { useState } from 'react';
import { useTournamentStore } from '../store/useTournamentStore';
import type { Match } from '../store/useTournamentStore';
import { Edit2, Save, Volleyball } from 'lucide-react';

interface Props {
  match: Match;
}

export default function LiveScore({ match }: Props) {
  const currentTournament = useTournamentStore(state => state.currentTournament);
  const updateMatchScore = useTournamentStore(state => state.updateMatchScore);
  const isAdmin = useTournamentStore(state => state.isAdmin);

  const [isEditing, setIsEditing] = useState(false);
  const [t1Score, setT1Score] = useState(match.team1Score[0]?.toString() || '0');
  const [t2Score, setT2Score] = useState(match.team2Score[0]?.toString() || '0');
  const [isFinished, setIsFinished] = useState(match.isFinished);

  if (!currentTournament) return null;

  // Trova i nomi dei giocatori
  const team1 = currentTournament.groups.flatMap(g => g.teams).find(t => t.id === match.team1Id);
  const team2 = currentTournament.groups.flatMap(g => g.teams).find(t => t.id === match.team2Id);

  const t1Name = team1 ? `${team1.player1} & ${team1.player2}` : 'Squadra 1';
  const t2Name = team2 ? `${team2.player1} & ${team2.player2}` : 'Squadra 2';

  const handleSave = () => {
    updateMatchScore(match.id, [parseInt(t1Score, 10) || 0], [parseInt(t2Score, 10) || 0], isFinished);
    setIsEditing(false);
  };

  return (
    <div className={`glass-panel p-5 relative transition-all duration-300 ${match.isFinished ? 'opacity-80 border-gray-700' : 'border-l-[4px] border-l-neon-orange shadow-[0_0_15px_rgba(255,94,0,0.1)] hover:shadow-[0_0_20px_rgba(255,94,0,0.3)]'}`}>

      {/* Intestazione Card */}
      <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.05)] pb-3 mb-4">
        <div className="flex items-center gap-2">
          {match.isFinished ? (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-gray-800 text-gray-400 border border-gray-700">FINALE</span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-neon-orange text-[#0b0c10] animate-pulse">LIVE</span>
          )}
          <span className="text-xs text-gray-500 font-mono">Girone</span>
        </div>

        {isAdmin && !isEditing && (
          <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-neon-blue transition-colors p-1" title="Aggiorna Punteggio">
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Contenuto Partita */}
      <div className="flex flex-col gap-4">

        {/* Squadra 1 */}
        <div className="flex justify-between items-center group">
          <div className="flex items-center gap-2 max-w-[70%]">
            {!match.isFinished && parseInt(t1Score) > parseInt(t2Score) && <Volleyball className="w-3 h-3 text-neon-blue animate-spin-slow" />}
            <span className={`font-medium truncate ${match.isFinished && match.team1Score[0] > match.team2Score[0] ? 'text-white font-bold' : 'text-gray-300'}`}>
              {t1Name}
            </span>
          </div>
          {isEditing ? (
            <input
              type="number"
              value={t1Score}
              onChange={e => setT1Score(e.target.value)}
              className="w-14 bg-black border border-neon-blue text-white text-center rounded font-mono p-1 text-lg shadow-[0_0_10px_rgba(0,243,255,0.3)] focus:outline-none"
              min="0"
            />
          ) : (
            <span className={`text-2xl font-mono font-bold w-12 text-center ${match.isFinished && match.team1Score[0] > match.team2Score[0] ? 'text-neon-blue drop-shadow-[0_0_5px_rgba(0,243,255,0.8)]' : 'text-gray-400'}`}>
              {match.team1Score[0] ?? 0}
            </span>
          )}
        </div>

        {/* Separatore */}
        <div className="relative h-px bg-[rgba(255,255,255,0.05)] w-full flex items-center justify-center">
          <span className="bg-[#0b0c10] px-2 text-[10px] text-gray-600 font-mono tracking-widest absolute">VS</span>
        </div>

        {/* Squadra 2 */}
        <div className="flex justify-between items-center group">
          <div className="flex items-center gap-2 max-w-[70%]">
             {!match.isFinished && parseInt(t2Score) > parseInt(t1Score) && <Volleyball className="w-3 h-3 text-neon-orange animate-spin-slow" />}
             <span className={`font-medium truncate ${match.isFinished && match.team2Score[0] > match.team1Score[0] ? 'text-white font-bold' : 'text-gray-300'}`}>
              {t2Name}
            </span>
          </div>
          {isEditing ? (
            <input
              type="number"
              value={t2Score}
              onChange={e => setT2Score(e.target.value)}
              className="w-14 bg-black border border-neon-orange text-white text-center rounded font-mono p-1 text-lg shadow-[0_0_10px_rgba(255,94,0,0.3)] focus:outline-none"
              min="0"
            />
          ) : (
            <span className={`text-2xl font-mono font-bold w-12 text-center ${match.isFinished && match.team2Score[0] > match.team1Score[0] ? 'text-neon-orange drop-shadow-[0_0_5px_rgba(255,94,0,0.8)]' : 'text-gray-400'}`}>
              {match.team2Score[0] ?? 0}
            </span>
          )}
        </div>

      </div>

      {/* Pannello Edit */}
      {isEditing && (
        <div className="mt-5 pt-4 border-t border-[rgba(255,255,255,0.1)] flex justify-between items-center bg-[rgba(0,0,0,0.2)] -mx-5 px-5 -mb-5 pb-5 rounded-b-xl">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isFinished}
              onChange={e => setIsFinished(e.target.checked)}
              className="w-4 h-4 accent-neon-blue rounded"
            />
            <span className="text-xs text-gray-300 uppercase font-bold tracking-wider">Partita Conclusa</span>
          </label>
          <button
            onClick={handleSave}
            className="flex items-center gap-1 bg-[rgba(0,243,255,0.1)] hover:bg-neon-blue hover:text-[#0b0c10] text-neon-blue border border-[rgba(0,243,255,0.3)] px-3 py-1.5 rounded text-sm font-bold transition-all shadow-[0_0_10px_rgba(0,243,255,0.2)]"
          >
            <Save className="w-4 h-4" /> Salva
          </button>
        </div>
      )}
    </div>
  );
}
