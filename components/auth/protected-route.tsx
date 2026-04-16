'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { isUiPreview } from '@/lib/ui-preview';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const preview = isUiPreview();

  useEffect(() => {
    // Aguardar um pouco mais para evitar redirecionamentos prematuros
    const timer = setTimeout(() => {
      if (!preview && !isLoading && !isAuthenticated) {
        router.replace('/login');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading, preview, router]);

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
