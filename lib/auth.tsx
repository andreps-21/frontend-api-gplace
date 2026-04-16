'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiService, User, LoginRequest, RegisterRequest, ApiError } from '@/lib/api';
import { usePersistedAuth } from './use-persisted-auth';

// Interface para o contexto de autenticação
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

// Contexto de autenticação
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook para usar o contexto de autenticação
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}

// Props do provider
interface AuthProviderProps {
  children: ReactNode;
}

// Provider de autenticação
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isInitialized } = usePersistedAuth();

  const isAuthenticated = !!user;

  // Quando o axios remove o token (401), manter contexto alinhado ao localStorage
  useEffect(() => {
    const onSessionInvalid = () => {
      setUser(null);
      setIsLoading(false);
    };
    window.addEventListener('auth:session-invalid', onSessionInvalid);
    return () => window.removeEventListener('auth:session-invalid', onSessionInvalid);
  }, []);

  // Carregar dados do usuário ao inicializar
  useEffect(() => {
    if (!isInitialized) return;

    let cancelled = false;

    const loadUser = async () => {
      try {
        setIsLoading(true);
        const token = apiService.getToken();
        if (!token) {
          if (!cancelled) setUser(null);
          return;
        }
        const response = await apiService.getProfile();
        if (!cancelled) setUser(response.data);
      } catch (e) {
        if (cancelled) return;
        const err = e as ApiError;
        const status = err.status;
        if (status === 403) {
          console.error(
            '[auth] 403 na API — em produção falta ou está errado NEXT_PUBLIC_APP_TOKEN (header `app` = stores.app_token).',
            err.message
          );
        }
        if (status === 401) {
          apiService.clearToken();
          setUser(null);
          return;
        }
        apiService.clearToken();
        setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadUser();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token') {
        if (e.newValue) {
          void loadUser();
        } else {
          setUser(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      cancelled = true;
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isInitialized]);

  // Função de login
  const login = async (credentials: LoginRequest) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiService.login(credentials);
      
      // Buscar perfil completo com establishment após login
      try {
        const profileResponse = await apiService.getProfile();
        setUser(profileResponse.data);
      } catch {
        setUser(response.data.user);
      }
    } catch (error) {
      const apiError = error as ApiError;
      setError(apiError.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Função de registro
  const register = async (userData: RegisterRequest) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await apiService.register(userData);
      // Após registro, fazer login automaticamente
      await login({
        email: userData.email || `${userData.number_inscription}@sigre.com`,
        password: userData.password,
      });
    } catch (error) {
      const apiError = error as ApiError;
      setError(apiError.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Função de logout
  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      // Ignorar erros de logout
    } finally {
      setUser(null);
      setError(null);
    }
  };

  // Função para limpar erros
  const clearError = () => {
    setError(null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    error,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
