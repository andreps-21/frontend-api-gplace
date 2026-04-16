import { useState, useEffect } from 'react';
import { apiService } from '../lib/api';

export interface Vendedor {
  id: number;
  name: string;
  email: string;
  roles?: Array<{ name: string }>;
  is_active: boolean;
  establishment_id: number;
}

export const useVendedoresComVendas = (establishmentId: number | null) => {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVendedoresComVendas = async () => {
    if (!establishmentId) return;

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 useVendedoresComVendas - Buscando vendedores para estabelecimento:', establishmentId);

      // Buscar usuários do estabelecimento usando o método do apiService
      const usersResponse = await apiService.getEstablishmentUsers(establishmentId, {
        page: 1
      });

      const usuarios = usersResponse.data?.data || [];
      console.log('👥 Usuários do estabelecimento encontrados:', usuarios.length);

      // Filtrar apenas vendedores e gerentes ativos
      const vendedoresFiltrados = usuarios.filter((user: any) => {
        const isVendedor = user.roles?.some((role: any) => role.name === 'vendedor');
        const isGerente = user.roles?.some((role: any) => role.name === 'gerente');

        const resultado = (isVendedor || isGerente) && user.is_active;

        if (resultado) {
          console.log('✅ Vendedor incluído:', {
            id: user.id,
            name: user.name,
            roles: user.roles?.map((r: any) => r.name),
            establishment_id: user.establishment_id
          });
        }

        return resultado;
      });

      console.log('👥 Vendedores filtrados (ativos):', vendedoresFiltrados.length);
      console.log('👥 Vendedores encontrados:', vendedoresFiltrados.map((v: any) => ({ id: v.id, name: v.name })));
      setVendedores(vendedoresFiltrados);

    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Erro ao carregar vendedores';
      setError(errorMessage);
      console.error('❌ useVendedoresComVendas - Erro:', errorMessage);

      // Se token expirado (401), redirecionar para login
      if (err.response?.status === 401) {
        console.log('🔐 Token expirado, redirecionando para login...');
        window.location.href = '/login';
      }

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔄 useVendedoresComVendas useEffect executado com establishmentId:', establishmentId);
    if (establishmentId) {
      fetchVendedoresComVendas();
    } else {
      console.log('⚠️ establishmentId é null/undefined, não executando fetch');
      setLoading(false);
    }
  }, [establishmentId]);

  return { 
    vendedores, 
    loading, 
    error, 
    refetch: fetchVendedoresComVendas 
  };
};