import type { Group } from '../store/useTournamentStore';

interface Props {
  group: Group;
}

export default function GroupStandings({ group }: Props) {
  // Ordina per punti decrescenti
  const sortedTeams = [...group.teams].sort((a, b) => b.points - a.points);

  return (
    <div className="glass-panel p-6 border-t-[4px] border-t-neon-blue flex flex-col gap-4 transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,243,255,0.2)]">
      <h3 className="text-xl font-bold text-white tracking-wide border-b border-[rgba(255,255,255,0.1)] pb-2 flex items-center justify-between">
        {group.name}
        <span className="text-xs bg-[rgba(0,243,255,0.1)] text-neon-blue px-2 py-1 rounded-full border border-[rgba(0,243,255,0.3)]">
          {sortedTeams.length} Squadre
        </span>
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="text-gray-400 border-b border-[rgba(255,255,255,0.05)]">
              <th className="pb-3 pl-2 font-medium">Pos</th>
              <th className="pb-3 font-medium">Squadra</th>
              <th className="pb-3 text-center font-bold text-neon-orange">PT</th>
              <th className="pb-3 text-center font-medium">SV</th>
              <th className="pb-3 text-center font-medium">SP</th>
              <th className="pb-3 text-center font-medium">QS</th>
            </tr>
          </thead>
          <tbody>
            {sortedTeams.map((team, index) => {
              const qs = team.setsLost === 0 ? team.setsWon : (team.setsWon / team.setsLost).toFixed(2);

              return (
                <tr key={team.id} className="border-b border-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                  <td className={`py-3 pl-2 font-bold ${index === 0 ? 'text-neon-blue' : index === 1 ? 'text-gray-300' : 'text-gray-500'}`}>
                    {index + 1}
                  </td>
                  <td className="py-3 text-white font-medium">
                    <span className="drop-shadow-sm">{team.player1}</span> <span className="text-neon-blue opacity-50">&amp;</span> <span className="drop-shadow-sm">{team.player2}</span>
                  </td>
                  <td className="py-3 text-center font-bold text-neon-orange bg-[rgba(255,94,0,0.05)] rounded-md px-2">
                    {team.points}
                  </td>
                  <td className="py-3 text-center text-gray-300">{team.setsWon}</td>
                  <td className="py-3 text-center text-gray-400">{team.setsLost}</td>
                  <td className="py-3 text-center text-gray-500 font-mono text-xs">{qs}</td>
                </tr>
              );
            })}

            {sortedTeams.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-500 italic">
                  Nessuna squadra in questo girone
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
