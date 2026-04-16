"use client"

import React, { useState, useEffect } from 'react'
import { useDynamicCategories } from '@/lib/use-dynamic-categories'
import { FieldConfigResponse } from '@/lib/dynamic-category-service'
import DynamicField from './dynamic-field'
import { Loader2, AlertCircle } from 'lucide-react'

interface DynamicFormProps {
  categoryId: number
  initialData?: Record<string, any>
  onSubmit: (data: Record<string, any>) => void
  onCancel: () => void
  title?: string
}

const DynamicForm: React.FC<DynamicFormProps> = ({ 
  categoryId, 
  initialData = {}, 
  onSubmit, 
  onCancel,
  title = "Formulário Dinâmico" 
}) => {
  const { loadFieldConfig, loading, error } = useDynamicCategories()
  const [formData, setFormData] = useState<Record<string, any>>(initialData)
  const [fieldConfig, setFieldConfig] = useState<FieldConfigResponse | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (categoryId) {
      loadFieldConfig(categoryId)
        .then(config => {
          setFieldConfig(config)
          console.log('✅ Configuração de campos carregada:', config)
        })
        .catch(err => {
          console.error('❌ Erro ao carregar configuração:', err)
        })
    }
  }, [categoryId, loadFieldConfig])

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }))
    
    // Limpar erro de validação do campo
    if (validationErrors[fieldName]) {
      setValidationErrors(prev => ({
        ...prev,
        [fieldName]: ''
      }))
    }
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    
    if (fieldConfig) {
      const allFields = [...fieldConfig.required_fields, ...fieldConfig.optional_fields]
      
      allFields.forEach(field => {
        if (field.required && (!formData[field.field_name] || formData[field.field_name] === '')) {
          errors[field.field_name] = `${field.label} é obrigatório`
        }
        
        // Validações específicas
        if (formData[field.field_name] && field.validation_rules) {
          const value = formData[field.field_name]
          const rules = field.validation_rules
          
          if (rules.min_length && value.length < rules.min_length) {
            errors[field.field_name] = `${field.label} deve ter pelo menos ${rules.min_length} caracteres`
          }
          
          if (rules.max_length && value.length > rules.max_length) {
            errors[field.field_name] = `${field.label} deve ter no máximo ${rules.max_length} caracteres`
          }
          
          if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
            errors[field.field_name] = `${field.label} tem formato inválido`
          }
          
          if (rules.min_value && parseFloat(value) < rules.min_value) {
            errors[field.field_name] = `${field.label} deve ser maior que ${rules.min_value}`
          }
        }
      })
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Validação será feita pelo formulário pai

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-600">Carregando configuração de campos...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-8 h-8 text-red-500 mb-4" />
        <p className="text-red-600 mb-4">Erro: {error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Tentar Novamente
        </button>
      </div>
    )
  }

  if (!fieldConfig) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-8 h-8 text-gray-400 mb-4" />
        <p className="text-gray-600">Nenhuma configuração de campos encontrada para esta categoria.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-600">Categoria: {fieldConfig.category_name}</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Campos Obrigatórios */}
        {fieldConfig.required_fields.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-900 border-b border-gray-200 pb-2">
              Campos Obrigatórios
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fieldConfig.required_fields.map(field => (
                <DynamicField
                  key={field.id}
                  field={field}
                  value={formData[field.field_name] || ''}
                  onChange={(value) => handleFieldChange(field.field_name, value)}
                  error={validationErrors[field.field_name]}
                />
              ))}
            </div>
          </div>
        )}

        {/* Campos Opcionais */}
        {fieldConfig.optional_fields.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-900 border-b border-gray-200 pb-2">
              Campos Opcionais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fieldConfig.optional_fields.map(field => (
                <DynamicField
                  key={field.id}
                  field={field}
                  value={formData[field.field_name] || ''}
                  onChange={(value) => handleFieldChange(field.field_name, value)}
                  error={validationErrors[field.field_name]}
                />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default DynamicForm
