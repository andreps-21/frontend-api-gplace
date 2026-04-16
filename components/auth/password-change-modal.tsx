"use client"

import React, { useState, useEffect } from 'react';
import { usePasswordChange } from '@/lib/use-password-change';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PasswordChangeModal({ isOpen, onClose }: PasswordChangeModalProps) {
  const {
    loading,
    error,
    success,
    changePassword,
    resetState
  } = usePasswordChange();

  const [formData, setFormData] = useState({
    current_password: '',
    password: '',
    password_confirmation: ''
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  useEffect(() => {
    if (isOpen) {
      resetState();
      setFormData({
        current_password: '',
        password: '',
        password_confirmation: ''
      });
      setValidationErrors({});
      setShowPasswords({
        current: false,
        new: false,
        confirm: false
      });
    }
  }, [isOpen, resetState]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Limpar erro de validação quando usuário digita
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.current_password) {
      errors.current_password = 'Senha atual é obrigatória';
    }

    if (!formData.password) {
      errors.password = 'Nova senha é obrigatória';
    } else if (formData.password.length < 6) {
      errors.password = 'Nova senha deve ter pelo menos 6 caracteres';
    }

    if (!formData.password_confirmation) {
      errors.password_confirmation = 'Confirmação de senha é obrigatória';
    } else if (formData.password !== formData.password_confirmation) {
      errors.password_confirmation = 'Senhas não coincidem';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      await changePassword(formData);
      // Fechar modal após 2 segundos de sucesso
      setTimeout(() => {
        onClose();
        resetState();
      }, 2000);
    } catch (err) {
      // Erro já tratado no hook
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50/80 via-white/60 to-purple-50/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white/70 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Alterar Senha</h2>
            <p className="text-sm text-muted-foreground">
              Digite sua senha atual e defina uma nova senha
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Mensagens de Sucesso/Erro */}
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                ✅ Senha alterada com sucesso!
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Senha Atual */}
            <div>
              <Label htmlFor="current_password">Senha Atual *</Label>
              <div className="relative">
                <Input
                  id="current_password"
                  name="current_password"
                  type={showPasswords.current ? "text" : "password"}
                  value={formData.current_password}
                  onChange={handleInputChange}
                  className={`pr-10 ${validationErrors.current_password ? 'border-red-500' : ''}`}
                  placeholder="Digite sua senha atual"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => togglePasswordVisibility('current')}
                  className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {validationErrors.current_password && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.current_password}</p>
              )}
            </div>

            {/* Nova Senha */}
            <div>
              <Label htmlFor="password">Nova Senha *</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPasswords.new ? "text" : "password"}
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`pr-10 ${validationErrors.password ? 'border-red-500' : ''}`}
                  placeholder="Digite sua nova senha"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {validationErrors.password && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.password}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Mínimo de 6 caracteres
              </p>
            </div>

            {/* Confirmação da Nova Senha */}
            <div>
              <Label htmlFor="password_confirmation">Confirmar Nova Senha *</Label>
              <div className="relative">
                <Input
                  id="password_confirmation"
                  name="password_confirmation"
                  type={showPasswords.confirm ? "text" : "password"}
                  value={formData.password_confirmation}
                  onChange={handleInputChange}
                  className={`pr-10 ${validationErrors.password_confirmation ? 'border-red-500' : ''}`}
                  placeholder="Confirme sua nova senha"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {validationErrors.password_confirmation && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.password_confirmation}</p>
              )}
            </div>

            {/* Botões */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {loading ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
