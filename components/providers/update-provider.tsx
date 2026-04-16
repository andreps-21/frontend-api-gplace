"use client"

import React from 'react';
import { useUpdateNotification } from '@/lib/use-update-notification';
import { UpdateNotification } from '@/components/ui/update-notification';
import { useAuth } from '@/lib/auth';

interface UpdateProviderProps {
  children: React.ReactNode;
}

export function UpdateProvider({ children }: UpdateProviderProps) {
  const { isAuthenticated } = useAuth();
  const { isUpdateAvailable, isVisible, updateApp, dismissNotification } = useUpdateNotification(isAuthenticated);

  return (
    <>
      {children}
      <UpdateNotification
        isVisible={isVisible && isUpdateAvailable}
        onUpdate={updateApp}
        onDismiss={dismissNotification}
      />
    </>
  );
}
