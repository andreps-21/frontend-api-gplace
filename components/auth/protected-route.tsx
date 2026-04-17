'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { isUiPreview } from '@/lib/ui-preview';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

function DashboardAuthSkeleton() {
  return (
    <div className="flex min-h-screen overflow-hidden bg-background">
      <div className="hidden w-64 shrink-0 flex-col border-r border-border bg-muted/20 md:flex">
        <Skeleton className="h-14 w-full rounded-none" />
        <div className="space-y-3 p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Skeleton className="h-14 w-full shrink-0 rounded-none border-b border-border" />
        <div className="flex-1 space-y-4 p-6">
          <Skeleton className="h-8 w-56 max-w-full" />
          <Skeleton className="h-4 w-full max-w-xl" />
          <Skeleton className="h-4 w-4/5 max-w-lg" />
          <div className="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-48 w-full max-w-4xl rounded-lg" />
        </div>
      </div>
    </div>
  );
}

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
    return <DashboardAuthSkeleton />;
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
