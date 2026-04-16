import { apiService } from './api';

export interface VendedorRanking {
  id: number;
  name: string;
  vendas: number;
  faturamento: number;
  posicao: number;
  establishment?: { id: number; name: string; cnpj?: string };
}

export interface RankingParams {
  vendedorName?: string;
  period: string;
  dateRange: {
    date_from: string;
    date_to: string;
  };
  establishment_id: number | null;
}

export const calculateVendedorRanking = async (params: RankingParams): Promise<VendedorRanking[]> => {
  const {
    vendedorName,
    period,
    dateRange,
    establishment_id
  } = params;

  try {
    // 1. Buscar TODAS as vendas (sem filtro de data se período for "todos")
    const salesParams: any = {
      per_page: 10000, // Buscar todas as vendas
      include: 'seller,establishment,customer,category'
    };
    
    // Só adicionar establishment_id se não for null (gestores não têm establishment_id)
    if (establishment_id !== null) {
      salesParams.establishment_id = establishment_id;
    }

    // Aplicar filtro de data para todos os períodos exceto "todos"
    if (period && period !== 'todos' && dateRange.date_from && dateRange.date_to) {
      salesParams.date_from = dateRange.date_from;
      salesParams.date_to = dateRange.date_to;
    }

    const salesResponse = await apiService.getSales(salesParams);

    let vendas = salesResponse.data?.data || [];
    
    // Se há paginação, buscar todas as páginas para incluir todas as vendas
    const totalPages = salesResponse.data?.last_page || 1;
    
    if (totalPages > 1) {
      // Buscar vendas das páginas restantes
      for (let page = 2; page <= totalPages; page++) {
        try {
          const pageResponse = await apiService.getSales({
            ...salesParams,
            page: page
          });
          
          if (pageResponse.data?.data) {
            vendas = [...vendas, ...pageResponse.data.data];
          }
        } catch (error) {
          // Silently continue on error
        }
      }
    }

    // 2. Primeiro, buscar todos os vendedores para ter os nomes
    let usuarios: any[] = [];
    
    if (establishment_id) {
      // Se tem establishment_id, buscar usuários do estabelecimento
      const usersResponse = await apiService.getEstablishmentUsers(establishment_id);
      usuarios = usersResponse.data?.data || [];
    } else {
      // Se é gestor sem establishment_id, buscar todos os usuários
      const usersResponse = await apiService.getUsers();
      usuarios = usersResponse.data?.data || [];
    }
    
    // Criar mapa de IDs para nomes
    const sellerNamesMap = new Map<number, string>();
    usuarios.forEach((user: any) => {
      sellerNamesMap.set(user.id, user.name);
    });
    
    console.log('📊 calculateVendedorRanking - Mapa de nomes de vendedores:', {
      totalUsuarios: usuarios.length,
      totalVendedoresComNome: sellerNamesMap.size,
      primeiros3: Array.from(sellerNamesMap.entries()).slice(0, 3)
    });

    // 3. Calcular ranking de todos os vendedores
    const rankingMap = new Map<number, VendedorRanking>();

    vendas.forEach((venda: any) => {
      const sellerId = venda.seller_id;
      const sellerName = sellerNamesMap.get(sellerId) || venda.seller_name || venda.seller?.name || 'Vendedor Desconhecido';
      const totalPrice = parseFloat(venda.total_price) || 0;
      const establishment = venda.establishment ? { id: venda.establishment.id, name: venda.establishment.name, cnpj: venda.establishment.cnpj } : undefined;

      // Debug: verificar estrutura dos dados
      if (!sellerName || sellerName === 'Vendedor Desconhecido') {
        console.log('🔍 Debug - Venda sem nome de vendedor:', {
          sellerId,
          sellerName,
          venda: {
            id: venda.id,
            seller_id: venda.seller_id,
            seller_name: venda.seller_name,
            seller: venda.seller
          }
        });
      }

      if (rankingMap.has(sellerId)) {
        const existing = rankingMap.get(sellerId)!;
        existing.vendas += 1;
        existing.faturamento += totalPrice;
        if (establishment && !existing.establishment) existing.establishment = establishment;
      } else {
        rankingMap.set(sellerId, {
          id: sellerId,
          name: sellerName,
          vendas: 1,
          faturamento: totalPrice,
          posicao: 0, // Será definido depois na ordenação
          establishment
        });
      }
    });

    // 4. Buscar todos os vendedores ativos do estabelecimento para incluir no ranking
    try {
      // Filtrar vendedores e gerentes ativos
      const vendedoresAtivos = usuarios.filter((user: any) => {
        const isVendedor = user.roles?.some((role: any) => role.name === 'vendedor');
        const isGerente = user.roles?.some((role: any) => role.name === 'gerente');
        return (isVendedor || isGerente) && user.is_active;
      });
      
      // Adicionar vendedores que não têm vendas no período (com faturamento 0)
      const establishmentFromUser = (u: any) => u.establishment ? { id: u.establishment.id, name: u.establishment.name, cnpj: u.establishment.cnpj } : undefined;
      vendedoresAtivos.forEach((vendedor: any) => {
        if (!rankingMap.has(vendedor.id)) {
          rankingMap.set(vendedor.id, {
            id: vendedor.id,
            name: vendedor.name,
            vendas: 0,
            faturamento: 0,
            posicao: 0,
            establishment: establishmentFromUser(vendedor)
          });
        }
      });
    } catch (error) {
      // Silently continue on error
    }

    // 5. Converter para array e ordenar por faturamento
    const ranking = Array.from(rankingMap.values())
      .sort((a, b) => b.faturamento - a.faturamento)
      .map((item, index) => ({
        ...item,
        posicao: index + 1
      }));

    // 6. Se vendedor específico foi selecionado, encontrar sua posição
    if (vendedorName && vendedorName !== 'todos') {
      const vendedorRanking = ranking.find(item => 
        item.name.toLowerCase().includes(vendedorName.toLowerCase())
      );
      
      if (vendedorRanking) {
        return [vendedorRanking];
      } else {
        return [];
      }
    }

    return ranking;

  } catch (error) {
    return [];
  }
};