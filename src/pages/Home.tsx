import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useTournamentStore } from '../store/useTournamentStore';
import { Trophy, Clock, Trash2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuthStore();
  const { tournamentsList, fetchTournaments, deleteTournament } = useTournamentStore();

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  if (!user) return <div className="text-white text-center mt-10">Accesso Negato</div>;

  const isAdmin = userRole === 'admin';
  const activeTournaments = tournamentsList.filter(t => !t.isArchived);
  const archivedTournaments = tournamentsList.filter(t => t.isArchived);

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-8 animate-fade-in p-4">
      <section className="glass-panel p-8 flex flex-col md:flex-row justify-between items-center gap-6 border-l-[4px] border-l-neon-blue relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-neon-blue opacity-5 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="z-10">
          <h1 className="text-3xl font-bold text-white mb-1">Dashboard Tornei</h1>
          <span className="px-3 py-1 bg-[rgba(0,243,255,0.1)] text-neon-blue rounded-full text-xs font-medium border border-[rgba(0,243,255,0.2)]">
            {isAdmin ? 'Amministratore' : 'Utente / Giocatore'}
          </span>
        </div>
        {isAdmin && (
            <button onClick={() => navigate('/create')} className="z-10 btn-primary flex items-center gap-2">
                <Plus className="w-5 h-5" /> Nuovo Torneo
            </button>
        )}
      </section>

      <div className="flex flex-col gap-6">
        <div className="glass-panel p-6 border-t-[3px] border-t-neon-blue">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-neon-blue" />
            Tornei Attivi
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeTournaments.map(t => (
              <div key={t.id} className="bg-[#0b0c10]/80 p-4 rounded-xl border border-neon-blue/20 relative hover:bg-[#1f2833] transition-colors cursor-pointer" onClick={() => navigate(`/tournament/${t.id}`)}>
                <h3 className="text-lg font-bold text-white mb-2">{t.name}</h3>
                <div className="text-xs text-gray-400 mb-4 flex flex-col gap-1">
                  <span>Gironi: {t.groupStageMode === 'single_set' ? 'Set Unico' : 'Best of 3'}</span>
                  <span>Squadre Qualificate per girone: {t.qualificationRules?.qualifiersPerGroup}</span>
                </div>
                {isAdmin && (
                  <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if(window.confirm(`Sei sicuro di voler eliminare definitivamente il torneo ${t.name}?`)) {
                            deleteTournament(t.id, t.apiKey);
                        }
                    }}
                    className="absolute top-4 right-4 text-gray-500 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {activeTournaments.length === 0 && <p className="text-sm text-gray-500">Nessun torneo attivo.</p>}
          </div>
        </div>

        <div className="glass-panel p-6 border-t-[3px] border-t-neon-orange">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-neon-orange" />
            Storico Tornei (Archiviati)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {archivedTournaments.map(t => (
              <div key={t.id} className="bg-[#0b0c10]/80 p-4 rounded-xl border border-neon-orange/20 relative opacity-70 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => navigate(`/tournament/${t.id}`)}>
                <h3 className="text-lg font-bold text-white mb-2">{t.name}</h3>
                {isAdmin && (
                  <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if(window.confirm(`Eliminare definitivamente dall'archivio?`)) {
                            deleteTournament(t.id, t.apiKey);
                        }
                    }}
                    className="absolute top-4 right-4 text-gray-500 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {archivedTournaments.length === 0 && <p className="text-sm text-gray-500">Nessun torneo in archivio.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
