"use client"

import React, { useState, useEffect } from 'react'
import { useDynamicCategories } from '@/lib/use-dynamic-categories'
import { FieldConfig } from '@/lib/dynamic-category-service'
import { Loader2 } from 'lucide-react'

interface DynamicFieldProps {
  field: FieldConfig
  value: string | number
  onChange: (value: string | number) => void
  error?: string | null
}

const DynamicField: React.FC<DynamicFieldProps> = ({ field, value, onChange, error }) => {
  const { searchProducts } = useDynamicCategories()
  const [autocompleteResults, setAutocompleteResults] = useState<any[]>([])
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)

  // Busca de produtos para autocomplete
  const handleAutocompleteSearch = async (searchTerm: string) => {
    if (searchTerm.length < (field.autocomplete_config?.min_chars || 2)) {
      setAutocompleteResults([])
      return
    }

    setSearchLoading(true)
    try {
      const results = await searchProducts(field.autocomplete_config?.category_id, searchTerm)
      setAutocompleteResults(results)
      setShowAutocomplete(true)
    } catch (err) {
      console.error('Erro na busca:', err)
    } finally {
      setSearchLoading(false)
    }
  }

  // Debounce para busca
  useEffect(() => {
    if (field.field_type === 'autocomplete' && value && typeof value === 'string') {
      const timeoutId = setTimeout(() => {
        handleAutocompleteSearch(value)
      }, field.autocomplete_config?.debounce_ms || 300)

      return () => clearTimeout(timeoutId)
    }
  }, [value, field])

  const renderField = () => {
    const baseClasses = `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      error ? 'border-red-500' : 'border-gray-300'
    }`

    switch (field.field_type) {
      case 'text':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={baseClasses}
            maxLength={field.validation_rules?.max_length}
            minLength={field.validation_rules?.min_length}
            pattern={field.validation_rules?.pattern}
          />
        )

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={baseClasses}
            min={field.validation_rules?.min_value}
            step="0.01"
          />
        )

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={baseClasses}
          />
        )

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={baseClasses}
          >
            <option value="">Selecione uma opção</option>
            {field.options?.map((option, index) => (
              <option key={index} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )

      case 'autocomplete':
        return (
          <div className="relative">
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.placeholder}
              className={baseClasses}
              onFocus={() => value && setShowAutocomplete(true)}
              onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
            />
            
            {searchLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            )}
            
            {showAutocomplete && autocompleteResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {autocompleteResults.map((product) => (
                  <div
                    key={product.id}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                    onClick={() => {
                      onChange(product[field.autocomplete_config?.display_field || 'name'])
                      setShowAutocomplete(false)
                    }}
                  >
                    <div className="font-medium text-gray-900">{product.name}</div>
                    <div className="text-sm text-green-600">R$ {product.price?.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">Estoque: {product.stock}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={baseClasses}
          />
        )
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {renderField()}
      
      {error && (
        <div className="text-sm text-red-600">
          {error}
        </div>
      )}
      
      {field.placeholder && !error && (
        <p className="text-xs text-gray-500">
          {field.placeholder}
        </p>
      )}
    </div>
  )
}

export default DynamicField
