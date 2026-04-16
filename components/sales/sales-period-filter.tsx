"use client"

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, X, Check } from 'lucide-react';

export type PeriodType = 'all' | 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'this_month' | 'last_month' | 'custom';

interface SalesPeriodFilterProps {
  onPeriodChange: (dateFrom: string | null, dateTo: string | null) => void;
  initialDateFrom?: string | null;
  initialDateTo?: string | null;
}

export function SalesPeriodFilter({ 
  onPeriodChange, 
  initialDateFrom, 
  initialDateTo 
}: SalesPeriodFilterProps) {
  const [periodType, setPeriodType] = useState<PeriodType>('all');
  const [customDateFrom, setCustomDateFrom] = useState<string>('');
  const [customDateTo, setCustomDateTo] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [appliedCustomPeriod, setAppliedCustomPeriod] = useState<{ from: string; to: string } | null>(null);

  // Inicializar com valores iniciais se fornecidos
  useEffect(() => {
    if (initialDateFrom && initialDateTo) {
      setCustomDateFrom(initialDateFrom);
      setCustomDateTo(initialDateTo);
      setPeriodType('custom');
      // Também definir como período aplicado se vier do componente pai
      setAppliedCustomPeriod({ from: initialDateFrom, to: initialDateTo });
    } else if (!initialDateFrom && !initialDateTo) {
      // Se não há valores iniciais, limpar o período aplicado
      setAppliedCustomPeriod(null);
    }
  }, [initialDateFrom, initialDateTo]);

  // Função para formatar data para YYYY-MM-DD
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Função para obter data máxima (hoje)
  const getMaxDate = (): string => {
    return formatDate(new Date());
  };

  // Validar datas - conforme documentação do backend
  const validateDates = (from: string | null, to: string | null): string | null => {
    // Se ambas as datas estão vazias, não há erro
    if (!from && !to) return null;

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Validar data inicial
    if (from) {
      const fromDate = new Date(from + 'T00:00:00'); // Adicionar hora para evitar problemas de timezone
      if (isNaN(fromDate.getTime())) {
        return 'Data inicial inválida';
      }
      // Comparar apenas a data (sem hora)
      const fromDateOnly = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      if (fromDateOnly > todayOnly) {
        return 'Data inicial não pode ser futura';
      }
    }

    // Validar data final
    if (to) {
      const toDate = new Date(to + 'T00:00:00'); // Adicionar hora para evitar problemas de timezone
      if (isNaN(toDate.getTime())) {
        return 'Data final inválida';
      }
      // Comparar apenas a data (sem hora)
      const toDateOnly = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      if (toDateOnly > todayOnly) {
        return 'Data final não pode ser futura';
      }
    }

    // Validar se data inicial é maior que data final (apenas se ambas estiverem preenchidas)
    if (from && to) {
      const fromDate = new Date(from + 'T00:00:00');
      const toDate = new Date(to + 'T00:00:00');
      const fromDateOnly = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
      const toDateOnly = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
      
      if (fromDateOnly > toDateOnly) {
        return 'Data inicial não pode ser maior que data final';
      }
    }

    return null;
  };

  // Calcular datas para períodos pré-definidos
  const getPresetDates = (period: PeriodType): { from: string | null; to: string | null } => {
    const today = new Date();
    const todayStr = formatDate(today);

    switch (period) {
      case 'all':
        return { from: null, to: null };
      
      case 'today':
        return { from: todayStr, to: todayStr };
      
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const yesterdayStr = formatDate(yesterday);
        return { from: yesterdayStr, to: yesterdayStr };
      
      case 'last_7_days':
        const last7Days = new Date(today);
        last7Days.setDate(today.getDate() - 7);
        return { from: formatDate(last7Days), to: todayStr };
      
      case 'last_30_days':
        const last30Days = new Date(today);
        last30Days.setDate(today.getDate() - 30);
        return { from: formatDate(last30Days), to: todayStr };
      
      case 'this_month':
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return { from: formatDate(firstDayOfMonth), to: todayStr };
      
      case 'last_month':
        const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        return { from: formatDate(firstDayLastMonth), to: formatDate(lastDayLastMonth) };
      
      case 'custom':
        return { from: customDateFrom || null, to: customDateTo || null };
      
      default:
        return { from: null, to: null };
    }
  };

  // Handler para mudança de período pré-definido
  const handlePresetChange = (period: PeriodType) => {
    setPeriodType(period);
    setValidationError(null);
    setAppliedCustomPeriod(null); // Limpar período aplicado quando mudar de tipo

    if (period === 'custom') {
      // Não aplicar ainda, aguardar usuário preencher
      return;
    }

    const dates = getPresetDates(period);
    onPeriodChange(dates.from, dates.to);
  };

  // Handler para mudança de data personalizada
  // Não aplica automaticamente - aguarda o usuário clicar em "Aplicar"
  const handleCustomDateChange = (type: 'from' | 'to', value: string) => {
    if (type === 'from') {
      setCustomDateFrom(value);
      // Limpar período aplicado quando o usuário editar as datas
      if (appliedCustomPeriod) {
        setAppliedCustomPeriod(null);
      }
      // Validar sempre que houver uma data preenchida
      const error = validateDates(value || null, customDateTo || null);
      setValidationError(error);
    } else {
      setCustomDateTo(value);
      // Limpar período aplicado quando o usuário editar as datas
      if (appliedCustomPeriod) {
        setAppliedCustomPeriod(null);
      }
      // Validar sempre que houver uma data preenchida
      const error = validateDates(customDateFrom || null, value || null);
      setValidationError(error);
    }
  };

  // Handler para aplicar o filtro personalizado
  // Conforme documentação: pode enviar apenas date_from, apenas date_to, ou ambos
  const handleApplyCustomPeriod = () => {
    // Se não há nenhuma data preenchida, não aplicar
    if (!customDateFrom && !customDateTo) {
      setValidationError('Preencha pelo menos uma data');
      return;
    }

    // Validar antes de aplicar
    const error = validateDates(customDateFrom || null, customDateTo || null);
    if (error) {
      setValidationError(error);
      return;
    }

    setValidationError(null);
    
    // Salvar período aplicado para exibição
    // Se apenas uma data estiver preenchida, usar ela em ambos os campos para exibição
    if (customDateFrom && customDateTo) {
      setAppliedCustomPeriod({ from: customDateFrom, to: customDateTo });
    } else if (customDateFrom) {
      setAppliedCustomPeriod({ from: customDateFrom, to: customDateFrom });
    } else if (customDateTo) {
      setAppliedCustomPeriod({ from: customDateTo, to: customDateTo });
    }
    
    // Enviar para o componente pai (conforme documentação: pode ser apenas uma data)
    onPeriodChange(customDateFrom || null, customDateTo || null);
  };

  // Handler para limpar filtros
  const handleClear = () => {
    setPeriodType('all');
    setCustomDateFrom('');
    setCustomDateTo('');
    setValidationError(null);
    setAppliedCustomPeriod(null);
    onPeriodChange(null, null);
  };

  // Formatar data para exibição em BR
  const formatDateBR = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  };

  // Obter texto do período selecionado
  const getPeriodDisplayText = (): string => {
    if (periodType === 'custom') {
      if (customDateFrom && customDateTo) {
        return `${formatDateBR(customDateFrom)} até ${formatDateBR(customDateTo)}`;
      }
      return 'Período Personalizado';
    }

    const dates = getPresetDates(periodType);
    if (dates.from && dates.to) {
      if (dates.from === dates.to) {
        return formatDateBR(dates.from);
      }
      return `${formatDateBR(dates.from)} até ${formatDateBR(dates.to)}`;
    }

    return 'Todos os períodos';
  };

  return (
    <div className="flex flex-col">
      <Label className="text-sm font-medium text-muted-foreground mb-2">
        Período
      </Label>
      
      <div className="flex flex-col gap-2">
        {/* Select de período pré-definido */}
        <Select value={periodType} onValueChange={(value) => handlePresetChange(value as PeriodType)}>
          <SelectTrigger>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <SelectValue placeholder="Selecione um período" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os períodos</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="yesterday">Ontem</SelectItem>
            <SelectItem value="last_7_days">Últimos 7 dias</SelectItem>
            <SelectItem value="last_30_days">Últimos 30 dias</SelectItem>
            <SelectItem value="this_month">Este mês</SelectItem>
            <SelectItem value="last_month">Mês passado</SelectItem>
            <SelectItem value="custom">Período personalizado</SelectItem>
          </SelectContent>
        </Select>

        {/* Campos de data personalizada */}
        {periodType === 'custom' && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="date-from" className="text-xs text-muted-foreground">
                  Data Inicial
                </Label>
                <Input
                  id="date-from"
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => handleCustomDateChange('from', e.target.value)}
                  max={customDateTo && customDateTo < getMaxDate() ? customDateTo : getMaxDate()}
                  className={validationError ? 'border-red-500' : ''}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="date-to" className="text-xs text-muted-foreground">
                  Data Final
                </Label>
                <Input
                  id="date-to"
                  type="date"
                  value={customDateTo}
                  onChange={(e) => handleCustomDateChange('to', e.target.value)}
                  min={customDateFrom || undefined}
                  max={getMaxDate()}
                  className={validationError ? 'border-red-500' : ''}
                />
              </div>
            </div>
            
            {/* Botões de ação para período personalizado */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleApplyCustomPeriod}
                disabled={(!customDateFrom && !customDateTo) || !!validationError}
                className="flex-1"
              >
                <Check className="w-3 h-3 mr-1" />
                Aplicar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="flex-1"
              >
                <X className="w-3 h-3 mr-1" />
                Limpar
              </Button>
            </div>
          </div>
        )}

        {/* Mensagem de erro de validação */}
        {validationError && (
          <p className="text-xs text-red-500">{validationError}</p>
        )}
      </div>
    </div>
  );
}

