import { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Volleyball, Trophy, Plus, LayoutDashboard, LogOut, LogIn } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from './lib/firebase';

import Home from './pages/Home';
import CreateTournament from './pages/CreateTournament';
import TournamentView from './pages/TournamentView';
import Login from './pages/Login';
import PlayerDashboard from './pages/PlayerDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import TestLiveScore from './pages/TestLiveScore';

import { useAuthStore } from './store/useAuthStore';

function App() {
  const { user, userRole, initAuthListener } = useAuthStore();

  useEffect(() => {
    initAuthListener();
  }, [initAuthListener]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error", error);
    }
  };

  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        {/* Navbar */}
        <nav className="glass-panel m-4 p-4 flex justify-between items-center sticky top-4 z-50">
          <Link to="/" className="flex items-center gap-3">
            <div className="relative p-1 bg-transparent rounded-full border-2 border-neon-blue shadow-[0_0_10px_rgba(0,243,255,0.6)] hover:shadow-[0_0_15px_rgba(255,94,0,0.6)] transition-all duration-300 overflow-hidden w-10 h-10 flex items-center justify-center">
               {/* Try to load custom logo.png, fallback to Volleyball icon if it fails to load or isn't there (using onError) */}
               <img
                  src={`${import.meta.env.BASE_URL}logo.png`}
                  alt="Logo"
                  className="w-full h-full object-contain drop-shadow-[0_0_5px_rgba(0,243,255,0.8)]"
                  onError={(e) => {
                     e.currentTarget.style.display = 'none';
                     if (e.currentTarget.nextElementSibling) {
                         (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'block';
                     }
                  }}
               />
               <Volleyball className="w-6 h-6 text-neon-blue drop-shadow-[0_0_8px_rgba(0,243,255,0.8)]" style={{ display: 'none' }} />
            </div>
            <span className="text-xl font-bold tracking-wider text-white">BEACH<span className="text-neon-orange">VOLLEY</span></span>
          </Link>

          <div className="flex gap-4 items-center">
            <Link to="/" className="text-gray-300 hover:text-white flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>

            {userRole === 'admin' && (
              <Link to="/create" className="btn-secondary flex items-center gap-2 ml-2">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nuovo Torneo</span>
              </Link>
            )}

            {userRole === 'player' && (
              <Link to="/dashboard" className="btn-secondary flex items-center gap-2 ml-2 bg-[rgba(0,243,255,0.1)] border-neon-blue text-neon-blue">
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Area Giocatore</span>
              </Link>
            )}

            {user ? (
              <button onClick={handleLogout} className="ml-4 text-gray-400 hover:text-neon-orange flex items-center gap-1 transition-colors">
                <LogOut className="w-4 h-4" />
                <span className="text-sm hidden sm:inline">Esci</span>
              </button>
            ) : (
              <Link to="/login" className="ml-4 text-neon-blue hover:text-white flex items-center gap-1 transition-colors">
                <LogIn className="w-4 h-4" />
                <span className="text-sm hidden sm:inline">Login / Registrati</span>
              </Link>
            )}
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-grow p-4 md:p-8 flex flex-col items-center">
          <div className="w-full max-w-6xl">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/tournament/:id" element={<TournamentView />} />
              <Route path="/test-livescore" element={<TestLiveScore />} />

              {/* Protected Routes (Admin Only) */}
              <Route element={<ProtectedRoute requiredRole="admin" />}>
                <Route path="/create" element={<CreateTournament />} />
              </Route>

              {/* Protected Routes (Player Only) */}
              <Route element={<ProtectedRoute requiredRole="player" />}>
                <Route path="/dashboard" element={<PlayerDashboard />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
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
