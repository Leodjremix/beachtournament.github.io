import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useTournamentStore } from '../store/useTournamentStore';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, PlayCircle, Settings, Users, Trophy } from 'lucide-react';

export default function Home() {
  const fetchTournaments = useTournamentStore((state) => state.fetchTournaments);
  const tournamentsList = useTournamentStore((state) => state.tournamentsList);

  const navigate = useNavigate();
  const isAdmin = useAuthStore(state => state.userRole === 'admin');

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  const activeTournaments = tournamentsList.filter(t => !t.isArchived);
  const archivedTournaments = tournamentsList.filter(t => t.isArchived);

  return (
    <div className="flex flex-col gap-8 w-full animate-fade-in">
      <div className="flex justify-between items-center bg-[rgba(255,255,255,0.02)] p-4 rounded-xl border border-[rgba(255,255,255,0.05)]">
        <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-md">
          Dashboard <span className="text-neon-blue">Tornei</span>
        </h1>
        {isAdmin && (
            <button
            onClick={() => navigate('/create')}
            className="btn-primary px-4 py-2 flex items-center gap-2"
            >
            <PlayCircle className="w-4 h-4" /> Crea Torneo
            </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeTournaments.length > 0 ? (
          activeTournaments.map(tournament => (
            <div key={tournament.id} className="glass-panel p-6 col-span-1 md:col-span-2 lg:col-span-3 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between border-neon-blue transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,243,255,0.3)]">
                <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-neon-blue text-[#0b0c10] text-xs font-bold rounded-full">IN CORSO</span>
                    <h2 className="text-2xl font-bold text-white">{tournament.name}</h2>
                </div>
                <div className="flex gap-4 mt-2 text-sm text-gray-300">
                    <div className="flex items-center gap-1"><Users className="w-4 h-4 text-neon-orange" /> {tournament.groups.reduce((acc, g) => acc + g.teams.length, 0)} Squadre</div>
                    <div className="flex items-center gap-1"><Settings className="w-4 h-4 text-neon-blue" /> {tournament.scoringSystem === 'single_set' ? 'Set Unico (21)' : 'Best of 3'}</div>
                </div>
                </div>

                <Link
                to={`/tournament/${tournament.id}`}
                className="btn-primary flex items-center gap-2 w-full md:w-auto justify-center py-3 px-6 text-lg shadow-[0_0_15px_rgba(0,243,255,0.4)]"
                >
                <PlayCircle className="w-5 h-5" />
                Gestisci / Visualizza
                </Link>
            </div>
          ))
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

        {/* Archived tournaments */}
        {archivedTournaments.map(tournament => (
            <div key={tournament.id} className="glass-panel p-6 flex flex-col gap-4 opacity-70 hover:opacity-100 transition-opacity">
                <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] pb-3">
                    <h3 className="font-bold text-white">{tournament.name}</h3>
                    <span className="text-xs px-2 py-1 bg-[rgba(255,255,255,0.1)] rounded text-gray-300">Concluso</span>
                </div>
                <div className="text-sm text-gray-400">
                    <p className="flex items-center gap-2"><Trophy className="w-4 h-4 text-neon-orange" /> {tournament.groups.reduce((acc, g) => acc + g.teams.length, 0)} Squadre • {tournament.groups.length} Gironi</p>
                </div>
                <Link to={`/tournament/${tournament.id}`} className="text-neon-blue text-sm text-left hover:underline mt-2">Vedi Storico</Link>
            </div>
        ))}
      </div>
    </div>
  );
}
