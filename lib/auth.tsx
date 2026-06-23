'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiService, User, LoginRequest, RegisterRequest, ApiError } from '@/lib/api';
import { usePersistedAuth } from './use-persisted-auth';

const AUTH_USER_SNAPSHOT_KEY = 'auth_user_snapshot';
const AUTH_USER_SNAPSHOT_MAX_AGE_MS = 2 * 60 * 1000;

type UserSnapshot = {
  user: User;
  syncedAt: number;
};

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function isUserSnapshot(value: unknown): value is UserSnapshot {
  return (
    typeof value === 'object' &&
    value !== null &&
    'user' in value &&
    'syncedAt' in value &&
    typeof (value as UserSnapshot).syncedAt === 'number'
  );
}

function readUserSnapshot(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_USER_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isUserSnapshot(parsed)) {
      localStorage.removeItem(AUTH_USER_SNAPSHOT_KEY);
      return null;
    }
    if (Date.now() - parsed.syncedAt > AUTH_USER_SNAPSHOT_MAX_AGE_MS) {
      localStorage.removeItem(AUTH_USER_SNAPSHOT_KEY);
      return null;
    }
    return parsed.user;
  } catch {
    return null;
  }
}

function writeUserSnapshot(user: User | null) {
  if (typeof window === 'undefined') return;
  if (!user) {
    localStorage.removeItem(AUTH_USER_SNAPSHOT_KEY);
    return;
  }
  try {
    localStorage.setItem(AUTH_USER_SNAPSHOT_KEY, JSON.stringify({ user, syncedAt: Date.now() }));
  } catch {
    // ignore quota / private mode
  }
}

function userHasSyncedPermissions(user: User | null | undefined): boolean {
  return Array.isArray(user?.permissions);
}

async function fetchProfileWithRetry(): Promise<User> {
  try {
    const response = await apiService.getProfile();
    return response.data;
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.status !== 429) {
      throw error;
    }
    await sleep(1200);
    const response = await apiService.getProfile();
    return response.data;
  }
}

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
          if (!cancelled) {
            setUser(null);
            writeUserSnapshot(null);
          }
          return;
        }
        const profile = await fetchProfileWithRetry();
        if (!cancelled) {
          setUser(profile);
          writeUserSnapshot(profile);
        }
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
        // Só invalidar sessão com 401 (token inválido/expirado). Outros erros não devem apagar o token.
        if (status === 401) {
          apiService.clearToken();
          setUser(null);
          writeUserSnapshot(null);
          return;
        }
        const cached = readUserSnapshot();
        if (cached) {
          setUser(cached);
          if (process.env.NODE_ENV === 'development') {
            console.warn(
              '[auth] Não foi possível atualizar o perfil; a usar dados em cache até à próxima sincronização.',
              err.message
            );
          }
        } else {
          setUser(null);
        }
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
          writeUserSnapshot(null);
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
        const profile = await fetchProfileWithRetry();
        setUser(profile);
        writeUserSnapshot(profile);
      } catch {
        const fallback = response.data.user;
        setUser(userHasSyncedPermissions(fallback) ? fallback : null);
        writeUserSnapshot(null);
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
      writeUserSnapshot(null);
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
