import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/lib/api';

export interface VendasPaginacaoState {
  vendas: any[];
  loading: boolean;
  error: string | null;
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
  };
}

export interface FiltrosVendas {
  search?: string;
  establishment_id?: number;
  seller_id?: number;
  category_id?: number;
  customer_id?: number;
  date_from?: string;
  date_to?: string;
  status?: string;
}

export const useVendasPaginacao = () => {
  const [state, setState] = useState<VendasPaginacaoState>({
    vendas: [],
    loading: false,
    error: null,
    pagination: {
      current_page: 1,
      last_page: 1,
      per_page: 15,
      total: 0,
      from: 0,
      to: 0
    }
  });

  const carregarVendas = useCallback(async (page = 1, filtros: FiltrosVendas = {}) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Construir parâmetros da URL
      const params = {
        page: page,
        per_page: 15, // Usar 15 por página conforme documentação
        ...filtros
      };


      // Fazer requisição
      const response = await apiService.getSales(params);


      if (response.data && response.data.data) {
        // Atualizar estado com dados da API
        setState(prev => ({
          ...prev,
          vendas: response.data.data,
          pagination: {
            current_page: response.data.current_page || 1,
            last_page: response.data.last_page || 1,
            per_page: response.data.per_page || 15,
            total: response.data.total || 0,
            from: response.data.from || 0,
            to: response.data.to || 0
          },
          loading: false
        }));

      } else {
        throw new Error('Resposta da API não contém dados válidos');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao carregar vendas';
      
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false
      }));
    }
  }, []);

  const proximaPagina = useCallback(() => {
    if (state.pagination.current_page < state.pagination.last_page) {
      carregarVendas(state.pagination.current_page + 1);
    }
  }, [state.pagination.current_page, state.pagination.last_page, carregarVendas]);

  const paginaAnterior = useCallback(() => {
    if (state.pagination.current_page > 1) {
      carregarVendas(state.pagination.current_page - 1);
    }
  }, [state.pagination.current_page, carregarVendas]);

  const irParaPagina = useCallback((page: number) => {
    if (page >= 1 && page <= state.pagination.last_page) {
      carregarVendas(page);
    }
  }, [state.pagination.last_page, carregarVendas]);

  const aplicarFiltros = useCallback((filtros: FiltrosVendas) => {
    carregarVendas(1, filtros); // Sempre voltar para a primeira página ao aplicar filtros
  }, [carregarVendas]);

  const limparFiltros = useCallback(() => {
    carregarVendas(1, {}); // Carregar primeira página sem filtros
  }, [carregarVendas]);

  // Carregar vendas na inicialização
  useEffect(() => {
    carregarVendas();
  }, []);

  return {
    vendas: state.vendas,
    loading: state.loading,
    error: state.error,
    pagination: state.pagination,
    carregarVendas,
    proximaPagina,
    paginaAnterior,
    irParaPagina,
    aplicarFiltros,
    limparFiltros
  };
};



