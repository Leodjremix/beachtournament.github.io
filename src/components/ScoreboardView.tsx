import { useState, useEffect } from 'react';
import { useTournamentStore } from '../store/useTournamentStore';
import { useAuthStore } from '../store/useAuthStore';
import type { Match } from '../store/useTournamentStore';
import { Volleyball, X } from 'lucide-react';

interface Props {
  matchId: string;
  onClose: () => void;
}

export default function ScoreboardView({ matchId, onClose }: Props) {
  const { currentTournament, updateMatchScoreRealtime } = useTournamentStore();
  const { userRole } = useAuthStore();
  const isAdmin = userRole === 'admin';

  if (!currentTournament || !isAdmin) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-red-500 text-white">
        Accesso non autorizzato
      </div>
    );
  }

  // Find the match
  const match = currentTournament.matches.find(m => m.id === matchId);
  if (!match) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-red-500 text-white">
        Partita non trovata
      </div>
    );
  }

  // Find team names
  const team1 = currentTournament.groups.flatMap(g => g.teams).find(t => t.id === match.team1Id);
  const team2 = currentTournament.groups.flatMap(g => g.teams).find(t => t.id === match.team2Id);

  const t1Name = team1 ? `${team1.players[0] ?? ''} & ${team1.players[1] ?? ''}` : 'Squadra 1';
  const t2Name = team2 ? `${team2.players[0] ?? ''} & ${team2.players[1] ?? ''}` : 'Squadra 2';

  // Current scores - use useState to track local state that syncs with Firestore
  const [t1Score, setT1Score] = useState(match.team1Score[0] || 0);
  const [t2Score, setT2Score] = useState(match.team2Score[0] || 0);
  const [t1Sets, setT1Sets] = useState(match.team1Score.length > 1 ? match.team1Score[1] || 0 : 0);
  const [t2Sets, setT2Sets] = useState(match.team2Score.length > 1 ? match.team2Score[1] || 0 : 0);

  // Sync with tournament store updates (for real-time updates from other users)
  useEffect(() => {
    const updatedMatch = currentTournament.matches.find(m => m.id === matchId);
    if (updatedMatch) {
      setT1Score(updatedMatch.team1Score[0] || 0);
      setT2Score(updatedMatch.team2Score[0] || 0);
      setT1Sets(updatedMatch.team1Score.length > 1 ? updatedMatch.team1Score[1] || 0 : 0);
      setT2Sets(updatedMatch.team2Score.length > 1 ? updatedMatch.team2Score[1] || 0 : 0);
    }
  }, [currentTournament.matches, matchId]);

  // Handle score increment
  const incrementScore = (team: 1 | 2) => {
    const newT1Score = team === 1 ? t1Score + 1 : t1Score;
    const newT2Score = team === 2 ? t2Score + 1 : t2Score;
    setT1Score(newT1Score);
    setT2Score(newT2Score);

    // Update Firestore in real-time
    updateMatchScoreRealtime(match.id, [newT1Score, t1Sets], [newT2Score, t2Sets], false, 'live', currentTournament.id, currentTournament.apiKey);
  };

  // Handle score decrement (for corrections)
  const decrementScore = (team: 1 | 2) => {
    if (team === 1 && t1Score > 0) {
      const newT1Score = t1Score - 1;
      setT1Score(newT1Score);
      updateMatchScoreRealtime(match.id, [newT1Score, t1Sets], [t2Score, t2Sets], false, 'live', currentTournament.id, currentTournament.apiKey);
    } else if (team === 2 && t2Score > 0) {
      const newT2Score = t2Score - 1;
      setT2Score(newT2Score);
      updateMatchScoreRealtime(match.id, [t1Score, t1Sets], [newT2Score, t2Sets], false, 'live', currentTournament.id, currentTournament.apiKey);
    }
  };

  // Handle set win
  const winSet = (team: 1 | 2) => {
    if (team === 1) {
      const newT1Sets = t1Sets + 1;
      const newT1Score = 0;
      setT1Sets(newT1Sets);
      setT1Score(newT1Score);
      updateMatchScoreRealtime(match.id, [newT1Score, newT1Sets], [t2Score, t2Sets], false, 'live', currentTournament.id, currentTournament.apiKey);
    } else {
      const newT2Sets = t2Sets + 1;
      const newT2Score = 0;
      setT2Sets(newT2Sets);
      setT2Score(newT2Score);
      updateMatchScoreRealtime(match.id, [t1Score, t1Sets], [newT2Score, newT2Sets], false, 'live', currentTournament.id, currentTournament.apiKey);
    }
  };

  // Handle reset current set
  const resetSet = () => {
    const newT1Score = 0;
    const newT2Score = 0;
    setT1Score(newT1Score);
    setT2Score(newT2Score);
    updateMatchScoreRealtime(match.id, [newT1Score, t1Sets], [newT2Score, t2Sets], false, 'live', currentTournament.id, currentTournament.apiKey);
  };

  // Handle match completion
  const finishMatch = () => {
    updateMatchScoreRealtime(match.id, [t1Score, t1Sets], [t2Score, t2Sets], true, 'finished', currentTournament.id, currentTournament.apiKey);
  };

  return (
    <div className="flex h-screen w-screen bg-black text-white">
      {/* Exit Button */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-50 p-2 hover:text-neon-blue transition-colors"
        title="Chiudi Scoreboard"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Main Container */}
      <div className="flex flex-col flex-1 w-full overflow-hidden">
        {/* Team Names (Bottom) */}
        <div className="flex justify-between px-8 pb-6">
          <div className="text-2xl font-bold text-center flex-1">
            {t1Name}
          </div>
          <div className="text-2xl font-bold text-center flex-1">
            {t2Name}
          </div>
        </div>

        {/* Score Areas (Top and Center) */}
        <div className="flex-1 flex flex-col">
          {/* Sets Score (Top Center) */}
          <div className="flex-1 flex flex-col items-center justify-center py-4">
            <div className="text-4xl font-bold mb-2">
              {t1Sets} - {t2Sets}
            </div>
            <div className="text-xl text-gray-400">Set</div>
          </div>

          {/* Main Score Area (Center) - Touch Friendly */}
          <div className="flex-1 flex flex-col items-center justify-center relative">
            {/* Team 1 Score Area (Left Half) */}
            <div
              onClick={() => incrementScore(1)}
              className="flex-1 flex flex-col items-center justify-center cursor-pointer hover:bg-yellow-900/50 transition-colors duration-200 active:bg-yellow-900/70 w-full h-full"
              onTouchStart={() => incrementScore(1)}
            >
              <div className="text-9xl font-mono font-bold w-16 text-center">
                {t1Score}
              </div>
              <div className="text-gray-400 text-xs mt-1">Punti</div>
            </div>

            {/* Separator */}
            <div className="w-px bg-gray-600 h-full"></div>

            {/* Team 2 Score Area (Right Half) */}
            <div
              onClick={() => incrementScore(2)}
              className="flex-1 flex flex-col items-center justify-center cursor-pointer hover:bg-yellow-900/50 transition-colors duration-200 active:bg-yellow-900/70 w-full h-full"
              onTouchStart={() => incrementScore(2)}
            >
              <div className="text-9xl font-mono font-bold w-16 text-center">
                {t2Score}
              </div>
              <div className="text-gray-400 text-xs mt-1">Punti</div>
            </div>
          </div>
        </div>

        {/* Controls Panel (Bottom) */}
        <div className="flex flex-col px-8 pb-8 space-y-4">
          {/* Decrement Buttons (Corrections) */}
          <div className="flex justify-center space-x-6">
            <button
              onClick={() => decrementScore(1)}
              className="p-2 bg-red-600/50 hover:bg-red-600/70 rounded-full transition-colors text-red-400 hover:text-white"
              title="Togli punto Squadra 1"
            >
              <span className="text-2xl font-bold">−</span>
            </button>

            <button
              onClick={() => decrementScore(2)}
              className="p-2 bg-red-600/50 hover:bg-red-600/70 rounded-full transition-colors text-red-400 hover:text-white"
              title="Togli punto Squadra 2"
            >
              <span className="text-2xl font-bold">−</span>
            </button>
          </div>

          {/* Set Management */}
          <div className="flex justify-center space-x-6">
            <button
              onClick={() => winSet(1)}
              className="p-2 bg-neon-blue/50 hover:bg-neon-blue/70 rounded-full transition-colors text-neon-blue hover:text-white"
              title="Squadra 1 vince il set"
            >
              <Volleyball className="w-5 h-5" /> Set 1
            </button>

            <button
              onClick={() => winSet(2)}
              className="p-2 bg-neon-orange/50 hover:bg-neon-orange/70 rounded-full transition-colors text-neon-orange hover:text-white"
              title="Squadra 2 vince il set"
            >
              <Volleyball className="w-5 h-5" /> Set 2
            </button>

            <button
              onClick={() => resetSet()}
              className="p-2 bg-gray-600/50 hover:bg-gray-600/70 rounded-full transition-colors text-gray-300 hover:text-white"
              title="Reset set corrente"
            >
              <span className="text-2xl font-bold">⟲</span>
            </button>
          </div>

          {/* Finish Match */}
          <button
            onClick={() => finishMatch()}
            className="w-full py-3 bg-neon-green/50 hover:bg-neon-green/70 rounded-lg font-bold text-neon-green hover:text-white transition-all shadow-[0_0_15px_rgba(0,255,136,0.3)]"
            title="Partita Terminata"
          >
            Partita Terminata
          </button>
        </div>
      </div>
    </div>
  );
}