'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { isUiPreview } from '@/lib/ui-preview';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const AUTH_TOKEN_KEY = 'auth_token';

function readStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

function subscribeToken(callback: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }
  window.addEventListener('storage', callback);
  window.addEventListener('auth:session-invalid', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('auth:session-invalid', callback);
  };
}

function getTokenSnapshot(): string {
  return readStoredToken() ?? '';
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const preview = isUiPreview();

  const tokenSnapshot = useSyncExternalStore(
    subscribeToken,
    getTokenSnapshot,
    () => ''
  );
  const hasStoredToken = tokenSnapshot.length > 0;

  useEffect(() => {
    if (preview || isLoading) return;
    if (hasStoredToken && !isAuthenticated) return;
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, hasStoredToken, preview, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Token no storage mas utilizador ainda não hidratado (ou a sincronizar após 401)
  if (hasStoredToken && !isAuthenticated && !preview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600">A sincronizar sessão...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !preview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600">Redirecionando para login...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
