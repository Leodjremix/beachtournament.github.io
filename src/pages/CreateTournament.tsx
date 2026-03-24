import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useTournamentStore } from '../store/useTournamentStore';
import type { ScoringSystem, Group, TieBreaker, PhaseConfig, PhaseType, MatchFormat } from '../store/useTournamentStore';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, KeyRound, Save, Trophy, Settings2 } from 'lucide-react';

export default function CreateTournament() {
  const createTournament = useTournamentStore((state) => state.createTournament);

  const navigate = useNavigate();
  const isAdmin = useAuthStore(state => state.userRole === 'admin');

  const [name, setName] = useState('');
  const [scoringSystem, setScoringSystem] = useState<ScoringSystem>('single_set');
  const [playoffScoringSystem, setPlayoffScoringSystem] = useState<ScoringSystem>('best_of_3');

  // Advanced Config State
  const [qualifiersPerGroup, setQualifiersPerGroup] = useState<number>(2);
  const [tieBreakers] = useState<TieBreaker[]>(['head_to_head', 'point_difference', 'set_quotient']);
  const [knockoutPhases, setKnockoutPhases] = useState<PhaseConfig[]>([
    { type: 'semi_finals', matchFormat: 'single_game' },
    { type: 'finals', matchFormat: 'single_game' }
  ]);

  const [groups, setGroups] = useState<Group[]>([
    { id: '1', name: 'Girone A', teams: [] }
  ]);
  const [generateApi, setGenerateApi] = useState(true);

  if (!isAdmin) {
    return (
      <div className="glass-panel p-8 text-center text-red-400 font-bold border-red-500 shadow-[0_0_15px_rgba(255,0,0,0.3)]">
        Accesso negato. Solo gli amministratori possono creare tornei.
      </div>
    );
  }

  const addGroup = () => {
    setGroups([...groups, { id: Math.random().toString(), name: `Girone ${String.fromCharCode(65 + groups.length)}`, teams: [] }]);
  };

  const removeGroup = (groupId: string) => {
    setGroups(groups.filter(g => g.id !== groupId));
  };

  const addTeam = (groupId: string) => {
    const newGroups = groups.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          teams: [...g.teams, {
            id: Math.random().toString(),
            player1: '',
            player2: '',
            points: 0,
            setsWon: 0,
            setsLost: 0,
            totalPointsScored: 0,
            totalPointsConceded: 0
          }]
        };
      }
      return g;
    });
    setGroups(newGroups);
  };

  const updateTeamPlayer = (groupId: string, teamId: string, playerNum: 1 | 2, value: string) => {
    const newGroups = groups.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          teams: g.teams.map(t => t.id === teamId ? { ...t, [`player${playerNum}`]: value } : t)
        };
      }
      return g;
    });
    setGroups(newGroups);
  };

  const removeTeam = (groupId: string, teamId: string) => {
    const newGroups = groups.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          teams: g.teams.filter(t => t.id !== teamId)
        };
      }
      return g;
    });
    setGroups(newGroups);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validazione base
    if (!name.trim() || groups.some(g => g.teams.some(t => !t.player1.trim() || !t.player2.trim()))) {
      alert("Compila tutti i campi (nome torneo e nomi giocatori).");
      return;
    }

    createTournament(name, scoringSystem, playoffScoringSystem, groups, qualifiersPerGroup, tieBreakers, knockoutPhases);
    // In a real app, if generateApi is true, we would also generate and save an API Key to Firestore here.
    navigate('/');
  };

  return (
    <div className="animate-fade-in w-full max-w-4xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-4 border-b border-[rgba(255,255,255,0.1)] pb-4">
        <Trophy className="w-8 h-8 text-neon-orange" />
        <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow-md">
          Configura Nuovo <span className="text-neon-orange">Torneo</span>
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">

        {/* Impostazioni Generali */}
        <section className="glass-panel p-6 flex flex-col gap-4 border-t-[3px] border-t-neon-blue">
          <h2 className="text-xl font-bold text-white mb-2">Impostazioni Generali</h2>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-300">Nome Torneo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="es. Summer Cup 2024"
              className="input-glass text-lg py-3"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-gray-300">Punteggio Gironi</label>
              <div className="flex gap-4 bg-[rgba(0,0,0,0.2)] p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setScoringSystem('single_set')}
                  className={`flex-1 py-2 rounded-md font-medium transition-all ${scoringSystem === 'single_set' ? 'bg-neon-blue text-[#0b0c10]' : 'text-gray-400 hover:text-white'}`}
                >
                  Set Unico (21)
                </button>
                <button
                  type="button"
                  onClick={() => setScoringSystem('best_of_3')}
                  className={`flex-1 py-2 rounded-md font-medium transition-all ${scoringSystem === 'best_of_3' ? 'bg-neon-blue text-[#0b0c10]' : 'text-gray-400 hover:text-white'}`}
                >
                  Best of 3 (21,21,15)
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-gray-300">Punteggio Fasi Finali</label>
              <div className="flex gap-4 bg-[rgba(0,0,0,0.2)] p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setPlayoffScoringSystem('single_set')}
                  className={`flex-1 py-2 rounded-md font-medium transition-all ${playoffScoringSystem === 'single_set' ? 'bg-neon-orange text-[#0b0c10]' : 'text-gray-400 hover:text-white'}`}
                >
                  Set Unico (21)
                </button>
                <button
                  type="button"
                  onClick={() => setPlayoffScoringSystem('best_of_3')}
                  className={`flex-1 py-2 rounded-md font-medium transition-all ${playoffScoringSystem === 'best_of_3' ? 'bg-neon-orange text-[#0b0c10]' : 'text-gray-400 hover:text-white'}`}
                >
                  Best of 3 (21,21,15)
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Regole di Qualificazione e Fasi Finali */}
        <section className="glass-panel p-6 flex flex-col gap-6 border-t-[3px] border-t-neon-orange">
          <div className="flex items-center gap-2 mb-2">
            <Settings2 className="w-5 h-5 text-neon-orange" />
            <h2 className="text-xl font-bold text-white">Regole e Qualificazioni</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-300">Squadre Qualificate per Girone</label>
              <input
                type="number"
                min="1"
                value={qualifiersPerGroup}
                onChange={(e) => setQualifiersPerGroup(parseInt(e.target.value) || 2)}
                className="input-glass"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-300">Regole di Spareggio (Ordine di priorità)</label>
              <div className="text-sm text-gray-400 bg-[rgba(0,0,0,0.2)] p-3 rounded border border-[rgba(255,255,255,0.05)]">
                1. Scontro Diretto (Head-to-head)<br/>
                2. Differenza Punti<br/>
                3. Quoziente Set
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-4">
            <label className="text-sm font-medium text-gray-300">Struttura Fasi Finali (Tabellone)</label>
            <div className="flex flex-col gap-3">
              {knockoutPhases.map((phase, idx) => (
                <div key={idx} className="flex gap-4 items-center bg-[rgba(0,0,0,0.2)] p-3 rounded border border-[rgba(255,255,255,0.05)]">
                  <select
                    value={phase.type}
                    onChange={(e) => {
                      const newP = [...knockoutPhases];
                      newP[idx].type = e.target.value as PhaseType;
                      setKnockoutPhases(newP);
                    }}
                    className="input-glass flex-1 bg-[rgba(0,0,0,0.5)]"
                  >
                    <option value="round_16">Ottavi di Finale</option>
                    <option value="quarter_finals">Quarti di Finale</option>
                    <option value="semi_finals">Semifinali</option>
                    <option value="finals">Finale</option>
                  </select>

                  <select
                    value={phase.matchFormat}
                    onChange={(e) => {
                      const newP = [...knockoutPhases];
                      newP[idx].matchFormat = e.target.value as MatchFormat;
                      setKnockoutPhases(newP);
                    }}
                    className="input-glass flex-1 bg-[rgba(0,0,0,0.5)]"
                  >
                    <option value="single_game">Gara Secca</option>
                    <option value="home_and_away">Andata e Ritorno</option>
                  </select>

                  <button type="button" onClick={() => setKnockoutPhases(knockoutPhases.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300 p-2">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setKnockoutPhases([...knockoutPhases, { type: 'finals', matchFormat: 'single_game' }])}
                className="text-sm text-neon-orange hover:text-white transition-colors text-left flex items-center gap-1 mt-1"
              >
                <Plus className="w-4 h-4" /> Aggiungi Fase Eliminatoria
              </button>
            </div>
          </div>
        </section>

        {/* Composizione Gironi e Squadre */}
        <section className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Composizione Gironi e Squadre</h2>
            <button
              type="button"
              onClick={addGroup}
              className="btn-secondary flex items-center gap-2 py-1.5 px-3 text-sm"
            >
              <Plus className="w-4 h-4" /> Aggiungi Girone
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {groups.map((group, groupIndex) => (
              <div key={group.id} className="glass-panel p-5 border-l-[4px] border-l-[rgba(255,255,255,0.2)] relative flex flex-col gap-4">
                {groups.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeGroup(group.id)}
                    className="absolute top-4 right-4 text-gray-500 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}

                <input
                  type="text"
                  value={group.name}
                  onChange={(e) => {
                    const newGroups = [...groups];
                    newGroups[groupIndex].name = e.target.value;
                    setGroups(newGroups);
                  }}
                  className="bg-transparent border-none text-xl font-bold text-white focus:outline-none focus:border-b focus:border-neon-blue w-3/4 pb-1"
                />

                <div className="flex flex-col gap-3 mt-2">
                  {group.teams.map((team) => (
                    <div key={team.id} className="flex items-center gap-2 bg-[rgba(0,0,0,0.3)] p-2 rounded-lg border border-[rgba(255,255,255,0.05)]">
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          placeholder="Giocatore 1"
                          value={team.player1}
                          onChange={(e) => updateTeamPlayer(group.id, team.id, 1, e.target.value)}
                          className="w-1/2 bg-transparent text-sm text-gray-200 focus:outline-none focus:text-neon-blue px-2"
                          required
                        />
                        <span className="text-gray-600 font-bold">&amp;</span>
                        <input
                          type="text"
                          placeholder="Giocatore 2"
                          value={team.player2}
                          onChange={(e) => updateTeamPlayer(group.id, team.id, 2, e.target.value)}
                          className="w-1/2 bg-transparent text-sm text-gray-200 focus:outline-none focus:text-neon-blue px-2"
                          required
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTeam(group.id, team.id)}
                        className="p-1.5 text-gray-500 hover:text-red-400 transition-colors rounded hover:bg-[rgba(255,0,0,0.1)]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => addTeam(group.id)}
                    className="mt-2 py-2 border border-dashed border-[rgba(255,255,255,0.2)] rounded-lg text-gray-400 hover:border-neon-blue hover:text-neon-blue transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4" /> Aggiungi Squadra ({group.name})
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* API Serverless Config */}
        <section className="glass-panel p-6 border border-[rgba(0,243,255,0.3)] bg-gradient-to-r from-[rgba(0,243,255,0.05)] to-transparent">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[rgba(0,243,255,0.1)] rounded-full text-neon-blue">
              <KeyRound className="w-6 h-6" />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-bold text-white">Generazione API Serverless</h3>
              <p className="text-sm text-gray-400">
                Poiché il progetto è ospitato come sito statico su GitHub Pages, genera un'API Key tramite Firestore per permettere a terze parti di leggere in sicurezza i dati live di questo torneo (Classifiche, Partite in Programma).
              </p>

              <label className="flex items-center gap-3 mt-3 cursor-pointer w-fit">
                <input
                  type="checkbox"
                  checked={generateApi}
                  onChange={() => setGenerateApi(!generateApi)}
                  className="w-5 h-5 accent-neon-blue bg-[rgba(0,0,0,0.5)] border-[rgba(255,255,255,0.2)] rounded"
                />
                <span className="text-sm font-medium text-white">Genera API Key Autorizzata (Public_Live_Data) alla creazione</span>
              </label>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-4 mt-4 pb-12">
          <button type="button" onClick={() => navigate('/')} className="btn-secondary px-6">
            Annulla
          </button>
          <button type="submit" className="btn-primary flex items-center gap-2 px-8 py-3 text-lg shadow-[0_0_20px_rgba(0,243,255,0.5)] bg-neon-blue text-[#0b0c10] hover:bg-transparent hover:text-neon-blue">
            <Save className="w-5 h-5" />
            Crea e Genera Calendario
          </button>
        </div>

      </form>
    </div>
  );
}
