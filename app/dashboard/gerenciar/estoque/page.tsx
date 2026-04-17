"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Package, Plus, AlertTriangle, CheckCircle2, AlertCircle, Upload, FileSpreadsheet, Download, Eye, Edit, Trash2, X, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getCategoriasAtivas, getCategoriasVendas, CategoriaVenda } from "@/lib/categorias"
import { apiService, Product } from "@/lib/api"
import * as XLSX from 'xlsx'
import { PanelGridCardsSkeleton, PanelPageHeaderSkeleton, PanelTableSkeleton } from "@/components/dashboard/panel-content-skeleton"

// Interface para compatibilidade com o sistema antigo
interface ProdutoEstoque {
  id: number
  produto: string
  categoria: string
  quantidade: number
  minimo: number
  loja: string
  preco?: number
  codigo?: string
  descricao?: string
}

// Interface para estabelecimentos
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
  is_active: boolean
}


export default function EstoquePage() {
  const [estoque, setEstoque] = useState<ProdutoEstoque[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [categoriasDisponiveis, setCategoriasDisponiveis] = useState<string[]>([])
  const [loadingCategorias, setLoadingCategorias] = useState(true)
  
  // Estados para estabelecimentos
  const [estabelecimentos, setEstabelecimentos] = useState<Establishment[]>([])
  const [loadingEstabelecimentos, setLoadingEstabelecimentos] = useState(true)
  const [lojaSelecionada, setLojaSelecionada] = useState<string>("todas")
  
  // Estados para filtros
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>("todas")
  const [termoBusca, setTermoBusca] = useState<string>("")
  
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalItems, setTotalItems] = useState(0)
  // Estados para importação
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importSuccess, setImportSuccess] = useState(false)
  const [importError, setImportError] = useState("")
  const [importCategory, setImportCategory] = useState("")
  
  // Estados para visualizar, editar e excluir
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProdutoEstoque | null>(null)
  
  const [formData, setFormData] = useState({
    produto: "",
    categoria: "",
    quantidade: "",
    minimo: "",
    loja: "",
    descricao: "",
    preco: "",
    codigo: ""
  })
  
  // Estados para validação de SKU
  const [skuError, setSkuError] = useState("")
  const [isValidatingSku, setIsValidatingSku] = useState(false)
  
  // Ref para debounce da busca
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // useEffect para busca em tempo real com debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (termoBusca.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        console.log('🔍 Busca automática por:', termoBusca)
        aplicarFiltros()
      }, 500) // Debounce de 500ms
    } else if (termoBusca === "") {
      // Se o campo foi limpo, aplicar filtros imediatamente
      aplicarFiltros()
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [termoBusca])

  // Função para validar SKU em tempo real
  const validateSku = async (sku: string) => {
    if (!sku.trim()) {
      setSkuError("")
      return
    }

    setIsValidatingSku(true)
    setSkuError("")

    try {
      // Verificar se o SKU já existe na lista local
      const skuExists = estoque.some(produto => 
        produto.codigo?.toLowerCase() === sku.toLowerCase()
      )
      
      if (skuExists) {
        setSkuError("⚠️ Este SKU já está cadastrado no sistema")
        return
      }

      // Se não encontrou localmente, fazer uma verificação na API
      // (opcional - pode ser implementado se houver endpoint específico)
      
    } catch (error) {
      console.error('Erro ao validar SKU:', error)
    } finally {
      setIsValidatingSku(false)
    }
  }

  // Função para limpar filtros e recarregar todos os produtos
  const limparFiltros = async () => {
    try {
      setLoading(true)
      setCategoriaSelecionada("todas")
      setTermoBusca("")
      setLojaSelecionada("todas")
      
      // Recarregar todos os produtos da API
      console.log('🔄 Limpando filtros e recarregando todos os produtos...')
      
      const firstResponse = await apiService.getProducts({ page: 1 })
      const totalPages = firstResponse.data?.last_page || 1
      
      let allProducts: any[] = []
      
      for (let page = 1; page <= totalPages; page++) {
        const response = await apiService.getProducts({ page })
        const products = response.data.data || response.data
        allProducts = [...allProducts, ...products]
      }
      
      const produtosEstoque: ProdutoEstoque[] = allProducts.map((product: any) => ({
        id: product.id,
        produto: product.name,
        categoria: product.category?.name || 'Sem categoria',
        quantidade: product.stock_quantity || 0,
        minimo: product.minimum_stock || 0,
        loja: product.establishment?.name || 'Sem estabelecimento',
        preco: product.price || 0,
        codigo: product.sku || '',
        descricao: product.description || ''
      }))
      
      setEstoque(produtosEstoque)
      setTotalItems(produtosEstoque.length)
      setCurrentPage(1)
      
      console.log('✅ Todos os produtos recarregados:', produtosEstoque.length)
    } catch (error) {
      console.error('❌ Erro ao limpar filtros:', error)
      setError('Erro ao recarregar produtos')
    } finally {
      setLoading(false)
    }
  }

  // Função para aplicar filtros
  const aplicarFiltros = async () => {
    try {
      setLoading(true)
      

      console.log('🔍 Aplicando filtros:', {
        loja: lojaSelecionada,
        categoria: categoriaSelecionada,
        busca: termoBusca
      })

      // Buscar produtos do estabelecimento selecionado ou todos os produtos
      let produtosFiltrados: ProdutoEstoque[] = []
      
      if (lojaSelecionada && lojaSelecionada !== "todas") {
        // Buscar produtos de uma loja específica
      const response = await apiService.getProducts({ establishment_id: parseInt(lojaSelecionada) })
      
      if (response && response.data && response.data.data) {
          produtosFiltrados = response.data.data.map((produto: Product) => ({
          id: produto.id,
          produto: produto.name,
          categoria: produto.category?.name || 'Sem categoria',
          quantidade: produto.stock_quantity || 0,
          minimo: produto.minimum_stock || 0,
          loja: estabelecimentos.find(est => est.id.toString() === lojaSelecionada)?.name || 'Loja não encontrada',
          preco: produto.price || 0,
          codigo: produto.sku || '',
          descricao: produto.description || ''
        }))
        }
      } else {
        // Se não há loja selecionada, buscar todos os produtos de todas as páginas
        const firstResponse = await apiService.getProducts({ page: 1 })
        const totalPages = firstResponse.data?.last_page || 1
        
        let allProducts: any[] = []
        
        for (let page = 1; page <= totalPages; page++) {
          const response = await apiService.getProducts({ page })
          const products = response.data.data || response.data
          allProducts = [...allProducts, ...products]
        }
        
        produtosFiltrados = allProducts.map((product: any) => ({
          id: product.id,
          produto: product.name,
          categoria: product.category?.name || 'Sem categoria',
          quantidade: product.stock_quantity || 0,
          minimo: product.minimum_stock || 0,
          loja: product.establishment?.name || 'Sem estabelecimento',
          preco: product.price || 0,
          codigo: product.sku || '',
          descricao: product.description || ''
        }))
      }

      // Aplicar filtro por categoria se não for "todas"
      if (categoriaSelecionada !== "todas") {
        produtosFiltrados = produtosFiltrados.filter((produto: ProdutoEstoque) => 
          produto.categoria.toLowerCase() === categoriaSelecionada.toLowerCase()
        )
        console.log(`🔍 Filtrados por categoria "${categoriaSelecionada}":`, produtosFiltrados.length)
      }

      // Aplicar filtro por nome se houver termo de busca
      if (termoBusca.trim()) {
        produtosFiltrados = produtosFiltrados.filter((produto: ProdutoEstoque) => 
          produto.produto.toLowerCase().includes(termoBusca.toLowerCase()) ||
          produto.codigo?.toLowerCase().includes(termoBusca.toLowerCase()) ||
          produto.descricao?.toLowerCase().includes(termoBusca.toLowerCase())
        )
        console.log(`🔍 Filtrados por busca "${termoBusca}":`, produtosFiltrados.length)
      }

      console.log('✅ Produtos filtrados:', produtosFiltrados.length)
      setEstoque(produtosFiltrados)
      setTotalItems(produtosFiltrados.length)
      setCurrentPage(1) // Reset para primeira página
    } catch (error: any) {
      console.error('❌ Erro ao aplicar filtros:', error)
      setError('Erro ao aplicar filtros. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Carregar categorias da API
  useEffect(() => {
    const loadCategorias = async () => {
      try {
        setLoadingCategorias(true)
        const categorias = await getCategoriasAtivas()
        setCategoriasDisponiveis(categorias)
      } catch (error) {
        console.error('Erro ao carregar categorias:', error)
        // Fallback para categorias padrão
        setCategoriasDisponiveis([
          "FAMILIA", "POS_PAGO", "CONTROLE", "PRE_PAGO", "FIBRA", 
          "UPGRADE", "APARELHO", "ACESSÓRIO", "CHIP"
        ])
      } finally {
        setLoadingCategorias(false)
      }
    }

    loadCategorias()
  }, [])

  // Carregar estabelecimentos da API
  useEffect(() => {
    const loadEstabelecimentos = async () => {
      try {
        setLoadingEstabelecimentos(true)
        
        // Tentar buscar estabelecimentos (pode dar erro de permissão para vendedor)
        try {
          const response = await apiService.getEstablishments()
          
          if (response && response.data && response.data.data && Array.isArray(response.data.data)) {
            const estabelecimentosAtivos = response.data.data.filter((est: Establishment) => est.is_active)
            setEstabelecimentos(estabelecimentosAtivos)
            
            // Manter "todas" como padrão
            setLojaSelecionada("todas")
            return
          } else {
            throw new Error('Estrutura de resposta inválida')
          }
        } catch (permissionError: any) {
          // Buscar perfil do usuário para obter o estabelecimento
          try {
            const userProfile = await apiService.getProfile()
            
            if (userProfile && userProfile.data && userProfile.data.establishment) {
              const estabelecimentoUsuario = userProfile.data.establishment
              
              setEstabelecimentos([estabelecimentoUsuario])
              setLojaSelecionada("todas")
            } else {
              throw new Error('Usuário sem estabelecimento')
            }
          } catch (profileError: any) {
            throw profileError
          }
        }
      } catch (error: any) {
        // Fallback para estabelecimentos padrão
        setEstabelecimentos([
          { id: 1, name: "Loja 1 - Centro", cnpj: "", address: "", city: "", state: "", zip_code: "", phone: "", email: "", is_active: true },
          { id: 2, name: "Loja 2 - Norte", cnpj: "", address: "", city: "", state: "", zip_code: "", phone: "", email: "", is_active: true },
          { id: 3, name: "Loja 3 - Shopping", cnpj: "", address: "", city: "", state: "", zip_code: "", phone: "", email: "", is_active: true }
        ])
        setLojaSelecionada("todas")
      } finally {
        setLoadingEstabelecimentos(false)
      }
    }

    loadEstabelecimentos()
  }, [])

  // Carregar produtos da API
  useEffect(() => {
    const loadProdutos = async () => {
      try {
        setLoading(true)
        console.log('🔄 Carregando produtos da API...')
        
        // Carregar primeira página para obter informações de paginação
        const firstResponse = await apiService.getProducts({ page: 1 })
        console.log('📥 Resposta da primeira página:', firstResponse)
        
        const totalPages = firstResponse.data?.last_page || 1
        console.log('📄 Total de páginas:', totalPages)
        
        let allProducts: any[] = []
        
        // Carregar todas as páginas
        for (let page = 1; page <= totalPages; page++) {
          console.log(`🔄 Carregando página ${page}/${totalPages}...`)
          const response = await apiService.getProducts({ page })
          const products = response.data.data || response.data
          allProducts = [...allProducts, ...products]
        }
        
        console.log('📦 Total de produtos carregados:', allProducts.length)
        console.log('📋 Lista de produtos:', allProducts.map(p => `${p.name} - ${p.establishment?.name}`))
        
        // Converter produtos da API para formato do estoque
        const produtosEstoque: ProdutoEstoque[] = allProducts.map((product: any) => ({
          id: product.id,
          produto: product.name,
          categoria: product.category?.name || 'Sem categoria',
          quantidade: product.stock_quantity || 0,
          minimo: product.minimum_stock || 0,
          loja: product.establishment?.name || 'Sem estabelecimento',
          preco: product.price || 0,
          codigo: product.sku || '',
          descricao: product.description || ''
        }))
        
        console.log('✅ Produtos convertidos para estoque:', produtosEstoque.length)
        setEstoque(produtosEstoque)
        setTotalItems(produtosEstoque.length)
      } catch (error) {
        console.error('❌ Erro ao carregar produtos:', error)
        setError('Erro ao carregar produtos do estoque')
      } finally {
        setLoading(false)
      }
    }

    loadProdutos()
  }, [])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Validar SKU em tempo real quando o campo código for alterado
    if (field === "codigo") {
      // Usar debounce para evitar muitas validações
      const timeoutId = setTimeout(() => {
        validateSku(value)
      }, 500)
      
      return () => clearTimeout(timeoutId)
    }
  }

  // Funções de paginação
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentItems = estoque.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value))
    setCurrentPage(1) // Reset para primeira página
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('🔍 Iniciando handleSubmit...')
    console.log('🔍 apiService no início:', apiService)
    console.log('🔍 typeof apiService:', typeof apiService)
    
    if (!formData.produto.trim()) {
      setError("Nome do produto é obrigatório")
      return
    }

    if (!formData.categoria) {
      setError("Categoria é obrigatória")
      return
    }

    if (!formData.loja) {
      setError("Estabelecimento é obrigatório")
      return
    }

    // Verificar se há erro de SKU antes de submeter
    if (skuError) {
      setError("Corrija o erro do SKU antes de continuar")
      return
    }

    try {
      setError("")
      
      // Buscar ID da categoria corretamente
      const categoriasCompletas = await getCategoriasVendas()
      const categoriaSelecionada = categoriasCompletas.find((cat: CategoriaVenda) => cat.nome === formData.categoria)
      const categoriaId = categoriaSelecionada?.id
      
      if (!categoriaId) {
        setError("Categoria selecionada não encontrada")
        return
      }
      
      // Validar campos obrigatórios
      if (!formData.produto.trim()) {
        setError("Nome do produto é obrigatório")
        return
      }

      // SKU é opcional - não precisa validar

      if (formData.preco && parseFloat(formData.preco) < 0) {
        setError("Preço deve ser maior ou igual a zero")
        return
      }

      // Garantir que SKU e description não sejam undefined/null
      const skuValue = formData.codigo.trim()
      const descriptionValue = formData.descricao.trim()
      
      // Gerar SKU único se não fornecido
      let finalSku = skuValue
      if (!finalSku) {
        const timestamp = Date.now()
        const nameSlug = formData.produto
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '-')
          .substring(0, 10)
        finalSku = `${nameSlug}-${timestamp}`
      }
      
      console.log('🔍 SKU value:', skuValue, 'Type:', typeof skuValue)
      console.log('🔍 Description value:', descriptionValue, 'Type:', typeof descriptionValue)
      console.log('🔍 Final SKU:', finalSku)

      const productData = {
        name: formData.produto.trim(),
        description: descriptionValue || "Sem descrição",
        sku: finalSku, // SKU único gerado
        price: parseFloat(formData.preco) || 0,
        stock_quantity: parseInt(formData.quantidade) || 0,
        minimum_stock: parseInt(formData.minimo) || 0,
        category_id: categoriaId,
        establishment_id: parseInt(formData.loja),
        is_active: true
      }

      console.log('🔍 Dados sendo enviados para API:', productData)
      console.log('🔍 formData completo:', formData)
      console.log('🔍 categoriaId calculado:', categoriaId)
      console.log('🔍 establishment_id:', parseInt(formData.loja))
      console.log('🔍 Iniciando chamada para apiService.createProduct...')
      console.log('🔍 apiService disponível:', !!apiService)
      console.log('🔍 apiService.createProduct disponível:', !!apiService?.createProduct)

      const response = await apiService.createProduct(productData)
      console.log('✅ Resposta da API recebida:', response)
      console.log('✅ Tipo da resposta:', typeof response)
      console.log('✅ Keys da resposta:', Object.keys(response || {}))
      
      const newProduct: any = response.data
      
      // Adicionar produto ao estado local
      const novoProduto: ProdutoEstoque = {
        id: newProduct.id,
        produto: newProduct.name,
        categoria: formData.categoria,
        quantidade: newProduct.stock_quantity || 0,
        minimo: newProduct.minimum_stock || 0,
        loja: estabelecimentos.find(est => est.id.toString() === formData.loja)?.name || 'Estabelecimento não encontrado',
        preco: newProduct.price || 0,
        codigo: newProduct.sku || '',
        descricao: newProduct.description || ''
      }

    setEstoque(prev => [...prev, novoProduto])
    setSuccessMessage("Produto adicionado com sucesso!")
    setSuccess(true)
    setShowModal(false)
    
    setFormData({
      produto: "",
      categoria: "",
      quantidade: "",
      minimo: "",
      loja: "",
      descricao: "",
      preco: "",
      codigo: ""
    })
      setTimeout(() => {
        setSuccess(false)
        setSuccessMessage("")
      }, 3000)
    } catch (error: any) {
      console.error('❌ Erro ao criar produto:', error)
      console.error('❌ Tipo do erro:', typeof error)
      console.error('❌ Error keys:', Object.keys(error || {}))
      console.error('❌ Resposta completa do erro:', error?.response?.data)
      console.error('❌ Status do erro:', error?.response?.status)
      console.error('❌ Error completo:', error)
      console.error('❌ Error message:', error?.message)
      console.error('❌ Error data:', error?.data)
      console.error('❌ Error stack:', error?.stack)
      
      // Determinar tipo de erro e mensagem apropriada
      let errorMessage = 'Erro desconhecido ao criar produto'
      
      if (error?.response) {
        // Erro de resposta da API
        const { status, data } = error.response
        console.error('🔍 Status HTTP:', status)
        console.error('🔍 Dados do erro:', data)
        
        if (status === 422) {
          // Erro de validação
          const validationErrors = data?.data || data?.errors || data
          console.error('🔍 Erros de validação:', validationErrors)
          console.error('🔍 Erros de SKU específicos:', validationErrors?.sku)
          console.error('🔍 Tipo do erro SKU:', typeof validationErrors?.sku)
          console.error('🔍 Array de erro SKU:', Array.isArray(validationErrors?.sku) ? validationErrors.sku : 'Não é array')
          
          if (typeof validationErrors === 'object' && validationErrors !== null) {
            const errorMessages = Object.keys(validationErrors).map(key => {
              const fieldErrors = validationErrors[key]
              if (Array.isArray(fieldErrors)) {
                return `${key}: ${fieldErrors.join(', ')}`
              } else {
                return `${key}: ${fieldErrors}`
              }
            })
            errorMessage = `Erro de validação: ${errorMessages.join('; ')}`
          } else if (typeof validationErrors === 'string') {
            errorMessage = `Erro de validação: ${validationErrors}`
          } else {
            errorMessage = 'Dados inválidos. Verifique os campos obrigatórios.'
          }
        } else if (status === 401) {
          errorMessage = 'Sessão expirada. Faça login novamente.'
        } else if (status === 403) {
          errorMessage = 'Você não tem permissão para criar produtos.'
        } else if (status >= 500) {
          errorMessage = 'Erro interno do servidor. Tente novamente mais tarde.'
        } else if (data?.message) {
          errorMessage = data.message
        } else {
          errorMessage = `Erro ${status}: ${data?.error || 'Erro desconhecido'}`
        }
      } else if (error?.request) {
        // Erro de rede
        errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.'
      } else if (error?.message) {
        errorMessage = error.message
      }
      
      console.error('🔍 Mensagem de erro final:', errorMessage)
      setError(errorMessage)
      
      // Redirecionar para login se sessão expirou
      if (error?.response?.status === 401) {
        setTimeout(() => {
          window.location.href = '/login'
        }, 2000)
      }
    }
  }

  // Funções para importação XLSX
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0])
      setImportError("")
      setImportSuccess(false)
    }
  }

  const handleImport = async () => {
    if (!importFile) {
      setImportError("Por favor, selecione um arquivo para importar")
      return
    }

    setImporting(true)
    setImportError("")

    try {
      const data = await importFile.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      // Validar se o arquivo tem dados
      if (!jsonData || jsonData.length === 0) {
        setImportError("O arquivo está vazio ou não contém dados válidos.")
        return
      }

      console.log('Dados do arquivo:', jsonData.slice(0, 3)) // Log para debug

      // Processar cada linha do arquivo
      const produtosImportados: ProdutoEstoque[] = []
      
      for (const row of jsonData as any[]) {
        // Mapear colunas do Excel real para campos do produto
        const categoriaNome = row['CATEGORIA'] || row['Categoria'] || importCategory
        const produtoNome = row['PLANO /PRODUTO'] || row['PLANO/PRODUTO'] || row['Produto'] || row['Nome']
        const valor = parseFloat(row['VALOR'] || row['Valor'] || row['Preço'] || '0')
        
        // Validar se o produto tem nome
        if (!produtoNome || produtoNome.trim() === '') {
          console.warn('Linha ignorada: produto sem nome', row)
          continue
        }
        
        // Buscar ID da categoria (do arquivo ou selecionada)
        let categoriaId = categoriasDisponiveis.findIndex(cat => cat === categoriaNome) + 1
        if (categoriaId === 0) {
          // Se categoria não encontrada, usar a selecionada no modal
          categoriaId = categoriasDisponiveis.findIndex(cat => cat === importCategory) + 1
        }
        
        console.log(`Buscando categoria:`, {
          categoriaNome,
          importCategory,
          categoriasDisponiveis,
          categoriaId
        })
        
        // Validar se a categoria existe
        if (categoriaId === 0) {
          console.warn(`Categoria '${categoriaNome}' não encontrada para o produto '${produtoNome}'`)
          console.warn(`Categorias disponíveis:`, categoriasDisponiveis)
          setImportError(`Categoria '${categoriaNome}' não encontrada. Categorias disponíveis: ${categoriasDisponiveis.join(', ')}`)
          throw new Error(`Categoria '${categoriaNome}' não encontrada`)
        }
        
        // Gerar SKU baseado no nome do produto
        const skuBase = produtoNome.toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
          .substring(0, 10)
        
        // Garantir que o SKU base não seja vazio
        const finalSkuBase = skuBase.length > 0 ? skuBase : 'PROD'
        
        const sku = finalSkuBase + '-' + Math.random().toString(36).substring(2, 6).toUpperCase()
        
        console.log('SKU gerado:', {
          produtoNome,
          skuBase,
          finalSkuBase,
          sku,
          skuLength: sku.length
        })
        
        // Validar se o SKU foi gerado corretamente
        if (!sku || sku.trim() === '' || sku.length < 3) {
          console.error('SKU não foi gerado corretamente para:', produtoNome)
          setImportError(`Erro ao gerar SKU para o produto '${produtoNome}'`)
          throw new Error(`SKU não foi gerado para '${produtoNome}'`)
        }
        
        const produto: any = {
          name: produtoNome,
          description: `Produto importado: ${produtoNome}`,
          sku: sku,
          price: valor,
          stock_quantity: 0, // Valor padrão
          minimum_stock: 0, // Valor padrão
          category_id: categoriaId,
          establishment_id: 1, // Estabelecimento padrão
          is_active: true
        }

        console.log(`Criando produto:`, {
          nome: produtoNome,
          categoria: categoriaNome,
          categoriaId: categoriaId,
          valor: valor,
          sku: sku,
          skuLength: sku.length,
          skuType: typeof sku,
          produto: produto
        })

        try {
          // Criar produto via API
          const response = await apiService.createProduct(produto)
          const newProduct: any = response.data

          // Adicionar ao estado local
          const novoProduto: ProdutoEstoque = {
            id: newProduct.id,
            produto: newProduct.name,
            categoria: categoriaNome, // Usar categoria do arquivo
            quantidade: newProduct.stock_quantity || 0,
            minimo: newProduct.minimum_stock || 0,
            loja: 'Estabelecimento Padrão',
            preco: newProduct.price || 0,
            codigo: newProduct.sku || '',
            descricao: newProduct.description || ''
          }

          produtosImportados.push(novoProduto)
        } catch (apiError: any) {
          console.error(`Erro ao criar produto '${produtoNome}':`, apiError)
          
          let errorMessage = `Erro ao criar produto '${produtoNome}'`
          
          if (apiError?.response?.data?.message) {
            errorMessage += `: ${apiError.response.data.message}`
          } else if (apiError?.response?.data?.errors) {
            const errors = Object.values(apiError.response.data.errors).flat()
            errorMessage += `: ${errors.join(', ')}`
          } else if (apiError?.message) {
            errorMessage += `: ${apiError.message}`
          } else if (apiError?.response?.status) {
            errorMessage += `: Status ${apiError.response.status}`
          } else {
            errorMessage += ': Erro desconhecido na API'
          }
          
          console.error('Detalhes do erro:', {
            status: apiError?.response?.status,
            data: apiError?.response?.data,
            message: apiError?.message,
            produto: produto
          })
          
          setImportError(errorMessage)
          throw apiError
        }
      }

      setEstoque(prev => [...prev, ...produtosImportados])
      setSuccessMessage(`${produtosImportados.length} produtos importados com sucesso!`)
      setSuccess(true)
      setImportSuccess(true)
      setShowImportModal(false)
      setImportFile(null)
      setImportCategory("")
      
      setTimeout(() => {
        setImportSuccess(false)
        setSuccess(false)
        setSuccessMessage("")
      }, 5000)
    } catch (error: any) {
      console.error('Erro ao importar arquivo:', error)
      
      let errorMessage = "Erro ao processar arquivo. Verifique o formato e tente novamente."
      
      if (error?.response?.data?.message) {
        errorMessage = `Erro da API: ${error.response.data.message}`
      } else if (error?.message) {
        errorMessage = `Erro: ${error.message}`
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      setImportError(errorMessage)
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const templateData = [
      {
        'CATEGORIA': 'CONTROLE',
        'PLANO /PRODUTO': 'TIM CONTROLE',
        'VALOR': 57.90
      },
      {
        'CATEGORIA': 'CONTROLE',
        'PLANO /PRODUTO': 'TIM CONTROLE PLUS',
        'VALOR': 69.90
      },
      {
        'CATEGORIA': 'POS_PAGO',
        'PLANO /PRODUTO': 'TIM PÓS-PAGO 30GB',
        'VALOR': 79.90
      },
      {
        'CATEGORIA': 'APARELHO',
        'PLANO /PRODUTO': 'iPhone 15 128GB',
        'VALOR': 3999.00
      },
      {
        'CATEGORIA': 'ACESSÓRIO',
        'PLANO /PRODUTO': 'Capa iPhone 15',
        'VALOR': 89.90
      }
    ]

    const ws = XLSX.utils.json_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'ImportPlano')
    XLSX.writeFile(wb, 'modelo_importacao_produtos.xlsx')
  }

  // Funções para visualizar, editar e excluir produtos
  const handleView = (product: ProdutoEstoque) => {
    setSelectedProduct(product)
    setShowViewModal(true)
  }

  const handleEdit = (product: ProdutoEstoque) => {
    setSelectedProduct(product)
    setFormData({
      produto: product.produto,
      categoria: product.categoria,
      quantidade: product.quantidade.toString(),
      minimo: product.minimo.toString(),
      loja: product.loja,
      preco: (product.preco || 0).toString(),
      codigo: product.codigo || '',
      descricao: product.descricao || ''
    })
    setShowEditModal(true)
  }

  const handleDelete = (product: ProdutoEstoque) => {
    setSelectedProduct(product)
    setShowDeleteModal(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct) return

    try {
      setError("")
      
      // Buscar ID da categoria
      const categoriaId = categoriasDisponiveis.findIndex(cat => cat === formData.categoria) + 1
      
      const productData = {
        name: formData.produto,
        description: formData.descricao,
        sku: formData.codigo,
        price: parseFloat(formData.preco) || 0,
        stock_quantity: parseInt(formData.quantidade) || 0,
        minimum_stock: parseInt(formData.minimo) || 0,
        category_id: categoriaId,
        establishment_id: 1,
        is_active: true
      }

      await apiService.updateProduct(selectedProduct.id, productData)
      
      // Atualizar estado local
      setEstoque(prev => prev.map(item => 
        item.id === selectedProduct.id 
          ? {
              ...item,
              produto: formData.produto,
              categoria: formData.categoria,
              quantidade: parseInt(formData.quantidade) || 0,
              minimo: parseInt(formData.minimo) || 0,
              preco: parseFloat(formData.preco) || 0,
              codigo: formData.codigo,
              descricao: formData.descricao
            }
          : item
      ))

      setSuccessMessage("Produto atualizado com sucesso!")
      setSuccess(true)
      setShowEditModal(false)
      setSelectedProduct(null)
      setFormData({
        produto: "",
        categoria: "",
        quantidade: "",
        minimo: "",
        loja: "",
        preco: "",
        codigo: "",
        descricao: ""
      })
    } catch (error) {
      setError("Erro ao atualizar produto")
    }
    setTimeout(() => {
      setSuccess(false)
      setSuccessMessage("")
    }, 3000)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedProduct) return

    try {
      setError("")
      await apiService.deleteProduct(selectedProduct.id)
      
      // Remover do estado local
      setEstoque(prev => prev.filter((item: ProdutoEstoque) => item.id !== selectedProduct.id))
      
      setSuccessMessage("Produto excluído com sucesso!")
      setSuccess(true)
      setShowDeleteModal(false)
      setSelectedProduct(null)
    } catch (error) {
      setError("Erro ao excluir produto")
    }
    setTimeout(() => {
      setSuccess(false)
      setSuccessMessage("")
    }, 3000)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setFormData({
      produto: "",
      categoria: "",
      quantidade: "",
      minimo: "",
      loja: "",
      descricao: "",
      preco: "",
      codigo: ""
    })
    setError("")
    setSkuError("")
  }
  if (loading) {
    return (
      <div className="min-h-screen space-y-6 p-6" aria-busy="true" aria-label="A carregar estoque">
        <PanelPageHeaderSkeleton />
        <PanelGridCardsSkeleton cards={4} />
        <PanelTableSkeleton rows={12} columns={6} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-600" />
            Gerenciar Estoque
          </h2>
          <p className="text-muted-foreground mt-2">Controle de produtos e inventário</p>
        </div>
        <Button
          onClick={downloadTemplate}
          variant="outline"
          className="border-blue-600 text-blue-600 hover:bg-blue-50"
        >
          <Download className="w-4 h-4 mr-2" />
          Baixar Modelo
        </Button>
        <Button
          onClick={() => setShowImportModal(true)}
          variant="outline"
          className="border-green-600 text-green-600 hover:bg-green-50"
        >
          <Upload className="w-4 h-4 mr-2" />
          Importar XLSX
        </Button>
        <Button 
          onClick={() => setShowModal(true)}
          className="text-white"
          style={{ backgroundColor: '#0026d9' }}
          onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#001a99'}
          onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#0026d9'}
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Produto
        </Button>
      </div>

      {success && (
        <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            {successMessage}
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
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Selecione a loja, categoria e busque por nome</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="loja-estoque">Loja</Label>
              <Select 
                value={lojaSelecionada} 
                onValueChange={setLojaSelecionada}
                disabled={loadingEstabelecimentos}
              >
                <SelectTrigger id="loja-estoque">
                  <SelectValue placeholder={loadingEstabelecimentos ? "Carregando..." : "Selecione uma loja ou todas"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Lojas</SelectItem>
                  {estabelecimentos.map((estabelecimento) => (
                    <SelectItem key={estabelecimento.id} value={estabelecimento.id.toString()}>
                      {estabelecimento.name} - {estabelecimento.city}/{estabelecimento.state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Select 
                value={categoriaSelecionada} 
                onValueChange={setCategoriaSelecionada}
                disabled={loadingCategorias}
              >
                <SelectTrigger id="categoria">
                  <SelectValue placeholder={loadingCategorias ? "Carregando..." : "Selecione uma categoria"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Categorias</SelectItem>
                  {Array.isArray(categoriasDisponiveis) && categoriasDisponiveis.map((categoria) => (
                    <SelectItem key={categoria} value={categoria.toLowerCase()}>
                      {categoria}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="busca-produto">Buscar Produto</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="busca-produto"
                  placeholder="Nome, SKU ou descrição..."
                  value={termoBusca}
                  onChange={(e) => setTermoBusca(e.target.value)}
                  className="w-full pl-10"
                />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <Button 
                className="flex-1 text-white"
                style={{ backgroundColor: '#0026d9' }}
                onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#001a99'}
                onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#0026d9'}
                onClick={aplicarFiltros}
                disabled={loading || loadingEstabelecimentos}
              >Aplicar Filtros</Button>
              <Button 
                variant="outline"
                onClick={limparFiltros}
                disabled={loading || loadingEstabelecimentos}
                className="px-3"
                title="Limpar filtros e mostrar todos os produtos"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">88</div>
            <p className="text-xs text-muted-foreground mt-1">Itens em estoque</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">R$ 87.450</div>
            <p className="text-xs text-muted-foreground mt-1">Custo de estoque</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alertas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">3</div>
            <p className="text-xs text-muted-foreground mt-1">Produtos abaixo do mínimo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Categorias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">2</div>
            <p className="text-xs text-muted-foreground mt-1">Aparelhos e Acessórios</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Produtos em Estoque</CardTitle>
          <CardDescription>Lista de produtos disponíveis</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Controles de paginação no topo */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="items-per-page">Itens por página:</Label>
              <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                <SelectTrigger className="w-20">
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
            <div className="text-sm text-muted-foreground">
              Mostrando {startIndex + 1}-{Math.min(endIndex, totalItems)} de {totalItems} produtos
            </div>
          </div>

          {/* Lista de produtos compacta */}
          <div className="space-y-2">
            {currentItems.map((item) => {
              const isLow = item.quantidade <= item.minimo
              return (
                <div key={item.id} className="flex items-center justify-between p-2 border rounded hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Package className="w-3 h-3 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-sm truncate" title={item.produto}>
                          {item.produto}
                        </h3>
                        <Badge 
                          variant={isLow ? "destructive" : "default"}
                          className="text-xs px-1 py-0"
                        >
                          {isLow ? "Baixo" : "OK"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{item.categoria}</span>
                        <span>•</span>
                        <span className="truncate" title={item.loja}>{item.loja}</span>
                        <span>•</span>
                        <span>{item.codigo}</span>
                        <span>•</span>
                        <span>R$ {Number(item.preco || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-3">
                    <div className="text-right">
                      <p className={`text-sm font-bold ${isLow ? "text-orange-600" : "text-foreground"}`}>
                        {item.quantidade}
                      </p>
                      <p className="text-xs text-muted-foreground">Mín: {item.minimo}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(item)}
                        title="Visualizar"
                        className="h-7 w-7 p-0"
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(item)}
                        title="Editar"
                        className="h-7 w-7 p-0"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(item)}
                        title="Excluir"
                        className="h-7 w-7 p-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

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

          {estoque.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum produto encontrado
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Adicionar Produto */}
      {showModal && (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-50/80 via-white/60 to-purple-50/80 backdrop-blur-md flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto bg-white/70 backdrop-blur-xl border border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle>Adicionar Produto ao Estoque</CardTitle>
              <CardDescription>Cadastre um novo produto no sistema de estoque</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="produto">Nome do Produto *</Label>
                  <Input
                    id="produto"
                    placeholder="Ex: Samsung Galaxy A54"
                    value={formData.produto}
                    onChange={(e) => handleInputChange("produto", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="codigo">Código do Produto (SKU) - Opcional</Label>
                  <div className="relative">
                  <Input
                    id="codigo"
                    placeholder="Ex: SAM-A54-128GB"
                    value={formData.codigo}
                    onChange={(e) => handleInputChange("codigo", e.target.value)}
                      className={skuError ? "border-red-500 focus:border-red-500" : ""}
                    />
                    {isValidatingSku && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                  </div>
                  {skuError && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <span>⚠️</span>
                      {skuError}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    placeholder="Descrição detalhada do produto..."
                    value={formData.descricao}
                    onChange={(e) => handleInputChange("descricao", e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="categoria">Categoria *</Label>
                    <Select
                      value={formData.categoria}
                      onValueChange={(value) => handleInputChange("categoria", value)}
                    >
                      <SelectTrigger id="categoria">
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(categoriasDisponiveis) && categoriasDisponiveis.map((categoria) => (
                          <SelectItem key={categoria} value={categoria}>
                            {categoria}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="loja">Estabelecimento *</Label>
                    <Select
                      value={formData.loja}
                      onValueChange={(value) => handleInputChange("loja", value)}
                      disabled={loadingEstabelecimentos}
                    >
                      <SelectTrigger id="loja">
                        <SelectValue placeholder={loadingEstabelecimentos ? "Carregando..." : "Selecione o estabelecimento"} />
                      </SelectTrigger>
                      <SelectContent>
                        {estabelecimentos.map((estabelecimento) => (
                          <SelectItem key={estabelecimento.id} value={estabelecimento.id.toString()}>
                            {estabelecimento.name} - {estabelecimento.city}/{estabelecimento.state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantidade">Quantidade Inicial</Label>
                    <Input
                      id="quantidade"
                      type="number"
                      placeholder="0"
                      value={formData.quantidade}
                      onChange={(e) => handleInputChange("quantidade", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="minimo">Estoque Mínimo</Label>
                    <Input
                      id="minimo"
                      type="number"
                      placeholder="0"
                      value={formData.minimo}
                      onChange={(e) => handleInputChange("minimo", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preco">Preço (R$)</Label>
                    <Input
                      id="preco"
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={formData.preco}
                      onChange={(e) => handleInputChange("preco", e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseModal}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 text-white"
                    style={{ backgroundColor: '#0026d9' }}
                    onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#001a99'}
                    onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#0026d9'}
                  >
                    Adicionar ao Estoque
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal Importar Produtos */}
      {showImportModal && (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-50/80 via-white/60 to-purple-50/80 backdrop-blur-md flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto bg-white/70 backdrop-blur-xl border border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" style={{ color: '#0026d9' }} />
                Importar Produtos via XLSX
              </CardTitle>
              <CardDescription>
                Selecione um arquivo Excel (.xlsx) com os produtos para importar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {importSuccess && (
                <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    Produtos importados com sucesso!
                  </AlertDescription>
                </Alert>
              )}

              {importError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{importError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <div className="space-y-2">
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <span className="text-sm font-medium text-primary hover:underline">Clique para selecionar</span>
                      <span className="text-sm text-muted-foreground"> ou arraste o arquivo aqui</span>
                    </Label>
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <p className="text-xs text-muted-foreground">Formatos aceitos: .xlsx, .xls (máx. 10MB)</p>
                  </div>
                </div>

                {importFile && (
                  <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{importFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(importFile.size / 1024).toFixed(2)} KB</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setImportFile(null)}>
                      Remover
                    </Button>
                  </div>
                )}

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Formato do Arquivo</h4>
                  <p className="text-sm text-blue-800 mb-2">
                    O arquivo deve conter as seguintes colunas:
                  </p>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• <strong>CATEGORIA</strong> - Categoria do produto (obrigatório)</li>
                    <li>• <strong>PLANO /PRODUTO</strong> - Nome do produto/plano (obrigatório)</li>
                    <li>• <strong>VALOR</strong> - Preço do produto (obrigatório)</li>
                  </ul>
                  <p className="text-xs text-blue-700 mt-2 font-medium">
                    ✅ Categorias aceitas: CONTROLE, POS_PAGO, PRE_PAGO, FAMILIA, FIBRA, APARELHO, ACESSÓRIO, CHIP
                  </p>
                  <p className="text-xs text-blue-700 mt-1 font-medium">
                    ℹ️ SKU e descrição serão gerados automaticamente
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowImportModal(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={!importFile || importing}
                    className="flex-1 text-white"
                    style={{ backgroundColor: '#0026d9' }}
                    onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#001a99'}
                    onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#0026d9'}
                  >
                    {importing ? "Importando..." : "Importar Produtos"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal Visualizar Produto */}
      {showViewModal && selectedProduct && (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-50/80 via-white/60 to-purple-50/80 backdrop-blur-md flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto bg-white/70 backdrop-blur-xl border border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" style={{ color: '#0026d9' }} />
                Detalhes do Produto
              </CardTitle>
              <CardDescription>
                Informações completas do produto selecionado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Nome do Produto</Label>
                    <p className="text-lg font-semibold">{selectedProduct.produto}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Categoria</Label>
                    <p className="text-base">{selectedProduct.categoria}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">SKU</Label>
                    <p className="text-base font-mono">{selectedProduct.codigo}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Estabelecimento</Label>
                    <p className="text-base">{selectedProduct.loja}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Preço</Label>
                    <p className="text-2xl font-bold text-green-600">R$ {Number(selectedProduct.preco || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Quantidade em Estoque</Label>
                    <p className={`text-2xl font-bold ${selectedProduct.quantidade <= selectedProduct.minimo ? "text-orange-600" : "text-blue-600"}`}>
                      {selectedProduct.quantidade}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Estoque Mínimo</Label>
                    <p className="text-lg">{selectedProduct.minimo}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <Badge 
                      variant={selectedProduct.quantidade <= selectedProduct.minimo ? "destructive" : "default"}
                      className="text-sm"
                    >
                      {selectedProduct.quantidade <= selectedProduct.minimo ? "Estoque Baixo" : "Em Estoque"}
                    </Badge>
                  </div>
                </div>
              </div>
              
              {selectedProduct.descricao && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Descrição</Label>
                  <p className="text-base mt-1 p-3 bg-muted rounded-lg">{selectedProduct.descricao}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowViewModal(false)}
                  className="flex-1"
                >
                  Fechar
                </Button>
                <Button
                  onClick={() => {
                    setShowViewModal(false)
                    handleEdit(selectedProduct)
                  }}
                  className="flex-1 text-white"
                  style={{ backgroundColor: '#0026d9' }}
                  onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#001a99'}
                  onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#0026d9'}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar Produto
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal Editar Produto */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-50/80 via-white/60 to-purple-50/80 backdrop-blur-md flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto bg-white/70 backdrop-blur-xl border border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit className="w-5 h-5" style={{ color: '#0026d9' }} />
                Editar Produto
              </CardTitle>
              <CardDescription>
                Atualize as informações do produto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-produto">Nome do Produto *</Label>
                  <Input
                    id="edit-produto"
                    value={formData.produto}
                    onChange={(e) => setFormData(prev => ({ ...prev, produto: e.target.value }))}
                    placeholder="Digite o nome do produto"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-categoria">Categoria *</Label>
                  <Select value={formData.categoria} onValueChange={(value) => setFormData(prev => ({ ...prev, categoria: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(categoriasDisponiveis) && categoriasDisponiveis.map((categoria) => (
                        <SelectItem key={categoria} value={categoria}>
                          {categoria}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-quantidade">Quantidade</Label>
                    <Input
                      id="edit-quantidade"
                      type="number"
                      value={formData.quantidade}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantidade: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-minimo">Estoque Mínimo</Label>
                    <Input
                      id="edit-minimo"
                      type="number"
                      value={formData.minimo}
                      onChange={(e) => setFormData(prev => ({ ...prev, minimo: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-preco">Preço</Label>
                    <Input
                      id="edit-preco"
                      type="number"
                      step="0.01"
                      value={formData.preco}
                      onChange={(e) => setFormData(prev => ({ ...prev, preco: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-codigo">SKU</Label>
                    <Input
                      id="edit-codigo"
                      value={formData.codigo}
                      onChange={(e) => setFormData(prev => ({ ...prev, codigo: e.target.value }))}
                      placeholder="Código do produto"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-descricao">Descrição</Label>
                  <Textarea
                    id="edit-descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                    placeholder="Descrição do produto"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-4">
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
                    onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#001a99'}
                    onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#0026d9'}
                  >
                    Atualizar Produto
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal Confirmar Exclusão */}
      {showDeleteModal && selectedProduct && (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-50/80 via-white/60 to-purple-50/80 backdrop-blur-md flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 bg-white/70 backdrop-blur-xl border border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="w-5 h-5" />
                Confirmar Exclusão
              </CardTitle>
              <CardDescription>
                Esta ação não pode ser desfeita
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-800">
                  Tem certeza que deseja excluir o produto <strong>"{selectedProduct.produto}"</strong>?
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Todos os dados relacionados a este produto serão permanentemente removidos.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleDeleteConfirm}
                  variant="destructive"
                  className="flex-1"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Produto
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
