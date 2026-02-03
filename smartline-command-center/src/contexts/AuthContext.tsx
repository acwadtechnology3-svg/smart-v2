import { useState, useContext, createContext, ReactNode, useCallback } from 'react';

export type DashboardRole = 'super_admin' | 'admin' | 'manager' | 'viewer';

export interface DashboardUser {
  id: string;
  email: string;
  full_name: string;
  role: DashboardRole;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  page: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface AuthContextType {
  user: DashboardUser | null;
  permissions: Permission[];
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (page: string, action: 'view' | 'create' | 'edit' | 'delete') => boolean;
  canViewPage: (page: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DashboardUser | null>(() => {
    const stored = localStorage.getItem('dashboard_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('dashboard_token');
  });
  const [permissions, setPermissions] = useState<Permission[]>(() => {
    const stored = localStorage.getItem('dashboard_permissions');
    return stored ? JSON.parse(stored) : [];
  });
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Login failed');
      }

      const { user, permissions, token } = data.data;
      
      setUser(user);
      setToken(token);
      setPermissions(permissions);
      
      localStorage.setItem('dashboard_user', JSON.stringify(user));
      localStorage.setItem('dashboard_token', token);
      localStorage.setItem('dashboard_permissions', JSON.stringify(permissions));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setPermissions([]);
    localStorage.removeItem('dashboard_user');
    localStorage.removeItem('dashboard_token');
    localStorage.removeItem('dashboard_permissions');
  }, []);

  const hasPermission = useCallback((page: string, action: 'view' | 'create' | 'edit' | 'delete'): boolean => {
    // Super admin has all permissions
    if (user?.role === 'super_admin') return true;
    
    const permission = permissions.find(p => p.page === page);
    if (!permission) return false;

    switch (action) {
      case 'view': return permission.can_view;
      case 'create': return permission.can_create;
      case 'edit': return permission.can_edit;
      case 'delete': return permission.can_delete;
      default: return false;
    }
  }, [permissions, user?.role]);

  const canViewPage = useCallback((page: string): boolean => {
    return hasPermission(page, 'view');
  }, [hasPermission]);

  const value: AuthContextType = {
    user,
    permissions,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    logout,
    hasPermission,
    canViewPage,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// API client with auth header
export async function apiClient(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('dashboard_token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Request failed');
  }

  return data;
}
