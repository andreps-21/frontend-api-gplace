"use client"

import React, { useState, useEffect } from 'react'
import { useDynamicCategories } from '@/lib/use-dynamic-categories'
import { apiService } from '@/lib/api'
import { usePermissions } from '@/lib/use-permissions'
import { AccessDenied } from '@/components/ui/access-denied'
import CategoryFieldConfigForm from '@/components/dynamic/category-field-config-form'
import CategoryFieldConfigList from '@/components/dynamic/category-field-config-list'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Settings, Plus, X } from 'lucide-react'
import { PanelGridCardsSkeleton, PanelPageHeaderSkeleton } from '@/components/dashboard/panel-content-skeleton'
import { notifications } from '@/lib/notifications'

interface Category {
  id: number
  name: string
  description: string
  is_active: boolean
  created_at: string
  updated_at: string
}

const CategoryManagement: React.FC = () => {
  const { loadFieldConfigs, createFieldConfig, updateFieldConfig, deleteFieldConfig } = useDynamicCategories()
  const { canAccessSpecificModule } = usePermissions()
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [fieldConfigs, setFieldConfigs] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingConfig, setEditingConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [categoryFieldCounts, setCategoryFieldCounts] = useState<Record<number, number>>({})
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false)
  const [newCategoryData, setNewCategoryData] = useState({
    name: '',
    description: '',
    is_active: true
  })

  // Verificar permissões
  if (!canAccessSpecificModule('gerenciar-categorias')) {
    return <AccessDenied />
  }

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    if (selectedCategory) {
      loadFieldConfigs(selectedCategory)
        .then(configs => {
          setFieldConfigs(configs)
          // Atualizar contagem da categoria selecionada
          setCategoryFieldCounts(prev => ({
            ...prev,
            [selectedCategory]: configs.length
          }))
        })
        .catch(err => console.error('Erro ao carregar configurações:', err))
    }
  }, [selectedCategory, loadFieldConfigs])

  const loadCategories = async () => {
      try {
        setLoading(true)
      console.log('🔄 Carregando categorias...')
      const response = await apiService.getCategoriesActive()
      console.log('✅ Categorias carregadas:', response.data)
      setCategories(response.data)
      
      // Carregar quantidade de campos para cada categoria
      await loadFieldCountsForAllCategories(response.data)
      } catch (error) {
      console.error('❌ Erro ao carregar categorias:', error)
      } finally {
        setLoading(false)
      }
    }

  const loadFieldCountsForAllCategories = async (categoriesList: Category[]) => {
    try {
      console.log('🔄 Carregando contagem de campos para todas as categorias...')
      const counts: Record<number, number> = {}
      
      // Carregar contagem para cada categoria
      for (const category of categoriesList) {
        try {
          const configs = await loadFieldConfigs(category.id)
          counts[category.id] = configs.length
          console.log(`📊 Categoria ${category.name}: ${configs.length} campos`)
        } catch (error) {
          console.log(`⚠️ Erro ao carregar campos para ${category.name}:`, error)
          counts[category.id] = 0
        }
      }
      
      setCategoryFieldCounts(counts)
      console.log('✅ Contagens carregadas:', counts)
    } catch (error) {
      console.error('❌ Erro ao carregar contagens:', error)
    }
  }

  const handleCategorySelect = (categoryId: number) => {
    setSelectedCategory(categoryId)
    setShowForm(false)
    setEditingConfig(null)
  }

  const handleCreateConfig = async (configData: any) => {
    try {
      if (!selectedCategory) return
      
      console.log('🔄 Criando configuração de campo:', configData)
      await createFieldConfig(selectedCategory, configData)
      console.log('✅ Configuração criada com sucesso')
      
      // Recarregar configurações e atualizar contagem
      const configs = await loadFieldConfigs(selectedCategory)
      setFieldConfigs(configs)
      setCategoryFieldCounts(prev => ({
        ...prev,
        [selectedCategory]: configs.length
      }))
      
      setShowForm(false)
    } catch (error) {
      console.error('❌ Erro ao criar configuração:', error)
    }
  }

  const handleUpdateConfig = async (fieldId: number, configData: any) => {
    try {
      if (!selectedCategory) return
      
      console.log('🔄 Atualizando configuração de campo:', fieldId, configData)
      await updateFieldConfig(selectedCategory, fieldId, configData)
      console.log('✅ Configuração atualizada com sucesso')
      
      // Recarregar configurações e atualizar contagem
      const configs = await loadFieldConfigs(selectedCategory)
      setFieldConfigs(configs)
      setCategoryFieldCounts(prev => ({
        ...prev,
        [selectedCategory]: configs.length
      }))
      
      setEditingConfig(null)
    } catch (error) {
      console.error('❌ Erro ao atualizar configuração:', error)
    }
  }

  const handleDeleteConfig = async (fieldId: number) => {
    if (!selectedCategory) return
    
    // Buscar o nome da configuração para exibir na confirmação
    const fieldConfig = fieldConfigs.find(config => config.id === fieldId)
    const fieldName = fieldConfig?.field_name || 'esta configuração'
    
    // Usar notificação de confirmação em vez de window.confirm
    notifications.confirmDelete(fieldName, async () => {
      try {
        console.log('🔄 Deletando configuração de campo:', fieldId)
        await deleteFieldConfig(selectedCategory, fieldId)
        console.log('✅ Configuração deletada com sucesso')
        
        // Recarregar configurações e atualizar contagem
        const configs = await loadFieldConfigs(selectedCategory)
        setFieldConfigs(configs)
        setCategoryFieldCounts(prev => ({
          ...prev,
          [selectedCategory]: configs.length
        }))
        
        // Mostrar notificação de sucesso
        notifications.custom.success('Configuração excluída com sucesso!')
      } catch (error) {
        console.error('❌ Erro ao deletar configuração:', error)
        notifications.custom.error('Erro ao excluir configuração')
      }
    })
  }

  const handleCreateCategory = async () => {
    try {
      console.log('🔄 Criando nova categoria:', newCategoryData)
      const response = await apiService.createCategory(newCategoryData)
      console.log('✅ Categoria criada com sucesso:', response.data)
      
      // Recarregar lista de categorias
      await loadCategories()
      
      // Fechar modal e limpar dados
      setShowCreateCategoryModal(false)
      setNewCategoryData({ name: '', description: '', is_active: true })
      
      // Mostrar notificação de sucesso
      notifications.custom.success('Categoria criada com sucesso!')
    } catch (error) {
      console.error('❌ Erro ao criar categoria:', error)
      notifications.custom.error('Erro ao criar categoria')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen space-y-6 p-6" aria-busy="true" aria-label="A carregar categorias">
        <PanelPageHeaderSkeleton />
        <PanelGridCardsSkeleton cards={6} />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Gerenciamento de Categorias</h1>
        <p className="text-sm text-gray-600">Configure campos personalizados para cada categoria</p>
      </div>

      {/* Lista de Categorias - Ocupa tela inteira */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
                Categorias
              </CardTitle>
              <p className="text-sm text-gray-600">
                Configure campos personalizados para cada categoria
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowCreateCategoryModal(true)}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nova Categoria
              </Button>
              {selectedCategory && (
                <Button
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Campo
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-1">
            {categories.map(category => {
              const configCount = categoryFieldCounts[category.id] || 0
              return (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleCategorySelect(category.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Settings className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-base truncate" title={category.name}>
                          {category.name}
                        </h3>
                        <Badge 
                          variant={configCount > 0 ? "default" : "secondary"}
                          className="text-xs px-2 py-1"
                        >
                          {configCount > 0 ? `${configCount} campos` : "Sem campos"}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 mt-1 line-clamp-1">
                        {category.description}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 ml-4">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {configCount}
                      </p>
                      <p className="text-xs text-gray-500">Campos configurados</p>
                </div>
                    <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCategorySelect(category.id)
                        }}
                        title="Configurar campos"
                        className="h-8 w-8 p-0 border-gray-300 hover:bg-gray-50"
                      >
                        <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              </div>
                  )
                })}
          </div>
        </CardContent>
      </Card>

      {/* Configurações de Campos - Modal ou seção expandida */}
      {selectedCategory && (
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Configurações de Campos - {categories.find(c => c.id === selectedCategory)?.name}
            </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCategory ? (
                <>
                  {showForm && (
                    <div className="mb-6">
                      <CategoryFieldConfigForm
                        onSubmit={handleCreateConfig}
                        onCancel={() => setShowForm(false)}
                  />
                </div>
                  )}

                  {editingConfig && (
                    <div className="mb-6">
                      <CategoryFieldConfigForm
                        config={editingConfig}
                        onSubmit={(data) => handleUpdateConfig(editingConfig.id, data)}
                        onCancel={() => setEditingConfig(null)}
                      />
        </div>
      )}

                  <CategoryFieldConfigList
                    configs={fieldConfigs}
                    onEdit={setEditingConfig}
                    onDelete={handleDeleteConfig}
                  />
                </>
              ) : (
                <div className="text-center py-12">
                  <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Selecione uma categoria para gerenciar seus campos</p>
        </div>
      )}
            </CardContent>
          </Card>
      )}

      {/* Modal de Nova Categoria */}
      {showCreateCategoryModal && (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-50/80 via-white/60 to-purple-50/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white/70 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-foreground">Nova Categoria</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCreateCategoryModal(false)
                  setNewCategoryData({ name: '', description: '', is_active: true })
                }}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <Label htmlFor="category-name" className="text-sm font-medium text-foreground">Nome da Categoria</Label>
                <Input
                  id="category-name"
                  value={newCategoryData.name}
                  onChange={(e) => setNewCategoryData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: APARELHO, PLANO, ACESSÓRIO"
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label htmlFor="category-description" className="text-sm font-medium text-foreground">Descrição (opcional)</Label>
                <Textarea
                  id="category-description"
                  value={newCategoryData.description}
                  onChange={(e) => setNewCategoryData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva a categoria..."
                  className="mt-2"
                  rows={3}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="category-active"
                  checked={newCategoryData.is_active}
                  onCheckedChange={(checked) => setNewCategoryData(prev => ({ ...prev, is_active: !!checked }))}
                />
                <Label htmlFor="category-active" className="text-sm text-foreground">
                  Categoria ativa
                </Label>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateCategoryModal(false)
                    setNewCategoryData({ name: '', description: '', is_active: true })
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateCategory}
                  disabled={!newCategoryData.name.trim()}
                >
                  Criar Categoria
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CategoryManagement