import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Volleyball, UserPlus } from 'lucide-react';

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegister) {
        // Registrazione nuovo giocatore
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Crea il documento Player in Firestore con Avatar autogenerato
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName,
          role: 'player',
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`
        });
        navigate('/dashboard');
      } else {
        // Login
        const userCredential = await signInWithEmailAndPassword(auth, email, password);

        // Fetch role to determine redirect
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (userDoc.exists() && userDoc.data().role === 'player') {
          navigate('/dashboard');
        } else {
          navigate('/');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Errore durante autenticazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-full pt-10 px-4">
      <div className="glass-panel p-8 w-full max-w-md bg-[rgba(11,12,16,0.8)] border-[rgba(0,243,255,0.2)]">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-neon-blue rounded-full shadow-[0_0_15px_rgba(0,243,255,0.5)]">
            <Volleyball className="w-8 h-8 text-[#0b0c10]" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center text-white mb-6">
          {isRegister ? 'Registrazione Giocatore' : 'Accesso'}
        </h2>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-100 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nome Cognome (Giocatore)</label>
              <input
                type="text"
                required
                className="w-full bg-[#1f2833] border border-[rgba(255,255,255,0.1)] rounded-md px-4 py-2 text-white focus:outline-none focus:border-neon-blue transition-colors"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="es. Mario Rossi"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full bg-[#1f2833] border border-[rgba(255,255,255,0.1)] rounded-md px-4 py-2 text-white focus:outline-none focus:border-neon-blue transition-colors"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full bg-[#1f2833] border border-[rgba(255,255,255,0.1)] rounded-md px-4 py-2 text-white focus:outline-none focus:border-neon-blue transition-colors"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3 mt-6 flex justify-center items-center gap-2 bg-neon-blue text-[#0b0c10] hover:bg-transparent hover:text-neon-blue border hover:border-neon-blue transition-all"
          >
            {isRegister ? <UserPlus className="w-5 h-5" /> : null}
            {loading ? 'Attendi...' : (isRegister ? 'Registrati' : 'Accedi')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="text-neon-blue hover:text-white text-sm transition-colors"
          >
            {isRegister
              ? 'Hai già un account? Accedi.'
              : 'Sei un giocatore? Registrati qui.'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
