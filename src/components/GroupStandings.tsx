import type { Group } from '../store/useTournamentStore';

interface GroupStandingsProps {
  group: Group;
}

const GroupStandings = ({ group }: GroupStandingsProps) => {
  return (
    <div className="glass-panel overflow-hidden rounded-xl animate-fade-in border border-gray-800/50">
      <div className="bg-[#1f2833]/80 px-6 py-4 flex justify-between items-center border-b border-gray-800">
        <h3 className="text-xl font-bold text-white tracking-wide">{group.name}</h3>
        <span className="text-xs font-medium px-3 py-1 bg-[#0b0c10] text-neon-blue rounded-full border border-neon-blue/30 shadow-[0_0_10px_rgba(102,252,241,0.1)]">
          {group.teams.length} Squadre
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-400 uppercase bg-[#0b0c10]/50 font-semibold border-b border-gray-800">
            <tr>
              <th scope="col" className="px-6 py-4 rounded-tl-lg">Pos</th>
              <th scope="col" className="px-6 py-4">Squadra</th>
              <th scope="col" className="px-4 py-4 text-center text-neon-orange">PT</th>
              <th scope="col" className="px-4 py-4 text-center">SV</th>
              <th scope="col" className="px-4 py-4 text-center">SP</th>
              <th scope="col" className="px-4 py-4 text-center rounded-tr-lg">QS</th>
            </tr>
          </thead>
          <tbody>
            {group.teams.map((team, index) => {
              const isTopTwo = index < 2;
              const ratio = team.setsLost === 0 ? team.setsWon : (team.setsWon / team.setsLost).toFixed(2);

              return (
                <tr
                  key={team.id}
                  className={`border-b border-gray-800/50 transition-colors hover:bg-[#1f2833]/50
                    ${index === 0 ? 'bg-neon-blue/5' : ''}
                  `}
                >
                  <td className={`px-6 py-4 font-bold ${isTopTwo ? 'text-neon-blue' : 'text-gray-500'}`}>
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-200 flex flex-col">
                    <span className="text-white font-bold">{team.name}</span>
                    <span className="text-xs text-gray-500">{team.players.join(' & ')}</span>
                  </td>
                  <td className="px-4 py-4 text-center font-bold text-neon-orange bg-[#0b0c10]/30">
                    {team.points}
                  </td>
                  <td className="px-4 py-4 text-center text-gray-400 font-mono">
                    {team.setsWon}
                  </td>
                  <td className="px-4 py-4 text-center text-gray-400 font-mono">
                    {team.setsLost}
                  </td>
                  <td className="px-4 py-4 text-center text-gray-500 font-mono text-xs">
                    {ratio}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GroupStandings;
