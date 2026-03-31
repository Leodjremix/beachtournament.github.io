import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournamentStore } from '../store/useTournamentStore';
import type { Team, ScoringMode, TieBreaker } from '../store/useTournamentStore';
import { Plus, Trash2, Save, Users, Settings } from 'lucide-react';

const CreateTournament = () => {
  const navigate = useNavigate();
  const createTournament = useTournamentStore(state => state.createTournament);

  const [name, setName] = useState('');
  const [groupStageMode, setGroupStageMode] = useState<ScoringMode>('single_set');
  const [knockoutMode, setKnockoutMode] = useState<ScoringMode>('best_of_3');
  const [isGroupStageHomeAway, setIsGroupStageHomeAway] = useState(false);
  const [isKnockoutHomeAway, setIsKnockoutHomeAway] = useState(false);
  const [pointsPerSetWon, setPointsPerSetWon] = useState<number>(3);

  const [numberOfGroups, setNumberOfGroups] = useState<number>(2);
  const [qualifiersPerGroup, setQualifiersPerGroup] = useState<number>(2);
  const [hasThirdPlaceMatch, setHasThirdPlaceMatch] = useState<boolean>(false);

  const [teamsList, setTeamsList] = useState<Team[]>([]);

  const tieBreakers: TieBreaker[] = ['points', 'sets_won', 'points_scored', 'points_conceded'];

  const addTeam = () => {
    setTeamsList([
      ...teamsList,
      {
        id: Math.random().toString(36).substring(7),
        name: `Squadra ${teamsList.length + 1}`,
        players: [''],
        points: 0, setsWon: 0, setsLost: 0, totalPointsScored: 0, totalPointsConceded: 0
      }
    ]);
  };

  const updateTeamName = (teamId: string, newName: string) => {
    setTeamsList(teamsList.map(t => t.id === teamId ? { ...t, name: newName } : t));
  };

  const addPlayerToTeam = (teamId: string) => {
    setTeamsList(teamsList.map(t => t.id === teamId ? { ...t, players: [...t.players, ''] } : t));
  };

  const updatePlayerName = (teamId: string, playerIndex: number, newName: string) => {
    setTeamsList(teamsList.map(t => {
      if (t.id === teamId) {
        const newPlayers = [...t.players];
        newPlayers[playerIndex] = newName;
        return { ...t, players: newPlayers };
      }
      return t;
    }));
  };

  const removeTeam = (teamId: string) => {
    setTeamsList(teamsList.filter(t => t.id !== teamId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || teamsList.length < 2) return alert("Inserisci il nome del torneo e almeno 2 squadre");

    await createTournament(
      name,
      groupStageMode,
      knockoutMode,
      isGroupStageHomeAway,
      isKnockoutHomeAway,
      pointsPerSetWon,
      { numberOfGroups, qualifiersPerGroup },
      tieBreakers,
      hasThirdPlaceMatch,
      teamsList
    );
    navigate('/');
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in p-4">
      <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
        <Settings className="text-neon-blue" /> Nuovo Torneo
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        <section className="glass-panel p-6 border-l-[4px] border-l-neon-blue">
          <h2 className="text-xl font-bold text-white mb-4">Dettagli e Regole</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-400">Nome Torneo</label>
              <input required type="text" value={name} onChange={e => setName(e.target.value)} className="input-glass" placeholder="Es. Summer Cup 2026" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-400">Modalità Gironi</label>
              <select value={groupStageMode} onChange={e => setGroupStageMode(e.target.value as ScoringMode)} className="input-glass bg-[#0b0c10]">
                <option value="single_set">Set Unico</option>
                <option value="best_of_3">Alla meglio dei 3 (Best of 3)</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-3 cursor-pointer mt-7">
                <input type="checkbox" checked={isGroupStageHomeAway} onChange={e => setIsGroupStageHomeAway(e.target.checked)} className="w-5 h-5 accent-neon-blue bg-[rgba(0,0,0,0.5)] border-[rgba(255,255,255,0.2)] rounded" />
                <span className="text-sm font-medium text-white">Gironi Andata e Ritorno</span>
              </label>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-400">Punti per Set Vinto</label>
              <input type="number" value={pointsPerSetWon} onChange={e => setPointsPerSetWon(Number(e.target.value))} className="input-glass" min="1" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-400">Numero di Gironi</label>
              <input type="number" value={numberOfGroups} onChange={e => setNumberOfGroups(Number(e.target.value))} className="input-glass" min="1" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-400">Qualificati per Girone</label>
              <input type="number" value={qualifiersPerGroup} onChange={e => setQualifiersPerGroup(Number(e.target.value))} className="input-glass" min="1" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-400">Modalità Fasi Finali</label>
              <select value={knockoutMode} onChange={e => setKnockoutMode(e.target.value as ScoringMode)} className="input-glass bg-[#0b0c10]">
                <option value="single_set">Set Unico</option>
                <option value="best_of_3">Alla meglio dei 3 (Best of 3)</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-3 cursor-pointer mt-7">
                <input type="checkbox" checked={isKnockoutHomeAway} onChange={e => setIsKnockoutHomeAway(e.target.checked)} className="w-5 h-5 accent-neon-blue bg-[rgba(0,0,0,0.5)] border-[rgba(255,255,255,0.2)] rounded" />
                <span className="text-sm font-medium text-white">Fasi Finali Andata e Ritorno</span>
              </label>
            </div>

            <label className="flex items-center gap-3 cursor-pointer mt-4 md:col-span-2">
              <input type="checkbox" checked={hasThirdPlaceMatch} onChange={e => setHasThirdPlaceMatch(e.target.checked)} className="w-5 h-5 accent-neon-orange bg-[rgba(0,0,0,0.5)] border-[rgba(255,255,255,0.2)] rounded" />
              <span className="text-sm font-medium text-white">Includi Finale 3°/4° Posto</span>
            </label>
          </div>
        </section>

        <section className="glass-panel p-6 border-t-[3px] border-t-neon-orange">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="text-neon-orange" /> Lista Squadre
            </h2>
            <button type="button" onClick={addTeam} className="btn-secondary flex items-center gap-2 text-sm px-4 py-2">
              <Plus className="w-4 h-4" /> Aggiungi Squadra
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamsList.map((team) => (
              <div key={team.id} className="bg-[#0b0c10]/80 p-4 rounded-xl border border-neon-orange/30 relative">
                <button type="button" onClick={() => removeTeam(team.id)} className="absolute top-3 right-3 text-gray-500 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                <input
                  type="text"
                  value={team.name}
                  onChange={e => updateTeamName(team.id, e.target.value)}
                  className="bg-transparent text-lg font-bold text-white focus:outline-none focus:border-b focus:border-neon-orange w-[85%] mb-3"
                  placeholder="Nome Visuale (es. Rossi/Bianchi)"
                />

                <div className="flex flex-col gap-2">
                  {team.players.map((player, pIdx) => (
                    <div key={pIdx} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-4">{pIdx + 1}.</span>
                      <input
                        type="text"
                        value={player}
                        onChange={e => updatePlayerName(team.id, pIdx, e.target.value)}
                        className="flex-1 bg-transparent border-b border-gray-800 text-sm text-gray-300 focus:outline-none focus:border-neon-orange"
                        placeholder="Nome Giocatore"
                        required
                      />
                    </div>
                  ))}
                  <button type="button" onClick={() => addPlayerToTeam(team.id)} className="text-xs text-neon-orange hover:text-white mt-2 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Aggiungi Membro
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-end gap-4 pb-12">
          <button type="submit" className="btn-primary flex items-center gap-2 px-8 py-3 text-lg bg-neon-blue text-[#0b0c10] hover:bg-transparent hover:text-neon-blue shadow-[0_0_15px_rgba(0,243,255,0.4)]">
            <Save className="w-5 h-5" /> Salva e Genera Gironi Random
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTournament;
