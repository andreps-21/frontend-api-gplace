'use client';

import { ReactNode } from 'react';
import { usePermissions } from '@/lib/use-permissions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Shield } from 'lucide-react';

interface ProtectedPageProps {
  children: ReactNode;
  requiredPermission: string;
  fallbackMessage?: string;
}

export function ProtectedPage({ 
  children, 
  requiredPermission, 
  fallbackMessage = 'Você não tem permissão para acessar esta página.' 
}: ProtectedPageProps) {
  const { canAccessSpecificModule } = usePermissions();

  if (!canAccessSpecificModule(requiredPermission)) {
    return (
      <div className="p-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <span className="font-medium">Acesso Negado</span>
            </div>
            <p className="mt-2">{fallbackMessage}</p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
