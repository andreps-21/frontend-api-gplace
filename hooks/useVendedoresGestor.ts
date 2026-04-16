import { useState, useEffect } from 'react';
import { apiService } from '../lib/api';

interface Vendedor {
  id: number;
  name: string;
  email: string;
  establishment_id: number;
  establishment_name: string;
}

interface VendedorFormatado {
  id: number | null;
  name: string;
  establishment_id?: number;
}

export const useVendedoresGestor = () => {
  const [vendedores, setVendedores] = useState<VendedorFormatado[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregarTodosVendedores = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 1. Buscar todos os estabelecimentos
      const establishmentsResponse = await apiService.getEstablishments();
      const establishments = establishmentsResponse.data?.data || establishmentsResponse.data || [];
      
      if (establishments.length === 0) {
        throw new Error('Nenhum estabelecimento encontrado');
      }
      
      // 2. Buscar vendedores de todos os estabelecimentos
      const allVendedores: Vendedor[] = [];
      
      for (const establishment of establishments) {
        try {
          const usersResponse = await apiService.getEstablishmentUsers(establishment.id);
          const users = usersResponse.data?.data || usersResponse.data || [];
          
          // Filtrar vendedores E gerentes ativos
          const vendedores = users.filter((user: any) => {
            // Incluir usuários com role vendedor
            const isVendedor = user.roles && user.roles.some((role: any) => role.name === 'vendedor');
            
            // Incluir gerentes que fazem vendas
            const isGerente = user.roles && user.roles.some((role: any) => role.name === 'gerente');
            
            // Incluir vendedores OU gerentes ativos
            return (isVendedor || isGerente) && user.is_active !== false;
          });
          
          // Adicionar nome do estabelecimento ao vendedor
          vendedores.forEach((vendedor: any) => {
            allVendedores.push({
              id: vendedor.id,
              name: vendedor.name,
              email: vendedor.email,
              establishment_id: vendedor.establishment_id,
              establishment_name: establishment.name
            });
          });
        } catch (err) {
          // Erro silencioso para estabelecimentos individuais
        }
      }
      
      // 3. Formatar para dropdown
      const vendedoresFormatados: VendedorFormatado[] = [
        { id: null, name: 'todos' },
        ...allVendedores.map(v => ({
          id: v.id,
          name: `${v.name} (${v.establishment_name})`,
          establishment_id: v.establishment_id
        }))
      ];
      
      setVendedores(vendedoresFormatados);
      
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Erro ao carregar vendedores';
      setError(errorMessage);
      
      // Fallback para lista vazia em caso de erro
      setVendedores([{ id: null, name: 'todos' }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarTodosVendedores();
  }, []);

  return { 
    vendedores, 
    loading, 
    error, 
    refetch: carregarTodosVendedores 
  };
};
