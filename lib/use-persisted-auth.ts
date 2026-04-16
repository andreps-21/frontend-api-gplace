'use client';

import { useEffect, useState } from 'react';
import { apiService } from './api';

export function usePersistedAuth() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Verificar se há token no localStorage
    const checkAuth = () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        // Token existe, configurar na API
        apiService.setToken(token);
      }
      setIsInitialized(true);
    };

    checkAuth();
  }, []);

  return { isInitialized };
}












