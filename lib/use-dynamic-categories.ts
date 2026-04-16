import { useState, useCallback } from 'react'
import dynamicCategoryService, { FieldConfig, FieldConfigResponse, Product } from './dynamic-category-service'

export const useDynamicCategories = () => {
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // === CONFIGURAÇÃO DE CAMPOS ===
  const loadFieldConfig = useCallback(async (categoryId: number): Promise<FieldConfigResponse> => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('🔄 Carregando configuração de campos para categoria:', categoryId)
      const response = await dynamicCategoryService.getFieldConfig(categoryId)
      console.log('✅ Configuração carregada:', response.data)
      return response.data
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao carregar configuração de campos'
      console.error('❌ Erro ao carregar configuração:', err)
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const loadFieldConfigs = useCallback(async (categoryId: number): Promise<FieldConfig[]> => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('🔄 Carregando configurações de campos para categoria:', categoryId)
      const response = await dynamicCategoryService.getFieldConfigs(categoryId)
      console.log('✅ Configurações carregadas:', response.data)
      setFieldConfigs(response.data)
      return response.data
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao carregar configurações de campos'
      console.error('❌ Erro ao carregar configurações:', err)
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const createFieldConfig = useCallback(async (categoryId: number, configData: Partial<FieldConfig>): Promise<FieldConfig> => {
    try {
      console.log('🔄 Criando configuração de campo:', configData)
      const response = await dynamicCategoryService.createFieldConfig(categoryId, configData)
      console.log('✅ Configuração criada:', response.data)
      
      // Recarregar lista
      await loadFieldConfigs(categoryId)
      return response.data
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao criar configuração de campo'
      console.error('❌ Erro ao criar configuração:', err)
      setError(errorMessage)
      throw err
    }
  }, [loadFieldConfigs])

  const updateFieldConfig = useCallback(async (categoryId: number, fieldId: number, configData: Partial<FieldConfig>): Promise<FieldConfig> => {
    try {
      console.log('🔄 Atualizando configuração de campo:', fieldId, configData)
      const response = await dynamicCategoryService.updateFieldConfig(categoryId, fieldId, configData)
      console.log('✅ Configuração atualizada:', response.data)
      
      // Recarregar lista
      await loadFieldConfigs(categoryId)
      return response.data
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao atualizar configuração de campo'
      console.error('❌ Erro ao atualizar configuração:', err)
      setError(errorMessage)
      throw err
    }
  }, [loadFieldConfigs])

  const deleteFieldConfig = useCallback(async (categoryId: number, fieldId: number): Promise<void> => {
    try {
      console.log('🔄 Deletando configuração de campo:', fieldId)
      await dynamicCategoryService.deleteFieldConfig(categoryId, fieldId)
      console.log('✅ Configuração deletada')
      
      // Recarregar lista
      await loadFieldConfigs(categoryId)
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao deletar configuração de campo'
      console.error('❌ Erro ao deletar configuração:', err)
      setError(errorMessage)
      throw err
    }
  }, [loadFieldConfigs])

  const updateAllFieldConfigs = useCallback(async (categoryId: number, configs: Partial<FieldConfig>[]): Promise<void> => {
    try {
      console.log('🔄 Atualizando todas as configurações de campos:', configs)
      await dynamicCategoryService.updateAllFieldConfigs(categoryId, configs)
      console.log('✅ Configurações atualizadas')
      
      // Recarregar lista
      await loadFieldConfigs(categoryId)
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao atualizar configurações de campos'
      console.error('❌ Erro ao atualizar configurações:', err)
      setError(errorMessage)
      throw err
    }
  }, [loadFieldConfigs])

  // === BUSCA DE PRODUTOS ===
  const searchProducts = useCallback(async (categoryId?: number, searchTerm?: string): Promise<Product[]> => {
    try {
      console.log('🔍 Buscando produtos:', { categoryId, searchTerm })
      const response = await dynamicCategoryService.searchProducts(categoryId, searchTerm)
      console.log('✅ Produtos encontrados:', response.data)
      return response.data
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao buscar produtos'
      console.error('❌ Erro ao buscar produtos:', err)
      setError(errorMessage)
      throw err
    }
  }, [])

  // === LIMPAR ERRO ===
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    // Estados
    fieldConfigs,
    loading,
    error,
    
    // Ações
    loadFieldConfig,
    loadFieldConfigs,
    createFieldConfig,
    updateFieldConfig,
    deleteFieldConfig,
    updateAllFieldConfigs,
    searchProducts,
    clearError
  }
}
