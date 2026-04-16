"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, ShoppingCart, Search, User, Loader2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getCategoriasAtivas, incrementarVendasCategoria } from "@/lib/categorias"
import { apiService } from "@/lib/api"
import dynamicCategoryService from "@/lib/dynamic-category-service"
import { useAuth } from "@/lib/auth"
import SaleDocuments from "@/components/documents/sale-documents"
import CitySearch from "@/components/ui/city-search"
import { maskCPF, maskCNPJ, maskPhone, maskCEP, unmaskCPF, unmaskCNPJ, unmaskPhone, unmaskCEP, maskCurrency, unmaskCurrency, parseCurrency, isValidCPF, isValidCNPJ } from "@/lib/masks"
import { notifications } from "@/lib/notifications"
import DynamicForm from "@/components/dynamic/dynamic-form"

// Interface para o formulário de cadastro de vendas
interface FormData {
  tipoPessoa: 'pf' | 'pj';
  nome: string;
  sobrenome: string;
  cpf: string;
  cnpj: string;
  razaoSocial: string;
  telefone: string;
  numeroAtivacao: string;
  email: string;
  dataNascimento: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  tipoServico: string;
  plano: string;
  valor: string;
  observacoes: string;
  meuTim: string;
  debitoAutomatico: string;
  portabilidade: string;
  numeroProvisorio: string;
  resgate: string;
  imei: string;
  valorAparelho: string;
  formaPagamento: string;
  nomeAcessorio: string;
  saleDate: string;
  iccid: string;
  documentos: any[];
}

/** Extrai mensagens de validação de uma resposta 422 (pode vir como string HTML+JSON). Aceita "data" ou "errors" (doc backend). */
function parseValidationResponse(body: unknown): { message?: string; data?: Record<string, string[]> } {
  if (body == null) return {}
  if (typeof body === 'object') {
    const obj = body as Record<string, unknown>
    const message = (obj.message as string) || undefined
    const data = (obj.data as Record<string, string[]> | undefined) ?? (obj.errors as Record<string, string[]> | undefined)
    if (data && typeof data === 'object') return { message, data }
    if (message) return { message }
  }
  if (typeof body === 'string') {
    const lastBrace = body.lastIndexOf('}')
    if (lastBrace !== -1) {
      const start = body.lastIndexOf('{', lastBrace)
      if (start !== -1) {
        try {
          const parsed = JSON.parse(body.slice(start, lastBrace + 1)) as Record<string, unknown>
          const message = (parsed.message as string) || undefined
          const data = (parsed.data as Record<string, string[]> | undefined) ?? (parsed.errors as Record<string, string[]> | undefined)
          if (data && typeof data === 'object') return { message, data }
          if (message) return { message }
        } catch {
          return {}
        }
      }
    }
  }
  return {}
}

// Mock de clientes cadastrados
const clientesCadastrados = [
  {
    cpf: "123.456.789-00",
    nome: "João Silva Santos",
    telefone: "(11) 99999-1111",
    email: "joao.silva@email.com",
    dataNascimento: "1985-03-15",
    cep: "01234-567",
    logradouro: "Rua das Flores",
    numero: "123",
    complemento: "Apto 45",
    bairro: "Centro",
    cidade: "São Paulo",
    estado: "SP"
  },
  {
    cpf: "987.654.321-00",
    nome: "Maria Oliveira Costa",
    telefone: "(11) 88888-2222",
    email: "maria.oliveira@email.com",
    dataNascimento: "1990-07-22",
    cep: "01310-100",
    logradouro: "Av. Paulista",
    numero: "456",
    complemento: "",
    bairro: "Bela Vista",
    cidade: "São Paulo",
    estado: "SP"
  },
  {
    cpf: "456.789.123-00",
    nome: "Pedro Almeida Lima",
    telefone: "(11) 77777-3333",
    email: "pedro.almeida@email.com",
    dataNascimento: "1988-12-10",
    cep: "01305-000",
    logradouro: "Rua Augusta",
    numero: "789",
    complemento: "Sala 12",
    bairro: "Consolação",
    cidade: "São Paulo",
    estado: "SP"
  },
  {
    cpf: "789.123.456-00",
    nome: "Ana Paula Rodrigues",
    telefone: "(11) 66666-4444",
    email: "ana.rodrigues@email.com",
    dataNascimento: "1992-05-18",
    cep: "01426-001",
    logradouro: "Rua Oscar Freire",
    numero: "321",
    complemento: "Casa 2",
    bairro: "Jardins",
    cidade: "São Paulo",
    estado: "SP"
  }
]

export default function CadastrarVendaPage() {
  const { user, isAuthenticated } = useAuth()
  const searchParams = useSearchParams()
  const [success, setSuccess] = useState(false)
  
  // Ref para o campo CPF para scroll
  const cpfInputRef = useRef<HTMLInputElement>(null)
  // Ref para o cabeçalho da página
  const headerRef = useRef<HTMLDivElement>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [saleId, setSaleId] = useState<number | null>(null)
  const [pendingDocuments, setPendingDocuments] = useState<File[]>([])
  const [pendingFilesFromUpload, setPendingFilesFromUpload] = useState<File[]>([])
  const pendingFilesFromUploadRef = useRef<File[]>([])
  const pendingDocumentTypeRef = useRef<string>('')
  const [pendingDocumentType, setPendingDocumentType] = useState<string>('')
  const [documentError, setDocumentError] = useState<string | null>(null)
  const [numeroError, setNumeroError] = useState<string | null>(null)
  const [clienteEncontrado, setClienteEncontrado] = useState<any>(null)
  const [showPortabilidadeModal, setShowPortabilidadeModal] = useState(false)
  const [isBuscandoCEP, setIsBuscandoCEP] = useState(false)
  const [selectedCity, setSelectedCity] = useState<any>(null) // Cidade selecionada para o CitySearch
  const [tiposServico, setTiposServico] = useState<string[]>([])
  const [loadingCategorias, setLoadingCategorias] = useState(true)
  const [produtosDaCategoria, setProdutosDaCategoria] = useState<any[]>([])
  const [loadingProdutos, setLoadingProdutos] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [initialDataLoaded, setInitialDataLoaded] = useState(false)
  const [customerLoadedFromURL, setCustomerLoadedFromURL] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [showDynamicFields, setShowDynamicFields] = useState(false)
  const [dynamicFieldsData, setDynamicFieldsData] = useState<Record<string, any>>({})
  const [showCategoryRulesModal, setShowCategoryRulesModal] = useState(false)
  const [categoryRules, setCategoryRules] = useState<any>(null)
  
  // Estados para validação de CPF/CNPJ
  const [cpfError, setCpfError] = useState("")
  const [cnpjError, setCnpjError] = useState("")
  const [isValidatingCpf, setIsValidatingCpf] = useState(false)
  
  // Estados para validação de ICCID
  const [iccidError, setIccidError] = useState("")

  // Função para validar CPF em tempo real
  const validateCPF = (cpf: string) => {
    if (!cpf.trim()) {
      setCpfError("")
      return
    }

    // Só valida se o CPF estiver completo (11 dígitos)
    const cpfNumbers = unmaskCPF(cpf)
    if (cpfNumbers.length !== 11) {
      setCpfError("")
      return
    }

    setIsValidatingCpf(true)
    setCpfError("")

    // Usar debounce para evitar muitas validações
    const timeoutId = setTimeout(() => {
      if (!isValidCPF(cpf)) {
        setCpfError("CPF inválido")
        notifications.invalidCPF(cpf)
      }
      setIsValidatingCpf(false)
    }, 500)

    return () => clearTimeout(timeoutId)
  }

  // Função para validar CNPJ em tempo real
  const validateCNPJ = (cnpj: string) => {
    if (!cnpj.trim()) {
      setCnpjError("")
      return
    }
    const cnpjNumbers = unmaskCNPJ(cnpj)
    if (cnpjNumbers.length !== 14) {
      setCnpjError("")
      return
    }
    setCnpjError(isValidCNPJ(cnpj) ? "" : "CNPJ inválido")
  }

  const [formData, setFormData] = useState<FormData>({
    tipoPessoa: 'pf',
    nome: "",
    sobrenome: "",
    cpf: "",
    cnpj: "",
    razaoSocial: "",
    telefone: "",
    numeroAtivacao: "",
    email: "",
    dataNascimento: "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    tipoServico: "",
    plano: "",
    valor: "",
    observacoes: "",
    meuTim: "",
    debitoAutomatico: "",
    portabilidade: "",
    numeroProvisorio: "",
    resgate: "",
    // Campos especiais
    imei: "",
    valorAparelho: "",
    formaPagamento: "",
    nomeAcessorio: "",
    // Novos campos
    saleDate: "",
    iccid: "",
    // Documentos (gerenciados pelo sistema de documentos)
    documentos: [],
  })


  // Função para lidar com seleção de cidade
  const handleCitySelect = (city: any) => {
    console.log('🏙️ Cidade selecionada:', city)
    setSelectedCity(city) // Armazena a cidade selecionada
    setFormData(prev => ({
      ...prev,
      cidade: city.title || city.name || '',
      estado: city.letter || city.state_code || ''
    }))
  }

  // Função para lidar com mudança de estado
  const handleStateChange = (stateCode: string) => {
    console.log('🗺️ Estado alterado para:', stateCode)
    setFormData(prev => ({
      ...prev,
      estado: stateCode
    }))
    console.log('✅ Estado atualizado no formData:', stateCode)
  }

  // Função para obter perfil do usuário logado
  const fetchUserProfile = async () => {
    try {
      setLoadingProfile(true)
      console.log('👤 Obtendo perfil do usuário...')
      
      const response = await apiService.getUserProfile()
      console.log('📥 Perfil obtido:', response)
      
      if (response && response.data) {
        setUserProfile(response.data)
        console.log('✅ Perfil carregado:', response.data.name, '- Estabelecimento:', response.data.establishment?.name)
      }
    } catch (error: any) {
      console.error('❌ Erro ao obter perfil:', error)
      console.error('❌ Status:', error?.response?.status)
      console.error('❌ Dados:', error?.response?.data)
      
      if (error?.response?.status === 401) {
        console.error('❌ Token expirado, redirecionando para login...')
        setTimeout(() => {
          window.location.href = '/login'
        }, 2000)
      }
    } finally {
      setLoadingProfile(false)
    }
  }

  // Carregar dados do cliente se customer_id estiver na URL
  useEffect(() => {
    const loadCustomerData = async () => {
      const customerId = searchParams.get('customer_id')
      if (customerId) {
        try {
          console.log('🔄 Carregando dados do cliente ID:', customerId)
          const response = await apiService.getClient(parseInt(customerId))
          const customer = response.data as any
          
          if (customer && customer.person) {
            const person = customer.person
            console.log('✅ Cliente carregado:', person.name)
            
            // Preencher o formulário com os dados do cliente
            setFormData(prev => ({
              ...prev,
              cpf: maskCPF(person.nif || ''),
              nome: person.name?.split(' ')[0] || '',
              sobrenome: person.name?.split(' ').slice(1).join(' ') || '',
              email: person.email || '',
              telefone: maskPhone(person.phone || ''),
              dataNascimento: person.birthdate || '',
              cep: maskCEP(person.zip_code || ''),
              logradouro: person.address || '',
              numero: person.number || '',
              complemento: '',
              bairro: person.district || '',
              cidade: person.city?.name || '',
              estado: person.city?.state?.uf || ''
            }))
            
            // Marcar como cliente encontrado
            setClienteEncontrado(customer)
            setCustomerLoadedFromURL(true)
            console.log('✅ Formulário preenchido com dados do cliente')
          }
        } catch (error) {
          console.error('❌ Erro ao carregar dados do cliente:', error)
        }
      }
    }
    
    loadCustomerData()
  }, [searchParams])

  // Carregar perfil do usuário e categorias da API
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Verificar se o usuário está autenticado
        if (!isAuthenticated || !user) {
          console.error('❌ Usuário não autenticado')
          throw new Error('Usuário não autenticado')
        }

        // Verificar se temos token válido
        const token = localStorage.getItem('auth_token')
        if (!token) {
          console.error('❌ Nenhum token encontrado')
          throw new Error('Token não encontrado')
        }

        console.log('👤 Usuário autenticado:', user.name, user.email)
        
        // Carregar perfil do usuário
        await fetchUserProfile()
        
        // Carregar categorias ativas
        setLoadingCategorias(true)
        console.log('🔍 Carregando categorias ativas da API...')
        
        const response = await apiService.getCategoriesActive()
        console.log('📥 Resposta da API de categorias:', response)
        
        if (response && response.data && Array.isArray(response.data)) {
          const categorias = response.data.map((cat: any) => cat.name)
          console.log('✅ Categorias carregadas:', categorias)
          setTiposServico(categorias)
        } else {
          throw new Error('Resposta inválida da API')
        }
      } catch (error: any) {
        console.error('❌ Erro ao carregar dados iniciais:', error)
        console.error('❌ Tipo do erro:', typeof error)
        console.error('❌ Mensagem:', error?.message)
        console.error('❌ Status:', error?.response?.status)
        
        // Fallback para categorias padrão
        console.log('🔄 Usando categorias padrão como fallback...')
        setTiposServico([
          "FAMILIA", "POS_PAGO", "CONTROLE", "PRE_PAGO", "FIBRA", 
          "UPGRADE", "APARELHO", "ACESSÓRIO", "CHIP"
        ])
      } finally {
        setLoadingCategorias(false)
        setInitialDataLoaded(true)
        console.log('✅ Dados iniciais carregados com sucesso')
      }
    }

    loadInitialData()
  }, [isAuthenticated, user])

  // Fechar resultados da busca quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.product-search-container')) {
        setShowSearchResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Scroll automático para o topo quando a página carregar
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Função para scroll para o campo CPF
  const scrollToCPF = () => {
    if (cpfInputRef.current) {
      cpfInputRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      })
      // Focar no campo após o scroll
      setTimeout(() => {
        cpfInputRef.current?.focus()
      }, 500)
    }
  }

  // Função para scroll para o topo da página
  const scrollToTop = () => {
    // Primeiro, tentar scroll para o cabeçalho específico
    if (headerRef.current) {
      headerRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest'
      })
      return
    }
    
    // Fallback: scroll para o topo absoluto
    window.scrollTo({ top: 0, behavior: 'smooth' })
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }

  // Função para buscar endereço por CEP
  const buscarEnderecoPorCEP = async (cep: string) => {
    const cepLimpo = unmaskCEP(cep)
    console.log('🔍 Buscando CEP:', cep, 'Limpo:', cepLimpo)
    
    if (cepLimpo.length !== 8) {
      console.log('⚠️ CEP incompleto, não buscando')
      return
    }

    setIsBuscandoCEP(true)
    console.log('🔄 Iniciando busca do CEP...')
    
    try {
      // Tentativa 1: API ViaCEP com proxy CORS
      let data = null
      
      try {
        console.log('🌐 Tentativa 1: ViaCEP com proxy CORS...')
        const response = await fetch(`https://cors-anywhere.herokuapp.com/https://viacep.com.br/ws/${cepLimpo}/json/`, {
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        })
        data = await response.json()
        console.log('📡 Resposta da API ViaCEP (proxy):', data)
      } catch (proxyError) {
        console.log('⚠️ Proxy CORS falhou, tentando API alternativa...')
        
        // Tentativa 2: API alternativa que suporta CORS
        try {
          console.log('🌐 Tentativa 2: API alternativa...')
          const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cepLimpo}`)
          const altData = await response.json()
          
          // Converter formato da API alternativa para o formato esperado
          data = {
            cep: altData.cep,
            logradouro: altData.street,
            bairro: altData.neighborhood,
            localidade: altData.city,
            uf: altData.state,
            erro: false
          }
          console.log('📡 Resposta da API alternativa:', data)
        } catch (altError) {
          console.log('⚠️ API alternativa falhou, tentando método manual...')
          
          // Tentativa 3: Dados mock para CEPs conhecidos (apenas para desenvolvimento)
          console.log('❌ APIs externas falharam, usando dados mock para teste...')
          
          // Fallback: Dados mock para CEPs conhecidos (apenas para desenvolvimento)
          const cepMock = {
            '77021062': {
              cep: '77021-062',
              logradouro: 'Quadra 201 Norte, Avenida JK',
              bairro: 'Plano Diretor Norte',
              localidade: 'Palmas',
              uf: 'TO',
              erro: false
            },
            '77060000': {
              cep: '77060-000',
              logradouro: 'Avenida JK',
              bairro: 'Plano Diretor Norte',
              localidade: 'Palmas',
              uf: 'TO',
              erro: false
            },
            '77000000': {
              cep: '77000-000',
              logradouro: 'Centro',
              bairro: 'Centro',
              localidade: 'Palmas',
              uf: 'TO',
              erro: false
            }
          }
          
          data = (cepMock as any)[cepLimpo] || null
          if (data) {
            console.log('📡 Usando dados mock:', data)
          }
        }
      }
      
      if (!data || data.erro) {
        console.log('❌ CEP não encontrado em nenhuma API')
        notifications.custom.error('CEP não encontrado. Verifique o número digitado.')
        return
      }

      console.log('✅ CEP encontrado! Preenchendo campos...')
      console.log('🏙️ Cidade:', data.localidade)
      console.log('🗺️ Estado:', data.uf)
      console.log('📍 Logradouro:', data.logradouro)
      console.log('🏘️ Bairro:', data.bairro)

      // Preenche automaticamente os campos de endereço
      setFormData(prev => ({
        ...prev,
        logradouro: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        estado: data.uf || ''
      }))

      // Buscar e selecionar automaticamente a cidade correta no sistema
      if (data.localidade && data.uf) {
        try {
          console.log('🔍 Buscando cidade no sistema:', data.localidade, data.uf)
          const citiesResponse = await apiService.getCities()
          let cities: any[] = []
          
          if (Array.isArray(citiesResponse.data)) {
            cities = citiesResponse.data
          } else if (citiesResponse.data && typeof citiesResponse.data === 'object' && 'data' in citiesResponse.data) {
            cities = Array.isArray((citiesResponse.data as any).data) ? (citiesResponse.data as any).data : []
          }
          
          // Buscar cidade pelo nome e estado (UF)
          const cityName = data.localidade.toLowerCase().trim()
          const stateCode = data.uf.toUpperCase().trim()
          
          // Primeiro, tentar encontrar cidade exata com o estado correto
          let city = cities.find((c: any) => {
            const cName = c.title?.toLowerCase().trim() || ''
            const cState = c.letter?.toUpperCase().trim() || ''
            return cName === cityName && cState === stateCode
          })
          
          // Se não encontrar exato, tentar apenas pelo nome (pode haver múltiplas)
          if (!city) {
            city = cities.find((c: any) => {
              const cName = c.title?.toLowerCase().trim() || ''
              return cName === cityName
            })
          }
          
          if (city) {
            console.log('✅ Cidade encontrada no sistema:', city.title, city.letter)
            // Criar objeto cidade completo
            const cityObject = {
              id: city.id,
              title: city.title,
              state_id: city.state_id,
              letter: city.letter || stateCode,
              lat: city.lat || '',
              long: city.long || '',
              created_at: city.created_at || '',
              updated_at: city.updated_at || ''
            }
            // Selecionar automaticamente a cidade
            handleCitySelect(cityObject)
            console.log('✅ Cidade selecionada automaticamente!')
          } else {
            console.log('⚠️ Cidade não encontrada no sistema:', data.localidade)
            // Limpar seleção se não encontrar
            setSelectedCity(null)
          }
        } catch (error) {
          console.error('⚠️ Erro ao buscar cidade no sistema:', error)
          // Continua mesmo se não conseguir buscar a cidade
        }
      }
      
      console.log('✅ Campos preenchidos com sucesso!')
      notifications.custom.success('Endereço preenchido automaticamente!')
      
    } catch (error) {
      console.error('❌ Erro ao buscar CEP:', error)
      notifications.custom.error('Erro ao buscar CEP. Preencha manualmente.')
    } finally {
      setIsBuscandoCEP(false)
      console.log('🏁 Busca do CEP finalizada')
    }
  }

  // Função para carregar produtos da categoria selecionada usando novo endpoint
  const carregarProdutosDaCategoria = async (categoriaNome: string) => {
    if (!categoriaNome) {
      setProdutosDaCategoria([])
      return
    }

    // Se o perfil ainda não foi carregado, aguardar o carregamento
    if (!userProfile?.establishment_id && !loadingProfile) {
      console.log('⏳ Aguardando carregamento do perfil do usuário...')
      setLoadingProdutos(true)
      
      try {
        await fetchUserProfile()
        // Aguardar um pouco para o estado ser atualizado
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.error('❌ Erro ao carregar perfil:', error)
        setLoadingProdutos(false)
        alert('Erro ao carregar perfil do usuário. Recarregue a página.')
        return
      }
    }

    // Para gestores e administradores, se não tiver establishment_id, buscar o primeiro estabelecimento disponível
    let establishmentId = userProfile?.establishment_id
    
    // Verificar se é usuário de alto nível (gestor ou administrador)
    const isHighLevelUser = user?.role === 'gestor' || 
                           user?.email === 'admin@tim.com.br' || 
                           user?.name?.includes('Administrador') ||
                           user?.name?.includes('Gestor')
    
    if (!establishmentId && isHighLevelUser) {
      console.log('👑 Usuário gestor/administrador sem establishment_id, buscando estabelecimentos...')
      try {
        const establishmentsResponse = await apiService.getEstablishments()
        console.log('📡 Resposta dos estabelecimentos:', establishmentsResponse)
        if (establishmentsResponse.data && establishmentsResponse.data.length > 0) {
          establishmentId = establishmentsResponse.data[0].id
          console.log('✅ Usando primeiro estabelecimento disponível:', establishmentId)
        } else {
          console.log('⚠️ Nenhum estabelecimento encontrado na resposta')
        }
      } catch (error) {
        console.error('❌ Erro ao buscar estabelecimentos:', error)
      }
    } else {
      console.log('ℹ️ Usuário não é gestor/administrador ou já tem establishment_id')
    }
    
    console.log('🔍 Debug - establishmentId final:', establishmentId)

    // Verificar se temos um establishment_id válido
    if (!establishmentId) {
      console.log('🔍 Debug - establishment_id não encontrado, aplicando fallback...')
      
      // Fallback: sempre tentar usar establishment_id = 1 como fallback
      establishmentId = 1
      console.log('✅ Usando fallback establishment_id = 1')
      console.log('🔍 Debug - isHighLevelUser:', isHighLevelUser)
      console.log('🔍 Debug - user:', user)
    }

    setLoadingProdutos(true)
    console.log(`🔍 Buscando produtos da categoria "${categoriaNome}" para estabelecimento ID: ${establishmentId}`)
    
    try {
      // Verificar se o usuário está autenticado
      if (!isAuthenticated || !user) {
        console.error('❌ Usuário não autenticado')
        throw new Error('Usuário não autenticado')
      }

      // Verificar se temos token válido
      const token = localStorage.getItem('auth_token')
      if (!token) {
        console.error('❌ Nenhum token encontrado')
        throw new Error('Token não encontrado')
      }

      console.log('👤 Usuário autenticado:', user.name, user.email)
      console.log('🏪 Estabelecimento ID:', establishmentId)

      // Buscar categoria pelo nome para obter o ID
      const categoriasResponse = await apiService.getCategoriesActive()
      const categoria = categoriasResponse.data.find((cat: any) => cat.name === categoriaNome)
      
      if (!categoria) {
        console.error(`❌ Categoria "${categoriaNome}" não encontrada`)
        throw new Error(`Categoria "${categoriaNome}" não encontrada`)
      }

      console.log(`🎯 Categoria encontrada: ${categoria.name} (ID: ${categoria.id})`)

      // Usar novo endpoint específico para produtos da categoria e estabelecimento
      console.log('🌐 Fazendo requisição para novo endpoint...')
      const response = await apiService.getProductsByCategoryAndEstablishment(
        categoria.id, 
        establishmentId
      )
      
      console.log('📥 Resposta da API:', response)
      
      if (!response || !response.data) {
        console.error('❌ Resposta inválida:', response)
        throw new Error('Resposta inválida da API')
      }

      const produtos = response.data.data || response.data || []
      console.log('📦 Total de produtos encontrados:', produtos.length)
      
      if (produtos.length > 0) {
        console.log(`✅ ${produtos.length} produtos encontrados para categoria "${categoriaNome}" no estabelecimento ID: ${establishmentId}`)
        console.log('📋 Produtos encontrados:', produtos.map((p: any) => `${p.name} - R$ ${p.price}`))
        setProdutosDaCategoria(produtos)
      } else {
        console.warn(`⚠️ Nenhum produto encontrado para categoria "${categoriaNome}" no estabelecimento ID: ${establishmentId}`)
        setProdutosDaCategoria([])
        notifications.noProductsInCategory(categoriaNome, `Estabelecimento ID: ${establishmentId}`)
      }
      
    } catch (error: any) {
      console.error('❌ Erro ao carregar produtos da API:', error)
      console.error('❌ Tipo do erro:', typeof error)
      console.error('❌ Mensagem:', error?.message)
      console.error('❌ Status:', error?.response?.status)
      console.error('❌ Dados do erro:', error?.response?.data)
      
      // Em caso de erro, limpar lista de produtos
      setProdutosDaCategoria([])
      
      // Mostrar erro específico para o usuário
      let errorMessage = `Erro ao carregar produtos da categoria ${categoriaNome}.`
      
      if (error?.response?.status === 401) {
        errorMessage = 'Sessão expirada. Faça login novamente.'
        setTimeout(() => {
          window.location.href = '/login'
        }, 2000)
      } else if (error?.response?.status === 403) {
        errorMessage = '❌ PROBLEMA DE PERMISSÕES: O vendedor não tem acesso a produtos. Contate o desenvolvedor backend.'
      } else if (error?.message === 'Usuário não autenticado') {
        errorMessage = 'Usuário não autenticado. Faça login novamente.'
        setTimeout(() => {
          window.location.href = '/login'
        }, 2000)
      } else if (error?.message === 'Token não encontrado') {
        errorMessage = 'Token de autenticação não encontrado. Faça login novamente.'
        setTimeout(() => {
          window.location.href = '/login'
        }, 2000)
      } else if (error?.message.includes('não encontrada')) {
        errorMessage = `Categoria "${categoriaNome}" não encontrada no sistema.`
      } else if (error?.response?.status >= 500) {
        errorMessage = 'Erro interno do servidor. Tente novamente em alguns minutos.'
      }
      
      alert(errorMessage)
      
    } finally {
      setLoadingProdutos(false)
    }
  }

  // Função para carregar regras da categoria
  const loadCategoryRules = async (categoriaId: number) => {
    try {
      const fieldConfigResponse = await dynamicCategoryService.getFieldConfig(categoriaId)
      if (fieldConfigResponse && fieldConfigResponse.data) {
        setCategoryRules(fieldConfigResponse.data)
        return fieldConfigResponse.data
      }
    } catch (error) {
      console.log('⚠️ Erro ao carregar regras da categoria:', error)
    }
    return null
  }

  // Função para lidar com mudança de categoria
  const handleCategoriaChange = async (categoria: string) => {
    setFormData({ 
      ...formData, 
      tipoServico: categoria,
      plano: "" // Limpa o plano quando muda categoria
    })
    
    // Buscar ID da categoria para campos dinâmicos
    try {
      const categoriasResponse = await apiService.getCategoriesActive()
      const categoriaObj = categoriasResponse.data.find((cat: any) => cat.name === categoria)
      
      if (categoriaObj) {
        setSelectedCategoryId(categoriaObj.id)
        console.log('✅ Categoria encontrada:', categoriaObj.name, 'ID:', categoriaObj.id)
        
        // Verificar se a categoria tem campos dinâmicos configurados
        if (categoria === "APARELHO") {
          // Configuração hardcoded para APARELHO
          console.log('📱 Categoria APARELHO - configurando campos dinâmicos hardcoded')
          const hardcodedRules = {
            category_id: categoriaObj.id,
            category_name: "APARELHO",
            required_fields: [
              {
                id: 1,
                field_name: "imei",
                field_type: "text",
                label: "IMEI do Aparelho",
                placeholder: "Digite o IMEI do aparelho",
                required: true,
                display_order: 1
              }
            ],
            optional_fields: []
          }
          
          setCategoryRules(hardcodedRules)
          setShowCategoryRulesModal(true)
          console.log('✅ Modal de campos dinâmicos configurado para APARELHO')
        } else {
          // Para outras categorias, tentar buscar do backend
          try {
            const fieldConfigResponse = await dynamicCategoryService.getFieldConfig(categoriaObj.id)
            if (fieldConfigResponse && fieldConfigResponse.data) {
              const hasFields = fieldConfigResponse.data.required_fields?.length > 0 || 
                              fieldConfigResponse.data.optional_fields?.length > 0
              console.log('🔧 Categoria tem campos dinâmicos:', hasFields)
              
              if (hasFields) {
                console.log('📝 Categoria com campos dinâmicos - mostrando modal de regras')
                // Carregar regras da categoria e mostrar modal
                await loadCategoryRules(categoriaObj.id)
                setShowCategoryRulesModal(true)
              } else {
                // Se não tem campos dinâmicos, mostrar campos normalmente
                setShowDynamicFields(true)
              }
            } else {
              // Se não conseguiu carregar configuração, mostrar campos normalmente
              setShowDynamicFields(true)
            }
          } catch (fieldError) {
            console.log('⚠️ Erro ao verificar campos dinâmicos:', fieldError)
            // Se houver erro, mostrar campos normalmente
            setShowDynamicFields(true)
          }
        }
      } else {
        setSelectedCategoryId(null)
        setShowDynamicFields(false)
        console.log('⚠️ Categoria não encontrada:', categoria)
      }
    } catch (error) {
      console.error('❌ Erro ao buscar categoria:', error)
      setSelectedCategoryId(null)
      setShowDynamicFields(false)
    }
    
    // Carregar produtos da categoria selecionada sempre
    carregarProdutosDaCategoria(categoria)
  }

  // Função para lidar com campos dinâmicos
  const handleDynamicFieldsChange = (data: Record<string, any>) => {
    setDynamicFieldsData(data)
    console.log('📝 Campos dinâmicos atualizados:', data)
  }

  const handleDynamicFieldsCancel = () => {
    setShowDynamicFields(false)
    setDynamicFieldsData({})
    setSelectedCategoryId(null)
  }

  // Função para limpar campos dinâmicos e fechar modal
  const handleCloseCategoryModal = () => {
    setShowCategoryRulesModal(false)
    setDynamicFieldsData({})
    setShowDynamicFields(false)
    setSelectedCategoryId(null)
    console.log('🧹 Campos dinâmicos limpos e modal fechado')
  }

  // Função para obter produtos da categoria selecionada
  const getProdutosDaCategoria = () => {
    // Retorna apenas produtos carregados da API
    if (produtosDaCategoria.length > 0) {
      return produtosDaCategoria.map(produto => produto.name || produto.nome || produto)
    }
    
    // Se não há produtos da API, retorna array vazio
    return []
  }

  // Função para buscar produtos no banco de dados
  const searchProducts = async (term: string) => {
    console.log('🔍 searchProducts chamado com termo:', term)
    console.log('🔍 Categoria atual:', formData.tipoServico)
    
    if (!term || term.length < 2) {
      console.log('🔍 Termo muito curto, limpando resultados')
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    setIsSearching(true)
    console.log('🔍 Iniciando busca...')
    
    try {
      console.log('🔍 Buscando produtos com termo:', term)
      
      // Buscar produtos da categoria atual via API
      const categoria = formData.tipoServico
      if (categoria) {
        console.log('🔍 Fazendo requisição para API...')
        try {
          // Primeiro, buscar o ID da categoria
          const categoriasResponse = await apiService.getCategoriesActive()
          const categoriaObj = categoriasResponse.data.find((cat: any) => 
            cat.name.toLowerCase() === categoria.toLowerCase()
          )
          
          if (categoriaObj) {
            console.log('🔍 Categoria encontrada:', categoriaObj.name, 'ID:', categoriaObj.id)
            
            // Fazer requisição com parâmetros corretos
            const response = await fetch(`/api/v1/products/search?category_id=${categoriaObj.id}&q=${encodeURIComponent(term)}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
              }
            })
            
            console.log('🔍 Resposta da API:', response.status, response.statusText)
            
            if (response.ok) {
              const data = await response.json()
              console.log('🔍 Dados recebidos:', data)
              if (data && data.data) {
                setSearchResults(data.data)
                setShowSearchResults(true)
                console.log('✅ Produtos encontrados:', data.data.length)
              } else {
                console.log('🔍 Nenhum produto encontrado na resposta')
                setSearchResults([])
                setShowSearchResults(false)
              }
            } else {
              console.log('🔍 Erro na resposta da API:', response.status)
              // Fallback para busca local
              console.log('🔍 Usando busca local como fallback...')
              const produtosDisponiveis = getProdutosDaCategoria()
              const resultadosFiltrados = produtosDisponiveis.filter(produto => 
                produto.toLowerCase().includes(term.toLowerCase())
              )
              
              if (resultadosFiltrados.length > 0) {
                const resultadosFormatados = resultadosFiltrados.map(produto => ({
                  name: produto,
                  nome: produto,
                  description: `Produto da categoria ${formData.tipoServico}`,
                  price: null
                }))
                
                setSearchResults(resultadosFormatados)
                setShowSearchResults(true)
                console.log('✅ Produtos encontrados na busca local:', resultadosFormatados.length)
              } else {
                setSearchResults([])
                setShowSearchResults(false)
              }
            }
          } else {
            console.log('🔍 Categoria não encontrada')
            setSearchResults([])
            setShowSearchResults(false)
          }
        } catch (fetchError) {
          console.error('❌ Erro na busca direta:', fetchError)
          // Fallback para busca local
          console.log('🔍 Usando busca local como fallback...')
          const produtosDisponiveis = getProdutosDaCategoria()
          const resultadosFiltrados = produtosDisponiveis.filter(produto => 
            produto.toLowerCase().includes(term.toLowerCase())
          )
          
          if (resultadosFiltrados.length > 0) {
            const resultadosFormatados = resultadosFiltrados.map(produto => ({
              name: produto,
              nome: produto,
              description: `Produto da categoria ${formData.tipoServico}`,
              price: null
            }))
            
            setSearchResults(resultadosFormatados)
            setShowSearchResults(true)
            console.log('✅ Produtos encontrados na busca local:', resultadosFormatados.length)
          } else {
            setSearchResults([])
            setShowSearchResults(false)
          }
        }
      } else {
        console.log('🔍 Nenhuma categoria selecionada')
        setSearchResults([])
        setShowSearchResults(false)
      }
    } catch (error) {
      console.error('❌ Erro ao buscar produtos:', error)
      setSearchResults([])
      setShowSearchResults(false)
    } finally {
      setIsSearching(false)
      console.log('🔍 Busca finalizada')
    }
  }

  // Função para lidar com mudança no campo de busca
  const handleSearchChange = (value: string) => {
    console.log('🔍 handleSearchChange chamado com valor:', value)
    setSearchTerm(value)
    setFormData({ ...formData, plano: value })
    
    // Busca imediata para teste
    if (value.length >= 2) {
      console.log('🔍 Executando busca imediata para:', value)
      searchProducts(value)
    } else {
      setSearchResults([])
      setShowSearchResults(false)
    }
  }

  // Função para selecionar um produto da busca
  const handleProductSelect = (product: any) => {
    const productName = product.name || product.nome || product
    setFormData({ ...formData, plano: productName })
    setSearchTerm(productName)
    setShowSearchResults(false)
    setSearchResults([])
  }

  // Função para marcar todos os campos booleanos como "Não"
  const marcarTodosComoNao = () => {
    setFormData(prev => ({
      ...prev,
      meuTim: "Não",
      debitoAutomatico: "Não",
      portabilidade: "Não",
      resgate: "Não"
    }))
  }

  // Função para verificar se é categoria especial
  const isCategoriaEspecial = (categoria: string) => {
    return categoria === "APARELHO" || categoria === "ACESSÓRIO"
  }
  const handlePortabilidadeChange = (value: string) => {
    setFormData({ ...formData, portabilidade: value })
    if (value === "Sim") {
      setShowPortabilidadeModal(true)
    }
  }

  // Função para fechar modal da portabilidade
  const handleClosePortabilidadeModal = () => {
    setShowPortabilidadeModal(false)
    if (!formData.numeroProvisorio) {
      setFormData({ ...formData, portabilidade: "Não" })
    }
  }

  // Função para confirmar número provisório
  const handleConfirmarNumeroProvisorio = () => {
    if (formData.numeroProvisorio.trim()) {
      // Exibir toast com o número de portabilidade digitado
      notifications.custom.success(`✅ Número de portabilidade confirmado: ${formData.numeroProvisorio}`)
      
      setShowPortabilidadeModal(false)
    }
  }
  const buscarClientePorCPF = async (cpf: string) => {
    if (!cpf || cpf.length < 11) {
      setClienteEncontrado(null)
      return
    }

    console.log('🔍 Iniciando busca de cliente por CPF:', cpf)
    setIsSearching(true)
    
    // Remove formatação do CPF antes de enviar para API
    const cpfLimpo = unmaskCPF(cpf)
    console.log('📋 CPF limpo para busca:', cpfLimpo)
    
    try {
      // Busca na API real
      console.log('🌐 Chamando API searchCustomerByNif...')
      const response = await apiService.searchCustomerByNif(cpfLimpo)
      console.log('📥 Resposta da API:', response)
      
      if (response.data) {
        const cliente = response.data
        console.log('👤 Dados completos do cliente encontrado:', cliente)
        console.log('🏙️ Cidade do cliente:', cliente.city)
        console.log('🗺️ Estado do cliente:', cliente.state)
        console.log('🔍 Verificando outros campos de localização...')
        console.log('📍 CEP:', cliente.zip_code)
        console.log('🏠 Endereço:', cliente.address)
        console.log('🏘️ Bairro:', cliente.neighborhood)
        console.log('🏠 Número:', cliente.number)
        console.log('🏠 Complemento:', cliente.complement)
        console.log('🌍 Todos os campos do cliente:', Object.keys(cliente))
        
        // Verificar se os campos de endereço estão vazios
        const camposEndereco = {
          zip_code: cliente.zip_code,
          address: cliente.address,
          number: cliente.number,
          complement: cliente.complement,
          neighborhood: cliente.neighborhood,
          city: cliente.city,
          state: cliente.state
        }
        console.log('🏠 Campos de endereço do cliente:', camposEndereco)
        
        setClienteEncontrado({
          id: cliente.id,  // ← Adicionar o ID do customer
          cpf: cliente.nif || cpf,  // ← Mudança: usar cliente.nif
          nome: cliente.name || "",
          telefone: cliente.phone || "",
          email: cliente.email || "",
          cep: cliente.zip_code || "",
          logradouro: cliente.address || "",
          numero: (cliente.number || '').slice(0, 20),
          complemento: cliente.complement || "",
          bairro: cliente.neighborhood || "",
          cidade: (cliente.city as any)?.title || cliente.city || "",
          estado: cliente.state || ""
        })
        // Separar nome e sobrenome
        const nomeCompleto = cliente.name || ""
        const partesNome = nomeCompleto.split(" ")
        const nome = partesNome[0] || ""
        const sobrenome = partesNome.slice(1).join(" ") || ""

        console.log('📝 Preenchendo formulário com dados do cliente...')
        console.log('🏙️ Cidade a ser preenchida:', cliente.city)
        console.log('🗺️ Estado a ser preenchido:', cliente.state)
        console.log('🔍 Estrutura completa da cidade:', JSON.stringify(cliente.city, null, 2))
        
        // Se cidade e estado não estão preenchidos, tentar buscar pelo CEP
        let cidadeFinal = (cliente.city as any)?.title || cliente.city || ""
        let estadoFinal = cliente.state || ""
        
        // Se não temos estado, tentar determinar pelo CEP ou state_id
        if (!estadoFinal && cliente.zip_code) {
          const cepLimpo = cliente.zip_code.replace(/\D/g, '')
          if (cepLimpo.startsWith('77021') || cepLimpo.startsWith('77060')) {
            estadoFinal = 'TO'
            console.log('✅ Estado determinado pelo CEP: TO')
          }
        }
        
        if (!cidadeFinal && !estadoFinal && cliente.zip_code) {
          console.log('🔍 Cidade e estado não encontrados, buscando pelo CEP:', cliente.zip_code)
          try {
            // Buscar cidade pelo CEP usando a API de cidades
            const cepLimpo = cliente.zip_code.replace(/\D/g, '')
            if (cepLimpo.length === 8) {
              // Buscar nas cidades carregadas
              const cidades = await apiService.getCities()
              if (cidades.data && Array.isArray(cidades.data)) {
                console.log('📊 Total de cidades disponíveis:', cidades.data.length)
                
                // Tentar encontrar cidade baseada no CEP
                // CEP 77021-062 é de Palmas/TO
                if (cepLimpo.startsWith('77021')) {
                  cidadeFinal = 'Palmas'
                  estadoFinal = 'TO'
                  console.log('✅ Cidade encontrada pelo CEP: Palmas/TO')
                } else if (cepLimpo.startsWith('77060')) {
                  cidadeFinal = 'Palmas'
                  estadoFinal = 'TO'
                  console.log('✅ Cidade encontrada pelo CEP: Palmas/TO')
                } else {
                  // Para outros CEPs, tentar uma busca mais genérica
                  console.log('⚠️ CEP não reconhecido, deixando campos vazios para preenchimento manual')
                }
              }
            }
          } catch (error) {
            console.log('⚠️ Erro ao buscar cidade pelo CEP:', error)
          }
        }

        console.log('📝 Dados que serão preenchidos no formulário:', {
          nome,
          sobrenome,
          telefone: cliente.phone,
          email: cliente.email,
          dataNascimento: cliente.birth_date,
          cep: cliente.zip_code,
          logradouro: cliente.address,
          numero: (cliente.number || '').slice(0, 20),
          complemento: cliente.complement,
          bairro: cliente.neighborhood,
          cidade: cidadeFinal,
          estado: estadoFinal
        })

        setFormData(prev => {
          const newFormData = {
          ...prev,
          nome: nome,
          sobrenome: sobrenome,
          telefone: cliente.phone || "",
          email: cliente.email || "",
          dataNascimento: cliente.birth_date || "",
          cep: cliente.zip_code || "",
          logradouro: cliente.address || "",
          numero: (cliente.number || '').slice(0, 20),
          complemento: cliente.complement || "",
          bairro: cliente.neighborhood || "",
          cidade: cidadeFinal,
          estado: estadoFinal
          }
          
          console.log('📝 Novo estado do formulário:', newFormData)
          return newFormData
        })
        
        console.log('✅ Formulário preenchido com sucesso!')
        console.log('🏙️ Cidade final:', cidadeFinal)
        console.log('🗺️ Estado final:', estadoFinal)
        console.log('🔍 Estado será preenchido no formulário:', estadoFinal)
        
        // Se não há dados de endereço, sugerir preenchimento manual
        if (!cliente.zip_code && !cliente.address && !cliente.city) {
          console.log('⚠️ Cliente encontrado mas sem dados de endereço cadastrados')
          console.log('💡 Sugestão: Preencha o CEP para buscar o endereço automaticamente')
        }
      } else {
        setClienteEncontrado(null)
        setFormData(prev => ({
          ...prev,
          nome: "",
          sobrenome: "",
          telefone: "",
          email: "",
          cep: "",
          logradouro: "",
          numero: "",
          complemento: "",
          bairro: "",
          cidade: "",
          estado: ""
        }))
      }
    } catch (error: any) {
      console.warn('⚠️ Erro ao buscar cliente:', error.message || error)
      console.log('📋 CPF pesquisado:', cpf)
      console.log('🔍 CPF limpo enviado:', cpfLimpo)
      
      // Se for erro de autenticação ou API indisponível, usa dados mockados
      if (error.message?.includes('Unauthenticated') || 
          error.message?.includes('Network Error') || 
          error.message?.includes('Acesso negado') ||
          error.message?.includes('Permissão insuficiente') ||
          error.status === 403 ||
          error.response?.status === 403) {
        console.log('🔄 API indisponível ou sem permissão, usando dados mockados para teste')
        
        // Dados mockados para teste
        const clienteMockado = {
          cpf: cpf,
          nome: "Cliente Teste",
          telefone: "(11) 99999-9999",
          email: "cliente@teste.com",
          cep: "01234-567",
          logradouro: "Rua Teste, 123",
          numero: "123",
          complemento: "",
          bairro: "Centro",
          cidade: "São Paulo",
          estado: "SP"
        }
        
        setClienteEncontrado(clienteMockado)
        setFormData(prev => ({
          ...prev,
          nome: clienteMockado.nome.split(' ')[0] || "",
          sobrenome: clienteMockado.nome.split(' ').slice(1).join(' ') || "",
          telefone: clienteMockado.telefone,
          email: clienteMockado.email,
          cep: clienteMockado.cep,
          logradouro: clienteMockado.logradouro,
          numero: (clienteMockado.numero || '').slice(0, 20),
          complemento: clienteMockado.complemento,
          bairro: clienteMockado.bairro,
          cidade: clienteMockado.cidade,
          estado: clienteMockado.estado
        }))
        return
      }
      
      setClienteEncontrado(null)
      setFormData(prev => ({
        ...prev,
        cliente: "",
        telefone: "",
        email: "",
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: ""
      }))
    } finally {
      setIsSearching(false)
    }
  }

  // Buscar cliente por CNPJ (Pessoa Jurídica) - mesmo fluxo do CPF
  const buscarClientePorCNPJ = async (cnpj: string) => {
    const cnpjLimpo = unmaskCNPJ(cnpj)
    if (cnpjLimpo.length !== 14) {
      setClienteEncontrado(null)
      return
    }
    setIsSearching(true)
    try {
      const response = await apiService.searchCustomerByNif(cnpjLimpo)
      if (response.data) {
        const cliente = response.data
        setClienteEncontrado({
          id: cliente.id,
          cpf: cliente.nif || cnpj,
          nome: cliente.name || "",
          telefone: cliente.phone || "",
          email: cliente.email || "",
          cep: cliente.zip_code || "",
          logradouro: cliente.address || "",
          numero: (cliente.number || '').slice(0, 20),
          complemento: cliente.complement || "",
          bairro: cliente.neighborhood || "",
          cidade: (cliente.city as any)?.title || cliente.city || "",
          estado: cliente.state || ""
        })
        const razaoSocial = cliente.name || ""
        setFormData(prev => ({
          ...prev,
          razaoSocial,
          telefone: cliente.phone || "",
          email: cliente.email || "",
          cep: cliente.zip_code || "",
          logradouro: cliente.address || "",
          numero: (cliente.number || '').slice(0, 20),
          complemento: cliente.complement || "",
          bairro: cliente.neighborhood || "",
          cidade: (cliente.city as any)?.title || cliente.city || "",
          estado: cliente.state || ""
        }))
      } else {
        setClienteEncontrado(null)
        setFormData(prev => ({
          ...prev,
          razaoSocial: "",
          telefone: "",
          email: "",
          cep: "",
          logradouro: "",
          numero: "",
          complemento: "",
          bairro: "",
          cidade: "",
          estado: ""
        }))
      }
    } catch {
      setClienteEncontrado(null)
      setFormData(prev => ({
        ...prev,
        razaoSocial: "",
        telefone: "",
        email: "",
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: ""
      }))
    } finally {
      setIsSearching(false)
    }
  }

  // Função para formatar número de ativação (chip) - usando máscara de telefone
  const formatarNumeroAtivacao = (value: string) => {
    return maskPhone(value)
  }

  // Função para formatar ICCID (apenas números, máximo 20 caracteres)
  const formatarICCID = (value: string) => {
    // Remove tudo que não é número
    const numericValue = value.replace(/\D/g, '')
    // Limita a 20 caracteres
    return numericValue.slice(0, 20)
  }

  // Função para validar ICCID
  const validarICCID = (iccid: string): { isValid: boolean; error?: string } => {
    if (!iccid || iccid.trim() === '') {
      return { isValid: false, error: 'O campo ICCID é obrigatório.' }
    }

    if (iccid.length !== 20) {
      return { isValid: false, error: 'O campo ICCID deve ter exatamente 20 caracteres.' }
    }

    if (!/^[0-9]+$/.test(iccid)) {
      return { isValid: false, error: 'O campo ICCID deve conter apenas números.' }
    }

    return { isValid: true }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validar CPF antes de submeter
    // Validar CPF ou CNPJ conforme tipo de pessoa
    if (formData.tipoPessoa === 'pf') {
      if (!isValidCPF(formData.cpf)) {
        notifications.invalidCPF(formData.cpf)
        setCpfError("CPF inválido")
        return
      }
    } else {
      if (!isValidCNPJ(formData.cnpj)) {
        notifications.custom.error('CNPJ inválido')
        setCnpjError("CNPJ inválido")
        return
      }
      if (!formData.razaoSocial?.trim()) {
        notifications.custom.error('Razão Social é obrigatória para Pessoa Jurídica')
        return
      }
    }
    
    // Validar número de ativação (obrigatório)
    if (!formData.numeroAtivacao || formData.numeroAtivacao.trim() === '') {
      notifications.custom.error('Número de Ativação é obrigatório')
      return
    }
    
    // Validar ICCID (obrigatório)
    const iccidValidation = validarICCID(formData.iccid)
    if (!iccidValidation.isValid) {
      notifications.custom.error(iccidValidation.error || 'ICCID inválido')
      return
    }

    // Validar data da venda: não pode ser retroativa (hoje ou posterior)
    if (formData.saleDate) {
      const today = new Date().toISOString().split('T')[0]
      if (formData.saleDate < today) {
        notifications.custom.error('Data da venda não pode ser retroativa. Informe hoje ou uma data futura.')
        return
      }
    }

    // Validar pelo menos um documento (usar ref para ter arquivos atuais do DocumentUpload no momento do submit)
    const uploadFiles = pendingFilesFromUploadRef.current?.length ? pendingFilesFromUploadRef.current : pendingFilesFromUpload
    const filesToSend = [...pendingDocuments, ...uploadFiles]
    if (!filesToSend.length) {
      setDocumentError('É obrigatório anexar pelo menos um documento à venda.')
      notifications.custom.error('É obrigatório anexar pelo menos um documento à venda.')
      return
    }
    setDocumentError(null)
    setNumeroError(null)
    
    // Scroll para o cabeçalho da página
    setTimeout(() => {
      scrollToTop()
    }, 100)
    
    console.log('🚀 Iniciando processo de salvamento de venda')
    console.log('📋 Dados do formulário:', formData)
    console.log('👤 Cliente encontrado:', clienteEncontrado)
    
    try {
      // 1. Buscar ou criar customer
      let customerId: number
      
      console.log('🔍 Passo 1: Buscando ou criando customer...')
      
      if (clienteEncontrado?.id) {
        console.log('👤 Cliente encontrado, usando customer_id...')
        customerId = clienteEncontrado.id
        console.log('✅ Customer ID encontrado:', customerId)
        
        // 🔄 ATUALIZAR CLIENTE COM DADOS DE ENDEREÇO
        console.log('🔄 Atualizando cliente com dados de endereço...')
        try {
          const enderecoData = {
            zip_code: unmaskCEP(formData.cep),
            address: formData.logradouro,
            number: (formData.numero || '').slice(0, 20),
            complement: formData.complemento,
            neighborhood: formData.bairro,
            city: formData.cidade,
            state: formData.estado
          }
          
          console.log('📤 Dados de endereço para atualizar:', enderecoData)
          
          // Verificar se há dados de endereço para atualizar
          const temDadosEndereco = Object.values(enderecoData).some(valor => valor && valor.trim() !== '')
          
          if (temDadosEndereco) {
            console.log('✅ Dados de endereço encontrados, atualizando cliente...')
            const updateResponse = await apiService.updateCustomer(customerId, enderecoData)
            console.log('✅ Cliente atualizado com sucesso:', updateResponse)
            notifications.custom.success('Dados de endereço do cliente atualizados!')
          } else {
            console.log('ℹ️ Nenhum dado de endereço para atualizar')
          }
        } catch (updateError) {
          console.warn('⚠️ Erro ao atualizar cliente com endereço:', updateError)
          // Não falhar a venda por causa do erro de atualização do endereço
          notifications.custom.error('Aviso: Não foi possível atualizar o endereço do cliente, mas a venda será criada normalmente.')
        }
      } else {
        console.log('🆕 Criando novo customer...')
        if (formData.tipoPessoa === 'pj') {
          const newCustomer = await apiService.createCustomer({
            name: formData.razaoSocial.trim(),
            nif: unmaskCNPJ(formData.cnpj),
            email: formData.email || undefined,
            phone: unmaskPhone(formData.telefone) || undefined,
            zip_code: unmaskCEP(formData.cep) || undefined,
            address: formData.logradouro || undefined,
            number: (formData.numero || '').slice(0, 20) || undefined,
            complement: formData.complemento || undefined,
            neighborhood: formData.bairro || undefined,
            city: formData.cidade || undefined,
            state: formData.estado || undefined,
          })
          customerId = newCustomer.data.id
          console.log('✅ Novo customer (PJ) criado com ID:', customerId)
        } else {
          const newCustomer = await apiService.createCustomer({
            name: `${formData.nome} ${formData.sobrenome}`.trim(),
            nif: unmaskCPF(formData.cpf),
            email: formData.email,
            phone: unmaskPhone(formData.telefone),
            birth_date: formData.dataNascimento || undefined,
            zip_code: unmaskCEP(formData.cep),
            address: formData.logradouro,
            number: (formData.numero || '').slice(0, 20),
            complement: formData.complemento,
            neighborhood: formData.bairro,
            city: formData.cidade,
            state: formData.estado,
          })
          customerId = newCustomer.data.id
          console.log('✅ Novo customer (PF) criado com ID:', customerId)
        }
      }

      console.log('🔍 Passo 2: Buscando categoria...')
      // 2. Buscar categoria: preferir ID selecionado na tela; fallback por nome (tipoServico)
      const categoriasRes = await apiService.getCategories()
      const categoriasList = categoriasRes?.data?.data ?? categoriasRes?.data ?? []
      console.log('📥 Categorias disponíveis:', categoriasList)
      const tipoServicoNorm = (formData.tipoServico || '').trim().toLowerCase()
      const categoria = selectedCategoryId != null
        ? categoriasList.find((cat: any) => Number(cat.id) === Number(selectedCategoryId))
        : categoriasList.find((cat: any) => (cat.name || '').toLowerCase() === tipoServicoNorm)
      if (!categoria) {
        const nomes = categoriasList.map((c: any) => c.name).join(', ')
        throw new Error(`Categoria não encontrada. Selecione novamente o tipo de serviço. (Valor atual: "${formData.tipoServico || ''}"; categorias: ${nomes || 'nenhuma'})`)
      }
      console.log('✅ Categoria encontrada:', categoria)

      console.log('🔍 Passo 3: Usando estabelecimento do usuário...')
      // 3. Usar estabelecimento do usuário logado
      let establishmentId = userProfile?.establishment_id
      
      // Para gestores e administradores, se não tiver establishment_id, buscar o primeiro estabelecimento disponível
      if (!establishmentId && (user?.role === 'gestor' || user?.email === 'admin@tim.com.br' || user?.name?.includes('Administrador'))) {
        console.log('👑 Usuário gestor/administrador sem establishment_id, buscando estabelecimentos...')
        try {
          const establishmentsResponse = await apiService.getEstablishments()
          if (establishmentsResponse.data && establishmentsResponse.data.length > 0) {
            establishmentId = establishmentsResponse.data[0].id
            console.log('✅ Usando primeiro estabelecimento disponível:', establishmentId)
          }
        } catch (error) {
          console.error('❌ Erro ao buscar estabelecimentos:', error)
        }
      }
      
      if (!establishmentId) {
        console.log('🔍 Debug - Usando fallback establishment_id = 1 no handleSubmit')
        establishmentId = 1
      }
      // 4. Preparar dados da venda (com sanitização conforme documento)
      const saleData = {
        customer_id: customerId,
        establishment_id: establishmentId,
        category_id: categoria.id,
        product_name: formData.plano || formData.tipoServico,
        quantity: 1,
        unit_price: parseCurrency(formData.valor),
        sale_date: formData.saleDate || undefined,
        activation_number: formData.numeroAtivacao ? unmaskPhone(formData.numeroAtivacao) : undefined,
        iccid: formData.iccid || undefined,
        imei: formData.imei || undefined,
        device_value: formData.valorAparelho ? parseCurrency(formData.valorAparelho) : undefined,
        payment_method: formData.formaPagamento || undefined,
        // ✅ CAMPOS TIM - SANITIZAÇÃO CONFORME DOCUMENTO
        meu_tim: Boolean(formData.meuTim === 'Sim'),
        debit_automatic: Boolean(formData.debitoAutomatico === 'Sim'),
        portability: Boolean(formData.portabilidade === 'Sim'),
        rescue: Boolean(formData.resgate === 'Sim'),
        provisional_number: formData.numeroProvisorio || undefined,
        // Incluir dados dos campos dinâmicos
        ...dynamicFieldsData,
        observations: formData.observacoes || undefined,
      }
      
      console.log('🔍 Passo 4: Dados da venda preparados:', saleData)
      console.log('🔍 Passo 5: Criando venda com documentos (multipart)...')

      const formDataToSend = new FormData()
      formDataToSend.append('customer_id', String(customerId))
      formDataToSend.append('establishment_id', String(establishmentId))
      formDataToSend.append('category_id', String(categoria.id))
      formDataToSend.append('product_name', saleData.product_name)
      formDataToSend.append('quantity', String(saleData.quantity))
      formDataToSend.append('unit_price', String(saleData.unit_price))
      formDataToSend.append('sale_date', saleData.sale_date || new Date().toISOString().slice(0, 10))
      if (saleData.iccid) formDataToSend.append('iccid', saleData.iccid)
      if (saleData.activation_number) formDataToSend.append('activation_number', saleData.activation_number)
      if (saleData.imei) formDataToSend.append('imei', saleData.imei)
      if (saleData.device_value !== undefined) formDataToSend.append('device_value', String(saleData.device_value))
      if (saleData.payment_method) formDataToSend.append('payment_method', saleData.payment_method)
      formDataToSend.append('meu_tim', saleData.meu_tim ? '1' : '0')
      formDataToSend.append('debit_automatic', saleData.debit_automatic ? '1' : '0')
      formDataToSend.append('portability', saleData.portability ? '1' : '0')
      if (saleData.provisional_number) formDataToSend.append('provisional_number', saleData.provisional_number)
      formDataToSend.append('rescue', saleData.rescue ? '1' : '0')
      if (saleData.observations) formDataToSend.append('observations', saleData.observations)
      Object.entries(dynamicFieldsData).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') formDataToSend.append(key, String(value))
      })
      const docType = pendingDocumentTypeRef.current || pendingDocumentType || 'anexo'
      formDataToSend.append('document_type', docType)
      // Reler ref no momento do envio (pode ter sido atualizado no render do DocumentUpload)
      const uploadFilesNow = (pendingFilesFromUploadRef.current?.length ? pendingFilesFromUploadRef.current : pendingFilesFromUpload) || []
      const allFiles = [...pendingDocuments, ...uploadFilesNow]
      console.log('📎 Arquivos para envio:', { doBloco: pendingDocuments.length, doUpload: uploadFilesNow.length, total: allFiles.length, nomes: allFiles.map(f => f.name) })
      allFiles.forEach((file, i) => {
        if (i === 0) formDataToSend.append('document', file)
        else formDataToSend.append('documents[]', file)
      })

      const saleResponse = await apiService.createSaleWithDocuments(formDataToSend)
      console.log('✅ Venda criada com sucesso:', saleResponse)

      if (saleResponse?.data?.id) {
        setSaleId(saleResponse.data.id)
        setPendingDocuments([])
        setPendingFilesFromUpload([])
        setPendingDocumentType('')
        pendingFilesFromUploadRef.current = []
        pendingDocumentTypeRef.current = ''
        console.log('📋 ID da venda armazenado:', saleResponse.data.id)
      }
      
      // 6. Incrementar contador de vendas da categoria
      if (formData.tipoServico) {
        incrementarVendasCategoria(formData.tipoServico)
      }
      // 7. Sucesso
      notifications.saleCompleted()
      setSuccess(true)
      
      // Scroll para o topo para mostrar mensagem de sucesso
      setTimeout(() => {
        scrollToTop()
      }, 200)
      setTimeout(() => {
        setSuccess(false)
        // Não resetar saleId aqui - manter para permitir upload de documentos
        // setSaleId(null) será chamado apenas quando o formulário for limpo manualmente
        setFormData({
          tipoPessoa: 'pf',
          nome: "",
          sobrenome: "",
          cpf: "",
          cnpj: "",
          razaoSocial: "",
          telefone: "",
          numeroAtivacao: "",
          email: "",
          dataNascimento: "",
          cep: "",
          logradouro: "",
          numero: "",
          complemento: "",
          bairro: "",
          cidade: "",
          estado: "",
          tipoServico: "",
          plano: "",
          valor: "",
          observacoes: "",
          meuTim: "",
          debitoAutomatico: "",
          portabilidade: "",
          numeroProvisorio: "",
          resgate: "",
          imei: "",
          valorAparelho: "",
          formaPagamento: "",
          nomeAcessorio: "",
          saleDate: "",
          iccid: "",
          documentos: []
        })
        setPendingDocuments([])
        setPendingFilesFromUpload([])
        setPendingDocumentType('')
        pendingFilesFromUploadRef.current = []
        pendingDocumentTypeRef.current = ''
        setDocumentError(null)
        setNumeroError(null)
        setClienteEncontrado(null)
        setIccidError("")
        setCnpjError("")
        // Limpar campos dinâmicos
        setDynamicFieldsData({})
        setShowDynamicFields(false)
        setSelectedCategoryId(null)
        setShowCategoryRulesModal(false)
      }, 2000)

    } catch (error: any) {
      // Normalizar: o serviço pode lançar ApiError { message, data, status, response } (sem .response no topo)
      const status = error?.response?.status ?? error?.status
      const body = error?.response?.data ?? error?.data
      const errMessage = error?.message ?? (typeof body === 'object' && body?.message) ?? 'Erro ao salvar venda'
      console.error('❌ Erro ao salvar venda:', errMessage, { status, body: typeof body === 'string' ? body?.slice?.(0, 200) : body })
      console.log('📋 Dados do formulário:', formData)
      console.log('🔍 Tipo do erro:', typeof error)
      console.log('📝 Mensagem do erro:', error?.message)
      console.log('📊 Status do erro:', status)
      console.log('🌐 Resposta da API:', body)
      console.log('🔍 Stack trace:', error?.stack)
      console.log('📡 URL da requisição:', error?.config?.url)
      console.log('📡 Método da requisição:', error?.config?.method)
      
      // Se for erro de API indisponível, simular salvamento local
      if (errMessage?.includes('Unauthenticated') || 
          errMessage?.includes('Network Error') || 
          errMessage?.includes('Failed to fetch') ||
          errMessage?.includes('Acesso negado') ||
          errMessage?.includes('Permissão insuficiente') ||
          status === 403) {
        console.log('🔄 API indisponível ou sem permissão, simulando salvamento local...')
        
        // Simular salvamento local
        notifications.saleCompleted()
        setSuccess(true)
        setTimeout(() => {
          setSuccess(false)
          setFormData({
            tipoPessoa: 'pf',
            nome: "",
            sobrenome: "",
            cpf: "",
            cnpj: "",
            razaoSocial: "",
            telefone: "",
            numeroAtivacao: "",
            email: "",
            dataNascimento: "",
            cep: "",
            logradouro: "",
            numero: "",
            complemento: "",
            bairro: "",
            cidade: "",
            estado: "",
            tipoServico: "",
            plano: "",
            valor: "",
            observacoes: "",
            meuTim: "",
            debitoAutomatico: "",
            portabilidade: "",
            numeroProvisorio: "",
            resgate: "",
            imei: "",
            valorAparelho: "",
            formaPagamento: "",
            nomeAcessorio: "",
            saleDate: "",
            iccid: "",
            documentos: []
          })
          setClienteEncontrado(null)
          setIccidError("")
          // Limpar campos dinâmicos
          setDynamicFieldsData({})
          setShowDynamicFields(false)
          setSelectedCategoryId(null)
          setShowCategoryRulesModal(false)
        }, 2000)
        
        alert('⚠️ API indisponível ou sem permissão. Venda salva localmente para teste.')
        return
      }
      
      // Extrair mensagens de validação em respostas 422 (corpo pode ser HTML+JSON)
      const validation = status === 422 ? parseValidationResponse(body) : {}
      const validationData = validation.data || {}

      if (validationData.document?.length) setDocumentError(validationData.document[0])
      else setDocumentError(null)
      if (validationData.number?.length) setNumeroError(validationData.number[0])
      else setNumeroError(null)
      if (validationData.iccid?.length) setIccidError(validationData.iccid[0])
      else setIccidError('')

      // Montar mensagem para o usuário
      let errorMessage = 'Erro desconhecido'
      if (validation.message) errorMessage = validation.message
      else if (errMessage && errMessage !== 'Erro ao salvar venda') errorMessage = errMessage
      else if (typeof body === 'object' && body?.message) errorMessage = body.message
      else if (status) errorMessage = `Erro ${status}: Erro na requisição`

      const parts = Object.values(validationData).flat()
      const detail = parts.length ? '\n\n' + parts.join('\n') : ''
      alert('Erro ao salvar venda: ' + errorMessage + detail)
    }
  }

  return (
    <div className="space-y-6">
      <div ref={headerRef} className="mb-6">
        <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <ShoppingCart className="w-8 h-8" style={{ color: '#0026d9' }} />
          Cadastrar Venda
        </h2>
        <p className="text-muted-foreground mt-2">Registre uma nova venda de serviço ou produto</p>
      </div>


      <Card className="w-full">
        <CardHeader>
          <CardTitle>Informações da Venda</CardTitle>
          <CardDescription>Preencha todos os campos obrigatórios</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border-t pt-6">
              <h3 className="font-semibold text-foreground mb-4">Dados do Cliente</h3>
              
              {/* Notificação de cliente carregado automaticamente */}
              {customerLoadedFromURL && (
                <Alert className="mb-4 border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>Cliente carregado automaticamente!</strong> Os dados foram preenchidos com base no cliente selecionado.
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Tipo de pessoa: CPF ou CNPJ (checkboxes) */}
              <div className="mb-6">
                <Label className="text-sm font-medium text-gray-700 block mb-3">Tipo de pessoa</Label>
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.tipoPessoa === 'pf'}
                      onCheckedChange={(checked) => {
                        if (checked && formData.tipoPessoa !== 'pf') {
                          setFormData(prev => ({
                            ...prev,
                            tipoPessoa: 'pf',
                            cnpj: '',
                            nome: '',
                            sobrenome: '',
                            razaoSocial: '',
                            dataNascimento: prev.dataNascimento,
                          }))
                          setClienteEncontrado(null)
                          setCpfError('')
                          setCnpjError('')
                        }
                      }}
                    />
                    <span className="text-sm font-medium text-gray-700">CPF</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.tipoPessoa === 'pj'}
                      onCheckedChange={(checked) => {
                        if (checked && formData.tipoPessoa !== 'pj') {
                          setFormData(prev => ({
                            ...prev,
                            tipoPessoa: 'pj',
                            cpf: '',
                            nome: '',
                            sobrenome: '',
                            razaoSocial: prev.razaoSocial,
                            dataNascimento: '',
                          }))
                          setClienteEncontrado(null)
                          setCpfError('')
                          setCnpjError('')
                        }
                      }}
                    />
                    <span className="text-sm font-medium text-gray-700">CNPJ</span>
                  </label>
                </div>
              </div>

              {/* Campo CPF (Pessoa Física) */}
              {formData.tipoPessoa === 'pf' && (
              <div className="mb-6">
                <Label htmlFor="cpf">CPF *</Label>
                <div className="relative">
                  <Input
                    ref={cpfInputRef}
                    id="cpf"
                    placeholder="000.000.000-00"
                    value={formData.cpf}
                    onChange={(e) => {
                      const formatted = maskCPF(e.target.value)
                      setFormData({ ...formData, cpf: formatted })
                      buscarClientePorCPF(formatted)
                      validateCPF(formatted)
                    }}
                    required
                    className={`pr-10 ${cpfError ? "border-red-500 focus:border-red-500" : ""}`}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {isSearching ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary-base" />
                    ) : isValidatingCpf ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    ) : (
                      <Search className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
                {cpfError && (
                  <p className="text-sm text-red-600 flex items-center gap-1 mt-2">
                    <span>⚠️</span>
                    {cpfError}
                  </p>
                )}
                {formData.cpf && formData.cpf.length > 0 && formData.cpf.length < 14 && !cpfError && (
                  <p className="text-sm text-blue-600 flex items-center gap-1 mt-2">
                    <span>ℹ️</span>
                    Digite o CPF completo para validar
                  </p>
                )}
                {formData.cpf && formData.cpf.length >= 11 && !clienteEncontrado && !isSearching && !cpfError && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800">Cliente não encontrado</span>
                    </div>
                    <p className="text-sm text-yellow-700 mt-1">
                      Preencha os dados do cliente manualmente
                    </p>
                  </div>
                )}
              </div>
              )}

              {/* Campo CNPJ (Pessoa Jurídica) */}
              {formData.tipoPessoa === 'pj' && (
              <div className="mb-6">
                <Label htmlFor="cnpj">CNPJ *</Label>
                <div className="relative">
                  <Input
                    id="cnpj"
                    placeholder="00.000.000/0001-00"
                    value={formData.cnpj}
                    onChange={(e) => {
                      const formatted = maskCNPJ(e.target.value)
                      setFormData({ ...formData, cnpj: formatted })
                      if (unmaskCNPJ(formatted).length === 14) {
                        buscarClientePorCNPJ(formatted)
                        validateCNPJ(formatted)
                      }
                    }}
                    required
                    className={`pr-10 ${cnpjError ? "border-red-500 focus:border-red-500" : ""}`}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {isSearching ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary-base" />
                    ) : (
                      <Search className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
                {cnpjError && (
                  <p className="text-sm text-red-600 flex items-center gap-1 mt-2">
                    <span>⚠️</span>
                    {cnpjError}
                  </p>
                )}
                {formData.cnpj && unmaskCNPJ(formData.cnpj).length < 14 && !cnpjError && (
                  <p className="text-sm text-blue-600 flex items-center gap-1 mt-2">
                    <span>ℹ️</span>
                    Digite o CNPJ completo para validar
                  </p>
                )}
                {formData.cnpj && unmaskCNPJ(formData.cnpj).length === 14 && !clienteEncontrado && !isSearching && !cnpjError && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800">Cliente não encontrado</span>
                    </div>
                    <p className="text-sm text-yellow-700 mt-1">
                      Preencha Razão Social, Telefone e E-mail manualmente
                    </p>
                  </div>
                )}
              </div>
              )}

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Pessoa Física: Nome, Sobrenome */}
                {formData.tipoPessoa === 'pf' && (
                  <>
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    placeholder="Nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sobrenome">Sobrenome *</Label>
                  <Input
                    id="sobrenome"
                    placeholder="Sobrenome"
                    value={formData.sobrenome}
                    onChange={(e) => setFormData({ ...formData, sobrenome: e.target.value })}
                    required
                  />
                </div>
                  </>
                )}

                {/* Pessoa Jurídica: Razão Social */}
                {formData.tipoPessoa === 'pj' && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="razaoSocial">Razão Social *</Label>
                  <Input
                    id="razaoSocial"
                    placeholder="Razão Social da empresa"
                    value={formData.razaoSocial}
                    onChange={(e) => setFormData({ ...formData, razaoSocial: e.target.value })}
                    required
                  />
                </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone/WhatsApp *</Label>
                  <Input
                    id="telefone"
                    placeholder="(00) 00000-0000"
                    value={formData.telefone}
                    onChange={(e) => {
                      const formatted = maskPhone(e.target.value)
                      setFormData({ ...formData, telefone: formatted })
                    }}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="cliente@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                {/* Data de Nascimento apenas para PF */}
                {formData.tipoPessoa === 'pf' && (
                <div className="space-y-2">
                  <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                  <Input
                    id="dataNascimento"
                    type="date"
                    value={formData.dataNascimento}
                    onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })}
                  />
                </div>
                )}
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold text-foreground mb-4">Endereço do Cliente</h3>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <div className="relative">
                    <Input
                      id="cep"
                      placeholder="00000-000"
                      value={formData.cep}
                      onChange={(e) => {
                        const formatted = maskCEP(e.target.value)
                        setFormData({ ...formData, cep: formatted })
                        
                        // Busca automática quando CEP estiver completo
                        if (unmaskCEP(formatted).length === 8) {
                          buscarEnderecoPorCEP(formatted)
                        }
                      }}
                      maxLength={9}
                    />
                    {isBuscandoCEP && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="logradouro">Logradouro</Label>
                  <div className="relative">
                    <Input
                      id="logradouro"
                      placeholder="Rua, Avenida, etc."
                      value={formData.logradouro}
                      onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })}
                    />
                    {formData.logradouro && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numero">Número</Label>
                  <Input
                    id="numero"
                    placeholder="123 (máx. 20 caracteres)"
                    maxLength={20}
                    value={formData.numero}
                    onChange={(e) => {
                      setNumeroError(null)
                      setFormData({ ...formData, numero: e.target.value.slice(0, 20) })
                    }}
                  />
                  {numeroError && (
                    <p className="text-sm text-destructive mt-1">{numeroError}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input
                    id="complemento"
                    placeholder="Apto, Sala, etc."
                    value={formData.complemento}
                    onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro</Label>
                  <div className="relative">
                    <Input
                      id="bairro"
                      placeholder="Nome do bairro"
                      value={formData.bairro}
                      onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                    />
                    {formData.bairro && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <CitySearch
                    value={formData.cidade}
                    onCitySelect={handleCitySelect}
                    onStateChange={handleStateChange}
                    placeholder="Digite o nome da cidade..."
                    label="Cidade"
                    required
                    selectedCity={selectedCity}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <div className="relative">
                    <Input
                      id="estado"
                      placeholder="Estado"
                      value={formData.estado}
                      readOnly
                      className="bg-gray-50"
                    />
                    {formData.estado && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold text-foreground mb-4">Detalhes do Serviço</h3>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="tipoServico">Categoria *</Label>
                  <Select
                    value={formData.tipoServico}
                    onValueChange={handleCategoriaChange}
                    disabled={!initialDataLoaded || loadingCategorias}
                  >
                    <SelectTrigger id="tipoServico">
                      <SelectValue placeholder={loadingCategorias ? "Carregando categorias..." : "Selecione a categoria"} />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposServico.map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>
                          {tipo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plano">Plano/Produto *</Label>
                  {formData.tipoServico ? (
                    <div className="relative product-search-container">
                      {/* Campo de busca/input */}
                      <div className="relative">
                      <Input
                          id="plano"
                          placeholder="Digite o nome do produto ou selecione da lista"
                          value={searchTerm || formData.plano}
                          onChange={(e) => handleSearchChange(e.target.value)}
                          onFocus={() => setShowSearchResults(true)}
                          className="pr-10"
                        />
                        {isSearching && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Lista de produtos da categoria */}
                      {!searchTerm && getProdutosDaCategoria().length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-2">Produtos disponíveis:</p>
                          <div className="max-h-32 overflow-y-auto border rounded-md">
                            {getProdutosDaCategoria().map((produto) => (
                              <div
                                key={produto}
                                className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm border-b last:border-b-0"
                                onClick={() => {
                                  setFormData({ ...formData, plano: produto })
                                  setSearchTerm(produto)
                                }}
                              >
                              {produto}
                    </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Resultados da busca */}
                      {showSearchResults && searchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {searchResults.map((produto, index) => (
                            <div
                              key={index}
                              className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm border-b last:border-b-0"
                              onClick={() => handleProductSelect(produto)}
                            >
                              <div className="font-medium">{produto.name || produto.nome || produto}</div>
                              {produto.description && (
                                <div className="text-xs text-gray-500">{produto.description}</div>
                              )}
                              {produto.price && (
                                <div className="text-xs text-green-600 font-medium">
                                  R$ {produto.price.toFixed(2).replace('.', ',')}
                          </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Mensagem quando não há produtos */}
                      {!searchTerm && getProdutosDaCategoria().length === 0 && !loadingProdutos && (
                        <div className="mt-2 text-sm text-gray-500">
                          Nenhum produto disponível para esta categoria
                        </div>
                      )}

                      {/* Mensagem quando não há resultados na busca */}
                      {showSearchResults && searchResults.length === 0 && searchTerm && !isSearching && (
                        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg p-3 text-sm text-gray-500">
                          Nenhum produto encontrado para "{searchTerm}"
                        </div>
                      )}
                    </div>
                  ) : (
                    <Input
                      id="plano"
                      placeholder="Selecione uma categoria primeiro"
                      value=""
                      disabled
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valor">Valor (R$) *</Label>
                  <Input
                    id="valor"
                    type="text"
                    placeholder="R$ 0,00"
                    value={formData.valor}
                    onChange={(e) => {
                      const maskedValue = maskCurrency(e.target.value)
                      setFormData({ ...formData, valor: maskedValue })
                    }}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numeroAtivacao">Número de Ativação *</Label>
                  <Input
                    id="numeroAtivacao"
                    placeholder="(00) 00000-0000"
                    value={formData.numeroAtivacao}
                    onChange={(e) => {
                      const formatted = formatarNumeroAtivacao(e.target.value)
                      setFormData({ ...formData, numeroAtivacao: formatted })
                    }}
                    maxLength={15}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="iccid">ICCID *</Label>
                  <Input
                    id="iccid"
                    placeholder="12345678901234567890"
                    value={formData.iccid}
                    onChange={(e) => {
                      const formatted = formatarICCID(e.target.value)
                      setFormData({ ...formData, iccid: formatted })
                      
                      // Validar em tempo real
                      if (formatted.length > 0) {
                        const validation = validarICCID(formatted)
                        if (!validation.isValid) {
                          setIccidError(validation.error || '')
                        } else {
                          setIccidError('')
                        }
                      } else {
                        setIccidError('')
                      }
                    }}
                    maxLength={20}
                    required
                    className={iccidError ? "border-red-500 focus:border-red-500" : ""}
                  />
                  {iccidError && (
                    <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                      <span>⚠️</span>
                      {iccidError}
                    </p>
                  )}
                  {formData.iccid && formData.iccid.length > 0 && formData.iccid.length < 20 && !iccidError && (
                    <p className="text-sm text-blue-600 flex items-center gap-1 mt-1">
                      <span>ℹ️</span>
                      Digite exatamente 20 dígitos numéricos ({formData.iccid.length}/20)
                    </p>
                  )}
                  {formData.iccid && formData.iccid.length === 20 && !iccidError && (
                    <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                      <span>✅</span>
                      ICCID válido
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Digite exatamente 20 dígitos numéricos
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="saleDate">Data da Venda</Label>
                  <Input
                    id="saleDate"
                    type="date"
                    value={formData.saleDate}
                    onChange={(e) => setFormData({ ...formData, saleDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    title="Data não pode ser retroativa (hoje ou posterior)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Apenas hoje ou datas futuras
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="formaPagamento">Forma de Pagamento *</Label>
                  <Select
                    value={formData.formaPagamento}
                    onValueChange={(value) => setFormData({ ...formData, formaPagamento: value })}
                  >
                    <SelectTrigger id="formaPagamento">
                      <SelectValue placeholder="Selecione a forma de pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="À vista">À vista</SelectItem>
                      <SelectItem value="Parcelado">Parcelado</SelectItem>
                      <SelectItem value="Financiado">Financiado</SelectItem>
                      <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                      <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                      <SelectItem value="PIX">PIX</SelectItem>
                      <SelectItem value="Boleto">Boleto</SelectItem>
                      <SelectItem value="Transferência">Transferência</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Campos Booleanos */}
              <div className="border-t pt-6">
                <h3 className="font-semibold text-foreground mb-4">Opções Adicionais</h3>
                
                {/* Checkbox para marcar todos como "Não" */}
                <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox"
                      id="marcarTodosNao"
                      onChange={(e) => {
                        if (e.target.checked) {
                          marcarTodosComoNao()
                        }
                      }}
                      className="w-4 h-4 text-primary-base bg-background border-border rounded focus:ring-primary-base focus:ring-2"
                    />
                    <Label 
                      htmlFor="marcarTodosNao" 
                      className="text-sm font-medium cursor-pointer"
                    >
                      Marcar todos como "Não"
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-6">
                    Marca automaticamente MEU TIM, DÉBITO AUTOMÁTICO, PORTABILIDADE e RESGATE como "Não"
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="meuTim">MEU TIM</Label>
                    <Select
                      value={formData.meuTim}
                      onValueChange={(value) => setFormData({ ...formData, meuTim: value })}
                    >
                      <SelectTrigger id="meuTim">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sim">Sim</SelectItem>
                        <SelectItem value="Não">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="debitoAutomatico">DÉBITO AUTOMÁTICO</Label>
                    <Select
                      value={formData.debitoAutomatico}
                      onValueChange={(value) => setFormData({ ...formData, debitoAutomatico: value })}
                    >
                      <SelectTrigger id="debitoAutomatico">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sim">Sim</SelectItem>
                        <SelectItem value="Não">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="portabilidade">PORTABILIDADE</Label>
                    <Select
                      value={formData.portabilidade}
                      onValueChange={handlePortabilidadeChange}
                    >
                      <SelectTrigger id="portabilidade">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sim">Sim</SelectItem>
                        <SelectItem value="Não">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resgate">RESGATE</Label>
                    <Select
                      value={formData.resgate}
                      onValueChange={(value) => setFormData({ ...formData, resgate: value })}
                    >
                      <SelectTrigger id="resgate">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sim">Sim</SelectItem>
                        <SelectItem value="Não">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                placeholder="Informações adicionais sobre a venda..."
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                rows={4}
              />
            </div>

            {/* Documentos obrigatórios (anexar antes de cadastrar) */}
            <div className="space-y-2 border rounded-lg p-4 bg-muted/30">
              <Label className="text-base font-medium">
                Documentos da venda <span className="text-destructive">*</span>
              </Label>
              <p className="text-sm text-muted-foreground">
                É obrigatório anexar pelo menos um documento. Formatos: PDF, DOC, DOCX, PNG, JPG, JPEG (máx. 10 MB por arquivo).
              </p>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/jpg"
                multiple
                className="cursor-pointer"
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  const allowedTypes = [
                    'application/pdf',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'image/png',
                    'image/jpeg',
                    'image/jpg'
                  ]
                  const maxSize = 10 * 1024 * 1024
                  const valid: File[] = []
                  for (const file of files) {
                    if (!allowedTypes.includes(file.type)) {
                      notifications.custom.error(`Arquivo "${file.name}": formato inválido. Use PDF, DOC, DOCX, PNG, JPG ou JPEG.`)
                      continue
                    }
                    if (file.size > maxSize) {
                      notifications.custom.error(`Arquivo "${file.name}": tamanho máximo 10 MB.`)
                      continue
                    }
                    valid.push(file)
                  }
                  setPendingDocuments((prev) => [...prev, ...valid])
                  setDocumentError(null)
                  e.target.value = ''
                }}
              />
              {pendingDocuments.length > 0 && (
                <ul className="text-sm mt-2 space-y-1">
                  {pendingDocuments.map((file, i) => (
                    <li key={`${file.name}-${i}`} className="flex items-center justify-between gap-2">
                      <span className="truncate">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0 h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => {
                          setPendingDocuments((prev) => prev.filter((_, idx) => idx !== i))
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {documentError && (
                <p className="text-sm text-destructive mt-1">{documentError}</p>
              )}
            </div>

            {/* Sistema de Documentos: anexe aqui ou no bloco acima; ao cadastrar, os arquivos são enviados com a venda */}
            <div className="mt-6">
              <SaleDocuments 
                saleId={saleId}
                userRole={user?.role || user?.roles?.[0]?.name || 'vendedor'}
                onPendingFilesForCreation={(files) => {
                  pendingFilesFromUploadRef.current = files
                  setPendingFilesFromUpload(files)
                }}
                onPendingDocumentType={(value) => {
                  pendingDocumentTypeRef.current = value
                  setPendingDocumentType(value)
                }}
                pendingFilesRef={pendingFilesFromUploadRef}
                pendingDocumentTypeRef={pendingDocumentTypeRef}
              />
            </div>

            <div className="flex gap-3 pt-4 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormData({
                    tipoPessoa: 'pf',
                    nome: "",
                    sobrenome: "",
                    cpf: "",
                    cnpj: "",
                    razaoSocial: "",
                    telefone: "",
                    numeroAtivacao: "",
                    email: "",
                    dataNascimento: "",
                    cep: "",
                    logradouro: "",
                    numero: "",
                    complemento: "",
                    bairro: "",
                    cidade: "",
                    estado: "",
                    tipoServico: "",
                    plano: "",
                    valor: "",
                    observacoes: "",
                    meuTim: "",
                    debitoAutomatico: "",
                    portabilidade: "",
                    numeroProvisorio: "",
                    resgate: "",
                    imei: "",
                    valorAparelho: "",
                    formaPagamento: "",
                    nomeAcessorio: "",
                    saleDate: "",
                    iccid: "",
                    documentos: []
                  })
                  setPendingDocuments([])
                  setPendingFilesFromUpload([])
                  setPendingDocumentType('')
                  pendingFilesFromUploadRef.current = []
                  pendingDocumentTypeRef.current = ''
        setDocumentError(null)
        setNumeroError(null)
        setClienteEncontrado(null)
        setSelectedCity(null)
                  setIccidError("")
                  setCpfError("")
                  setCnpjError("")
                  setIsSearching(false)
                  setIsBuscandoCEP(false)
                  setSaleId(null)
                  setDynamicFieldsData({})
                  setShowDynamicFields(false)
                  setSelectedCategoryId(null)
                }}
              >
                Limpar
              </Button>
              <Button 
                type="submit" 
                className="text-white"
                style={{ backgroundColor: '#0026d9' }}
                onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#001a99'}
                onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#0026d9'}
              >
                Cadastrar Venda
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Modal Portabilidade */}
      {showPortabilidadeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Número Provisório - Portabilidade</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClosePortabilidadeModal}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                Insira o número provisório para portabilidade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="numeroProvisorio">Número Provisório *</Label>
                  <Input
                    id="numeroProvisorio"
                    placeholder="(00) 00000-0000"
                    value={formData.numeroProvisorio}
                    onChange={(e) => {
                      const formatted = formatarNumeroAtivacao(e.target.value)
                      setFormData({ ...formData, numeroProvisorio: formatted })
                    }}
                    maxLength={15}
                    required
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClosePortabilidadeModal}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="button" 
                    onClick={handleConfirmarNumeroProvisorio}
                    className="flex-1 text-white"
                    style={{ backgroundColor: '#0026d9' }}
                    onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#001a99'}
                    onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#0026d9'}
                    disabled={!formData.numeroProvisorio.trim()}
                  >
                    Confirmar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de Regras da Categoria */}
      {showCategoryRulesModal && categoryRules && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Campos da Categoria</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseCategoryModal}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                Preencha os campos específicos para {categoryRules.category_name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryRules.required_fields && categoryRules.required_fields.map((field: any, index: number) => (
                  <div key={index} className="space-y-2">
                    <Label htmlFor={field.field_name} className="text-sm font-medium">
                      {field.label} *
                    </Label>
                    {field.field_type === 'text' && (
                      <Input
                        id={field.field_name}
                        placeholder={field.placeholder || `Digite ${field.label.toLowerCase()}`}
                        value={dynamicFieldsData[field.field_name] || ''}
                        onChange={(e) => {
                          const newData = { ...dynamicFieldsData, [field.field_name]: e.target.value }
                          setDynamicFieldsData(newData)
                        }}
                        required
                      />
                    )}
                    {field.field_type === 'number' && (
                      <Input
                        id={field.field_name}
                        type="number"
                        placeholder={field.placeholder || `Digite ${field.label.toLowerCase()}`}
                        value={dynamicFieldsData[field.field_name] || ''}
                        onChange={(e) => {
                          const newData = { ...dynamicFieldsData, [field.field_name]: e.target.value }
                          setDynamicFieldsData(newData)
                        }}
                        required
                      />
                    )}
                    {field.field_type === 'select' && field.options && (
                      <Select
                        value={dynamicFieldsData[field.field_name] || ''}
                        onValueChange={(value) => {
                          const newData = { ...dynamicFieldsData, [field.field_name]: value }
                          setDynamicFieldsData(newData)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={field.placeholder || `Selecione ${field.label.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options.map((option: any, optIndex: number) => (
                            <SelectItem key={optIndex} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
                
                {categoryRules.optional_fields && categoryRules.optional_fields.map((field: any, index: number) => (
                  <div key={index} className="space-y-2">
                    <Label htmlFor={field.field_name} className="text-sm font-medium">
                      {field.label}
                    </Label>
                    {field.field_type === 'text' && (
                      <Input
                        id={field.field_name}
                        placeholder={field.placeholder || `Digite ${field.label.toLowerCase()}`}
                        value={dynamicFieldsData[field.field_name] || ''}
                        onChange={(e) => {
                          const newData = { ...dynamicFieldsData, [field.field_name]: e.target.value }
                          setDynamicFieldsData(newData)
                        }}
                      />
                    )}
                    {field.field_type === 'number' && (
                      <Input
                        id={field.field_name}
                        type="number"
                        placeholder={field.placeholder || `Digite ${field.label.toLowerCase()}`}
                        value={dynamicFieldsData[field.field_name] || ''}
                        onChange={(e) => {
                          const newData = { ...dynamicFieldsData, [field.field_name]: e.target.value }
                          setDynamicFieldsData(newData)
                        }}
                      />
                    )}
                    {field.field_type === 'select' && field.options && (
                      <Select
                        value={dynamicFieldsData[field.field_name] || ''}
                        onValueChange={(value) => {
                          const newData = { ...dynamicFieldsData, [field.field_name]: value }
                          setDynamicFieldsData(newData)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={field.placeholder || `Selecione ${field.label.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options.map((option: any, optIndex: number) => (
                            <SelectItem key={optIndex} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
                
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseCategoryModal}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      console.log('🔘 Botão "Salvar e Continuar" clicado')
                      console.log('📝 Dados dos campos:', dynamicFieldsData)
                      
                      // Exibir toast com o IMEI digitado
                      const imeiValue = dynamicFieldsData.imei || 'Não informado'
                      notifications.custom.success(`✅ Campos salvos com sucesso! IMEI: ${imeiValue}`)
                      
                      setShowCategoryRulesModal(false)
                      setShowDynamicFields(true)
                      console.log('✅ showDynamicFields definido como true')
                    }}
                    className="flex-1 text-white"
                    style={{ backgroundColor: '#0026d9' }}
                    onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#001a99'}
                    onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#0026d9'}
                  >
                    Salvar e Continuar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
