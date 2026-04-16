"use client"

import React, { useState, useEffect } from 'react'
import { FieldConfig } from '@/lib/dynamic-category-service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { X, Plus, Trash2 } from 'lucide-react'

interface CategoryFieldConfigFormProps {
  config?: FieldConfig
  onSubmit: (data: Partial<FieldConfig>) => void
  onCancel: () => void
}

const CategoryFieldConfigForm: React.FC<CategoryFieldConfigFormProps> = ({ 
  config, 
  onSubmit, 
  onCancel 
}) => {
  const [formData, setFormData] = useState<Partial<FieldConfig>>({
    field_name: '',
    field_type: 'text',
    label: '',
    placeholder: '',
    required: false,
    validation_rules: {},
    options: [],
    autocomplete_config: {
      endpoint: '',
      search_field: '',
      display_field: '',
      value_field: '',
      min_chars: 2,
      debounce_ms: 300
    },
    display_order: 0
  })

  useEffect(() => {
    if (config) {
      setFormData({
        field_name: config.field_name || '',
        field_type: config.field_type || 'text',
        label: config.label || '',
        placeholder: config.placeholder || '',
        required: config.required || false,
        validation_rules: config.validation_rules || {},
        options: config.options || [],
        autocomplete_config: config.autocomplete_config || {
          endpoint: '',
          search_field: '',
          display_field: '',
          value_field: '',
          min_chars: 2,
          debounce_ms: 300
        },
        display_order: config.display_order || 0
      })
    }
  }, [config])

  const handleChange = (field: keyof FieldConfig, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleValidationRuleChange = (rule: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      validation_rules: {
        ...prev.validation_rules,
        [rule]: value
      }
    }))
  }

  const handleOptionChange = (index: number, field: 'value' | 'label', value: string) => {
    const newOptions = [...(formData.options || [])]
    newOptions[index] = {
      ...newOptions[index],
      [field]: value
    }
    setFormData(prev => ({
      ...prev,
      options: newOptions
    }))
  }

  const addOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...(prev.options || []), { value: '', label: '' }]
    }))
  }

  const removeOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: (prev.options || []).filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>{config ? 'Editar Campo' : 'Novo Campo'}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="field_name">Nome do Campo *</Label>
              <Input
                id="field_name"
                value={formData.field_name || ''}
                onChange={(e) => handleChange('field_name', e.target.value)}
                placeholder="Ex: imei, device_value"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="field_type">Tipo do Campo *</Label>
              <Select
                value={formData.field_type}
                onValueChange={(value) => handleChange('field_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto</SelectItem>
                  <SelectItem value="number">Número</SelectItem>
                  <SelectItem value="select">Seleção</SelectItem>
                  <SelectItem value="autocomplete">Autocomplete</SelectItem>
                  <SelectItem value="date">Data</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="label">Label *</Label>
              <Input
                id="label"
                value={formData.label || ''}
                onChange={(e) => handleChange('label', e.target.value)}
                placeholder="Ex: IMEI do Aparelho"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="placeholder">Placeholder</Label>
              <Input
                id="placeholder"
                value={formData.placeholder || ''}
                onChange={(e) => handleChange('placeholder', e.target.value)}
                placeholder="Ex: Digite o IMEI do aparelho"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="required"
              checked={formData.required || false}
              onChange={(e) => handleChange('required', e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="required">Campo obrigatório</Label>
          </div>

          {/* Configurações específicas por tipo */}
          {formData.field_type === 'select' && (
            <div className="space-y-4">
              <Label>Opções</Label>
              {(formData.options || []).map((option, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    placeholder="Valor"
                    value={option.value}
                    onChange={(e) => handleOptionChange(index, 'value', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Label"
                    value={option.label}
                    onChange={(e) => handleOptionChange(index, 'label', e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeOption(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOption}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Adicionar Opção
              </Button>
            </div>
          )}

          {formData.field_type === 'autocomplete' && (
            <div className="space-y-4">
              <Label>Configuração de Autocomplete</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="autocomplete_endpoint">Endpoint</Label>
                  <Input
                    id="autocomplete_endpoint"
                    value={formData.autocomplete_config?.endpoint || ''}
                    onChange={(e) => handleChange('autocomplete_config', {
                      ...formData.autocomplete_config,
                      endpoint: e.target.value
                    })}
                    placeholder="/api/v1/products/search"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="autocomplete_search_field">Campo de Busca</Label>
                  <Input
                    id="autocomplete_search_field"
                    value={formData.autocomplete_config?.search_field || ''}
                    onChange={(e) => handleChange('autocomplete_config', {
                      ...formData.autocomplete_config,
                      search_field: e.target.value
                    })}
                    placeholder="name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="autocomplete_display_field">Campo de Exibição</Label>
                  <Input
                    id="autocomplete_display_field"
                    value={formData.autocomplete_config?.display_field || ''}
                    onChange={(e) => handleChange('autocomplete_config', {
                      ...formData.autocomplete_config,
                      display_field: e.target.value
                    })}
                    placeholder="name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="autocomplete_value_field">Campo de Valor</Label>
                  <Input
                    id="autocomplete_value_field"
                    value={formData.autocomplete_config?.value_field || ''}
                    onChange={(e) => handleChange('autocomplete_config', {
                      ...formData.autocomplete_config,
                      value_field: e.target.value
                    })}
                    placeholder="id"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Regras de Validação */}
          <div className="space-y-4">
            <Label>Regras de Validação</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pattern">Padrão (Regex)</Label>
                <Input
                  id="pattern"
                  value={formData.validation_rules?.pattern || ''}
                  onChange={(e) => handleValidationRuleChange('pattern', e.target.value)}
                  placeholder="^[0-9]{15}$"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_length">Tamanho Mínimo</Label>
                <Input
                  id="min_length"
                  type="number"
                  value={formData.validation_rules?.min_length || ''}
                  onChange={(e) => handleValidationRuleChange('min_length', parseInt(e.target.value) || 0)}
                  placeholder="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_length">Tamanho Máximo</Label>
                <Input
                  id="max_length"
                  type="number"
                  value={formData.validation_rules?.max_length || ''}
                  onChange={(e) => handleValidationRuleChange('max_length', parseInt(e.target.value) || 0)}
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_value">Valor Mínimo</Label>
                <Input
                  id="min_value"
                  type="number"
                  step="0.01"
                  value={formData.validation_rules?.min_value || ''}
                  onChange={(e) => handleValidationRuleChange('min_value', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit">
              {config ? 'Atualizar' : 'Criar'} Campo
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default CategoryFieldConfigForm
