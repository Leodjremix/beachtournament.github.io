import { useState, useEffect } from 'react';
import { useTournamentStore } from '../store/useTournamentStore';
import { useAuthStore } from '../store/useAuthStore';
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

  // Local state for scores arrays (mirrors Firestore)
  const [t1Scores, setT1Scores] = useState<number[]>(match.team1Score.slice());
  const [t2Scores, setT2Scores] = useState<number[]>(match.team2Score.slice());

  // Sync with store updates (real-time from other users)
  useEffect(() => {
    const updatedMatch = currentTournament.matches.find(m => m.id === matchId);
    if (updatedMatch) {
      setT1Scores(updatedMatch.team1Score.slice());
      setT2Scores(updatedMatch.team2Score.slice());
    }
  }, [currentTournament.matches, matchId]);

  // Derived values: sets won and current set points
  const t1SetsWon = t1Scores.reduce((acc, score, idx) => {
    const oppScore = t2Scores[idx] ?? 0;
    return score > oppScore ? acc + 1 : acc;
  }, 0);
  const t2SetsWon = t2Scores.reduce((acc, score, idx) => {
    const oppScore = t1Scores[idx] ?? 0;
    return score > oppScore ? acc + 1 : acc;
  }, 0);

  const currentSetIndex = Math.max(t1Scores.length, t2Scores.length) - 1;
  const t1Current = t1Scores[currentSetIndex] ?? 0;
  const t2Current = t2Scores[currentSetIndex] ?? 0;

  // Helper to update Firestore
  const updateScores = (newT1: number[], newT2: number[], isFinished: boolean, status: 'scheduled' | 'live' | 'finished') => {
    updateMatchScoreRealtime(
      match.id,
      newT1,
      newT2,
      isFinished,
      status,
      currentTournament.id,
      currentTournament.apiKey
    );
  };

  // Increment point in current set
  const incrementScore = (team: 1 | 2) => {
    const newT1 = [...t1Scores];
    const newT2 = [...t2Scores];
    // ensure arrays have same length (at least 1)
    if (newT1.length === 0) { newT1.push(0); }
    if (newT2.length === 0) { newT2.push(0); }
    if (team === 1) {
      newT1[newT1.length - 1] = Math.max(0, newT1[newT1.length - 1] + 1);
    } else {
      newT2[newT2.length - 1] = Math.max(0, newT2[newT2.length - 1] + 1);
    }
    setT1Scores(newT1);
    setT2Scores(newT2);
    updateScores(newT1, newT2, false, 'live');
  };

  // Decrement point (correction)
  const decrementScore = (team: 1 | 2) => {
    const newT1 = [...t1Scores];
    const newT2 = [...t2Scores];
    if (newT1.length === 0) { newT1.push(0); }
    if (newT2.length === 0) { newT2.push(0); }
    if (team === 1 && newT1[newT1.length - 1] > 0) {
      newT1[newT1.length - 1] -= 1;
      setT1Scores(newT1);
      updateScores(newT1, newT2, false, 'live');
    } else if (team === 2 && newT2[newT2.length - 1] > 0) {
      newT2[newT2.length - 1] -= 1;
      setT2Scores(newT2);
      updateScores(newT1, newT2, false, 'live');
    }
  };

  // Award set to team (finalize current set, start new set)
  const winSet = () => {
    const newT1 = [...t1Scores];
    const newT2 = [...t2Scores];
    // ensure we have at least one set (current)
    if (newT1.length === 0) { newT1.push(0); }
    if (newT2.length === 0) { newT2.push(0); }
    // push a new set (0-0) for both teams
    newT1.push(0);
    newT2.push(0);
    setT1Scores(newT1);
    setT2Scores(newT2);
    updateScores(newT1, newT2, false, 'live');
  };

  // Reset current set to 0-0 (without adding new set)
  const resetSet = () => {
    const newT1 = [...t1Scores];
    const newT2 = [...t2Scores];
    if (newT1.length === 0) { newT1.push(0); }
    if (newT2.length === 0) { newT2.push(0); }
    newT1[newT1.length - 1] = 0;
    newT2[newT2.length - 1] = 0;
    setT1Scores(newT1);
    setT2Scores(newT2);
    updateScores(newT1, newT2, false, 'live');
  };

  // Finish match
  const finishMatch = () => {
    updateScores(t1Scores, t2Scores, true, 'finished');
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
            <div className="text-6xl font-bold mb-2">
              {t1SetsWon} - {t2SetsWon}
            </div>
            <div className="text-xl text-gray-400">Set vinti</div>
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
                {t1Current}
              </div>
              <div className="text-gray-400 text-xs mt-1">Punti set corrente</div>
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
                {t2Current}
              </div>
              <div className="text-gray-400 text-xs mt-1">Punti set corrente</div>
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
              onClick={() => winSet()}
              className="p-2 bg-neon-blue/50 hover:bg-neon-blue/70 rounded-full transition-colors text-neon-blue hover:text-white"
              title="Squadra 1 vince il set"
            >
              <Volleyball className="w-5 h-5" /> Set 1
            </button>

            <button
              onClick={() => winSet()}
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