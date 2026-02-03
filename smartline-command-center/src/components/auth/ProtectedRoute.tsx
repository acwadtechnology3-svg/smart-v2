import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, type DashboardRole } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: DashboardRole[];
  requiredPage?: string;
}

export default function ProtectedRoute({ 
  children, 
  requiredRoles,
  requiredPage 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, canViewPage } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role requirements
  if (requiredRoles && requiredRoles.length > 0) {
    if (!user?.role || !requiredRoles.includes(user.role)) {
      return <Navigate to="/" replace />;
    }
  }

  // Check page permission
  if (requiredPage && !canViewPage(requiredPage)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
