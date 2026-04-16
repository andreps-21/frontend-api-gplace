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

  // Carregar dados do usuário ao inicializar
  useEffect(() => {
    if (!isInitialized) return;

    const loadUser = async () => {
      try {
        setIsLoading(true);
        const token = apiService.getToken();
        if (token) {
          const response = await apiService.getProfile();
          console.log('📥 Resposta do /auth/profile:', response);
          console.log('📥 Dados do usuário:', response.data);
          console.log('🎯 Role do usuário:', response.data?.role);
          console.log('🎯 Roles do usuário:', response.data?.roles);
          console.log('🏢 Estabelecimento do usuário:', response.data?.establishment);
          setUser(response.data);
        } else {
          setUser(null);
        }
      } catch (error) {
        // Token inválido ou expirado
        console.log('Token inválido, fazendo logout automático');
        apiService.clearToken();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();

    // Listener para mudanças no localStorage (sincronização entre abas)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token') {
        if (e.newValue) {
          // Token foi adicionado em outra aba
          loadUser();
        } else {
          // Token foi removido em outra aba
          setUser(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
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
        console.log('📥 Perfil completo carregado:', profileResponse);
        console.log('📥 Dados do usuário:', profileResponse.data);
        console.log('🎯 Role do usuário:', profileResponse.data?.role);
        console.log('🎯 Roles do usuário:', profileResponse.data?.roles);
        setUser(profileResponse.data);
      } catch (profileError) {
        console.warn('⚠️ Erro ao carregar perfil completo, usando dados básicos:', profileError);
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
