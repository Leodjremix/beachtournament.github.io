import { useState } from 'react';
import type { Match, PhaseType, Tournament } from '../store/useTournamentStore';
import LiveScore from './LiveScore';
import { useTournamentStore } from '../store/useTournamentStore';

export function KnockoutBracket({ tournament, isAdmin }: { tournament: Tournament, isAdmin: boolean }) {
  const bracketMatches = tournament.matches.filter(m => m.phaseType !== 'groups');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const updateMatchScoreRealtime = useTournamentStore((state) => state.updateMatchScoreRealtime);

  const handleScoreUpdate = async (matchId: string, team1Score: number[], team2Score: number[], isFinished: boolean) => {
    if(!isAdmin) return;
    await updateMatchScoreRealtime(
        matchId,
        team1Score,
        team2Score,
        isFinished,
        tournament.id,
        tournament.apiKey
    );
    // Aggiorna lo state del match selezionato localmente per riflettere il nuovo stato nella modale
    const updatedMatch = tournament.matches.find(m => m.id === matchId);
    if(updatedMatch) {
        // La reference cambierà quando lo store farà scattare il re-render, ma aiutiamo la UI
        setSelectedMatch({ ...updatedMatch, team1Score, team2Score, isFinished });
    }
    if (isFinished) {
      setSelectedMatch(null); // Chiudi la modale se è finita
    }
  };

  if (bracketMatches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-[rgba(255,255,255,0.1)] rounded-2xl">
        <h3 className="text-xl font-bold text-gray-300 mb-2">Tabellone non ancora generato</h3>
        <p className="text-gray-500 mb-6 max-w-md">
          Completa prima tutte le partite dei gironi per poter generare il tabellone delle fasi finali.
        </p>
      </div>
    );
  }

  // Raggruppa per fase e rimuovi duplicati temporanei
  const phases = tournament.knockoutPhases.map(p => p.type);

  const getMatchesByPhase = (phaseType: PhaseType) => {
    // Gestione visuale delle doppie gare non inclusa in questo file semplificato
    // per non appesantire il rendering del bracket, mostriamo solo un "box" per accoppiamento.
    const rawMatches = bracketMatches.filter(m => m.phaseType === phaseType);

    // De-duplica andata/ritorno visualmente (se ci sono 2 match con stessi team, mostriamo come 1 riga)
    // NB: In una vera app si gestirebbe il rendering di entrambe le gare
    const uniqueMatches: Match[] = [];
    rawMatches.forEach(rm => {
        if (!uniqueMatches.find(u =>
            (u.team1Id === rm.team1Id && u.team2Id === rm.team2Id) ||
            (u.team1Id === rm.team2Id && u.team2Id === rm.team1Id))) {
                uniqueMatches.push(rm);
        }
    });
    return uniqueMatches;
  };

  const formatPhaseName = (type: PhaseType) => {
    switch (type) {
      case 'round_16': return 'Ottavi';
      case 'quarter_finals': return 'Quarti';
      case 'semi_finals': return 'Semifinali';
      case 'finals': return 'Finale';
      default: return type;
    }
  };

  const getTeamDisplay = (teamId: string | null) => {
    if (!teamId) return <span className="text-gray-500 italic">TBD</span>;
    // Cerca nel tournament.groups
    for (const group of tournament.groups) {
      const team = group.teams.find(t => t.id === teamId);
      if (team) return `${team.player1} & ${team.player2}`;
    }
    return <span className="text-gray-500 italic">TBD</span>;
  };

  return (
    <div className="w-full overflow-x-auto pb-8">
      <div className="flex gap-8 min-w-max">
        {phases.map((phase, pIndex) => (
          <div key={phase} className="flex flex-col gap-6 w-72">
            <h3 className="text-center font-bold text-neon-orange uppercase tracking-wider mb-4 border-b border-[rgba(255,107,0,0.3)] pb-2">
              {formatPhaseName(phase)}
            </h3>

            <div className="flex flex-col justify-around h-full gap-8">
              {getMatchesByPhase(phase).map((match) => {
                // Calcola chi ha vinto visualmente per opacizzare chi perde
                let t1SetsWon = 0, t2SetsWon = 0;
                if (match.isFinished) {
                    for(let i=0; i<match.team1Score.length; i++) {
                        if(match.team1Score[i] > match.team2Score[i]) t1SetsWon++;
                        else if(match.team2Score[i] > match.team1Score[i]) t2SetsWon++;
                    }
                }
                const t1Won = t1SetsWon > t2SetsWon;
                const t2Won = t2SetsWon > t1SetsWon;

                return (
                  <div
                    key={match.id}
                    className={`relative glass-panel p-4 flex flex-col gap-3 border-[rgba(255,107,0,0.2)] ${isAdmin && match.team1Id && match.team2Id ? 'cursor-pointer hover:border-neon-orange hover:shadow-[0_0_15px_rgba(255,107,0,0.3)] transition-all' : ''}`}
                    onClick={() => {
                        if(isAdmin && match.team1Id && match.team2Id) setSelectedMatch(match);
                    }}
                  >
                    {/* Team 1 */}
                    <div className="flex justify-between items-center text-sm">
                      <div className={`truncate font-medium ${match.isFinished ? (t1Won ? 'text-white font-bold' : 'text-gray-500 line-through') : 'text-gray-300'}`}>
                        {getTeamDisplay(match.team1Id)}
                      </div>
                      <div className="text-neon-orange font-bold text-xs">{match.team1Score.filter(s => s > 0).length > 0 || match.isFinished ? match.team1Score.join(' - ') : ''}</div>
                    </div>

                    <div className="w-full h-[1px] bg-[rgba(255,255,255,0.1)]"></div>

                    {/* Team 2 */}
                    <div className="flex justify-between items-center text-sm">
                      <div className={`truncate font-medium ${match.isFinished ? (t2Won ? 'text-white font-bold' : 'text-gray-500 line-through') : 'text-gray-300'}`}>
                        {getTeamDisplay(match.team2Id)}
                      </div>
                      <div className="text-neon-orange font-bold text-xs">{match.team2Score.filter(s => s > 0).length > 0 || match.isFinished ? match.team2Score.join(' - ') : ''}</div>
                    </div>

                    {/* Connectors (CSS puro) */}
                    {pIndex < phases.length - 1 && (
                       <div className="absolute top-1/2 -right-8 w-8 h-[2px] bg-[rgba(255,107,0,0.3)]"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Quick Score Input per Admin */}
      {selectedMatch && isAdmin && selectedMatch.team1Id && selectedMatch.team2Id && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(11,12,16,0.8)] backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-panel p-6 max-w-lg w-full relative border-[rgba(255,107,0,0.4)] shadow-[0_0_30px_rgba(255,107,0,0.2)]">
            <button
              onClick={() => setSelectedMatch(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white bg-[rgba(255,255,255,0.1)] rounded-full w-8 h-8 flex items-center justify-center"
            >
              ✕
            </button>
            <h3 className="text-xl font-bold text-neon-orange mb-6 text-center">Aggiorna Risultato</h3>

            <LiveScore
              match={selectedMatch}
              team1Name={getTeamDisplay(selectedMatch.team1Id) as string}
              team2Name={getTeamDisplay(selectedMatch.team2Id) as string}
              isAdmin={isAdmin}
              onUpdate={handleScoreUpdate}
            />
          </div>
        </div>
      )}
    </div>
  );
}
