"use client"

import React, { useState, useEffect } from 'react';
import { useSalesManagement, Sale } from '@/lib/use-sales-management';
import { useAuth } from '@/lib/auth';
import { usePermissions } from '@/lib/use-permissions';
import { apiService } from '@/lib/api';
import { SaleCard } from './sale-card';
import { SaleModal } from './sale-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Search, Filter, AlertCircle, Eye, Edit, Trash2, User, Building2, Calendar, DollarSign } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SalesPeriodFilter } from './sales-period-filter';

export function SalesList() {
  const { user } = useAuth();
  const { canAccessSpecificModule } = usePermissions();
  const {
    sales,
    loading,
    error,
    pagination,
    fetchSales,
    deleteSale
  } = useSalesManagement();

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  const [searchTerm, setSearchTerm] = useState('');
  const [establishmentFilter, setEstablishmentFilter] = useState<string>('all');
  const [sellerFilter, setSellerFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [establishments, setEstablishments] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Permissões baseadas no role do usuário
  const canEdit = canAccessSpecificModule('vendas-editar') || user?.role === 'gerente' || user?.role === 'gestor';
  const canDelete = canAccessSpecificModule('vendas-excluir') || user?.role === 'gestor';

  useEffect(() => {
    loadSales();
    loadEstablishments();
    loadSellers();
  }, []);

  // Recarregar vendas quando página ou itens por página mudarem
  useEffect(() => {
    loadSales();
  }, [currentPage, itemsPerPage]);

  // Reset página e recarregar vendas quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
    
    // Debounce para busca - aguardar 500ms após parar de digitar
    const timeoutId = setTimeout(() => {
      loadSales();
    }, searchTerm ? 500 : 0); // Sem delay se não há termo de busca
    
    return () => clearTimeout(timeoutId);
  }, [searchTerm, establishmentFilter, sellerFilter, dateFrom, dateTo]);

  const loadEstablishments = async () => {
    try {
      // Carregar estabelecimentos APENAS para gestores
      // Gerentes e Vendedores NÃO devem ver o filtro de estabelecimento
      if (user?.role === 'gestor') {
        const response = await apiService.getEstablishments();
        const establishmentsData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
        setEstablishments(establishmentsData);
      }
    } catch (err) {
      console.error('Erro ao carregar estabelecimentos:', err);
    }
  };

  const loadSellers = async () => {
    try {
      // Carregar vendedores baseado no role
      if (user?.role === 'gerente') {
        // Gerente: vendedores do mesmo estabelecimento
        if (user?.establishment_id) {
          const response = await apiService.getEstablishmentUsers(user.establishment_id, { page: 1 });
          const usuarios = response.data?.data || [];
          // Filtrar apenas vendedores ativos
          const vendedoresFiltrados = usuarios.filter((u: any) => {
            const isVendedor = u.roles?.some((r: any) => r.name === 'vendedor');
            return isVendedor && u.is_active;
          });
          setSellers(vendedoresFiltrados);
        }
      } else if (user?.role === 'gestor') {
        // Gestor: todos os vendedores (ou filtrados por estabelecimento se selecionado)
        const params: any = {
          role: 'vendedor',
          page: 1
        };
        // Se houver filtro de estabelecimento, buscar apenas vendedores desse estabelecimento
        if (establishmentFilter !== 'all') {
          params.establishment_id = parseInt(establishmentFilter);
        }
        const response = await apiService.getUsers(params);
        const usuarios = response.data?.data || [];
        // Filtrar apenas ativos
        const vendedoresFiltrados = usuarios.filter((u: any) => u.is_active);
        setSellers(vendedoresFiltrados);
      }
    } catch (err) {
      console.error('Erro ao carregar vendedores:', err);
    }
  };

  // Recarregar vendedores quando o filtro de estabelecimento mudar (para gestor)
  useEffect(() => {
    if (user?.role === 'gestor' && user) {
      loadSellers();
    }
  }, [establishmentFilter, user?.role, user?.id]);

  const loadSales = async () => {
    try {
      const params: any = {
        page: currentPage,
        per_page: itemsPerPage
      };
      
      // Adicionar busca se houver termo de pesquisa
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
        console.log('🔍 Busca via API com termo:', searchTerm);
      }
      
      // Regras por role conforme documentação do backend:
      
      // VENDEDOR: Backend aplica automaticamente seller_id e establishment_id
      // ❌ NÃO enviar seller_id - o backend aplica automaticamente
      // ❌ NÃO enviar establishment_id - o backend aplica automaticamente
      
      // GERENTE: Backend aplica automaticamente establishment_id
      // ❌ NÃO enviar establishment_id - o backend aplica automaticamente
      // ✅ Pode enviar seller_id se houver filtro de vendedor selecionado
      if (user?.role === 'gerente' && sellerFilter !== 'all') {
        params.seller_id = parseInt(sellerFilter);
      }
      
      // GESTOR: Pode enviar qualquer filtro
      // ✅ Pode enviar establishment_id (opcional)
      // ✅ Pode enviar seller_id (opcional)
      if (user?.role === 'gestor') {
        if (establishmentFilter !== 'all') {
          params.establishment_id = parseInt(establishmentFilter);
        }
        if (sellerFilter !== 'all') {
          params.seller_id = parseInt(sellerFilter);
        }
      }

      // Aplicar filtro de data personalizado
      // O backend aplica automaticamente os filtros de role (vendedor, gerente, gestor)
      // O frontend apenas envia date_from e date_to quando selecionados
      if (dateFrom) {
        params.date_from = dateFrom;
      }
      if (dateTo) {
        params.date_to = dateTo;
      }

      console.log('📤 Parâmetros enviados para API:', params);
      await fetchSales(params);
    } catch (err) {
      console.error('Erro ao carregar vendas:', err);
    }
  };

  const handleViewSale = (sale: Sale) => {
    setSelectedSale(sale);
    setModalMode('view');
    setShowModal(true);
  };

  const handleEditSale = (sale: Sale) => {
    setSelectedSale(sale);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleDeleteSale = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.')) {
      try {
        await deleteSale(id);
        // Notificação de sucesso seria implementada aqui
      } catch (err: any) {
        alert('Erro ao excluir venda: ' + (err.message || 'Erro desconhecido'));
      }
    }
  };


  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedSale(null);
  };

  const handleSaveModal = () => {
    setShowModal(false);
    setSelectedSale(null);
    loadSales(); // Recarregar lista
  };

  // A busca agora é feita pela API, não precisamos filtrar localmente
  const filteredSales = sales;

  const getEstablishmentCounts = () => {
    const counts: { [key: string]: number } = {
      all: sales.length
    };
    
    establishments.forEach(establishment => {
      counts[establishment.id.toString()] = sales.filter(s => s.establishment_id === establishment.id).length;
    });
    
    return counts;
  };

  // Funções de paginação - usar dados da API
  const totalPages = pagination?.last_page || 1;
  const startIndex = pagination ? ((pagination.current_page - 1) * pagination.per_page) + 1 : 1;
  const endIndex = pagination ? Math.min(pagination.current_page * pagination.per_page, pagination.total) : sales.length;
  const currentItems = sales; // A API já retorna os itens da página atual

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // Reset para primeira página
  };

  const establishmentCounts = getEstablishmentCounts();

  if (loading && sales.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-foreground">Gerenciar Vendas</h2>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Gerenciar Vendas</h2>
          <p className="text-muted-foreground">
            Visualize, edite e gerencie todas as vendas do sistema
          </p>
        </div>
        <Button onClick={loadSales} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`grid grid-cols-1 gap-4 items-start ${
            user?.role === 'gestor' 
              ? 'md:grid-cols-4' 
              : (user?.role === 'gerente' 
                ? 'md:grid-cols-3' 
                : 'md:grid-cols-2')
          }`}>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-muted-foreground mb-2">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar por cliente, produto, vendedor, loja, CPF, IMEI..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filtro de Estabelecimento - APENAS para Gestores */}
            {/* ❌ Gerentes e Vendedores NÃO devem ver este filtro */}
            {user?.role === 'gestor' && (
              <div className="flex flex-col">
                <label className="text-sm font-medium text-muted-foreground mb-2">
                  Estabelecimento
                </label>
                <Select 
                  value={establishmentFilter} 
                  onValueChange={(value) => {
                    setEstablishmentFilter(value);
                    // Resetar filtro de vendedor quando mudar estabelecimento
                    setSellerFilter('all');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os estabelecimentos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {establishments.map(establishment => (
                      <SelectItem key={establishment.id} value={establishment.id.toString()}>
                        {establishment.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Filtro de Vendedor - Para Gerentes e Gestores */}
            {/* ❌ Vendedores NÃO devem ver este filtro */}
            {(user?.role === 'gerente' || user?.role === 'gestor') && (
              <div className="flex flex-col">
                <label className="text-sm font-medium text-muted-foreground mb-2">
                  Vendedor
                </label>
                <Select 
                  value={sellerFilter} 
                  onValueChange={setSellerFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      user?.role === 'gerente' 
                        ? "Todos os vendedores" 
                        : "Todos os vendedores"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {sellers.map(seller => (
                      <SelectItem key={seller.id} value={seller.id.toString()}>
                        {seller.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Filtro de Período - Disponível para todos os perfis */}
            <SalesPeriodFilter
              onPeriodChange={(from, to) => {
                setDateFrom(from);
                setDateTo(to);
              }}
              initialDateFrom={dateFrom}
              initialDateTo={dateTo}
            />
          </div>
        </CardContent>
      </Card>

      {/* Mensagem de Erro */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Controles de paginação no topo */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <label htmlFor="items-per-page" className="text-sm font-medium text-muted-foreground">
            Itens por página:
          </label>
          <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="text-sm text-muted-foreground">
          {searchTerm ? (
            <>Mostrando {startIndex} - {endIndex} de {pagination?.total || 0} vendas encontradas para "{searchTerm}"</>
          ) : (
            <>Mostrando {startIndex} - {endIndex} de {pagination?.total || 0} vendas</>
          )}
        </div>
      </div>

      {/* Lista de Vendas */}
      <Card>
        <CardHeader>
          <CardTitle>
            {searchTerm ? (
              <>Vendas encontradas ({pagination?.total || 0})</>
            ) : (
              <>Vendas ({pagination?.total || 0})</>
            )}
          </CardTitle>
          <CardDescription>
            {searchTerm ? (
              <>Resultados da busca por "{searchTerm}"</>
            ) : (
              <>Lista de todas as vendas cadastradas</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {currentItems.length === 0 ? (
            <div className="text-center py-8 px-4 text-muted-foreground">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {searchTerm 
                  ? `Nenhuma venda encontrada para "${searchTerm}"` 
                  : 'Nenhuma venda cadastrada'
                }
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? (
                  <>
                    Tente buscar por:
                    <br />
                    • Nome do cliente
                    <br />
                    • Nome do produto
                    <br />
                    • Nome do vendedor
                    <br />
                    • CPF do cliente
                    <br />
                    • IMEI do aparelho
                  </>
                ) : (
                  'Comece cadastrando uma nova venda no sistema.'
                )}
              </p>
              {searchTerm && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setEstablishmentFilter('all');
                    setSellerFilter('all');
                    setDateFrom(null);
                    setDateTo(null);
                  }}
                >
                  Limpar Busca
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Tabela em colunas (desktop) */}
              <div className="hidden md:block overflow-x-auto w-full">
                <div className="min-w-max">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px]">Venda / Cliente</TableHead>
                        <TableHead className="min-w-[180px]">Vendedor / Loja</TableHead>
                        <TableHead className="min-w-[120px]">Valor</TableHead>
                        <TableHead className="hidden lg:table-cell min-w-[120px]">ICCID</TableHead>
                        <TableHead className="min-w-[100px]">Status</TableHead>
                        <TableHead className="hidden lg:table-cell min-w-[140px]">Data</TableHead>
                        <TableHead className="text-right min-w-[140px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentItems.map((sale) => {
                        const clienteNome = sale.customer?.person?.name || sale.customer?.person?.full_name || 'N/A';
                        const formatCurrency = (v: string) =>
                          new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(v));
                        const formatDate = (d: string) =>
                          new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                        return (
                          <TableRow key={sale.id}>
                            <TableCell
                              className="py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => handleViewSale(sale)}
                              title="Visualizar venda"
                            >
                              <div className="flex flex-col gap-0.5">
                                <span className="font-semibold text-foreground text-sm">
                                  #{sale.id} – {sale.product_name}
                                </span>
                                <span className="text-xs text-muted-foreground truncate block">
                                  {clienteNome}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-2">
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5 text-sm">
                                  <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                  <span className="truncate">{sale.seller?.name || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Building2 className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{sale.establishment?.name || 'N/A'}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-2">
                              <span className="font-semibold text-green-600 whitespace-nowrap">
                                {formatCurrency(sale.total_price)}
                              </span>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell py-2 text-sm font-mono text-muted-foreground" title={(sale as any).iccid || undefined}>
                              {(sale as any).iccid
                                ? (String((sale as any).iccid).length > 14
                                    ? String((sale as any).iccid).slice(0, 12) + '…'
                                    : (sale as any).iccid)
                                : '—'}
                            </TableCell>
                            <TableCell className="py-2">
                              <Badge
                                variant={
                                  sale.status === 1 ? 'default' : sale.status === 2 ? 'secondary' : 'destructive'
                                }
                                className="text-xs px-2 py-0.5"
                              >
                                {sale.status === 0 ? 'Cancelada' : sale.status === 1 ? 'Ativa' : 'Aprovada'}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell py-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                                {sale.sale_date
                                  ? formatDate(sale.sale_date)
                                  : formatDate(sale.created_at)}
                              </div>
                            </TableCell>
                            <TableCell className="text-right py-2">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleViewSale(sale)}
                                  title="Visualizar"
                                  className="h-7 w-7"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                {canEdit && (
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleEditSale(sale)}
                                    title="Editar"
                                    className="h-7 w-7"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {canDelete && (
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleDeleteSale(sale.id)}
                                    title="Excluir"
                                    className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Cards para mobile */}
              <div className="md:hidden space-y-4 p-4">
                {currentItems.map((sale) => {
                  const clienteNome = sale.customer?.person?.name || sale.customer?.person?.full_name || 'N/A';
                  const formatCurrency = (v: string) =>
                    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(v));
                  return (
                    <Card key={sale.id} className="p-4">
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={() => handleViewSale(sale)}
                          className="flex flex-col gap-1 text-left w-full rounded-md -m-1 p-1 hover:bg-muted/50 transition-colors cursor-pointer"
                          title="Visualizar venda"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-semibold text-foreground truncate">
                              #{sale.id} – {sale.product_name}
                            </h3>
                            <Badge
                              variant={
                                sale.status === 1 ? 'default' : sale.status === 2 ? 'secondary' : 'destructive'
                              }
                              className="text-xs flex-shrink-0"
                            >
                              {sale.status === 0 ? 'Cancelada' : sale.status === 1 ? 'Ativa' : 'Aprovada'}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">{clienteNome}</span>
                        </button>
                          <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5" />
                            <span>{sale.seller?.name || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5" />
                            <span>{sale.establishment?.name || 'N/A'}</span>
                          </div>
                          {(sale as any).iccid && (
                            <div className="flex items-center gap-2 font-mono text-xs">
                              <span className="text-muted-foreground">ICCID:</span>
                              <span>{(sale as any).iccid}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 font-semibold text-green-600">
                            <DollarSign className="h-3.5 w-3.5" />
                            {formatCurrency(sale.total_price)}
                          </div>
                        </div>
                        <div className="flex gap-2 pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewSale(sale)}
                            className="flex-1"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Ver
                          </Button>
                          {canEdit && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditSale(sale)}
                              className="flex-1"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteSale(sale.id)}
                              className="flex-1 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Controles de paginação na parte inferior */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Anterior
          </Button>
          
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNumber;
              if (totalPages <= 5) {
                pageNumber = i + 1;
              } else if (currentPage <= 3) {
                pageNumber = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNumber = totalPages - 4 + i;
              } else {
                pageNumber = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={pageNumber}
                  variant={currentPage === pageNumber ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(pageNumber)}
                  className="w-8 h-8 p-0"
                >
                  {pageNumber}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Próximo
          </Button>
        </div>
      )}

      {/* Modal */}
      {showModal && selectedSale && (
        <SaleModal
          sale={selectedSale}
          onClose={handleCloseModal}
          onSave={handleSaveModal}
          mode={modalMode}
        />
      )}
    </div>
  );
}
