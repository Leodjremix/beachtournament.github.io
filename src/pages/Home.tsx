import { useTournamentStore } from '../store/useTournamentStore';
import { useNavigate } from 'react-router-dom';
import { Calendar, PlayCircle, Settings, Users } from 'lucide-react';

export default function Home() {
  const currentTournament = useTournamentStore((state) => state.currentTournament);
  const isAdmin = useTournamentStore((state) => state.isAdmin);
  const setAdmin = useTournamentStore((state) => state.setAdmin);
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-8 w-full animate-fade-in">
      <div className="flex justify-between items-center bg-[rgba(255,255,255,0.02)] p-4 rounded-xl border border-[rgba(255,255,255,0.05)]">
        <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-md">
          Dashboard <span className="text-neon-blue">Tornei</span>
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">Modalità Admin</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={isAdmin}
              onChange={() => setAdmin(!isAdmin)}
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-blue"></div>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentTournament ? (
          <div className="glass-panel p-6 col-span-1 md:col-span-2 lg:col-span-3 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between border-neon-blue transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,243,255,0.3)]">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-neon-blue text-[#0b0c10] text-xs font-bold rounded-full">IN CORSO</span>
                <h2 className="text-2xl font-bold text-white">{currentTournament.name}</h2>
              </div>
              <div className="flex gap-4 mt-2 text-sm text-gray-300">
                <div className="flex items-center gap-1"><Users className="w-4 h-4 text-neon-orange" /> {currentTournament.groups.reduce((acc, g) => acc + g.teams.length, 0)} Squadre</div>
                <div className="flex items-center gap-1"><Settings className="w-4 h-4 text-neon-blue" /> {currentTournament.scoringSystem === 'single_set' ? 'Set Unico (21)' : 'Best of 3'}</div>
              </div>
            </div>

            <button
              onClick={() => navigate(`/tournament/${currentTournament.id}`)}
              className="btn-primary flex items-center gap-2 w-full md:w-auto justify-center py-3 px-6 text-lg shadow-[0_0_15px_rgba(0,243,255,0.4)]"
            >
              <PlayCircle className="w-5 h-5" />
              Gestisci / Visualizza
            </button>
          </div>
        ) : (
          <div className="glass-panel p-10 col-span-1 md:col-span-2 lg:col-span-3 flex flex-col items-center justify-center text-center gap-4 border-dashed border-[rgba(255,255,255,0.2)]">
            <Calendar className="w-16 h-16 text-gray-500 mb-2" />
            <h2 className="text-xl text-gray-300 font-medium">Nessun torneo in corso</h2>
            {isAdmin && (
              <button
                onClick={() => navigate('/create')}
                className="btn-primary mt-4 text-lg px-8 py-3"
              >
                Crea Nuovo Torneo
              </button>
            )}
          </div>
        )}

        {/* Placeholder for archived tournaments */}
        <div className="glass-panel p-6 flex flex-col gap-4 opacity-70 hover:opacity-100 transition-opacity">
          <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] pb-3">
            <h3 className="font-bold text-white">Winter Cup 2024</h3>
            <span className="text-xs px-2 py-1 bg-[rgba(255,255,255,0.1)] rounded text-gray-300">Concluso</span>
          </div>
          <div className="text-sm text-gray-400">
            <p>Vincitori: Mario & Luigi</p>
            <p className="mt-1">12 Squadre • 4 Gironi</p>
          </div>
          <button className="text-neon-blue text-sm text-left hover:underline mt-2">Vedi Storico</button>
        </div>
      </div>
    </div>
  );
}
