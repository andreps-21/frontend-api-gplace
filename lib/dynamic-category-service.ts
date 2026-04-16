import { apiService } from './api'
import axios from 'axios'

export interface FieldConfig {
  id: number
  category_id: number
  field_name: string
  field_type: 'text' | 'number' | 'select' | 'autocomplete' | 'date'
  label: string
  placeholder?: string
  required: boolean
  validation_rules?: Record<string, any>
  options?: Array<{ value: string; label: string }>
  autocomplete_config?: {
    endpoint: string
    search_field: string
    display_field: string
    value_field: string
    min_chars: number
    debounce_ms: number
    category_id?: number
  }
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface FieldConfigResponse {
  category_id: number
  category_name: string
  required_fields: FieldConfig[]
  optional_fields: FieldConfig[]
  validation_rules: Record<string, any>
}

export interface Product {
  id: number
  name: string
  price: number
  stock: number
  description?: string
}

class DynamicCategoryService {
  private api: any

  constructor() {
    // Acessar a instância axios do apiService
    this.api = (apiService as any).api
  }

  // === CONFIGURAÇÃO DE CAMPOS ===
  async getFieldConfig(categoryId: number): Promise<{ data: FieldConfigResponse }> {
    try {
      const response = await this.api.get(`/categories/${categoryId}/field-config`)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async getFieldConfigs(categoryId: number): Promise<{ data: FieldConfig[] }> {
    try {
      const response = await this.api.get(`/categories/${categoryId}/field-configs`)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async createFieldConfig(categoryId: number, configData: Partial<FieldConfig>): Promise<{ data: FieldConfig }> {
    try {
      const response = await this.api.post(`/categories/${categoryId}/field-configs`, configData)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async updateFieldConfig(categoryId: number, fieldId: number, configData: Partial<FieldConfig>): Promise<{ data: FieldConfig }> {
    try {
      const response = await this.api.put(`/categories/${categoryId}/field-configs/${fieldId}`, configData)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async deleteFieldConfig(categoryId: number, fieldId: number): Promise<{ data: any }> {
    try {
      const response = await this.api.delete(`/categories/${categoryId}/field-configs/${fieldId}`)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async updateAllFieldConfigs(categoryId: number, configs: Partial<FieldConfig>[]): Promise<{ data: any }> {
    try {
      const response = await this.api.put(`/categories/${categoryId}/field-configs`, {
        field_configs: configs
      })
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  // === BUSCA DE PRODUTOS ===
  async searchProducts(categoryId?: number, searchTerm?: string): Promise<{ data: Product[] }> {
    try {
      const params = new URLSearchParams()
      if (categoryId) params.append('category_id', categoryId.toString())
      if (searchTerm) params.append('q', searchTerm)
      
      const queryString = params.toString()
      const url = `/products/search${queryString ? `?${queryString}` : ''}`
      
      const response = await this.api.get(url)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  private handleError(error: any): Error {
    console.error('DynamicCategoryService Error:', error)
    
    if (error?.response?.data?.message) {
      return new Error(error.response.data.message)
    }
    
    if (error?.message) {
      return new Error(error.message)
    }
    
    return new Error('Erro desconhecido no serviço de categorias dinâmicas')
  }
}

export default new DynamicCategoryService()
