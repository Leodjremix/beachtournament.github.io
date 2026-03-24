import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useTournamentStore } from './store/useTournamentStore';
import { Volleyball, Trophy, Plus, LayoutDashboard } from 'lucide-react';
import Home from './pages/Home';
import CreateTournament from './pages/CreateTournament';
import TournamentView from './pages/TournamentView';

function App() {
  const isAdmin = useTournamentStore((state) => state.isAdmin);

  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        {/* Navbar */}
        <nav className="glass-panel m-4 p-4 flex justify-between items-center sticky top-4 z-50">
          <Link to="/" className="flex items-center gap-3">
            <div className="p-2 bg-neon-blue rounded-full">
              <Volleyball className="w-6 h-6 text-[#0b0c10]" />
            </div>
            <span className="text-xl font-bold tracking-wider text-white">BEACH<span className="text-neon-orange">VOLLEY</span></span>
          </Link>

          <div className="flex gap-4">
            <Link to="/" className="btn-primary flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            {isAdmin && (
              <Link to="/create" className="btn-secondary flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nuovo Torneo</span>
              </Link>
            )}
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-grow p-4 md:p-8 flex flex-col items-center">
          <div className="w-full max-w-6xl">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/create" element={<CreateTournament />} />
              <Route path="/tournament/:id" element={<TournamentView />} />
            </Routes>
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-auto py-6 text-center text-sm text-gray-500 glass-panel mx-4 mb-4">
          <p>© {new Date().getFullYear()} Beach Volley Tournaments</p>
          <div className="mt-2 text-neon-blue text-xs flex justify-center items-center gap-2">
            <Trophy className="w-4 h-4" /> Serverless SPA System
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
