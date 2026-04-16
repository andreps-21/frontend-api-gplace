"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Plus, Search, Edit, Trash2, Mail, Phone, X, ChevronLeft, ChevronRight, Filter, MoreHorizontal, History, Calendar, DollarSign, Shield, UserCheck, Building2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle } from "lucide-react"
import { apiService, User, CreateUserRequest } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { usePermissions } from "@/lib/use-permissions"
import { AccessDenied } from "@/components/ui/access-denied"
import { notifications } from "@/lib/notifications"
import { toast } from "sonner"
import { ToggleSwitch } from "@/components/ui/toggle-switch"
import { useUserPermissions, canAccessUser } from "@/lib/user-permissions"
import { handleApiError, showErrorNotification } from "@/lib/error-handler"
import CitySearch from "@/components/ui/city-search"
import { maskCEP, unmaskCEP, unmaskCPF } from "@/lib/masks"
import { Info } from "lucide-react"

export default function UsuariosPage() {
  const { user } = useAuth()
  const { userRole, isGestor, isGerente } = usePermissions()
  const permissions = useUserPermissions()
  const [usuarios, setUsuarios] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("todos")
  const [filterEstablishment, setFilterEstablishment] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedUsuario, setSelectedUsuario] = useState<User | null>(null)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [totalPages, setTotalPages] = useState(1)
  const [establishments, setEstablishments] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [totalUsuarios, setTotalUsuarios] = useState(0)
  const [totalUsuariosAtivos, setTotalUsuariosAtivos] = useState(0)
  
  // Estados para verificação informativa de NIF
  const [nifInfo, setNifInfo] = useState<{
    exists: boolean;
    isCustomer: boolean;
    name?: string;
  } | null>(null)
  const [isCheckingNif, setIsCheckingNif] = useState(false)

  // Verificar permissões usando o hook useUserPermissions
  const hasPermission = permissions.canViewAllUsers || permissions.canViewEstablishmentUsers || permissions.canViewOwnUser

  if (!hasPermission) {
    return <AccessDenied />
  }

  // Carregar usuários da API com debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
    loadUsuarios()
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [currentPage, searchTerm, filterStatus, filterEstablishment])

  // Reset página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterStatus, filterEstablishment])

  // Carregar estabelecimentos e roles para o formulário
  useEffect(() => {
    loadEstablishments()
    loadRoles()
  }, [])

  // Carregar totais de usuários (todas as páginas) para os cards de resumo
  useEffect(() => {
    loadTotalUsuarios()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filterStatus, filterEstablishment, user?.establishment_id, permissions.canViewAllUsers, permissions.canViewEstablishmentUsers, permissions.canViewOwnUser])

  const loadUsuarios = async () => {
    try {
      setLoading(true)
      
      // Determinar parâmetros de busca baseado nas permissões
      let searchParams: any = {
        page: currentPage,
        search: searchTerm || undefined,
      }
      
      // Se for gestor, pode usar filtro de estabelecimento se selecionado
      if (permissions.canViewAllUsers && filterEstablishment) {
        searchParams.establishment_id = parseInt(filterEstablishment)
      }
      // Se for gerente, filtrar apenas usuários do seu estabelecimento
      else if (permissions.canViewEstablishmentUsers && !permissions.canViewAllUsers) {
        searchParams.establishment_id = user?.establishment_id
      }
      // Se for vendedor, buscar apenas seu próprio usuário
      else if (permissions.canViewOwnUser && !permissions.canViewEstablishmentUsers) {
        searchParams.user_id = user?.id
      }
      
      console.log('🔍 Parâmetros de busca de usuários:', searchParams)
      const response = await apiService.getUsers(searchParams)
      
      // Verificar se a resposta tem a estrutura esperada
      if (response && response.data) {
        // Log para debug da estrutura dos dados
        console.log('🔍 Estrutura da resposta da API de usuários:', response.data)
        
        // Verificar se é uma resposta paginada ou uma lista simples
        if (response.data.data && Array.isArray(response.data.data)) {
          // Resposta paginada
          console.log('📊 Usuários carregados (paginado):', response.data.data.length)
          console.log('🔍 Primeiro usuário (estrutura):', response.data.data[0])
          setUsuarios(response.data.data)
          setTotalPages(response.data.last_page || 1)
        } else if (Array.isArray(response.data)) {
          // Lista simples
          console.log('📊 Usuários carregados (lista):', response.data.length)
          console.log('🔍 Primeiro usuário (estrutura):', response.data[0])
          setUsuarios(response.data)
          setTotalPages(1)
        } else {
          console.error('Estrutura de dados inesperada:', response.data)
          setUsuarios([])
          setTotalPages(1)
        }
      } else {
        console.error('Estrutura de resposta inesperada:', response)
        setUsuarios([])
        setTotalPages(1)
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
      
      // Tratar erros 403 de acesso negado
      const errorInfo = handleApiError(error)
      showErrorNotification(errorInfo)
      
      // Se for erro de acesso a usuários, tentar carregar apenas usuários do próprio estabelecimento
      if (errorInfo.type === 'users_access_denied' && permissions.canViewEstablishmentUsers) {
        console.log('🔄 Tentando carregar usuários do próprio estabelecimento...')
        try {
          const fallbackResponse = await apiService.getUsers({
            page: currentPage,
            search: searchTerm || undefined,
            establishment_id: user?.establishment_id
          })
          
          if (fallbackResponse && fallbackResponse.data) {
            if (fallbackResponse.data.data && Array.isArray(fallbackResponse.data.data)) {
              setUsuarios(fallbackResponse.data.data)
              setTotalPages(fallbackResponse.data.last_page || 1)
            } else if (Array.isArray(fallbackResponse.data)) {
              setUsuarios(fallbackResponse.data)
              setTotalPages(1)
            }
          }
        } catch (fallbackError) {
          console.error('❌ Erro no fallback:', fallbackError)
          setUsuarios([])
          setTotalPages(1)
        }
      } else {
        setUsuarios([])
        setTotalPages(1)
      }
    } finally {
      setLoading(false)
    }
  }

  // Função para carregar todos os usuários (todas as páginas) para calcular totais
  const loadTotalUsuarios = async () => {
    try {
      // Determinar parâmetros de busca baseado nas permissões (sem paginação)
      let searchParams: any = {
        per_page: 10000, // Buscar muitos itens por página
        search: searchTerm || undefined,
      }
      
      // Se for gestor, pode usar filtro de estabelecimento se selecionado
      if (permissions.canViewAllUsers && filterEstablishment) {
        searchParams.establishment_id = parseInt(filterEstablishment)
      }
      // Se for gerente, filtrar apenas usuários do seu estabelecimento
      else if (permissions.canViewEstablishmentUsers && !permissions.canViewAllUsers) {
        searchParams.establishment_id = user?.establishment_id
      }
      // Se for vendedor, buscar apenas seu próprio usuário
      else if (permissions.canViewOwnUser && !permissions.canViewEstablishmentUsers) {
        searchParams.user_id = user?.id
      }
      
      const response = await apiService.getUsers(searchParams)
      
      if (response && response.data) {
        let todosUsuarios: User[] = []
        
        // Verificar se é uma resposta paginada
        if (response.data.data && Array.isArray(response.data.data)) {
          todosUsuarios = response.data.data
          
          // Se há mais páginas, buscar todas
          const totalPages = response.data.last_page || 1
          if (totalPages > 1) {
            for (let page = 2; page <= totalPages; page++) {
              try {
                const pageResponse = await apiService.getUsers({
                  ...searchParams,
                  page: page,
                  per_page: 10000
                })
                
                if (pageResponse.data?.data && Array.isArray(pageResponse.data.data)) {
                  todosUsuarios = [...todosUsuarios, ...pageResponse.data.data]
                }
              } catch (error) {
                console.error(`Erro ao carregar página ${page} de usuários:`, error)
              }
            }
          }
        } else if (Array.isArray(response.data)) {
          todosUsuarios = response.data
        }
        
        // Aplicar filtro de status se necessário
        let usuariosFiltrados = todosUsuarios
        if (filterStatus === "ativo") {
          usuariosFiltrados = todosUsuarios.filter(u => u.is_active)
        } else if (filterStatus === "inativo") {
          usuariosFiltrados = todosUsuarios.filter(u => !u.is_active)
        }
        
        // Calcular totais
        setTotalUsuarios(usuariosFiltrados.length)
        setTotalUsuariosAtivos(usuariosFiltrados.filter(u => u.is_active).length)
      }
    } catch (error) {
      console.error('Erro ao carregar totais de usuários:', error)
      // Em caso de erro, usar os dados da página atual como fallback
      setTotalUsuarios(usuarios.length)
      setTotalUsuariosAtivos(usuarios.filter(u => u.is_active).length)
    }
  }

  const loadEstablishments = async () => {
    try {
      console.log('🔄 Carregando estabelecimentos da API...')
      const response = await apiService.getEstablishments()
      console.log('📥 Resposta da API de estabelecimentos:', response)
      
      // A API retorna o array diretamente em response.data
      let establishments = Array.isArray(response.data) ? response.data : (response.data?.data || [])
      console.log('🏪 Estabelecimentos carregados:', establishments)
      console.log('🔍 response.data:', response.data)
      console.log('🔍 É array?', Array.isArray(response.data))
      
      // A API já filtra baseado no role do usuário:
      // - Gestores: veem todos os estabelecimentos
      // - Gerentes/Vendedores: veem apenas seu estabelecimento
      console.log('🏪 Estabelecimentos disponíveis para o usuário:', establishments.length)
      
      setEstablishments(establishments)
      
      // Se for gerente/vendedor e não tiver estabelecimento selecionado, selecionar o único disponível
      if (!permissions.canViewAllUsers && establishments.length === 1) {
        setFilterEstablishment(establishments[0].id.toString())
      }
      
      console.log('✅ Estabelecimentos carregados com sucesso da API')
    } catch (error: any) {
      console.error('❌ Erro ao carregar estabelecimentos da API:', error)
      console.error('❌ Tipo do erro:', typeof error)
      console.error('❌ Mensagem do erro:', error?.message)
      console.error('❌ Status do erro:', error?.response?.status)
      console.error('❌ Dados do erro:', error?.response?.data)
      
      // Fallback: usar dados do estabelecimento do usuário da API (apenas se disponível)
      const userRole = getUserRole()
      if (userRole === 'gerente' && user?.establishment) {
        console.log('🔄 Usando dados do estabelecimento do perfil do usuário')
        console.log('🏢 Dados do estabelecimento do usuário:', user.establishment)
        
        setEstablishments([{
          id: user.establishment.id,
          name: user.establishment.name,
          address: user.establishment.address || '',
          phone: user.establishment.phone || ''
        }])
      } else {
        console.log('⚠️ Não foi possível carregar estabelecimentos - API indisponível e sem dados do usuário')
        setEstablishments([])
      }
    }
  }

  const loadRoles = async () => {
    try {
      console.log('🔄 Carregando roles da API...')
      const response = await apiService.getRoles()
      console.log('📥 Resposta da API de roles:', response)
      
      // A API retorna o array diretamente em response.data
      let availableRoles = Array.isArray(response.data) ? response.data : (response.data?.data || [])
      console.log('👥 Roles carregados:', availableRoles)
      console.log('🔍 response.data:', response.data)
      console.log('🔍 É array?', Array.isArray(response.data))
      
      // Filtrar roles baseado no perfil do usuário logado
      const userRole = getUserRole()
      console.log('👤 Role do usuário:', userRole)
      
      if (userRole === 'gerente') {
        // Gerente só pode criar vendedores
        availableRoles = availableRoles.filter((role: any) => role.name === 'vendedor')
        console.log('🔒 Roles filtrados para gerente:', availableRoles)
      }
      
      setRoles(availableRoles)
      console.log('✅ Roles carregados com sucesso da API')
    } catch (error: any) {
      console.error('❌ Erro ao carregar roles da API:', error)
      console.error('❌ Tipo do erro:', typeof error)
      console.error('❌ Mensagem do erro:', error?.message)
      console.error('❌ Status do erro:', error?.response?.status)
      console.error('❌ Dados do erro:', error?.response?.data)
      
      // Sem fallback - se API falhar, não mostrar roles
      console.log('⚠️ Não foi possível carregar roles - API indisponível')
      setRoles([])
    }
  }

  // Funções auxiliares para obter dados do usuário logado
  const getUserRole = () => {
    console.log('🔍 getUserRole - userRole:', userRole)
    console.log('🔍 getUserRole - isGestor:', isGestor)
    console.log('🔍 getUserRole - isGerente:', isGerente)
    console.log('🔍 getUserRole - user:', user)
    return userRole
  }

  const getUserEstablishmentId = () => {
    return user?.establishment_id || 0
  }

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
    establishment_id: "",
    role: "",
    is_active: true,
    // Campos opcionais de Person (dados pessoais)
    birthdate: "",
    nif: "",
    phone: "",
    city_id: "",
    zip_code: "",
    address: "",
    district: "",
    number: "",
    gender: ""
  })

  // Verificar NIF com debounce quando o campo mudar (apenas no modal de criação)
  useEffect(() => {
    if (!showModal) {
      setNifInfo(null)
      return
    }

    const timeoutId = setTimeout(() => {
      if (formData.nif) {
        checkNIFExists(formData.nif)
      } else {
        setNifInfo(null)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.nif, showModal])

  // Função para resetar formulário com pré-preenchimento baseado no perfil
  const resetFormData = () => {
    const userRole = getUserRole()
    
    // Limpar informações de NIF ao resetar formulário
    setNifInfo(null)
    
    if (userRole === 'gerente') {
      // Pré-preencher com dados do gerente (apenas se tiver dados da API)
      const userEstablishmentId = getUserEstablishmentId()
      if (userEstablishmentId > 0) {
        setFormData({
          name: "",
          email: "",
          password: "",
          password_confirmation: "",
          establishment_id: userEstablishmentId.toString(),
          role: "vendedor", // Gerente só cria vendedores
          is_active: true,
          birthdate: "",
          nif: "",
          phone: "",
          city_id: "",
          zip_code: "",
          address: "",
          district: "",
          number: "",
          gender: ""
        })
        console.log('✅ Formulário pré-preenchido para gerente com dados da API')
      } else {
        console.log('⚠️ Dados do estabelecimento não disponíveis - formulário limpo')
        setFormData({
          name: "",
          email: "",
          password: "",
          password_confirmation: "",
          establishment_id: "",
          role: "",
          is_active: true,
          birthdate: "",
          nif: "",
          phone: "",
          city_id: "",
          zip_code: "",
          address: "",
          district: "",
          number: "",
          gender: ""
        })
      }
    } else {
      // Limpar formulário para outros perfis
      setFormData({
        name: "",
        email: "",
        password: "",
        password_confirmation: "",
        establishment_id: "",
        role: "",
        is_active: true,
        birthdate: "",
        nif: "",
        phone: "",
        city_id: "",
        zip_code: "",
        address: "",
        district: "",
        number: "",
        gender: ""
      })
    }
  }

  // Função para verificar se NIF já existe (informativo)
  const checkNIFExists = async (nif: string) => {
    const cleanNIF = unmaskCPF(nif)
    
    // Só verifica se tiver pelo menos 11 dígitos (CPF completo)
    if (!cleanNIF || cleanNIF.length < 11) {
      setNifInfo(null)
      return
    }

    setIsCheckingNif(true)
    try {
      // Verificar se existe pessoa com esse NIF
      const personResponse = await apiService.getPersonByNif(cleanNIF)
      
      if (personResponse.data) {
        const person = personResponse.data
        
        // Verificar se já é cliente
        try {
          const customerResponse = await apiService.searchCustomerByNif(cleanNIF)
          
          setNifInfo({
            exists: true,
            isCustomer: !!customerResponse.data,
            name: person.name || person.full_name
          })
        } catch (error) {
          // Se não encontrar cliente, ainda pode ser pessoa existente
          setNifInfo({
            exists: true,
            isCustomer: false,
            name: person.name || person.full_name
          })
        }
      } else {
        setNifInfo(null)
      }
    } catch (error) {
      // Se não encontrar pessoa, limpa a informação
      setNifInfo(null)
    } finally {
      setIsCheckingNif(false)
    }
  }

  // Função para buscar CEP e preencher automaticamente
  const handleCepChange = async (cep: string) => {
    // Remove caracteres não numéricos usando a função unmaskCEP
    const cleanCep = unmaskCEP(cep)
    
    // Verifica se o CEP tem 8 dígitos
    if (cleanCep.length !== 8) {
      return
    }
    
    try {
      // Busca CEP na API ViaCEP
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
      const data = await response.json()
      
      if (data.erro) {
        console.error('CEP não encontrado')
        return
      }
      
      // Preenche os campos automaticamente
      // Formata o CEP retornado pela API com a máscara
      const formattedCep = data.cep ? maskCEP(data.cep) : maskCEP(cleanCep)
      setFormData(prev => ({
        ...prev,
        zip_code: formattedCep,
        address: data.logradouro || '',
        district: data.bairro || ''
      }))
      
      // Busca a cidade pelo nome para obter o city_id
      if (data.localidade) {
        try {
          const citiesResponse = await apiService.getCities()
          let cities: any[] = []
          
          if (Array.isArray(citiesResponse.data)) {
            cities = citiesResponse.data
          } else if (citiesResponse.data && typeof citiesResponse.data === 'object' && 'data' in citiesResponse.data) {
            cities = Array.isArray((citiesResponse.data as any).data) ? (citiesResponse.data as any).data : []
          }
          
          // Busca cidade pelo nome (case insensitive, com fallback para busca parcial)
          const cityName = data.localidade.toLowerCase().trim()
          let city = cities.find((c: any) => 
            c.title?.toLowerCase().trim() === cityName
          )
          
          // Se não encontrar exato, tenta busca parcial
          if (!city) {
            city = cities.find((c: any) => 
              c.title?.toLowerCase().includes(cityName) ||
              cityName.includes(c.title?.toLowerCase() || '')
            )
          }
          
          if (city) {
            setFormData(prev => ({
              ...prev,
              city_id: city.id.toString()
            }))
          } else {
            console.log('Cidade não encontrada no sistema:', data.localidade)
          }
        } catch (error) {
          console.error('Erro ao buscar cidade:', error)
        }
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error)
    }
  }

  // Função para abrir modal com pré-preenchimento para gerentes
  const handleOpenCreateModal = () => {
    resetFormData()
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validações adicionais baseadas no perfil do usuário
    const userRole = getUserRole()
    
    if (userRole === 'gerente') {
      // Gerente só pode criar vendedores para seu estabelecimento
      if (formData.role !== 'vendedor') {
        setError('Gerente só pode criar vendedores.')
        return
      }
      
      if (parseInt(formData.establishment_id) !== getUserEstablishmentId()) {
        setError('Gerente só pode criar usuários para seu próprio estabelecimento.')
        return
      }
    }
    
    // Validar senha (mínimo 8 caracteres conforme documentação)
    if (!formData.password || formData.password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.')
      return
    }
    
    // Validar confirmação de senha
    if (formData.password !== formData.password_confirmation) {
      setError('As senhas não coincidem.')
      return
    }
    
    // Preparar dados para envio
    const createUserData: CreateUserRequest = {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      password_confirmation: formData.password_confirmation,
      role: formData.role,
      is_active: formData.is_active
    }
    
    // Gestores não devem ter establishment_id (deve ser null ou não enviado)
    // Gerentes e vendedores devem ter establishment_id válido
    if (formData.role !== 'gestor') {
      if (!formData.establishment_id || formData.establishment_id === '') {
        setError('Estabelecimento é obrigatório para gerentes e vendedores.')
        return
      }
      const establishmentId = parseInt(formData.establishment_id)
      if (isNaN(establishmentId)) {
        setError('Estabelecimento inválido.')
        return
      }
      createUserData.establishment_id = establishmentId
    }
    // Para gestores, não incluir establishment_id (será null no backend)
    
    // Adicionar campos de Person apenas se pelo menos um campo estiver preenchido
    // Se pelo menos um campo for fornecido, uma Person será criada
    const hasPersonData = formData.birthdate || formData.nif || formData.phone || 
                          formData.city_id || formData.zip_code || formData.address || 
                          formData.district || formData.number || formData.gender
    
    if (hasPersonData) {
      createUserData.birthdate = formData.birthdate || null
      createUserData.nif = formData.nif || null
      createUserData.phone = formData.phone || null
      createUserData.city_id = formData.city_id ? parseInt(formData.city_id) : null
      createUserData.zip_code = formData.zip_code || null
      createUserData.address = formData.address || null
      createUserData.district = formData.district || null
      createUserData.number = formData.number || null
      createUserData.gender = formData.gender as 'M' | 'F' | 'O' || null
    }
    
    try {
      const response = await apiService.createUser(createUserData)
      setSuccess(true)
      setError("")
      setShowModal(false)
      
      // Verificar se cliente foi promovido a vendedor
      if (formData.nif && nifInfo?.isCustomer) {
        toast.success(`Usuário criado com sucesso! ${nifInfo.name || 'Este cliente'} agora é cliente E vendedor.`, {
          duration: 5000
        })
      } else {
        notifications.userCreated()
      }
      
      resetFormData() // Usar função de reset com pré-preenchimento
      loadUsuarios()
    } catch (err: any) {
      console.error("Erro ao criar usuário:", err)
      
      // Tratar erros de validação do backend (422)
      if (err.status === 422) {
        let errorMessage = err.message || "Erro de validação."
        
        // Backend retorna erros no formato: { errors: { campo: ["mensagem"] } }
        // ou { data: { campo: ["mensagem"] } }
        const validationErrors = err.data?.errors || err.data || err.errors
        
        if (validationErrors && typeof validationErrors === 'object') {
          const errorFields = Object.keys(validationErrors)
          if (errorFields.length > 0) {
            const errorMessages = errorFields.map(field => {
              const fieldErrors = Array.isArray(validationErrors[field]) 
                ? validationErrors[field] 
                : [validationErrors[field]]
              // Traduzir nomes de campos para português
              const fieldNames: Record<string, string> = {
                'name': 'Nome',
                'email': 'Email',
                'password': 'Senha',
                'establishment_id': 'Estabelecimento',
                'role': 'Função',
                'is_active': 'Status'
              }
              const fieldName = fieldNames[field] || field
              return `${fieldName}: ${fieldErrors.join(', ')}`
            })
            errorMessage = errorMessages.join('\n')
          }
        }
        
        setError(errorMessage)
      } else if (err.status === 403) {
        // Erro de acesso negado
        setError(err.data || err.message || "Acesso negado. Você não tem permissão para realizar esta ação.")
      } else {
        setError(err.message || "Erro ao criar usuário.")
      }
      
      notifications.custom.error('Erro ao criar usuário')
    }
  }

  const handleEdit = async (usuario: User) => {
    setSelectedUsuario(usuario)
    
    // Carregar dados completos do usuário incluindo Person
    try {
      const response = await apiService.getUser(usuario.id)
      const userData = response.data
      
      setFormData({
        name: userData.name || "",
        email: userData.email || "",
        password: "",
        password_confirmation: "",
        establishment_id: userData.establishment_id?.toString() || "",
        role: userData.role || userData.roles?.[0]?.name || "",
        is_active: userData.is_active !== undefined ? userData.is_active : true,
        // Carregar dados de Person se existir
        birthdate: userData.person?.birthdate || "",
        nif: userData.person?.nif || "",
        phone: userData.person?.phone || "",
        city_id: userData.person?.city_id?.toString() || "",
        zip_code: userData.person?.zip_code || "",
        address: userData.person?.address || "",
        district: userData.person?.district || "",
        number: userData.person?.number || "",
        gender: userData.person?.gender || ""
      })
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error)
      // Fallback: usar dados básicos
      setFormData({
        name: usuario.name || "",
        email: usuario.email || "",
        password: "",
        password_confirmation: "",
        establishment_id: usuario.establishment_id?.toString() || "",
        role: usuario.role || "",
        is_active: usuario.is_active || true,
        birthdate: "",
        nif: "",
        phone: "",
        city_id: "",
        zip_code: "",
        address: "",
        district: "",
        number: "",
        gender: ""
      })
    }
    
    setShowEditModal(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUsuario) return

    // Validar confirmação de senha se senha foi preenchida
    if (formData.password && formData.password !== formData.password_confirmation) {
      setError('As senhas não coincidem.')
      return
    }

    try {
      const updateData: any = {
        name: formData.name,
        email: formData.email,
        establishment_id: parseInt(formData.establishment_id),
        role: formData.role,
        is_active: formData.is_active
      }

      // Só incluir senha se foi preenchida
      if (formData.password) {
        updateData.password = formData.password
        updateData.password_confirmation = formData.password_confirmation
      }
      
      // Adicionar campos de Person (opcionais, podem ser atualizados ou adicionados)
      // Se pelo menos um campo for fornecido, uma Person será criada/atualizada
      const hasPersonData = formData.birthdate || formData.nif || formData.phone || 
                            formData.city_id || formData.zip_code || formData.address || 
                            formData.district || formData.number || formData.gender
      
      if (hasPersonData) {
        updateData.birthdate = formData.birthdate || null
        updateData.nif = formData.nif || null
        updateData.phone = formData.phone || null
        updateData.city_id = formData.city_id ? parseInt(formData.city_id) : null
        updateData.zip_code = formData.zip_code || null
        updateData.address = formData.address || null
        updateData.district = formData.district || null
        updateData.number = formData.number || null
        updateData.gender = formData.gender || null
      }

      await apiService.updateUser(selectedUsuario.id, updateData)
      setSuccess(true)
      setError("")
      setShowEditModal(false)
      setSelectedUsuario(null)
      loadUsuarios()
      notifications.userUpdated()
    } catch (err: any) {
      console.error("Erro ao atualizar usuário:", err)
      setError(err.message || "Erro ao atualizar usuário.")
      notifications.custom.error('Erro ao atualizar usuário')
    }
  }

  const handleDeleteClick = (usuario: User) => {
    setSelectedUsuario(usuario)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (selectedUsuario) {
      try {
        await apiService.deleteUser(selectedUsuario.id)
        setSuccess(true)
        setError("")
        setShowDeleteModal(false)
        setSelectedUsuario(null)
        loadUsuarios()
        notifications.userDeleted()
      } catch (err: any) {
        console.error("Erro ao excluir usuário:", err)
        setError(err.message || "Erro ao excluir usuário.")
        notifications.custom.error('Erro ao excluir usuário')
      }
    }
  }

  // Funções para gerenciar status dos usuários
  const handleToggleStatus = async (usuario: User) => {
    setActionLoading(usuario.id)
    try {
      await apiService.toggleUserStatus(usuario.id)
      loadUsuarios()
      // Usar notificação específica baseada no estado atual
      if (usuario.is_active) {
        notifications.userDeactivated()
      } else {
        notifications.userActivated()
      }
    } catch (err: any) {
      console.error("Erro ao alterar status:", err)
      notifications.custom.error('Erro ao alterar status do usuário')
    } finally {
      setActionLoading(null)
    }
  }


  // Lógica de filtros
  const filteredUsuarios = usuarios.filter((usuario) => {
    // Verificar se o usuário atual pode acessar este usuário
    if (!canAccessUser(user, usuario)) {
      return false
    }
    
    const matchesSearch = !searchTerm || 
      usuario.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usuario.email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === "todos" || 
      (filterStatus === "ativo" && usuario.is_active) ||
      (filterStatus === "inativo" && !usuario.is_active)
    
    return matchesSearch && matchesStatus
  })

  // Paginação
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedUsuarios = filteredUsuarios.slice(startIndex, endIndex)

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value))
    setCurrentPage(1) // Reset to first page when changing items per page
  }

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return <Badge variant="default" className="text-xs">Ativo</Badge>
    }
    return <Badge variant="secondary" className="text-xs">Inativo</Badge>
  }

  const getEstablishmentName = (establishmentId: number) => {
    const establishment = establishments.find(est => est.id === establishmentId)
    return establishment?.name || "N/A"
  }

  const getUserRoleDisplay = (usuario: User) => {
    // Se o role estiver definido na API, usar ele
    if (usuario.role) {
      return usuario.role
    }
    
    // Fallback: tentar determinar o role baseado em outros campos
    // Verificar se tem establishment_id (gerente ou vendedor)
    if (usuario.establishment_id) {
      // Se for o usuário atual e for gestor/gerente, mostrar como gerente
      if (usuario.id === user?.id && (permissions.canViewAllUsers || permissions.canViewEstablishmentUsers)) {
        return permissions.canViewAllUsers ? 'gestor' : 'gerente'
      }
      // Para outros usuários com establishment, assumir vendedor
      return 'vendedor'
    }
    
    // Se não tem establishment_id, pode ser gestor
    if (!usuario.establishment_id) {
      return 'gestor'
    }
    
    // Fallback final
    return 'N/A'
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Users className="w-8 h-8" style={{ color: '#0026d9' }} />
            Usuários do Sistema
          </h2>
          <p className="text-muted-foreground mt-2">Gerenciamento de usuários do sistema</p>
        </div>
        
        {/* Indicadores de permissão */}
        {permissions.canViewAllUsers && (
          <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-purple-100 to-blue-100 text-purple-800">
            <Shield className="w-3 h-3 mr-1" />
            Modo Administrador - Visualizando todos os usuários de todos os estabelecimentos
          </div>
        )}
        
        {permissions.canViewEstablishmentUsers && !permissions.canViewAllUsers && (
          <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-pink-100 to-red-100 text-pink-800">
            <Building2 className="w-3 h-3 mr-1" />
            Modo Gerente - Visualizando usuários do estabelecimento: {establishments[0]?.name || 'N/A'}
          </div>
        )}
        
        {permissions.canViewOwnUser && !permissions.canViewEstablishmentUsers && (
          <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800">
            <UserCheck className="w-3 h-3 mr-1" />
            Modo Vendedor - Visualizando apenas seu perfil
          </div>
        )}
      </div>

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Operação realizada com sucesso!
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 whitespace-pre-line">
            {error}
          </AlertDescription>
        </Alert>
      )}

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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="search"
                  placeholder="Nome ou email..."
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
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Filtro de estabelecimento - apenas para gestores */}
            {permissions.canViewAllUsers && (
              <div className="space-y-2">
                <Label htmlFor="establishment">Estabelecimento</Label>
                <Select value={filterEstablishment || "todos"} onValueChange={(value) => setFilterEstablishment(value === "todos" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os estabelecimentos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os estabelecimentos</SelectItem>
                    {establishments.map((establishment) => (
                      <SelectItem key={establishment.id} value={establishment.id.toString()}>
                        {establishment.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total de Usuários</p>
                <p className="text-2xl font-bold">{loading ? '...' : totalUsuarios}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Usuários Ativos</p>
                <p className="text-2xl font-bold">{loading ? '...' : totalUsuariosAtivos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Usuários Inativos</p>
                <p className="text-2xl font-bold">{loading ? '...' : totalUsuarios - totalUsuariosAtivos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controles de paginação no topo */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <label htmlFor="items-per-page" className="text-sm font-medium text-muted-foreground">
            Itens por página:
          </label>
          <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="text-sm text-muted-foreground">
          Mostrando {startIndex + 1} - {Math.min(endIndex, filteredUsuarios.length)} de {filteredUsuarios.length} usuários
        </div>
      </div>

      {/* Lista de Usuários */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle>Usuários Cadastrados ({filteredUsuarios.length})</CardTitle>
              <CardDescription>Lista de todos os usuários do sistema</CardDescription>
            </div>
            {/* Botão de novo usuário - apenas para gestores e gerentes */}
            {permissions.canCreateUsers && (
              <div className="flex-shrink-0">
                <Button 
                  onClick={handleOpenCreateModal}
                  className="text-white"
                  style={{ backgroundColor: '#0026d9' }}
                  onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#001a99'}
                  onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#0026d9'}
                >
                  <Plus className="w-4 h-4 mr-2 text-white" />
                  Novo Usuário
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-muted-foreground">Carregando usuários...</span>
            </div>
          ) : paginatedUsuarios.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>Nenhum usuário encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium text-gray-500">ID</th>
                    <th className="text-left p-4 font-medium text-gray-500">Nome</th>
                    <th className="text-left p-4 font-medium text-gray-500">Email</th>
                    <th className="text-left p-4 font-medium text-gray-500">Perfil</th>
                    <th className="text-left p-4 font-medium text-gray-500">Estabelecimento</th>
                    <th className="text-left p-4 font-medium text-gray-500">Status</th>
                    <th className="text-left p-4 font-medium text-gray-500">Ações</th>
                  </tr>
                </thead>
                <tbody>
              {paginatedUsuarios.map((usuario) => (
                    <tr key={usuario.id} className="border-b hover:bg-gray-50">
                      <td className="p-4 text-sm text-gray-600">{usuario.id}</td>
                      <td className="p-4">
                      <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="w-4 h-4 text-blue-600" />
                      </div>
                          <span className="font-medium text-gray-900">{usuario.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-600">{usuario.email}</td>
                      <td className="p-4 text-sm text-gray-600">
                        <Badge variant="outline" className="text-xs">
                          {getUserRoleDisplay(usuario)}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          {getEstablishmentName(usuario.establishment_id || 0)}
                        </div>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(usuario.is_active)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {/* Toggle Switch para ativar/desativar - apenas para gestores e gerentes */}
                          {permissions.canActivateUsers && (
                            <div className="flex items-center gap-2">
                              <ToggleSwitch
                                checked={usuario.is_active}
                                onChange={() => handleToggleStatus(usuario)}
                                disabled={actionLoading === usuario.id}
                                size="md"
                              />
                              {actionLoading === usuario.id && (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              )}
                            </div>
                          )}

                          {/* Editar - baseado nas permissões */}
                          {((permissions.canEditAllUsers) || 
                            (permissions.canEditEstablishmentUsers && usuario.establishment_id === user?.establishment_id) ||
                            (permissions.canEditOwnUser && usuario.id === user?.id)) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(usuario)}
                              title="Editar usuário"
                              className="hover:bg-blue-50"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}

                          {/* Excluir */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(usuario)}
                      title="Excluir usuário"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                      </td>
                    </tr>
              ))}

              {paginatedUsuarios.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum usuário encontrado
                      </td>
                    </tr>
              )}
                </tbody>
              </table>
            </div>
          )}

          {/* Controles de paginação na parte inferior */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (currentPage <= 3) {
                    pageNumber = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNumber}
                      variant={currentPage === pageNumber ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNumber)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Próximo
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Cadastro */}
      {showModal && (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-50/80 via-white/60 to-purple-50/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white/70 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-foreground">Novo Usuário</h2>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Digite o nome completo"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Digite o email"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Digite a senha"
                    required
                    minLength={8}
                  />
                  <p className="text-xs text-muted-foreground">
                    Mínimo de 8 caracteres
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password_confirmation">Confirmar Senha *</Label>
                  <Input
                    id="password_confirmation"
                    type="password"
                    value={formData.password_confirmation}
                    onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
                    placeholder="Confirme a senha"
                    required
                  />
                </div>

                {/* Perfil - apenas para gestores */}
                {permissions.canEditRole && (
                  <div className="space-y-2">
                    <Label htmlFor="role">Perfil *</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value) => {
                        const currentUserRole = getUserRole()
                        let newEstablishmentId = formData.establishment_id
                        
                        // Se selecionar gestor, limpar establishment_id
                        if (value === 'gestor') {
                          newEstablishmentId = ''
                        } 
                        // Se usuário autenticado é gerente e role não é gestor, preencher automaticamente
                        else if (currentUserRole === 'gerente') {
                          const userEstablishmentId = getUserEstablishmentId()
                          if (userEstablishmentId > 0) {
                            newEstablishmentId = userEstablishmentId.toString()
                          }
                        }
                        
                        setFormData({ 
                          ...formData, 
                          role: value,
                          establishment_id: newEstablishmentId
                        })
                      }}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o perfil" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.name}>
                            {role.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Estabelecimento - apenas para gestores e gerentes */}
                {/* Ocultar quando role = gestor (conforme documentação) */}
                {permissions.canEditEstablishment && formData.role !== 'gestor' && (
                  <div className="space-y-2">
                    <Label htmlFor="establishment_id">
                      Estabelecimento *
                      {userRole === 'gerente' && (
                        <span className="text-xs text-muted-foreground ml-2">(Seu estabelecimento)</span>
                      )}
                    </Label>
                    <Select
                      value={formData.establishment_id}
                      onValueChange={(value) => setFormData({ ...formData, establishment_id: value })}
                      required
                      disabled={userRole === 'gerente'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          userRole === 'gerente'
                            ? "Seu estabelecimento"
                            : "Selecione o estabelecimento"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {establishments.map((establishment) => (
                          <SelectItem key={establishment.id} value={establishment.id.toString()}>
                            {establishment.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {userRole === 'gerente' && (
                      <p className="text-xs text-muted-foreground">
                        Gerentes só podem criar usuários para seu próprio estabelecimento
                      </p>
                    )}
                  </div>
                )}

                {/* Status - apenas para gestores e gerentes */}
                {permissions.canEditStatus && (
                  <div className="space-y-2">
                    <Label htmlFor="is_active">Status *</Label>
                    <Select
                      value={formData.is_active ? "true" : "false"}
                      onValueChange={(value) => setFormData({ ...formData, is_active: value === "true" })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Ativo</SelectItem>
                        <SelectItem value="false">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Seção de Dados Pessoais (Opcional) */}
              <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-semibold mb-4 text-foreground">Dados Pessoais (Opcional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="birthdate">Data de Nascimento</Label>
                    <Input
                      id="birthdate"
                      type="date"
                      value={formData.birthdate}
                      onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                      max={new Date().toISOString().split('T')[0]}
                    />
                    <p className="text-xs text-muted-foreground">Opcional, mas recomendado</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nif">CPF/CNPJ (NIF)</Label>
                    <Input
                      id="nif"
                      value={formData.nif}
                      onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                      placeholder="Digite o CPF/CNPJ"
                    />
                    {isCheckingNif && (
                      <p className="text-xs text-muted-foreground">Verificando CPF...</p>
                    )}
                    {nifInfo?.exists && !isCheckingNif && (
                      <Alert variant="info" className="mt-2">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          {nifInfo.isCustomer ? (
                            <>
                              <strong>CPF já cadastrado como cliente!</strong>
                              {nifInfo.name && (
                                <p className="mt-1">Cliente: <strong>{nifInfo.name}</strong></p>
                              )}
                              <p className="mt-1 text-sm">
                                O sistema irá reutilizar os dados existentes e criar o usuário normalmente.
                                Esta pessoa será cliente <strong>E</strong> vendedor.
                              </p>
                            </>
                          ) : (
                            <>
                              <strong>CPF já cadastrado no sistema!</strong>
                              {nifInfo.name && (
                                <p className="mt-1">Pessoa: <strong>{nifInfo.name}</strong></p>
                              )}
                              <p className="mt-1 text-sm">
                                O sistema irá reutilizar os dados existentes.
                              </p>
                            </>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(63) 99999-9999"
                      maxLength={20}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">Gênero</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value) => setFormData({ ...formData, gender: value })}
                    >
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
                    <Label htmlFor="zip_code">CEP</Label>
                    <Input
                      id="zip_code"
                      value={formData.zip_code}
                      onChange={(e) => {
                        const value = e.target.value
                        // Aplica máscara de CEP
                        const maskedValue = maskCEP(value)
                        setFormData({ ...formData, zip_code: maskedValue })
                        // Busca CEP automaticamente quando tiver 8 dígitos
                        const cleanCep = unmaskCEP(maskedValue)
                        if (cleanCep.length === 8) {
                          handleCepChange(maskedValue)
                        }
                      }}
                      onBlur={(e) => {
                        // Também busca quando o campo perde o foco
                        const value = e.target.value
                        const cleanCep = unmaskCEP(value)
                        if (cleanCep.length === 8) {
                          handleCepChange(value)
                        }
                      }}
                      placeholder="00000-000"
                      maxLength={9}
                    />
                    <p className="text-xs text-muted-foreground">
                      Digite o CEP para preenchimento automático
                    </p>
                  </div>

                  <div className="space-y-2">
                    <CitySearch
                      value={formData.city_id}
                      onCitySelect={(city) => {
                        setFormData({ ...formData, city_id: city.id.toString() })
                      }}
                      onStateChange={(state) => {
                        // Estado não é usado no formulário, mas é obrigatório no componente
                      }}
                      label="Cidade"
                      placeholder="Digite o nome da cidade..."
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Endereço</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Rua, Avenida, etc."
                      maxLength={255}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="district">Bairro</Label>
                    <Input
                      id="district"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      placeholder="Digite o bairro"
                      maxLength={255}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="number">Número</Label>
                    <Input
                      id="number"
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                      placeholder="123"
                      maxLength={20}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
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
                >
                  Criar Usuário
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {showEditModal && selectedUsuario && (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-50/80 via-white/60 to-purple-50/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white/70 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-foreground">
                Editar Usuário - {selectedUsuario.name}
              </h2>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nome Completo *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Digite o nome completo"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email *</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Digite o email"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-password">Nova Senha</Label>
                  <Input
                    id="edit-password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Deixe em branco para manter a senha atual"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-password_confirmation">Confirmar Nova Senha</Label>
                  <Input
                    id="edit-password_confirmation"
                    type="password"
                    value={formData.password_confirmation}
                    onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
                    placeholder="Confirme a nova senha"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-establishment_id">Estabelecimento *</Label>
                  <Select
                    value={formData.establishment_id}
                    onValueChange={(value) => setFormData({ ...formData, establishment_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o estabelecimento" />
                    </SelectTrigger>
                    <SelectContent>
                      {establishments.map((establishment) => (
                        <SelectItem key={establishment.id} value={establishment.id.toString()}>
                          {establishment.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-role">Perfil *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.name}>
                          {role.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-is_active">Status *</Label>
                  <Select
                    value={formData.is_active ? "true" : "false"}
                    onValueChange={(value) => setFormData({ ...formData, is_active: value === "true" })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Ativo</SelectItem>
                      <SelectItem value="false">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Seção de Dados Pessoais (Opcional) */}
              <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-semibold mb-4 text-foreground">Dados Pessoais (Opcional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-birthdate">Data de Nascimento</Label>
                    <Input
                      id="edit-birthdate"
                      type="date"
                      value={formData.birthdate}
                      onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                      max={new Date().toISOString().split('T')[0]}
                    />
                    <p className="text-xs text-muted-foreground">Opcional, mas recomendado</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-nif">CPF/CNPJ (NIF)</Label>
                    <Input
                      id="edit-nif"
                      value={formData.nif}
                      onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                      placeholder="Digite o CPF/CNPJ"
                    />
                    {isCheckingNif && (
                      <p className="text-xs text-muted-foreground">Verificando CPF...</p>
                    )}
                    {nifInfo?.exists && !isCheckingNif && (
                      <Alert variant="info" className="mt-2">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          {nifInfo.isCustomer ? (
                            <>
                              <strong>CPF já cadastrado como cliente!</strong>
                              {nifInfo.name && (
                                <p className="mt-1">Cliente: <strong>{nifInfo.name}</strong></p>
                              )}
                              <p className="mt-1 text-sm">
                                O sistema irá reutilizar os dados existentes e criar o usuário normalmente.
                                Esta pessoa será cliente <strong>E</strong> vendedor.
                              </p>
                            </>
                          ) : (
                            <>
                              <strong>CPF já cadastrado no sistema!</strong>
                              {nifInfo.name && (
                                <p className="mt-1">Pessoa: <strong>{nifInfo.name}</strong></p>
                              )}
                              <p className="mt-1 text-sm">
                                O sistema irá reutilizar os dados existentes.
                              </p>
                            </>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-phone">Telefone</Label>
                    <Input
                      id="edit-phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(63) 99999-9999"
                      maxLength={20}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-gender">Gênero</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value) => setFormData({ ...formData, gender: value })}
                    >
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
                    <Label htmlFor="edit-zip_code">CEP</Label>
                    <Input
                      id="edit-zip_code"
                      value={formData.zip_code}
                      onChange={(e) => {
                        const value = e.target.value
                        // Aplica máscara de CEP
                        const maskedValue = maskCEP(value)
                        setFormData({ ...formData, zip_code: maskedValue })
                        // Busca CEP automaticamente quando tiver 8 dígitos
                        const cleanCep = unmaskCEP(maskedValue)
                        if (cleanCep.length === 8) {
                          handleCepChange(maskedValue)
                        }
                      }}
                      onBlur={(e) => {
                        // Também busca quando o campo perde o foco
                        const value = e.target.value
                        const cleanCep = unmaskCEP(value)
                        if (cleanCep.length === 8) {
                          handleCepChange(value)
                        }
                      }}
                      placeholder="00000-000"
                      maxLength={9}
                    />
                    <p className="text-xs text-muted-foreground">
                      Digite o CEP para preenchimento automático
                    </p>
                  </div>

                  <div className="space-y-2">
                    <CitySearch
                      value={formData.city_id}
                      onCitySelect={(city) => {
                        setFormData({ ...formData, city_id: city.id.toString() })
                      }}
                      onStateChange={(state) => {
                        // Estado não é usado no formulário, mas é obrigatório no componente
                      }}
                      label="Cidade"
                      placeholder="Digite o nome da cidade..."
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="edit-address">Endereço</Label>
                    <Input
                      id="edit-address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Rua, Avenida, etc."
                      maxLength={255}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-district">Bairro</Label>
                    <Input
                      id="edit-district"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      placeholder="Digite o bairro"
                      maxLength={255}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-number">Número</Label>
                    <Input
                      id="edit-number"
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                      placeholder="123"
                      maxLength={20}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
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
                >
                  Atualizar Usuário
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && selectedUsuario && (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-50/80 via-white/60 to-purple-50/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white/70 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold text-foreground">Confirmar Exclusão</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteModal(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6">
              <p className="text-muted-foreground mb-4">
                Tem certeza que deseja excluir o usuário <strong>{selectedUsuario.name}</strong>?
                Esta ação não pode ser desfeita.
              </p>
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
                  Excluir Usuário
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
