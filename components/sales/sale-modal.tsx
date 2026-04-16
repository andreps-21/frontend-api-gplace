"use client"

import React, { useState, useEffect } from 'react';
import { useSalesManagement, Sale, SaleUpdateData } from '@/lib/use-sales-management';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, X, Eye, Edit } from 'lucide-react';
import { SaleDocumentsList } from './sale-documents-list';

interface SaleModalProps {
  sale: Sale;
  onClose: () => void;
  onSave: () => void;
  mode?: 'view' | 'edit';
}

export function SaleModal({ sale, onClose, onSave, mode = 'edit' }: SaleModalProps) {
  const { updateSale, loading, error } = useSalesManagement();
  const { user } = useAuth();
  const [formData, setFormData] = useState<SaleUpdateData>({
    quantity: sale.quantity || 1,
    unit_price: parseFloat(sale.unit_price) || 0,
    sale_date: sale.sale_date ? sale.sale_date.split('T')[0] : '',
    observations: sale.observations || '',
    imei: sale.imei || '',
    iccid: (sale as any).iccid || '',
    payment_method: sale.payment_method || '',
    activation_number: sale.activation_number || '',
    provisional_number: sale.provisional_number || '',
    device_value: parseFloat(sale.device_value || '0') || 0,
    meu_tim: Boolean(sale.meu_tim),
    debit_automatic: Boolean(sale.debit_automatic),
    portability: Boolean(sale.portability),
    rescue: Boolean(sale.rescue)
  });


  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isViewMode, setIsViewMode] = useState(mode === 'view');

  useEffect(() => {
    // Calcular total quando quantidade ou preço mudarem
    const total = (formData.quantity || 0) * (formData.unit_price || 0);
    setFormData(prev => ({ ...prev, total_price: total }));
  }, [formData.quantity, formData.unit_price]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Limpar erro de validação quando usuário digita
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpar erro de validação
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.quantity || formData.quantity < 1) {
      errors.quantity = 'Quantidade deve ser maior que 0';
    }

    if (!formData.unit_price || formData.unit_price <= 0) {
      errors.unit_price = 'Preço unitário deve ser maior que 0';
    }

    if (formData.imei && formData.imei.length !== 15) {
      errors.imei = 'IMEI deve ter exatamente 15 dígitos';
    }

    // ICCID obrigatório (conforme documentação backend): 20 caracteres numéricos
    if (!formData.iccid || String(formData.iccid).trim() === '') {
      errors.iccid = 'O campo ICCID é obrigatório.';
    } else {
      const iccid = String(formData.iccid).replace(/\D/g, '');
      if (iccid.length !== 20) {
        errors.iccid = 'O campo ICCID deve ter exatamente 20 caracteres.';
      } else if (!/^[0-9]+$/.test(iccid)) {
        errors.iccid = 'O campo ICCID deve conter apenas números.';
      }
    }

    // Data da venda: não pode ser retroativa (hoje ou posterior)
    if (formData.sale_date) {
      const today = new Date().toISOString().split('T')[0];
      if (formData.sale_date < today) {
        errors.sale_date = 'Data da venda não pode ser retroativa. Informe hoje ou uma data futura.';
      }
    }

    // Validação dos campos TIM (conforme documento)
    if (typeof formData.meu_tim !== 'boolean') {
      errors.meu_tim = 'Meu TIM deve ser boolean';
    }

    if (typeof formData.debit_automatic !== 'boolean') {
      errors.debit_automatic = 'Débito Automático deve ser boolean';
    }

    if (typeof formData.portability !== 'boolean') {
      errors.portability = 'Portabilidade deve ser boolean';
    }

    if (typeof formData.rescue !== 'boolean') {
      errors.rescue = 'Resgate deve ser boolean';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isViewMode) {
      onClose();
      return;
    }

    if (!validateForm()) return;


    try {
      await updateSale(sale.id, formData);
      onSave();
    } catch (err) {
      // Erro já tratado no hook
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
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
        return { text: 'Cancelada', color: 'text-red-600' };
      case 1:
        return { text: 'Ativa', color: 'text-blue-600' };
      case 2:
        return { text: 'Aprovada', color: 'text-green-600' };
      default:
        return { text: 'Desconhecido', color: 'text-gray-600' };
    }
  };

  const statusInfo = getStatusInfo(sale.status);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50/80 via-white/60 to-purple-50/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white/70 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {isViewMode ? 'Visualizar Venda' : 'Editar Venda'} #{sale.id}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isViewMode ? 'Detalhes da venda' : 'Modifique os dados da venda'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsViewMode(!isViewMode)}
              className="h-8 px-3"
            >
              {isViewMode ? (
                <>
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-1" />
                  Visualizar
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Informações da Venda - Somente Leitura */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Status</Label>
              <p className={`text-sm font-medium ${statusInfo.color}`}>{statusInfo.text}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Cliente</Label>
              <p className="text-sm text-foreground">{sale.customer?.person?.name || sale.customer?.person?.full_name || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Vendedor</Label>
              <p className="text-sm text-foreground">{sale.seller?.name || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Loja</Label>
              <p className="text-sm text-foreground">{sale.establishment?.name || 'N/A'}</p>
            </div>
            {sale.sale_date && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Data da Venda</Label>
                <p className="text-sm text-foreground">{formatDate(sale.sale_date)}</p>
              </div>
            )}
            {((sale as any).iccid) && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">ICCID</Label>
                <p className="text-sm text-foreground font-mono">{(sale as any).iccid}</p>
              </div>
            )}
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Criada em</Label>
              <p className="text-sm text-foreground">{formatDate(sale.created_at)}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Atualizada em</Label>
              <p className="text-sm text-foreground">{formatDate(sale.updated_at)}</p>
            </div>
          </div>

          {/* Mensagens de Erro */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informações Básicas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                  Quantidade *
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  min="1"
                  disabled={isViewMode}
                  className={validationErrors.quantity ? 'border-red-500' : ''}
                />
                {validationErrors.quantity && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.quantity}</p>
                )}
              </div>

              <div>
                <Label htmlFor="unit_price" className="block text-sm font-medium text-gray-700 mb-1">
                  Preço Unitário *
                </Label>
                <Input
                  id="unit_price"
                  type="number"
                  name="unit_price"
                  value={formData.unit_price}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  disabled={isViewMode}
                  className={validationErrors.unit_price ? 'border-red-500' : ''}
                />
                {validationErrors.unit_price && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.unit_price}</p>
                )}
              </div>

              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">
                  Total
                </Label>
                <Input
                  value={formatCurrency((formData.quantity || 0) * (formData.unit_price || 0))}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>

            {/* Campo Data da Venda */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sale_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Data da Venda
                </Label>
                <Input
                  id="sale_date"
                  type="date"
                  name="sale_date"
                  value={formData.sale_date}
                  onChange={handleInputChange}
                  disabled={isViewMode}
                  className={validationErrors.sale_date ? 'border-red-500' : ''}
                  min={new Date().toISOString().split('T')[0]}
                />
                {validationErrors.sale_date && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.sale_date}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Apenas hoje ou datas futuras (não retroativa)
                </p>
              </div>
            </div>

            {/* Informações do Produto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="iccid" className="block text-sm font-medium text-gray-700 mb-1">
                  ICCID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="iccid"
                  type="text"
                  name="iccid"
                  value={formData.iccid || ''}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 20);
                    setFormData(prev => ({ ...prev, iccid: v }));
                    if (validationErrors.iccid) setValidationErrors(prev => ({ ...prev, iccid: '' }));
                  }}
                  maxLength={20}
                  disabled={isViewMode}
                  className={validationErrors.iccid ? 'border-red-500' : ''}
                  placeholder="20 dígitos numéricos"
                />
                {validationErrors.iccid && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.iccid}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">Exatamente 20 dígitos numéricos</p>
              </div>

              <div>
                <Label htmlFor="imei" className="block text-sm font-medium text-gray-700 mb-1">
                  IMEI
                </Label>
                <Input
                  id="imei"
                  type="text"
                  name="imei"
                  value={formData.imei}
                  onChange={handleInputChange}
                  maxLength={15}
                  disabled={isViewMode}
                  className={validationErrors.imei ? 'border-red-500' : ''}
                  placeholder="15 dígitos"
                />
                {validationErrors.imei && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.imei}</p>
                )}
              </div>

              <div>
                <Label htmlFor="payment_method" className="block text-sm font-medium text-gray-700 mb-1">
                  Método de Pagamento
                </Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => handleSelectChange('payment_method', value)}
                  disabled={isViewMode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Informações Adicionais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="activation_number" className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Ativação
                </Label>
                <Input
                  id="activation_number"
                  type="text"
                  name="activation_number"
                  value={formData.activation_number}
                  onChange={handleInputChange}
                  disabled={isViewMode}
                />
              </div>

              <div>
                <Label htmlFor="provisional_number" className="block text-sm font-medium text-gray-700 mb-1">
                  Número Provisório
                </Label>
                <Input
                  id="provisional_number"
                  type="text"
                  name="provisional_number"
                  value={formData.provisional_number}
                  onChange={handleInputChange}
                  disabled={isViewMode}
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="meu_tim"
                  checked={formData.meu_tim}
                  onCheckedChange={(checked) => handleCheckboxChange('meu_tim', checked as boolean)}
                  disabled={isViewMode}
                />
                <Label htmlFor="meu_tim" className="text-sm">Meu TIM</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="debit_automatic"
                  checked={formData.debit_automatic}
                  onCheckedChange={(checked) => handleCheckboxChange('debit_automatic', checked as boolean)}
                  disabled={isViewMode}
                />
                <Label htmlFor="debit_automatic" className="text-sm">Débito Automático</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="portability"
                  checked={formData.portability}
                  onCheckedChange={(checked) => handleCheckboxChange('portability', checked as boolean)}
                  disabled={isViewMode}
                />
                <Label htmlFor="portability" className="text-sm">Portabilidade</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rescue"
                  checked={formData.rescue}
                  onCheckedChange={(checked) => handleCheckboxChange('rescue', checked as boolean)}
                  disabled={isViewMode}
                />
                <Label htmlFor="rescue" className="text-sm">Resgate</Label>
              </div>
            </div>

            {/* Observações */}
            <div>
              <Label htmlFor="observations" className="block text-sm font-medium text-gray-700 mb-1">
                Observações
              </Label>
              <Textarea
                id="observations"
                name="observations"
                value={formData.observations}
                onChange={handleInputChange}
                rows={3}
                disabled={isViewMode}
                placeholder="Observações adicionais sobre a venda..."
              />
            </div>

            {/* Documentos Anexados */}
            <div className="pt-4 border-t">
              <SaleDocumentsList 
                saleId={sale.id}
                sale={{
                  id: sale.id,
                  seller_id: sale.seller_id,
                  establishment_id: sale.establishment_id
                }}
                userRole={user?.role}
                onDocumentDeleted={() => {
                  // Opcional: recarregar dados da venda se necessário
                }}
              />
            </div>

            {/* Botões */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                {isViewMode ? 'Fechar' : 'Cancelar'}
              </Button>
              {!isViewMode && (
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
