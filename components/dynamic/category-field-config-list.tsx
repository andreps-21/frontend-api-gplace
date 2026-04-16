"use client"

import React from 'react'
import { FieldConfig } from '@/lib/dynamic-category-service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit, Trash2, Settings } from 'lucide-react'

interface CategoryFieldConfigListProps {
  configs: FieldConfig[]
  onEdit: (config: FieldConfig) => void
  onDelete: (fieldId: number) => void
}

const CategoryFieldConfigList: React.FC<CategoryFieldConfigListProps> = ({ 
  configs, 
  onEdit, 
  onDelete 
}) => {
  const getFieldTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      text: 'Texto',
      number: 'Número',
      select: 'Seleção',
      autocomplete: 'Autocomplete',
      date: 'Data'
    }
    return types[type] || type
  }

  const getFieldTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      text: 'bg-blue-100 text-blue-800',
      number: 'bg-green-100 text-green-800',
      select: 'bg-purple-100 text-purple-800',
      autocomplete: 'bg-orange-100 text-orange-800',
      date: 'bg-gray-100 text-gray-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  if (configs.length === 0) {
    return (
      <div className="text-center py-12">
        <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Nenhum campo configurado para esta categoria.</p>
        <p className="text-sm text-gray-500 mt-2">
          Clique em "Adicionar Campo" para começar a configurar.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {configs.map((config) => (
        <Card key={config.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-lg">{config.label}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge 
                    variant={config.required ? "destructive" : "secondary"}
                    className="text-xs"
                  >
                    {config.required ? 'Obrigatório' : 'Opcional'}
                  </Badge>
                  <Badge 
                    variant="outline"
                    className={`text-xs ${getFieldTypeColor(config.field_type)}`}
                  >
                    {getFieldTypeLabel(config.field_type)}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(config)}
                  className="flex items-center gap-1"
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(config.id)}
                  className="flex items-center gap-1 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Campo:</span>
                  <span className="ml-2 text-gray-600 font-mono">{config.field_name}</span>
                </div>
                
                {config.placeholder && (
                  <div>
                    <span className="font-medium text-gray-700">Placeholder:</span>
                    <span className="ml-2 text-gray-600">"{config.placeholder}"</span>
                  </div>
                )}

                {config.field_type === 'select' && config.options && config.options.length > 0 && (
                  <div className="md:col-span-2">
                    <span className="font-medium text-gray-700">Opções:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {config.options.map((option, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {option.label} ({option.value})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {config.field_type === 'autocomplete' && config.autocomplete_config && (
                  <div className="md:col-span-2">
                    <span className="font-medium text-gray-700">Configuração de Autocomplete:</span>
                    <div className="mt-1 space-y-1 text-xs text-gray-600">
                      <div>Endpoint: {config.autocomplete_config.endpoint || 'N/A'}</div>
                      <div>Campo de Busca: {config.autocomplete_config.search_field || 'N/A'}</div>
                      <div>Campo de Exibição: {config.autocomplete_config.display_field || 'N/A'}</div>
                    </div>
                  </div>
                )}

                {config.validation_rules && Object.keys(config.validation_rules).length > 0 && (
                  <div className="md:col-span-2">
                    <span className="font-medium text-gray-700">Validações:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {Object.entries(config.validation_rules).map(([rule, value]) => (
                        <Badge key={rule} variant="outline" className="text-xs">
                          {rule}: {value}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default CategoryFieldConfigList
