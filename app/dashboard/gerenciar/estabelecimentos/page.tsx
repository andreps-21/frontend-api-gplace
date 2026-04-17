"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2, Plus, Search, Edit, Trash2, Mail, Phone, X, ChevronLeft, ChevronRight, Filter, MoreHorizontal, History, Calendar, DollarSign, Shield, UserCheck, MapPin, Users, Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle } from "lucide-react"
import { apiService, ApiResponse } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { usePermissions } from "@/lib/use-permissions"
import { AccessDenied } from "@/components/ui/access-denied"
import { notifications } from "@/lib/notifications"
import { useUserPermissions } from "@/lib/user-permissions"
import { handleApiError, showErrorNotification } from "@/lib/error-handler"
import { PanelTableSkeleton } from "@/components/dashboard/panel-content-skeleton"

interface Establishment {
  id: number
  name: string
  cnpj: string
  address: string
  city: string
  state: string
  zip_code: string
  phone: string
  email: string
  manager_id: number | null
  is_active: boolean
  created_at: string
  updated_at: string
  manager?: {
    id: number
    name: string
    email: string
  }
  users?: Array<{
    id: number
    name: string
    email: string
    is_active: boolean
    roles: Array<{
      id: number
      name: string
      description: string
    }>
  }>
}

interface PaginationData {
  current_page: number
  last_page: number
  total: number
  per_page: number
  from: number
  to: number
}

export default function EstabelecimentosPage() {
  const { user } = useAuth()
  const { userRole, isGestor } = usePermissions()
  const permissions = useUserPermissions()
  
  const [establishments, setEstablishments] = useState<Establishment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("todos")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedEstablishment, setSelectedEstablishment] = useState<Establishment | null>(null)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [totalPages, setTotalPages] = useState(1)
  const [managers, setManagers] = useState<any[]>([])
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  // Verificar permissões usando o hook useUserPermissions
  const hasPermission = permissions.canViewAllEstablishments

  if (!hasPermission) {
    return <AccessDenied />
  }

  // Carregar estabelecimentos da API com debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadEstablishments()
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [currentPage, searchTerm, filterStatus])

  // Reset página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterStatus])

  // Carregar gerentes para o formulário
  useEffect(() => {
    loadManagers()
  }, [])

  const loadEstablishments = async () => {
    try {
      setLoading(true)
      setError("")
      
      // Determinar parâmetros de busca baseado nas permissões
      let searchParams: any = {
        page: currentPage,
        search: searchTerm || undefined,
      }
      
      // Aplicar filtro de status se selecionado
      if (filterStatus !== 'todos') {
        searchParams.is_active = filterStatus === 'ativo'
      }
      
      console.log('🔍 Parâmetros de busca de estabelecimentos:', searchParams)
      
      const response = await apiService.getEstablishments(searchParams)
      
      // Verificar se a resposta tem a estrutura esperada
      if (response && response.data) {
        console.log('🔍 Estrutura da resposta da API de estabelecimentos:', response.data)
        
        // Verificar se é uma resposta paginada
        if (response.data.data && Array.isArray(response.data.data)) {
          setEstablishments(response.data.data)
          setTotalPages(response.data.last_page || 1)
        } else if (Array.isArray(response.data)) {
          // Se for um array direto (sem paginação)
          setEstablishments(response.data)
          setTotalPages(1)
        } else {
          console.warn('⚠️ Estrutura de resposta inesperada:', response.data)
          setEstablishments([])
          setTotalPages(1)
        }
      } else {
        console.warn('⚠️ Resposta vazia da API de estabelecimentos')
        setEstablishments([])
        setTotalPages(1)
      }
    } catch (error: any) {
      console.error('❌ Erro ao carregar estabelecimentos:', error)
      const errorInfo = handleApiError(error)
      setError(errorInfo.message)
      showErrorNotification(errorInfo)
    } finally {
      setLoading(false)
    }
  }

  const loadManagers = async () => {
    try {
      const response = await apiService.getUsers()
      if (response.data && Array.isArray(response.data)) {
        // Filtrar apenas usuários com role de gerente
        const managers = response.data.filter((user: any) => 
          user.roles && user.roles.some((role: any) => role.name === 'gerente')
        )
        setManagers(managers)
      }
    } catch (error) {
      console.error('❌ Erro ao carregar gerentes:', error)
    }
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value))
    setCurrentPage(1)
  }

  const handleCreate = () => {
    setSelectedEstablishment(null)
    setShowModal(true)
  }

  const handleEdit = (establishment: Establishment) => {
    setSelectedEstablishment(establishment)
    setShowEditModal(true)
  }

  const handleView = (establishment: Establishment) => {
    setSelectedEstablishment(establishment)
    // Implementar visualização de detalhes
    notifications.custom.success(`Visualizando ${establishment.name}`)
  }

  const handleDelete = (establishment: Establishment) => {
    setSelectedEstablishment(establishment)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!selectedEstablishment) return

    try {
      setActionLoading(selectedEstablishment.id)
      await apiService.deleteEstablishment(selectedEstablishment.id)
      
      notifications.custom.success('Estabelecimento excluído com sucesso!')
      setShowDeleteModal(false)
      setSelectedEstablishment(null)
      loadEstablishments()
    } catch (error: any) {
      console.error('❌ Erro ao excluir estabelemento:', error)
      notifications.custom.error('Erro ao excluir estabelecimento')
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return <Badge variant="default" className="text-xs">Ativo</Badge>
    }
    return <Badge variant="secondary" className="text-xs">Inativo</Badge>
  }

  const formatCNPJ = (cnpj: string) => {
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }

  const formatPhone = (phone: string) => {
    return phone.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3')
  }

  // Paginação
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedEstablishments = establishments.slice(startIndex, endIndex)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estabelecimentos</h1>
          <p className="text-muted-foreground">
            Gerencie todos os estabelecimentos do sistema
          </p>
        </div>
        {isGestor() && (
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Novo Estabelecimento
          </Button>
        )}
      </div>

      {/* Indicadores de Permissão */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Acesso</p>
                <p className="text-xs text-muted-foreground">
                  {permissions.canViewAllEstablishments ? 'Todos os estabelecimentos' : 'Apenas próprio'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Total</p>
                <p className="text-xs text-muted-foreground">
                  {establishments.length} estabelecimentos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Status</p>
                <p className="text-xs text-muted-foreground">
                  {establishments.filter(e => e.is_active).length} ativos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nome ou CNPJ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="inativo">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="items-per-page">Itens por página</Label>
              <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Lista de Estabelecimentos */}
      <Card>
        <CardHeader>
          <CardTitle>Estabelecimentos Cadastrados ({establishments.length})</CardTitle>
          <CardDescription>Lista de todos os estabelecimentos do sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <PanelTableSkeleton rows={10} columns={8} />
          ) : paginatedEstablishments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>Nenhum estabelecimento encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium text-gray-500">Nome</th>
                    <th className="text-left p-4 font-medium text-gray-500">CNPJ</th>
                    <th className="text-left p-4 font-medium text-gray-500">Localização</th>
                    <th className="text-left p-4 font-medium text-gray-500">Contato</th>
                    <th className="text-left p-4 font-medium text-gray-500">Gerente</th>
                    <th className="text-left p-4 font-medium text-gray-500">Usuários</th>
                    <th className="text-left p-4 font-medium text-gray-500">Status</th>
                    <th className="text-left p-4 font-medium text-gray-500">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEstablishments.map((establishment) => (
                    <tr key={establishment.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <div className="font-medium text-gray-900">{establishment.name}</div>
                        <div className="text-sm text-gray-500">{establishment.email}</div>
                      </td>
                      <td className="p-4 text-sm text-gray-900">
                        {formatCNPJ(establishment.cnpj)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-sm text-gray-900">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          {establishment.city}/{establishment.state}
                        </div>
                        <div className="text-xs text-gray-500">{establishment.address}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-sm text-gray-900">
                          <Phone className="w-4 h-4 text-gray-400" />
                          {formatPhone(establishment.phone)}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-900">
                        {establishment.manager?.name || 'Sem gerente'}
                      </td>
                      <td className="p-4 text-sm text-gray-900">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-gray-400" />
                          {establishment.users?.length || 0}
                        </div>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(establishment.is_active)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(establishment)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {isGestor() && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(establishment)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          {isGestor() && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(establishment)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              disabled={actionLoading === establishment.id}
                            >
                              {actionLoading === establishment.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1} a {Math.min(endIndex, establishments.length)} de {establishments.length} estabelecimentos
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Exclusão */}
      {showDeleteModal && selectedEstablishment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-red-600">Confirmar Exclusão</CardTitle>
              <CardDescription>
                Tem certeza que deseja excluir o estabelecimento "{selectedEstablishment.name}"?
                Esta ação não pode ser desfeita.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={actionLoading === selectedEstablishment.id}
              >
                {actionLoading === selectedEstablishment.id ? 'Excluindo...' : 'Excluir'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mensagem de Erro */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
