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
      <Alert className="border-blue-200 bg-blue-50 shadow-lg">
        <div className="flex items-start gap-3">
          <Download className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <AlertDescription className="text-blue-800">
              <strong>Atualização disponível!</strong>
              <br />
              Uma nova versão do sistema está disponível. Clique em "Atualizar" para obter as últimas melhorias.
            </AlertDescription>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={onUpdate}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onDismiss}
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                <X className="h-4 w-4 mr-2" />
                Depois
              </Button>
            </div>
          </div>
        </div>
      </Alert>
    </div>
  );
}






