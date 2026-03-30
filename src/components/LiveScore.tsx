import { useState } from 'react';
import type { Match } from '../store/useTournamentStore';
import { Plus, Minus, Check, Clock, Save, CalendarDays } from 'lucide-react';

interface LiveScoreProps {
  match: Match;
  team1Name: string;
  team2Name: string;
  groupName?: string;
  isAdmin: boolean;
  onUpdate: (matchId: string, team1Score: number[], team2Score: number[], isFinished: boolean) => Promise<void>;
  onScheduleUpdate?: (matchId: string, scheduledTime: string) => Promise<void>;
}

const LiveScore = ({ match, team1Name, team2Name, groupName, isAdmin, onUpdate, onScheduleUpdate }: LiveScoreProps) => {
  const [t1Score, setT1Score] = useState<number[]>([...match.team1Score]);
  const [t2Score, setT2Score] = useState<number[]>([...match.team2Score]);
  const [isFinished, setIsFinished] = useState(match.isFinished);
  const [isUpdating, setIsUpdating] = useState(false);

  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleTime, setScheduleTime] = useState(match.scheduledTime || '');

  const handleScoreChange = async (team: 1 | 2, setIndex: number, delta: number) => {
    if (isFinished || !isAdmin || isUpdating) return;

    setIsUpdating(true);
    const newT1Score = [...t1Score];
    const newT2Score = [...t2Score];

    if (team === 1) {
      newT1Score[setIndex] = Math.max(0, newT1Score[setIndex] + delta);
      setT1Score(newT1Score);
    } else {
      newT2Score[setIndex] = Math.max(0, newT2Score[setIndex] + delta);
      setT2Score(newT2Score);
    }

    await onUpdate(match.id, newT1Score, newT2Score, false);
    setIsUpdating(false);
  };

  const addSet = async () => {
    if (isFinished || !isAdmin || isUpdating) return;
    const newT1Score = [...t1Score, 0];
    const newT2Score = [...t2Score, 0];
    setT1Score(newT1Score);
    setT2Score(newT2Score);
    await onUpdate(match.id, newT1Score, newT2Score, false);
  };

  const closeMatch = async () => {
    if (!isAdmin || isUpdating) return;
    if (window.confirm("Sei sicuro di voler chiudere la partita? Questo aggiornerà definitivamente le classifiche o l'avanzamento tabellone.")) {
        setIsUpdating(true);
        setIsFinished(true);
        await onUpdate(match.id, t1Score, t2Score, true);
        setIsUpdating(false);
    }
  };

  const handleScheduleSave = async () => {
    if (!onScheduleUpdate || isUpdating) return;
    setIsUpdating(true);
    await onScheduleUpdate(match.id, scheduleTime);
    setShowSchedule(false);
    setIsUpdating(false);
  };

  return (
    <div className={`glass-panel p-4 flex flex-col gap-4 relative transition-all ${isFinished ? 'opacity-70 grayscale-[30%] border-[rgba(255,255,255,0.1)]' : 'border-l-[4px] border-neon-blue'}`}>
      <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.1)] pb-2">
        <span className="text-xs font-bold text-neon-blue uppercase tracking-wider">{groupName || match.phaseType}</span>

        <div className="flex items-center gap-2">
           {match.scheduledTime && !showSchedule && (
               <span className="text-xs font-mono bg-neon-orange/20 text-neon-orange px-2 py-1 rounded flex items-center gap-1">
                   <CalendarDays className="w-3 h-3" /> {match.scheduledTime}
               </span>
           )}
           {isAdmin && !isFinished && onScheduleUpdate && (
             <button onClick={() => setShowSchedule(!showSchedule)} className="text-gray-400 hover:text-neon-orange transition-colors" title="Imposta Orario">
               <Clock className="w-4 h-4" />
             </button>
           )}
           {isFinished && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded font-bold flex items-center gap-1"><Check className="w-3 h-3" /> FINITA</span>}
        </div>
      </div>

      {showSchedule && isAdmin && (
          <div className="flex items-center gap-2 bg-[#0b0c10] p-2 rounded border border-neon-orange/30">
              <input
                 type="text"
                 placeholder="Es. 15/08 ore 16:30"
                 value={scheduleTime}
                 onChange={(e) => setScheduleTime(e.target.value)}
                 className="flex-1 bg-transparent text-sm text-white focus:outline-none placeholder-gray-600"
              />
              <button onClick={handleScheduleSave} disabled={isUpdating} className="text-neon-orange hover:text-white p-1">
                  <Save className="w-4 h-4" />
              </button>
          </div>
      )}

      <div className="flex flex-col gap-3">
        {[team1Name, team2Name].map((teamName, teamIdx) => {
            const isTeam1 = teamIdx === 0;
            const currentScores = isTeam1 ? t1Score : t2Score;

            return (
              <div key={teamIdx} className="flex justify-between items-center bg-[rgba(0,0,0,0.3)] p-2 rounded-lg">
                <span className={`font-bold truncate w-[45%] ${isFinished ? 'text-gray-400' : 'text-white'}`}>{teamName}</span>
                <div className="flex items-center gap-2">
                   {currentScores.map((score, setIdx) => (
                      <div key={setIdx} className="flex items-center gap-1 bg-[#1f2833] rounded px-1 border border-gray-700">
                        {isAdmin && !isFinished && (
                          <button onClick={() => handleScoreChange(isTeam1 ? 1 : 2, setIdx, -1)} disabled={isUpdating} className="p-1 text-gray-400 hover:text-red-400"><Minus className="w-3 h-3" /></button>
                        )}
                        <span className={`font-mono text-lg font-bold w-6 text-center ${isFinished ? 'text-gray-500' : 'text-neon-orange'}`}>{score}</span>
                        {isAdmin && !isFinished && (
                          <button onClick={() => handleScoreChange(isTeam1 ? 1 : 2, setIdx, 1)} disabled={isUpdating} className="p-1 text-gray-400 hover:text-green-400"><Plus className="w-3 h-3" /></button>
                        )}
                      </div>
                   ))}
                </div>
              </div>
            );
        })}
      </div>

      {isAdmin && !isFinished && (
        <div className="flex justify-between mt-2 pt-2 border-t border-[rgba(255,255,255,0.05)]">
           <button onClick={addSet} disabled={isUpdating} className="text-xs text-neon-blue hover:text-white flex items-center gap-1">
              <Plus className="w-3 h-3" /> Nuovo Set
           </button>
           <button onClick={closeMatch} disabled={isUpdating} className="btn-primary py-1 px-3 text-xs flex items-center gap-1">
              <Check className="w-3 h-3" /> Chiudi Partita
           </button>
        </div>
      )}
    </div>
  );
};

export default LiveScore;
