import { useState, useCallback } from 'react';
import { apiService, Person } from './api';

export interface Sale {
  id: number;
  customer_id: number;
  customer_code?: string;
  sale_date?: string;
  seller_id: number;
  establishment_id: number;
  category_id: number;
  product_id: number | null;
  product_name: string;
  quantity: number;
  unit_price: string;
  total_price: string;
  status: number;
  observations?: string;
  imei?: string;
  iccid?: string;
  payment_method?: string;
  activation_number?: string;
  provisional_number?: string;
  device_value?: string;
  meu_tim?: boolean;
  debit_automatic?: boolean;
  portability?: boolean;
  rescue?: boolean;
  created_at: string;
  updated_at: string;
  customer?: {
    id: number;
    person_id: number;
    person?: Person;
  };
  seller?: {
    id: number;
    name: string;
    email: string;
  };
  establishment?: {
    id: number;
    name: string;
  };
  category?: {
    id: number;
    name: string;
  };
}

export interface SaleUpdateData {
  quantity?: number;
  unit_price?: number;
  customer_code?: string;
  sale_date?: string;
  observations?: string;
  imei?: string;
  iccid?: string;
  payment_method?: string;
  activation_number?: string;
  provisional_number?: string;
  device_value?: number;
  meu_tim?: boolean;
  debit_automatic?: boolean;
  portability?: boolean;
  rescue?: boolean;
}

interface SalesManagementState {
  sales: Sale[];
  loading: boolean;
  error: string | null;
  pagination?: {
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
  };
}

export const useSalesManagement = () => {
  const [state, setState] = useState<SalesManagementState>({
    sales: [],
    loading: false,
    error: null,
  });


  // Listar vendas
  const fetchSales = useCallback(async (params?: {
    status?: string;
    establishment_id?: number;
    seller_id?: number;
    date_from?: string;
    date_to?: string;
    search?: string;
    page?: number;
    per_page?: number;
  }) => {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      try {
        const response = await apiService.getSales(params);
        const sales = Array.isArray(response.data) ? response.data : (response.data?.data || []);
        
        // Extrair dados de paginação se disponíveis
        const pagination = response.data?.current_page ? {
          current_page: response.data.current_page,
          last_page: response.data.last_page,
          total: response.data.total,
          per_page: response.data.per_page
        } : undefined;
        
        setState(prev => ({ ...prev, sales, pagination, loading: false }));
        return response.data;
    } catch (err: any) {
      console.error('❌ useSalesManagement: Erro ao carregar vendas:', err);
      const errorMessage = err.message || 'Erro ao carregar vendas';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
      throw err;
    }
  }, []);

  // Visualizar venda específica
  const fetchSale = useCallback(async (id: number) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await apiService.getSale(id);
      setState(prev => ({ ...prev, loading: false }));
      return response.data;
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao carregar venda';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
      throw err;
    }
  }, []);

  // Editar venda
  const updateSale = useCallback(async (id: number, data: SaleUpdateData) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await apiService.updateSale(id, data);
      
      // Recarregar lista para evitar problemas de tipos
      setState(prev => ({ ...prev, loading: false }));
      // Recarregar vendas após atualização
      setTimeout(() => fetchSales(), 100);
      
      return response.data;
    } catch (err: any) {
      console.error('❌ useSalesManagement - Erro ao atualizar venda:', err);
      const errorMessage = err.message || 'Erro ao atualizar venda';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
      throw err;
    }
  }, []);

  // Excluir venda
  const deleteSale = useCallback(async (id: number) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      await apiService.deleteSale(id);
      
      // Remover da lista local
      setState(prev => ({
        ...prev,
        sales: prev.sales.filter(sale => sale.id !== id),
        loading: false
      }));
      
      return true;
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao excluir venda';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
      throw err;
    }
  }, []);


  // Limpar estado
  const resetState = useCallback(() => {
    setState({
      sales: [],
      loading: false,
      error: null
    });
  }, []);

  return {
    ...state,
    fetchSales,
    fetchSale,
    updateSale,
    deleteSale,
    resetState
  };
};
