"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Edit, Trash2, MapPin, Phone, Mail, X, ChevronLeft, ChevronRight, Filter, MoreHorizontal, Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle } from "lucide-react"
import { useState, useEffect } from "react"
import { apiService, Establishment } from "@/lib/api"

export default function PDVPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("todos")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedEstablishment, setSelectedEstablishment] = useState<Establishment | null>(null)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [establishments, setEstablishments] = useState<Establishment[]>([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: "",
    cnpj: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    phone: "",
    email: "",
    manager_id: "",
  })

  const estados = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
    "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
    "RS", "RO", "RR", "SC", "SP", "SE", "TO"
  ]

  // Carregar estabelecimentos da API
  useEffect(() => {
    const loadEstablishments = async () => {
      try {
        setLoading(true)
        const response = await apiService.getEstablishments()
        console.log('📥 Resposta da API de estabelecimentos (PDV):', response)
        
        // A API retorna o array diretamente em response.data
        const establishments = Array.isArray(response.data) ? response.data : (response.data?.data || [])
        console.log('🏪 Estabelecimentos carregados (PDV):', establishments)
        
        setEstablishments(establishments)
      } catch (err: any) {
        console.error('❌ Erro ao carregar estabelecimentos (PDV):', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadEstablishments()
  }, [])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const dataToSend = {
        ...formData,
        manager_id: formData.manager_id ? parseInt(formData.manager_id) : undefined,
      }
      await apiService.createEstablishment(dataToSend)
      // Recarregar lista
      const response = await apiService.getEstablishments()
      setEstablishments(Array.isArray(response.data) ? response.data : (response.data?.data || []))
    setShowModal(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    setFormData({
        name: "",
        cnpj: "",
        address: "",
        city: "",
        state: "",
        zip_code: "",
        phone: "",
      email: "",
        manager_id: "",
    })
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleView = (establishment: Establishment) => {
    setSelectedEstablishment(establishment)
    setShowViewModal(true)
  }

  const handleEdit = (establishment: Establishment) => {
    setSelectedEstablishment(establishment)
    setFormData({
      name: establishment.name,
      cnpj: establishment.cnpj,
      address: establishment.address,
      city: establishment.city,
      state: establishment.state,
      zip_code: establishment.zip_code,
      phone: establishment.phone,
      email: establishment.email,
      manager_id: establishment.manager_id?.toString() || "",
    })
    setShowEditModal(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEstablishment) return
    
    try {
      const dataToSend = {
        ...formData,
        manager_id: formData.manager_id ? parseInt(formData.manager_id) : undefined,
      }
      await apiService.updateEstablishment(selectedEstablishment.id, dataToSend)
      // Recarregar lista
      const response = await apiService.getEstablishments()
      setEstablishments(Array.isArray(response.data) ? response.data : (response.data?.data || []))
      setShowEditModal(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDelete = async () => {
    if (!selectedEstablishment) return
    
    try {
      await apiService.deleteEstablishment(selectedEstablishment.id)
      // Recarregar lista
      const response = await apiService.getEstablishments()
      setEstablishments(Array.isArray(response.data) ? response.data : (response.data?.data || []))
      setShowDeleteModal(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Filtrar estabelecimentos
  const filteredEstablishments = establishments.filter(establishment => {
    const matchesSearch = establishment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         establishment.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         establishment.cnpj.includes(searchTerm)
    
    const matchesStatus = filterStatus === "todos" || 
                         (filterStatus === "ativo" && establishment.is_active) ||
                         (filterStatus === "inativo" && !establishment.is_active)
    
    return matchesSearch && matchesStatus
  })

  // Paginação
  const totalPages = Math.ceil(filteredEstablishments.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentEstablishments = filteredEstablishments.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(page)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setFilterStatus("todos")
    setCurrentPage(1)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando estabelecimentos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">
            Pontos de Venda
          </h2>
          <p className="text-muted-foreground mt-2">Gerencie os estabelecimentos da rede</p>
        </div>
        <Button 
          onClick={() => setShowModal(true)}
          className="text-white"
          style={{ backgroundColor: '#0026d9' }}
          onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#001a99'}
          onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#0026d9'}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Estabelecimento
        </Button>
      </div>

      {success && (
        <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Estabelecimento processado com sucesso!
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros e Busca
          </CardTitle>
          <CardDescription>Pesquise e filtre os estabelecimentos</CardDescription>
          </CardHeader>
          <CardContent>
          <div className="space-y-4">
            {/* Busca principal */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, cidade ou CNPJ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtros */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="filter-status">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger id="filter-status">
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os status</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end gap-2">
                <Button variant="outline" onClick={clearFilters}>
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </div>
          </CardContent>
        </Card>

        <Card>
        <CardHeader>
          <CardTitle>Estabelecimentos ({filteredEstablishments.length})</CardTitle>
          <CardDescription>Lista de todos os estabelecimentos cadastrados</CardDescription>
          </CardHeader>
          <CardContent>
          <div className="space-y-4">
            {currentEstablishments.map((establishment) => (
              <div key={establishment.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="flex items-center gap-2">
                  <Badge 
                      variant={establishment.is_active ? "default" : "secondary"}
                      className="text-xs px-2 py-1"
                  >
                      {establishment.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{establishment.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {establishment.city}, {establishment.state}
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {establishment.phone}
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {establishment.email}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      CNPJ: {establishment.cnpj} | {establishment.users?.length || 0} vendedores
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleView(establishment)}
                    title="Visualizar dados"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(establishment)}
                    title="Editar estabelecimento"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedEstablishment(establishment)
                      setShowDeleteModal(true)
                    }}
                    title="Excluir estabelecimento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                  </div>
            ))}

            {currentEstablishments.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum estabelecimento encontrado
                  </div>
            )}
                </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1} a {Math.min(endIndex, filteredEstablishments.length)} de {filteredEstablishments.length} estabelecimentos
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => goToPage(page)}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
            </div>
          )}
              </CardContent>
            </Card>

      {/* Modal para novo estabelecimento */}
      {showModal && (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-50/80 via-white/60 to-purple-50/80 backdrop-blur-md flex items-center justify-center z-[100]">
          <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto bg-white/70 backdrop-blur-xl border border-white/20 shadow-2xl">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Novo Estabelecimento</CardTitle>
              <Button
                variant="ghost"
                  size="sm"
                  onClick={() => setShowModal(false)}
              >
                  <X className="w-4 h-4" />
              </Button>
            </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nome do Estabelecimento</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      value={formData.cnpj}
                      onChange={(e) => handleInputChange("cnpj", e.target.value)}
                      required
                    />
              </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="address">Endereço</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange("address", e.target.value)}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="city">Cidade</Label>
                      <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange("city", e.target.value)}
                        required
                      />
                    </div>
                  
                  <div>
                    <Label htmlFor="state">Estado</Label>
                    <Select value={formData.state} onValueChange={(value) => handleInputChange("state", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o estado" />
                        </SelectTrigger>
                        <SelectContent>
                          {estados.map((estado) => (
                            <SelectItem key={estado} value={estado}>
                              {estado}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  
                  <div>
                    <Label htmlFor="zip_code">CEP</Label>
                    <Input
                      id="zip_code"
                      value={formData.zip_code}
                      onChange={(e) => handleInputChange("zip_code", e.target.value)}
                    />
              </div>

                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowModal(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 text-white"
                    style={{ backgroundColor: '#0026d9' }}
                  >
                    Criar Estabelecimento
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal para editar estabelecimento */}
      {showEditModal && selectedEstablishment && (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-50/80 via-white/60 to-purple-50/80 backdrop-blur-md flex items-center justify-center z-[100]">
          <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto bg-white/70 backdrop-blur-xl border border-white/20 shadow-2xl">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Editar Estabelecimento</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEditModal(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-name">Nome do Estabelecimento</Label>
                    <Input
                      id="edit-name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-cnpj">CNPJ</Label>
                    <Input
                      id="edit-cnpj"
                      value={formData.cnpj}
                      onChange={(e) => handleInputChange("cnpj", e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="edit-address">Endereço</Label>
                    <Input
                      id="edit-address"
                      value={formData.address}
                      onChange={(e) => handleInputChange("address", e.target.value)}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-city">Cidade</Label>
                    <Input
                      id="edit-city"
                      value={formData.city}
                      onChange={(e) => handleInputChange("city", e.target.value)}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-state">Estado</Label>
                    <Select value={formData.state} onValueChange={(value) => handleInputChange("state", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {estados.map((estado) => (
                          <SelectItem key={estado} value={estado}>
                            {estado}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-zip_code">CEP</Label>
                    <Input
                      id="edit-zip_code"
                      value={formData.zip_code}
                      onChange={(e) => handleInputChange("zip_code", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-phone">Telefone</Label>
                    <Input
                      id="edit-phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 text-white"
                    style={{ backgroundColor: '#0026d9' }}
                  >
                    Salvar Alterações
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
              </div>
      )}

      {/* Modal para confirmar exclusão */}
      {showDeleteModal && selectedEstablishment && (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-50/80 via-white/60 to-purple-50/80 backdrop-blur-md flex items-center justify-center z-[100]">
          <Card className="w-full max-w-md mx-4 bg-white/70 backdrop-blur-xl border border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle>Confirmar Exclusão</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Tem certeza que deseja excluir o estabelecimento <strong>{selectedEstablishment.name}</strong>?
                Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleDelete}
                  className="flex-1"
                >
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de Visualização */}
      {showViewModal && selectedEstablishment && (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-50/80 via-white/60 to-purple-50/80 backdrop-blur-md flex items-center justify-center z-[100]">
          <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto bg-white/70 backdrop-blur-xl border border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle>
                Dados do Estabelecimento
              </CardTitle>
              <CardDescription>
                Informações completas de {selectedEstablishment.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Status</h3>
                <Badge 
                  variant={selectedEstablishment.is_active ? "default" : "secondary"}
                  className="text-sm px-3 py-1"
                >
                  {selectedEstablishment.is_active ? "Ativo" : "Inativo"}
                </Badge>
              </div>

              {/* Informações Básicas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Nome</Label>
                  <p className="text-sm">{selectedEstablishment.name}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">CNPJ</Label>
                  <p className="text-sm font-mono">{selectedEstablishment.cnpj}</p>
                </div>
              </div>

              {/* Endereço */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Endereço</Label>
                <p className="text-sm">{selectedEstablishment.address}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Cidade</Label>
                  <p className="text-sm">{selectedEstablishment.city}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Estado</Label>
                  <p className="text-sm">{selectedEstablishment.state}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">CEP</Label>
                  <p className="text-sm font-mono">{selectedEstablishment.zip_code}</p>
                </div>
              </div>

              {/* Contato */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Telefone</Label>
                  <p className="text-sm">{selectedEstablishment.phone}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <p className="text-sm">{selectedEstablishment.email}</p>
                </div>
              </div>

              {/* Estatísticas */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">Estatísticas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Total de Vendedores</Label>
                    <p className="text-2xl font-bold text-blue-600">{selectedEstablishment.users?.length || 0}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Data de Criação</Label>
                    <p className="text-sm">{new Date(selectedEstablishment.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowViewModal(false)
                    setSelectedEstablishment(null)
                  }}
                >
                  Fechar
                </Button>
                <Button
                  onClick={() => {
                    setShowViewModal(false)
                    handleEdit(selectedEstablishment)
                  }}
                  style={{ backgroundColor: '#0026d9' }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}