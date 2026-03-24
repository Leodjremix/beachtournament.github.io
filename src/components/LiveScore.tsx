import { useState } from 'react';
import type { Match } from '../store/useTournamentStore';
import { Edit2, Save, X } from 'lucide-react';

interface LiveScoreProps {
  match: Match;
  team1Name: string;
  team2Name: string;
  groupName?: string;
  isAdmin: boolean;
  onUpdate: (matchId: string, team1Score: number[], team2Score: number[], isFinished: boolean) => void;
}

const LiveScore = ({ match, team1Name, team2Name, groupName, isAdmin, onUpdate }: LiveScoreProps) => {
  const [isEditing, setIsEditing] = useState(false);
  // Per semplicità nell'MVP gestiamo solo il primo set
  const [t1Scores, setT1Scores] = useState([...match.team1Score]);
  const [t2Scores, setT2Scores] = useState([...match.team2Score]);
  const [finished, setFinished] = useState(match.isFinished);

  const handleSave = () => {
    onUpdate(match.id, t1Scores, t2Scores, finished);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setT1Scores([...match.team1Score]);
    setT2Scores([...match.team2Score]);
    setFinished(match.isFinished);
    setIsEditing(false);
  };

  const isLive = !match.isFinished && (match.team1Score.some(s => s > 0) || match.team2Score.some(s => s > 0));

  return (
    <div className={`glass-panel p-4 rounded-xl border-l-4 ${
      match.isFinished ? 'border-gray-500 opacity-75' :
      isLive ? 'border-neon-orange' : 'border-neon-blue'
    }`}>
      <div className="flex justify-between items-center mb-3 text-xs">
        <div className="flex gap-2">
          {match.isFinished ? (
            <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded uppercase font-bold tracking-wider">Finale</span>
          ) : isLive ? (
            <span className="bg-neon-orange text-[#0b0c10] px-2 py-0.5 rounded uppercase font-bold tracking-wider animate-pulse">Live</span>
          ) : (
            <span className="bg-neon-blue/20 text-neon-blue px-2 py-0.5 rounded uppercase font-bold tracking-wider">Programmata</span>
          )}
          {groupName && <span className="text-gray-400">{groupName}</span>}
        </div>

        {isAdmin && !isEditing && (
          <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-white transition-colors">
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <span className="text-sm text-gray-300 truncate">{team1Name}</span>
              <div className="flex gap-2">
                {t1Scores.map((score, idx) => (
                  <input key={idx} type="number" value={score} onChange={(e) => {
                    const newScores = [...t1Scores];
                    newScores[idx] = Number(e.target.value);
                    setT1Scores(newScores);
                  }} className="w-12 bg-[#0b0c10] border border-gray-600 rounded text-center text-white py-1 focus:border-neon-blue outline-none" />
                ))}
                {t1Scores.length < 3 && <button onClick={() => { setT1Scores([...t1Scores, 0]); setT2Scores([...t2Scores, 0]); }} className="text-xs bg-gray-700 px-2 rounded">+ Set</button>}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm text-gray-300 truncate">{team2Name}</span>
              <div className="flex gap-2">
                {t2Scores.map((score, idx) => (
                  <input key={idx} type="number" value={score} onChange={(e) => {
                    const newScores = [...t2Scores];
                    newScores[idx] = Number(e.target.value);
                    setT2Scores(newScores);
                  }} className="w-12 bg-[#0b0c10] border border-gray-600 rounded text-center text-white py-1 focus:border-neon-blue outline-none" />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={finished}
                onChange={(e) => setFinished(e.target.checked)}
                className="rounded bg-[#0b0c10] border-gray-600 text-neon-blue focus:ring-neon-blue"
              />
              Partita Terminata
            </label>
            <div className="flex-1"></div>
            <button onClick={handleCancel} className="p-1.5 text-red-400 hover:bg-red-400/10 rounded transition-colors">
              <X className="w-4 h-4" />
            </button>
            <button onClick={handleSave} className="p-1.5 text-green-400 hover:bg-green-400/10 rounded transition-colors">
              <Save className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div className="flex justify-between items-center py-2">
            <span className={`text-sm md:text-base font-medium ${match.isFinished && match.team1Score[0] > match.team2Score[0] ? 'text-white' : 'text-gray-300'}`}>
              {team1Name}
            </span>
            <span className={`text-xl font-bold font-mono ${isLive ? 'text-neon-blue' : 'text-white'}`}>
              {match.team1Score.join(' - ')}
            </span>
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#1f2833] text-[10px] text-gray-500 px-1 rounded">
            VS
          </div>

          <div className="flex justify-between items-center py-2 border-t border-gray-800/50 mt-1">
            <span className={`text-sm md:text-base font-medium ${match.isFinished && match.team2Score[0] > match.team1Score[0] ? 'text-white' : 'text-gray-300'}`}>
              {team2Name}
            </span>
            <span className={`text-xl font-bold font-mono ${isLive ? 'text-neon-blue' : 'text-white'}`}>
              {match.team2Score.join(' - ')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveScore;
