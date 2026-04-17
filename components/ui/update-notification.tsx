"use client"

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, RefreshCw, Download } from 'lucide-react';

interface UpdateNotificationProps {
  isVisible: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
}

export function UpdateNotification({ isVisible, onUpdate, onDismiss }: UpdateNotificationProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <Alert className="border-[#262f73] bg-[#2f3a8f] text-white shadow-lg">
        <div className="flex items-start gap-3">
          <Download className="mt-0.5 h-5 w-5 shrink-0 text-white/90" />
          <div className="flex-1">
            <AlertDescription className="text-white/95 [&_strong]:text-white">
              <strong>Atualização disponível!</strong>
              <br />
              Uma nova versão do sistema está disponível. Clique em "Atualizar" para obter as últimas melhorias.
            </AlertDescription>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                onClick={onUpdate}
                className="bg-white text-[#2f3a8f] hover:bg-white/90"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onDismiss}
                className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <X className="mr-2 h-4 w-4" />
                Depois
              </Button>
            </div>
          </div>
        </div>
      </Alert>
    </div>
  );
}






