"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Sale } from '@/lib/use-sales-management';

interface SaleCardProps {
  sale: Sale;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onApprove?: () => void;
  onCancel?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
  canApprove?: boolean;
  canCancel?: boolean;
}

export function SaleCard({ 
  sale, 
  onView, 
  onEdit, 
  onDelete, 
  onApprove, 
  onCancel,
  canEdit = true,
  canDelete = true,
  canApprove = false,
  canCancel = false
}: SaleCardProps) {
  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusInfo = (status: number) => {
    switch (status) {
      case 0:
        return { text: 'Cancelada', variant: 'destructive' as const };
      case 1:
        return { text: 'Ativa', variant: 'default' as const };
      case 2:
        return { text: 'Aprovada', variant: 'secondary' as const };
      default:
        return { text: 'Desconhecido', variant: 'outline' as const };
    }
  };

  const statusInfo = getStatusInfo(sale.status);

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground">
            Venda #{sale.id}
          </CardTitle>
          <Badge variant={statusInfo.variant} className="text-xs">
            {statusInfo.text}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Informações da Venda */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-muted-foreground">Produto:</span>
            <span className="text-sm text-foreground font-medium">{sale.product_name}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-muted-foreground">Quantidade:</span>
            <span className="text-sm text-foreground">{sale.quantity}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-muted-foreground">Preço Unit.:</span>
            <span className="text-sm text-foreground">{formatCurrency(sale.unit_price)}</span>
          </div>
          
          <div className="flex justify-between items-center border-t pt-2">
            <span className="text-sm font-semibold text-foreground">Total:</span>
            <span className="text-lg font-bold text-green-600">{formatCurrency(sale.total_price)}</span>
          </div>
        </div>

        {/* Informações do Cliente e Vendedor */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-muted-foreground">Cliente:</span>
            <span className="text-sm text-foreground">
              {sale.customer?.person?.name || sale.customer?.person?.full_name || 'N/A'}
            </span>
          </div>
          
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-muted-foreground">Vendedor:</span>
            <span className="text-sm text-foreground">{sale.seller?.name || 'N/A'}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-muted-foreground">Loja:</span>
            <span className="text-sm text-foreground">{sale.establishment?.name || 'N/A'}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-muted-foreground">Data Venda:</span>
            <span className="text-sm text-foreground">
              {sale.sale_date ? formatDate(sale.sale_date) : formatDate(sale.created_at)}
            </span>
          </div>
          
          {sale.sale_date && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Data Criação:</span>
              <span className="text-sm text-foreground">{formatDate(sale.created_at)}</span>
            </div>
          )}
        </div>

        {/* Serviços TIM */}
        {(sale.meu_tim || sale.debit_automatic || sale.portability || sale.rescue) && (
          <div className="space-y-2 pt-2 border-t">
            <span className="text-sm font-medium text-muted-foreground">Serviços TIM:</span>
            <div className="flex flex-wrap gap-2">
              {sale.meu_tim && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Meu TIM
                </span>
              )}
              {sale.debit_automatic && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Débito Automático
                </span>
              )}
              {sale.portability && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Portabilidade
                </span>
              )}
              {sale.rescue && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  Resgate
                </span>
              )}
            </div>
          </div>
        )}

        {/* Informações Adicionais */}
        {(sale.imei || sale.payment_method || sale.observations) && (
          <div className="space-y-2 pt-2 border-t">
            {sale.imei && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">IMEI:</span>
                <span className="text-sm text-foreground font-mono">{sale.imei}</span>
              </div>
            )}
            
            {sale.payment_method && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Pagamento:</span>
                <span className="text-sm text-foreground capitalize">{sale.payment_method}</span>
              </div>
            )}
            
            {sale.observations && (
              <div className="pt-2">
                <span className="text-sm font-medium text-muted-foreground">Observações:</span>
                <p className="text-sm text-foreground mt-1 bg-muted p-2 rounded text-xs">
                  {sale.observations}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Ações */}
        <div className="flex flex-wrap gap-2 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={onView}
            className="flex-1 min-w-0"
          >
            <Eye className="w-4 h-4 mr-1" />
            Ver
          </Button>
          
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="flex-1 min-w-0"
            >
              <Edit className="w-4 h-4 mr-1" />
              Editar
            </Button>
          )}
          
          {canDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="flex-1 min-w-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Excluir
            </Button>
          )}
        </div>

        {/* Ações de Aprovação/Cancelamento */}
        {(canApprove || canCancel) && (
          <div className="flex gap-2 pt-2">
            {canApprove && sale.status === 1 && (
              <Button
                variant="default"
                size="sm"
                onClick={onApprove}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Aprovar
              </Button>
            )}
            
            {canCancel && (sale.status === 1 || sale.status === 2) && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onCancel}
                className="flex-1"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Cancelar
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
