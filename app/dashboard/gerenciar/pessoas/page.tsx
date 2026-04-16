"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Plus, Search, Edit, Trash2, Mail, Phone, X, ChevronLeft, ChevronRight, Filter, MoreHorizontal, History, Calendar, DollarSign, ShoppingCart } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle } from "lucide-react"
import { apiService, Person, Customer } from "@/lib/api"
import { useUserRole } from "@/lib/use-user-role"

const mockPessoas = [
  {
    id: 1,
    nome: "João Silva",
    email: "joao.silva@tim.com",
    telefone: "(11) 98765-4321",
    cargo: "Vendedor",
    loja: "Loja 1 - Centro",
    status: "Ativo",
  },
  {
    id: 2,
    nome: "Maria Santos",
    email: "maria.santos@tim.com",
    telefone: "(11) 97654-3210",
    cargo: "Gerente",
    loja: "Loja 3 - Shopping",
    status: "Ativo",
  },
  {
    id: 3,
    nome: "Pedro Costa",
    email: "pedro.costa@tim.com",
    telefone: "(11) 96543-2109",
    cargo: "Vendedor",
    loja: "Loja 2 - Norte",
    status: "Ativo",
  },
  {
    id: 4,
    nome: "Ana Oliveira",
    email: "ana.oliveira@tim.com",
    telefone: "(11) 95432-1098",
    cargo: "Supervisor",
    loja: "Loja 5 - Leste",
    status: "Ativo",
  },
  {
    id: 5,
    nome: "Carlos Lima",
    email: "carlos.lima@tim.com",
    telefone: "(11) 94321-0987",
    cargo: "Vendedor",
    loja: "Loja 1 - Centro",
    status: "Inativo",
  },
  {
    id: 6,
    nome: "Fernanda Alves",
    email: "fernanda.alves@tim.com",
    telefone: "(11) 93210-9876",
    cargo: "Vendedor",
    loja: "Loja 4 - Sul",
    status: "Ativo",
  },
  {
    id: 7,
    nome: "Roberto Mendes",
    email: "roberto.mendes@tim.com",
    telefone: "(11) 92109-8765",
    cargo: "Assistente",
    loja: "Loja 6 - Oeste",
    status: "Ativo",
  },
  {
    id: 8,
    nome: "Juliana Ferreira",
    email: "juliana.ferreira@tim.com",
    telefone: "(11) 91098-7654",
    cargo: "Gerente",
    loja: "Loja 7 - Zona Norte",
    status: "Ativo",
  },
  {
    id: 9,
    nome: "Marcos Rodrigues",
    email: "marcos.rodrigues@tim.com",
    telefone: "(11) 90987-6543",
    cargo: "Vendedor",
    loja: "Loja 2 - Norte",
    status: "Ativo",
  },
  {
    id: 10,
    nome: "Patricia Souza",
    email: "patricia.souza@tim.com",
    telefone: "(11) 89876-5432",
    cargo: "Supervisor",
    loja: "Loja 3 - Shopping",
    status: "Ativo",
  },
  {
    id: 11,
    nome: "Ricardo Barbosa",
    email: "ricardo.barbosa@tim.com",
    telefone: "(11) 88765-4321",
    cargo: "Vendedor",
    loja: "Loja 5 - Leste",
    status: "Inativo",
  },
  {
    id: 12,
    nome: "Camila Martins",
    email: "camila.martins@tim.com",
    telefone: "(11) 87654-3210",
    cargo: "Vendedor",
    loja: "Loja 1 - Centro",
    status: "Ativo",
  },
  {
    id: 13,
    nome: "Diego Pereira",
    email: "diego.pereira@tim.com",
    telefone: "(11) 86543-2109",
    cargo: "Assistente",
    loja: "Loja 4 - Sul",
    status: "Ativo",
  },
  {
    id: 14,
    nome: "Larissa Gomes",
    email: "larissa.gomes@tim.com",
    telefone: "(11) 85432-1098",
    cargo: "Vendedor",
    loja: "Loja 6 - Oeste",
    status: "Ativo",
  },
  {
    id: 15,
    nome: "Thiago Nascimento",
    email: "thiago.nascimento@tim.com",
    telefone: "(11) 84321-0987",
    cargo: "Gerente",
    loja: "Loja 7 - Zona Norte",
    status: "Ativo",
  }
]

export default function PessoasPage() {
  const { user, userRole, isAdmin, canEditClients, canDeleteClients, canViewClientSales } = useUserRole()
  const [pessoas, setPessoas] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("todos")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [selectedPessoa, setSelectedPessoa] = useState<Customer | null>(null)
  const [clientSales, setClientSales] = useState<any[]>([])
  const [loadingSales, setLoadingSales] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [totalPages, setTotalPages] = useState(1)
  const [cities, setCities] = useState<any[]>([])

  // Carregar dados da API
  useEffect(() => {
    loadPessoas()
    loadCities()
  }, [currentPage, searchTerm, filterStatus])

  // Calcular total de páginas baseado nos dados filtrados
  useEffect(() => {
    const filtered = pessoas.filter((customer) => {
      const person = customer.person || {}
      const matchesSearch = !searchTerm || 
        person.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.nif?.includes(searchTerm)
      
      const matchesCity = filterStatus === "todos" || (person.city_id && person.city_id.toString() === filterStatus)
      
      return matchesSearch && matchesCity
    })
    
    setTotalPages(Math.ceil(filtered.length / itemsPerPage))
  }, [pessoas, searchTerm, filterStatus, itemsPerPage])

  const loadPessoas = async () => {
    try {
      setLoading(true)
      const response = await apiService.getClients({
        page: currentPage,
        search: searchTerm || undefined,
        city: filterStatus !== "todos" ? filterStatus : undefined
      })
      
      // A API retorna customers com person aninhado
      const customers = response.data.data || []
      setPessoas(customers)
      setTotalPages(response.data.last_page || 1)
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
      setError("Erro ao carregar clientes")
    } finally {
      setLoading(false)
    }
  }

  const loadCities = async () => {
    try {
      const response = await apiService.getCities()
      setCities(response.data)
    } catch (error) {
      console.error('Erro ao carregar cidades:', error)
    }
  }

  const [formData, setFormData] = useState({
    name: "",
    nif: "",
    email: "",
    phone: "",
    birthdate: "",
    gender: "",
    city_id: "",
    zip_code: "",
    address: "",
    district: "",
    number: "",
    full_name: ""
  })


  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await apiService.createClient({
        name: formData.name,
        full_name: formData.full_name,
        nif: formData.nif,
        email: formData.email,
        phone: formData.phone,
        birthdate: formData.birthdate,
        gender: formData.gender,
        city_id: parseInt(formData.city_id),
        zip_code: formData.zip_code,
        address: formData.address,
        district: formData.district,
        number: formData.number,
      })
      setSuccess(true)
      setError("")
      setShowModal(false)
      setFormData({
        name: "",
        nif: "",
        email: "",
        phone: "",
        birthdate: "",
        gender: "",
        city_id: "",
        zip_code: "",
        address: "",
        district: "",
        number: "",
        full_name: ""
      })
      loadPessoas() // Recarregar a lista de clientes
    } catch (err: any) {
      console.error("Erro ao criar cliente:", err)
      setError(err.message || "Erro ao criar cliente.")
    }
  }

  const handleEdit = (customer: any) => {
    // Verificar permissão antes de abrir o modal
    if (!canEditClients) {
      console.warn('Usuário não tem permissão para editar clientes')
      return
    }
    
    const person = customer.person || {}
    setSelectedPessoa(customer)
    // Preencher o formulário com os dados da pessoa
    setFormData({
      name: person.name || "",
      nif: person.nif || "",
      email: person.email || "",
      phone: person.phone || "",
      birthdate: person.birthdate || "",
      gender: person.gender || "",
      city_id: person.city_id?.toString() || "",
      zip_code: person.zip_code || "",
      address: person.address || "",
      district: person.district || "",
      number: person.number || "",
      full_name: person.full_name || ""
    })
    setShowEditModal(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedPessoa) {
      try {
        await apiService.updateClient(selectedPessoa.id, {
          name: formData.name,
          full_name: formData.full_name,
          nif: formData.nif,
          email: formData.email,
          phone: formData.phone,
          birthdate: formData.birthdate,
          gender: formData.gender,
          city_id: parseInt(formData.city_id),
          zip_code: formData.zip_code,
          address: formData.address,
          district: formData.district,
          number: formData.number,
        })
        setSuccess(true)
        setError("")
        setShowEditModal(false)
        setSelectedPessoa(null)
        loadPessoas() // Recarregar a lista de clientes
      } catch (err: any) {
        console.error("Erro ao atualizar cliente:", err)
        setError(err.message || "Erro ao atualizar cliente.")
      }
    }
  }

  const handleDeleteClick = (pessoa: any) => {
    // Verificar permissão antes de abrir o modal
    if (!canDeleteClients) {
      console.warn('Usuário não tem permissão para excluir clientes')
      return
    }
    
    setSelectedPessoa(pessoa)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (selectedPessoa) {
      try {
        await apiService.deleteClient(selectedPessoa.id)
        setSuccess(true)
        setError("")
        setShowDeleteModal(false)
        setSelectedPessoa(null)
        loadPessoas() // Recarregar a lista de clientes
      } catch (err: any) {
        console.error("Erro ao excluir cliente:", err)
        setError(err.message || "Erro ao excluir cliente.")
      }
    }
  }

  const handleViewHistory = async (customer: any) => {
    // Verificar permissão antes de abrir o modal
    if (!canViewClientSales) {
      console.warn('Usuário não tem permissão para visualizar vendas')
      return
    }
    
    setSelectedPessoa(customer)
    setShowHistoryModal(true)
    setLoadingSales(true)
    
    try {
      // Buscar vendas do cliente usando o ID do customer
      const sales = await apiService.getSales({ 
        customer_id: customer.id,
        per_page: 10000 // Buscar todas as vendas do cliente
      })
      setClientSales(sales.data.data || [])
    } catch (err: any) {
      console.error('Erro ao carregar histórico:', err)
      setClientSales([])
    } finally {
      setLoadingSales(false)
    }
  }

  // Lógica de filtros avançados
  const filteredPessoas = pessoas.filter((customer) => {
    const person = customer.person || {}
    const matchesSearch = !searchTerm || 
      person.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.nif?.includes(searchTerm)
    
    const matchesCity = filterStatus === "todos" || (person.city_id && person.city_id.toString() === filterStatus)
    
    return matchesSearch && matchesCity
  })

  // Paginação
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedPessoas = filteredPessoas.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setFilterStatus("todos")
    setCurrentPage(1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Users className="w-8 h-8" style={{ color: '#0026d9' }} />
            Gerenciar Clientes
          </h2>
          <p className="text-muted-foreground mt-2">Cadastro e gestão de clientes</p>
        </div>
        <Button 
          onClick={() => setShowModal(true)}
          className="text-white"
          style={{ backgroundColor: '#0026d9' }}
          onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#001a99'}
          onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#0026d9'}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {success && (
        <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Cliente cadastrado com sucesso!
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
          <CardDescription>Pesquise e filtre os clientes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Busca principal */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou NIF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtros avançados */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="filter-city">Cidade</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger id="filter-city">
                    <SelectValue placeholder="Todas as cidades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas as cidades</SelectItem>
                    {cities.map((city) => (
                      <SelectItem key={city.id} value={city.id.toString()}>
                        {city.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={clearFilters}
                  className="w-full"
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>

            {/* Estatísticas */}
            <div className="flex items-center justify-between pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                Mostrando {paginatedPessoas.length} de {filteredPessoas.length} clientes
              </p>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {filteredPessoas.length} Clientes
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Clientes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Clientes</CardTitle>
              <CardDescription>Lista de todos os clientes cadastrados</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={`${
                  userRole === 'gestor' || isAdmin ? 'bg-purple-50 text-purple-700 border-purple-200' :
                  userRole === 'gerente' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  'bg-green-50 text-green-700 border-green-200'
                }`}
              >
                {userRole === 'gestor' || isAdmin ? '👑 Gestor' : 
                 userRole === 'gerente' ? '👨‍💼 Gerente' : 
                 '👤 Vendedor'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Informações sobre permissões baseadas no role */}
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Permissões do seu perfil:</strong> {
                userRole === 'gestor' || isAdmin ? 'Acesso total - pode visualizar, editar, excluir clientes e ver compras' :
                userRole === 'gerente' ? 'Acesso gerencial - pode visualizar, editar, excluir clientes e ver compras' :
                'Acesso básico - pode visualizar clientes e criar novas vendas'
              }
            </AlertDescription>
          </Alert>
          
          <div className="space-y-4">
            {paginatedPessoas.map((customer) => {
              const person = customer.person || {}
              return (
                <div key={customer.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{person.name || 'Nome não informado'}</h3>
                        <Badge 
                          variant="default"
                          style={{ backgroundColor: '#0026d9', color: 'white' }}
                          className="text-xs"
                        >
                          Ativo
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <div className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {person.email || 'Email não informado'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {person.phone || 'Telefone não informado'}
                        </div>
                        {person.nif && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs">NIF:</span>
                            <span className="text-xs font-mono">{person.nif}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Cliente TIM • ID: {customer.id}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {/* Botão de Nova Venda - disponível para todos */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = `/dashboard/vendas/cadastrar?customer_id=${customer.id}`}
                      title="Nova venda para este cliente"
                      className="text-green-600 hover:text-green-700 border-green-200 hover:border-green-300"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Nova Venda
                    </Button>
                    
                    {/* Botão de Compras - apenas para gerente e gestor */}
                    {canViewClientSales && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewHistory(customer)}
                        title="Ver compras do cliente"
                        className="text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300"
                      >
                        <ShoppingCart className="w-4 h-4 mr-1" />
                        Compras
                      </Button>
                    )}
                    
                    {/* Botão de Editar - apenas para gerente e gestor */}
                    {canEditClients && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(customer)}
                        title="Editar cliente"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                    
                    {/* Botão de Excluir - apenas para gerente e gestor */}
                    {canDeleteClients && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(customer)}
                        title="Excluir cliente"
                        className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}

            {paginatedPessoas.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum cliente encontrado
              </div>
            )}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                      className="w-8 h-8 p-0"
                      style={currentPage === page ? { backgroundColor: '#0026d9', color: 'white' } : {}}
                    >
                      {page}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Cadastro */}
      {showModal && (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-50/80 via-white/60 to-purple-50/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white/70 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-semibold">Cadastrar Novo Cliente</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowModal(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Informações Pessoais */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-foreground">Informações Pessoais</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nomeCompleto">Nome Completo *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder="Digite o nome completo"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF *</Label>
                    <Input
                      id="nif"
                      value={formData.nif}
                      onChange={(e) => handleInputChange("nif", e.target.value)}
                      placeholder="000.000.000-00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="email@exemplo.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dataNascimento">Data de Nascimento *</Label>
                    <Input
                      id="birthdate"
                      type="date"
                      value={formData.birthdate}
                      onChange={(e) => handleInputChange("birthdate", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefoneCelular">Telefone Celular *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder="(11) 99999-9999"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Informações Adicionais */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-foreground">Informações Adicionais</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gênero</Label>
                    <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o gênero" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Masculino</SelectItem>
                        <SelectItem value="F">Feminino</SelectItem>
                        <SelectItem value="O">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city_id">Cidade *</Label>
                    <Select value={formData.city_id} onValueChange={(value) => handleInputChange("city_id", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a cidade" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map((city) => (
                          <SelectItem key={city.id} value={city.id.toString()}>
                            {city.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-foreground">Endereço</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cep">CEP *</Label>
                    <Input
                      id="zip_code"
                      value={formData.zip_code}
                      onChange={(e) => handleInputChange("zip_code", e.target.value)}
                      placeholder="00000-000"
                      required
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="logradouro">Logradouro *</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange("address", e.target.value)}
                      placeholder="Rua, Avenida, etc."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numero">Número *</Label>
                    <Input
                      id="number"
                      value={formData.number}
                      onChange={(e) => handleInputChange("number", e.target.value)}
                      placeholder="123"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bairro">Bairro *</Label>
                    <Input
                      id="district"
                      value={formData.district}
                      onChange={(e) => handleInputChange("district", e.target.value)}
                      placeholder="Nome do bairro"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="text-white"
                  style={{ backgroundColor: '#0026d9' }}
                  onMouseEnter={(e) => {
                    const target = e.target as HTMLButtonElement
                    target.style.backgroundColor = '#001a99'
                  }}
                  onMouseLeave={(e) => {
                    const target = e.target as HTMLButtonElement
                    target.style.backgroundColor = '#0026d9'
                  }}
                >
                  Cadastrar Cliente
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {showEditModal && selectedPessoa && (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-50/80 via-white/60 to-purple-50/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white/70 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-semibold">Editar Cliente - {selectedPessoa?.person?.name || 'Cliente'}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEditModal(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <form onSubmit={handleUpdate} className="p-6 space-y-6">
              {/* Informações Pessoais */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-foreground">Informações Pessoais</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-nomeCompleto">Nome Completo *</Label>
                    <Input
                      id="edit-name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder="Digite o nome completo"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-cpf">CPF *</Label>
                    <Input
                      id="edit-nif"
                      value={formData.nif}
                      onChange={(e) => handleInputChange("nif", e.target.value)}
                      placeholder="000.000.000-00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email *</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="email@exemplo.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-dataNascimento">Data de Nascimento *</Label>
                    <Input
                      id="edit-birthdate"
                      type="date"
                      value={formData.birthdate}
                      onChange={(e) => handleInputChange("birthdate", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-telefoneCelular">Telefone Celular *</Label>
                    <Input
                      id="edit-phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder="(11) 99999-9999"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Informações Adicionais */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-foreground">Informações Adicionais</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-gender">Gênero</Label>
                    <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o gênero" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Masculino</SelectItem>
                        <SelectItem value="F">Feminino</SelectItem>
                        <SelectItem value="O">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-city_id">Cidade *</Label>
                    <Select value={formData.city_id} onValueChange={(value) => handleInputChange("city_id", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a cidade" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map((city) => (
                          <SelectItem key={city.id} value={city.id.toString()}>
                            {city.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-foreground">Endereço</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-cep">CEP *</Label>
                    <Input
                      id="edit-zip_code"
                      value={formData.zip_code}
                      onChange={(e) => handleInputChange("zip_code", e.target.value)}
                      placeholder="00000-000"
                      required
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="edit-logradouro">Logradouro *</Label>
                    <Input
                      id="edit-address"
                      value={formData.address}
                      onChange={(e) => handleInputChange("address", e.target.value)}
                      placeholder="Rua, Avenida, etc."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-numero">Número *</Label>
                    <Input
                      id="edit-number"
                      value={formData.number}
                      onChange={(e) => handleInputChange("number", e.target.value)}
                      placeholder="123"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-bairro">Bairro *</Label>
                    <Input
                      id="edit-bairro"
                      value={formData.district}
                      onChange={(e) => handleInputChange("district", e.target.value)}
                      placeholder="Nome do bairro"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="text-white"
                  style={{ backgroundColor: '#0026d9' }}
                  onMouseEnter={(e) => {
                    const target = e.target as HTMLButtonElement
                    target.style.backgroundColor = '#001a99'
                  }}
                  onMouseLeave={(e) => {
                    const target = e.target as HTMLButtonElement
                    target.style.backgroundColor = '#0026d9'
                  }}
                >
                  Atualizar Cliente
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && selectedPessoa && (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-50/80 via-white/60 to-purple-50/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white/70 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-semibold text-red-600">Confirmar Exclusão</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteModal(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    Tem certeza que deseja excluir este cliente?
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Esta ação não pode ser desfeita.
                  </p>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-foreground">Nome:</span>
                  <span className="text-sm text-foreground">{selectedPessoa?.person?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-foreground">Email:</span>
                  <span className="text-sm text-foreground">{selectedPessoa?.person?.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-foreground">NIF:</span>
                  <span className="text-sm text-foreground">{selectedPessoa?.person?.nif || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-foreground">Telefone:</span>
                  <span className="text-sm text-foreground">{selectedPessoa?.person?.phone || 'N/A'}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleDeleteConfirm}
                  className="text-white bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Cliente
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Histórico de Vendas */}
      {showHistoryModal && selectedPessoa && (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-50/80 via-white/60 to-purple-50/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white/70 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Compras do Cliente
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedPessoa?.person?.name || 'Cliente'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistoryModal(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-6">
              {loadingSales ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                  <span className="ml-2 text-muted-foreground">Carregando compras...</span>
                </div>
              ) : clientSales.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-green-600" />
                        <span className="font-semibold text-green-900">Total de Compras</span>
                      </div>
                      <p className="text-2xl font-bold text-green-600 mt-1">
                        {clientSales.length}
                      </p>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-emerald-600" />
                        <span className="font-semibold text-emerald-900">Valor Total</span>
                      </div>
                      <p className="text-2xl font-bold text-emerald-600 mt-1">
                        R$ {clientSales.reduce((total, sale) => total + parseFloat(sale.total_price || 0), 0).toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                    <div className="bg-teal-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-teal-600" />
                        <span className="font-semibold text-teal-900">Última Compra</span>
                      </div>
                      <p className="text-sm text-teal-600 mt-1">
                        {clientSales.length > 0 ? new Date(clientSales[0].created_at).toLocaleDateString('pt-BR') : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {clientSales.map((sale, index) => (
                      <div key={sale.id || index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-gray-900">{sale.product_name}</h3>
                              <Badge 
                                variant={sale.status === 'approved' ? 'default' : sale.status === 'pending' ? 'secondary' : 'destructive'}
                                className="text-xs"
                              >
                                {sale.status === 'approved' ? 'Aprovada' : sale.status === 'pending' ? 'Pendente' : 'Cancelada'}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                              <div>
                                <span className="font-medium">Quantidade:</span> {sale.quantity}
                              </div>
                              <div>
                                <span className="font-medium">Preço Unit.:</span> R$ {parseFloat(sale.unit_price || 0).toFixed(2)}
                              </div>
                              <div>
                                <span className="font-medium">Total:</span> R$ {parseFloat(sale.total_price || 0).toFixed(2)}
                              </div>
                              <div>
                                <span className="font-medium">Data:</span> {new Date(sale.created_at).toLocaleDateString('pt-BR')}
                              </div>
                            </div>
                            {sale.observations && (
                              <div className="mt-2 text-sm text-gray-600">
                                <span className="font-medium">Observações:</span> {sale.observations}
                              </div>
                            )}
                            <div className="mt-2 text-xs text-gray-500">
                              <span className="font-medium">Estabelecimento:</span> {sale.establishment?.name || 'N/A'} | 
                              <span className="font-medium ml-1">Categoria:</span> {sale.category?.name || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <Button 
                      onClick={() => window.location.href = `/dashboard/vendas/cadastrar?customer_id=${selectedPessoa?.id}`}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Venda para este Cliente
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShoppingCart className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma compra encontrada</h3>
                  <p className="text-gray-600 mb-4">Este cliente ainda não realizou nenhuma compra.</p>
                  <Button 
                    onClick={() => window.location.href = `/dashboard/vendas/cadastrar?customer_id=${selectedPessoa?.id}`}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Venda
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
