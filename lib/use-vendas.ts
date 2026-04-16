import { useState, useCallback } from 'react';
import { apiService } from './api';

export interface VendaData {
  customer_id: number;
  establishment_id: number;
  category_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  meu_tim: boolean;
  debit_automatic: boolean;
  portability: boolean;
  rescue: boolean;
  payment_method?: string;
  observations?: string;
  sale_date?: string;
  activation_number?: string;
  imei?: string;
  device_value?: number;
  provisional_number?: string;
}

export interface Venda {
  id: number;
  customer_id: number;
  establishment_id: number;
  category_id: number;
  product_name: string;
  quantity: number;
  unit_price: string;
  total_price: string;
  meu_tim: boolean;
  debit_automatic: boolean;
  portability: boolean;
  rescue: boolean;
  payment_method?: string;
  observations?: string;
  sale_date?: string;
  activation_number?: string;
  imei?: string;
  device_value?: string;
  provisional_number?: string;
  created_at: string;
  updated_at: string;
  customer?: {
    id: number;
    person?: {
      name: string;
    };
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

export const useVendas = () => {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Sanitizar dados da venda conforme documento
   */
  const sanitizarDadosVenda = useCallback((dados: Partial<VendaData>): VendaData => {
    return {
      customer_id: dados.customer_id || 0,
      establishment_id: dados.establishment_id || 0,
      category_id: dados.category_id || 0,
      product_name: dados.product_name || '',
      quantity: parseInt(String(dados.quantity)) || 1,
      unit_price: parseFloat(String(dados.unit_price)) || 0,
      // ✅ GARANTIR QUE CAMPOS TIM SEJAM BOOLEAN (conforme documento)
      meu_tim: Boolean(dados.meu_tim),
      debit_automatic: Boolean(dados.debit_automatic),
      portability: Boolean(dados.portability),
      rescue: Boolean(dados.rescue),
      payment_method: dados.payment_method,
      observations: dados.observations,
      sale_date: dados.sale_date,
      activation_number: dados.activation_number,
      imei: dados.imei,
      device_value: dados.device_value,
      provisional_number: dados.provisional_number,
    };
  }, []);

  /**
   * Validar campos TIM conforme documento
   */
  const validarCamposTIM = useCallback((dados: Partial<VendaData>) => {
    const erros: Record<string, string> = {};

    // Campos TIM são opcionais, mas se enviados devem ser boolean
    if (dados.meu_tim !== undefined && typeof dados.meu_tim !== 'boolean') {
      erros.meu_tim = 'Meu TIM deve ser true ou false';
    }

    if (dados.debit_automatic !== undefined && typeof dados.debit_automatic !== 'boolean') {
      erros.debit_automatic = 'Débito Automático deve ser true ou false';
    }

    if (dados.portability !== undefined && typeof dados.portability !== 'boolean') {
      erros.portability = 'Portabilidade deve ser true ou false';
    }

    if (dados.rescue !== undefined && typeof dados.rescue !== 'boolean') {
      erros.rescue = 'Resgate deve ser true ou false';
    }

    return erros;
  }, []);

  /**
   * Criar venda com validação e sanitização
   */
  const criarVenda = useCallback(async (dadosVenda: Partial<VendaData>) => {
    setLoading(true);
    setError(null);
    
    try {
      // Validar campos TIM
      const errosTIM = validarCamposTIM(dadosVenda);
      if (Object.keys(errosTIM).length > 0) {
        throw new Error(`Erro de validação: ${Object.values(errosTIM).join(', ')}`);
      }

      // Sanitizar dados
      const dadosSanitizados = sanitizarDadosVenda(dadosVenda);

      console.log('🔍 useVendas - Criando venda com dados sanitizados:', {
        meu_tim: dadosSanitizados.meu_tim,
        debit_automatic: dadosSanitizados.debit_automatic,
        portability: dadosSanitizados.portability,
        rescue: dadosSanitizados.rescue
      });

      const response = await apiService.createSale(dadosSanitizados);
      
      console.log('✅ useVendas - Venda criada com sucesso:', {
        id: response.data?.id,
        meu_tim: response.data?.meu_tim,
        debit_automatic: response.data?.debit_automatic,
        portability: response.data?.portability,
        rescue: response.data?.rescue
      });

      // Atualizar lista local
      if (response.data) {
        setVendas(prev => [response.data as unknown as Venda, ...prev]);
      }

      return response.data;
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao criar venda';
      setError(errorMessage);
      console.error('❌ useVendas - Erro ao criar venda:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sanitizarDadosVenda, validarCamposTIM]);

  /**
   * Buscar vendas
   */
  const buscarVendas = useCallback(async (params?: {
    status?: string;
    establishment_id?: number;
    seller_id?: number;
    date_from?: string;
    date_to?: string;
    page?: number;
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getSales(params);
      const vendasData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      
      console.log('✅ useVendas - Vendas carregadas:', {
        total: vendasData?.length || 0,
        campos_tim: vendasData?.slice(0, 3).map((venda: Venda) => ({
          id: venda.id,
          product_name: venda.product_name,
          meu_tim: venda.meu_tim,
          debit_automatic: venda.debit_automatic,
          portability: venda.portability,
          rescue: venda.rescue
        }))
      });

      setVendas(vendasData);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao buscar vendas';
      setError(errorMessage);
      console.error('❌ useVendas - Erro ao buscar vendas:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Atualizar venda
   */
  const atualizarVenda = useCallback(async (id: number, dadosVenda: Partial<VendaData>) => {
    setLoading(true);
    setError(null);
    
    try {
      // Validar campos TIM
      const errosTIM = validarCamposTIM(dadosVenda);
      if (Object.keys(errosTIM).length > 0) {
        throw new Error(`Erro de validação: ${Object.values(errosTIM).join(', ')}`);
      }

      // Sanitizar dados
      const dadosSanitizados = sanitizarDadosVenda(dadosVenda);

      const response = await apiService.updateSale(id, dadosSanitizados);
      
      // Atualizar lista local
      if (response.data) {
        setVendas(prev => prev.map(venda => 
          venda.id === id ? response.data as unknown as Venda : venda
        ));
      }

      return response.data;
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao atualizar venda';
      setError(errorMessage);
      console.error('❌ useVendas - Erro ao atualizar venda:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sanitizarDadosVenda, validarCamposTIM]);

  /**
   * Excluir venda
   */
  const excluirVenda = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    
    try {
      await apiService.deleteSale(id);
      
      // Remover da lista local
      setVendas(prev => prev.filter(venda => venda.id !== id));
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao excluir venda';
      setError(errorMessage);
      console.error('❌ useVendas - Erro ao excluir venda:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Renderizar campos TIM para exibição
   */
  const renderizarCamposTIM = useCallback((venda: Venda) => {
    const camposAtivos = [];
    
    if (venda.meu_tim) camposAtivos.push('Meu TIM');
    if (venda.debit_automatic) camposAtivos.push('Débito Automático');
    if (venda.portability) camposAtivos.push('Portabilidade');
    if (venda.rescue) camposAtivos.push('Resgate');

    return camposAtivos;
  }, []);

  return {
    vendas,
    loading,
    error,
    criarVenda,
    buscarVendas,
    atualizarVenda,
    excluirVenda,
    renderizarCamposTIM,
    sanitizarDadosVenda,
    validarCamposTIM
  };
};
