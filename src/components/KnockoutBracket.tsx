import type { Match, PhaseType, Tournament } from '../store/useTournamentStore';

export function KnockoutBracket({ tournament }: { tournament: Tournament, isAdmin: boolean }) {
  const bracketMatches = tournament.matches.filter(m => m.phaseType !== 'groups');

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
              {getMatchesByPhase(phase).map((match) => (
                <div key={match.id} className="relative glass-panel p-4 flex flex-col gap-3 border-[rgba(255,107,0,0.2)]">
                  {/* Team 1 */}
                  <div className="flex justify-between items-center text-sm">
                    <div className={`truncate font-medium ${match.isFinished && match.team1Score.length > 0 ? 'text-white' : 'text-gray-300'}`}>
                      {getTeamDisplay(match.team1Id)}
                    </div>
                    {/* Se il match è finito, mostriamo i set, altrimenti niente. Se TBD niente. */}
                  </div>

                  <div className="w-full h-[1px] bg-[rgba(255,255,255,0.1)]"></div>

                  {/* Team 2 */}
                  <div className="flex justify-between items-center text-sm">
                    <div className={`truncate font-medium ${match.isFinished && match.team2Score.length > 0 ? 'text-white' : 'text-gray-300'}`}>
                      {getTeamDisplay(match.team2Id)}
                    </div>
                  </div>

                  {/* Connectors (CSS puro) */}
                  {pIndex < phases.length - 1 && (
                     <div className="absolute top-1/2 -right-8 w-8 h-[2px] bg-[rgba(255,107,0,0.3)]"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
