import { useState, useCallback } from 'react';
import { apiService } from './api';

export interface PasswordChangeData {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export interface PasswordChangeState {
  loading: boolean;
  error: string | null;
  success: boolean;
}

export const usePasswordChange = () => {
  const [state, setState] = useState<PasswordChangeState>({
    loading: false,
    error: null,
    success: false
  });

  const setLoading = (loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  };

  const setError = (error: string | null) => {
    setState(prev => ({ ...prev, error }));
  };

  const setSuccess = (success: boolean) => {
    setState(prev => ({ ...prev, success }));
  };

  const changePassword = async (passwordData: PasswordChangeData) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const response = await apiService.changePassword(passwordData);
      setSuccess(true);
      return response;
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao alterar senha';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resetState = useCallback(() => {
    setState({
      loading: false,
      error: null,
      success: false
    });
  }, []);

  return {
    ...state,
    changePassword,
    resetState
  };
};
