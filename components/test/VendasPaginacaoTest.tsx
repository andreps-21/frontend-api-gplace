"use client"

import React, { useState } from 'react';
import { useVendasPaginacao, FiltrosVendas } from '@/hooks/useVendasPaginacao';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function VendasPaginacaoTest() {
  const {
    vendas,
    loading,
    error,
    pagination,
    carregarVendas,
    proximaPagina,
    paginaAnterior,
    irParaPagina,
    aplicarFiltros,
    limparFiltros
  } = useVendasPaginacao();

  const [filtros, setFiltros] = useState<FiltrosVendas>({
    search: '',
    establishment_id: undefined,
    seller_id: undefined,
    date_from: '',
    date_to: ''
  });

  const handleAplicarFiltros = () => {
    aplicarFiltros(filtros);
  };

  const handleLimparFiltros = () => {
    setFiltros({
      search: '',
      establishment_id: undefined,
      seller_id: undefined,
      date_from: '',
      date_to: ''
    });
    limparFiltros();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Teste de Paginação de Vendas</CardTitle>
          <CardDescription>
            Teste da implementação de paginação com todas as 578 vendas do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar por nome ou CPF</Label>
              <Input
                id="search"
                placeholder="Digite nome ou CPF..."
                value={filtros.search || ''}
                onChange={(e) => setFiltros({...filtros, search: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="date_from">Data inicial</Label>
              <Input
                id="date_from"
                type="date"
                value={filtros.date_from || ''}
                onChange={(e) => setFiltros({...filtros, date_from: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_to">Data final</Label>
              <Input
                id="date_to"
                type="date"
                value={filtros.date_to || ''}
                onChange={(e) => setFiltros({...filtros, date_to: e.target.value})}
              />
            </div>
          </div>

          <div className="flex gap-2 mb-6">
            <Button onClick={handleAplicarFiltros}>
              Aplicar Filtros
            </Button>
            <Button variant="outline" onClick={handleLimparFiltros}>
              Limpar Filtros
            </Button>
          </div>

          {/* Informações de paginação */}
          <div className="mb-4 p-4 bg-secondary/50 rounded-lg">
            <h3 className="font-semibold mb-2">Informações de Paginação</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total de vendas:</p>
                <p className="font-semibold">{pagination.total}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Página atual:</p>
                <p className="font-semibold">{pagination.current_page} de {pagination.last_page}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Itens por página:</p>
                <p className="font-semibold">{pagination.per_page}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Mostrando:</p>
                <p className="font-semibold">{pagination.from} - {pagination.to}</p>
              </div>
            </div>
          </div>

          {/* Controles de paginação */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={paginaAnterior}
              disabled={pagination.current_page === 1}
            >
              Anterior
            </Button>
            
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => {
                let pageNumber;
                if (pagination.last_page <= 5) {
                  pageNumber = i + 1;
                } else if (pagination.current_page <= 3) {
                  pageNumber = i + 1;
                } else if (pagination.current_page >= pagination.last_page - 2) {
                  pageNumber = pagination.last_page - 4 + i;
                } else {
                  pageNumber = pagination.current_page - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNumber}
                    variant={pagination.current_page === pageNumber ? "default" : "outline"}
                    size="sm"
                    onClick={() => irParaPagina(pageNumber)}
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
              onClick={proximaPagina}
              disabled={pagination.current_page === pagination.last_page}
            >
              Próximo
            </Button>
          </div>

          {/* Lista de vendas */}
          {loading ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">Carregando vendas...</div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-500">Erro: {error}</div>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="font-semibold">Vendas da Página Atual ({vendas.length} vendas)</h3>
              {vendas.map((venda: any, index: number) => (
                <div key={venda.id || index} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">Venda #{venda.id}</p>
                      <p className="text-sm text-muted-foreground">
                        Cliente: {venda.customer?.person?.name || 'N/A'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Vendedor: {venda.seller?.name || 'N/A'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Produto: {venda.product_name || 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        R$ {parseFloat(venda.total_price || 0).toLocaleString('pt-BR', { 
                          minimumFractionDigits: 2 
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(venda.sale_date || venda.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



