import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
type Role = 'admin' | 'player' | 'guest';

interface ProtectedRouteProps {
  requiredRole?: Role;
}

const ProtectedRoute = ({ requiredRole }: ProtectedRouteProps) => {
  const { user, userRole, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#0b0c10]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-blue"></div>
      </div>
    );
  }

  // Se non si è autenticati
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Se è richiesto un ruolo specifico (es: admin) e l'utente non lo ha
  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  // Mostra i children (la rotta vera e propria)
  return <Outlet />;
};

export default ProtectedRoute;
