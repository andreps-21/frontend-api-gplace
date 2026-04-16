import { useState, useEffect } from 'react';

interface UpdateNotificationState {
  isUpdateAvailable: boolean;
  isVisible: boolean;
  updateApp: () => void;
  dismissNotification: () => void;
}

export const useUpdateNotification = (isAuthenticated: boolean = false): UpdateNotificationState => {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Marcar que estamos no cliente
    setIsClient(true);
    
    // Só verificar atualizações se o usuário estiver autenticado
    if (!isAuthenticated) return;
    
    // Verificar se estamos no navegador
    if (typeof window === 'undefined') return;

    // Método simples: verificar se há uma nova versão disponível
    const checkForUpdates = () => {
      try {
        // Verificar se localStorage está disponível
        if (!window.localStorage) return;
        
        // Verificar se há uma nova versão no localStorage
        const lastVersion = localStorage.getItem('app-version');
        const currentVersion = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';
        
        if (lastVersion && lastVersion !== currentVersion) {
          setIsUpdateAvailable(true);
          setIsVisible(true);
        }
        
        // Salvar versão atual
        localStorage.setItem('app-version', currentVersion);
      } catch (error) {
        // Silently handle error
      }
    };

    // Verificar atualizações ao carregar (com delay para evitar problemas de hidratação)
    const timeoutId = setTimeout(checkForUpdates, 1000);

    // Verificar atualizações periodicamente (a cada 5 minutos)
    const interval = setInterval(checkForUpdates, 5 * 60 * 1000);

    // Verificar atualizações quando a página ganha foco
    const handleFocus = () => {
      checkForUpdates();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated]);

  const updateApp = () => {
    // Simplesmente recarregar a página para obter a nova versão
    window.location.reload();
  };

  const dismissNotification = () => {
    setIsVisible(false);
  };

  return {
    isUpdateAvailable: isClient ? isUpdateAvailable : false,
    isVisible: isClient ? isVisible : false,
    updateApp,
    dismissNotification
  };
};
