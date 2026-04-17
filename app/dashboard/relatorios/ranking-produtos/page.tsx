"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Download, Trophy, TrendingUp, Users, DollarSign, Loader2, Calendar, X, ChevronLeft, ChevronRight } from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"
import { usePermissions } from "@/lib/use-permissions"
import { apiService } from "@/lib/api"
import { useDateRange } from "@/hooks/useDateRange"
import { ProtectedPage } from "@/components/auth/protected-page"
import { PanelTableSkeleton } from "@/components/dashboard/panel-content-skeleton"

interface ClienteInfo {
  nome: string
  telefone: string
}

interface RankingProduto {
  posicao: number
  vendedor: {
    id: number
    name: string
    establishment?: string
  }
  produto: string
  categoria: string
  faturamento: number
  quantidadeVendas: number
  ticketMedio: number
  clientes: ClienteInfo[]
}

const CATEGORIAS_RANKING = [
  { value: "POS_PAGO", label: "Pós" },
  { value: "CONTROLE", label: "Controle" },
  { value: "RESGATE", label: "Resgate" },
  { value: "FAMILIA", label: "Família" },
  { value: "FIBRA", label: "Fibra" }
]

export default function RankingProdutosPage() {
  const { user } = useAuth()
  const { hasRole } = usePermissions()
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState("1mes")
  const [customDateFrom, setCustomDateFrom] = useState("")
  const [customDateTo, setCustomDateTo] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["POS_PAGO", "CONTROLE", "RESGATE", "FAMILIA", "FIBRA"])
  const [selectedProduct, setSelectedProduct] = useState<string>("todos")
  const [selectedVendedor, setSelectedVendedor] = useState<number | null>(null)
  const [vendedoresDisponiveis, setVendedoresDisponiveis] = useState<Array<{id: number, name: string, establishment_name?: string}>>([])
  const [loadingVendedores, setLoadingVendedores] = useState(false)
  const [vendas, setVendas] = useState<any[]>([])
  const [ranking, setRanking] = useState<RankingProduto[]>([])
  const [products, setProducts] = useState<string[]>([])
  const [isExportingPDF, setIsExportingPDF] = useState(false)
  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(15)

  const { dateRange } = useDateRange(selectedPeriod)
  const userRole = user?.role || user?.roles?.[0]?.name || null
  const isGestor = userRole === 'gestor'
  const isGerente = userRole === 'gerente'
  const isVendedor = userRole === 'vendedor'
  
  // Detectar administrador
  const isAdmin = user?.email === 'admin@tim.com.br' || user?.name?.includes('Administrador')
  const isGestorOrAdmin = isGestor || isAdmin

  // Função para calcular período
  const getDateRange = (period: string, useCustomDates: boolean = false) => {
    // Se houver datas customizadas preenchidas, usar elas (prioridade)
    if (customDateFrom && customDateTo) {
      return {
        from: customDateFrom,
        to: customDateTo
      }
    }

    // Caso contrário, usar o período pré-definido
    const today = new Date()
    let from = new Date()
    let to = new Date()

    switch (period) {
      case "1mes":
        from = new Date(today.getFullYear(), today.getMonth(), 1)
        to = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        break
      case "mesAnterior":
        from = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        to = new Date(today.getFullYear(), today.getMonth(), 0)
        break
      case "custom":
        // Se for custom mas não tiver datas, retornar vazio
        if (!customDateFrom || !customDateTo) {
          return { from: '', to: '' }
        }
        from = new Date(customDateFrom)
        to = new Date(customDateTo)
        break
      default:
        from = new Date(today.getFullYear(), today.getMonth(), 1)
        to = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    }

    return {
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0]
    }
  }

  // Carregar vendas
  const loadVendas = async () => {
    setLoading(true)
    try {
      const dateRange = getDateRange(selectedPeriod, true)
      
      const filtros: any = {
        per_page: 10000,
        page: 1,
        // Incluir relacionamentos se a API suportar
        include: 'seller,category,establishment,customer'
      }

      if (dateRange.from && dateRange.to) {
        filtros.date_from = dateRange.from
        filtros.date_to = dateRange.to
      }

      // Regras de filtro por role:
      // - Gestor/Admin: vê todos (não aplica filtro de estabelecimento)
      // - Gerente: filtra por estabelecimento
      // - Vendedor: filtra apenas suas próprias vendas (não pode selecionar outro)
      if (isGerente && !isGestorOrAdmin && user?.establishment_id) {
        filtros.establishment_id = user.establishment_id
      }

      // Aplicar filtro de vendedor
      if (selectedVendedor !== null) {
        // Se um vendedor foi selecionado no filtro, usar ele
        filtros.seller_id = selectedVendedor
      } else if (isVendedor && !isGestorOrAdmin && !isGerente && user?.id) {
        // Se for vendedor e não selecionou nenhum, filtrar por ele mesmo
        filtros.seller_id = user.id
      }

      const response = await apiService.getSales(filtros)
      let todasVendas = response.data?.data || []

      // Carregar páginas restantes se houver
      const totalPages = response.data?.last_page || 1
      if (totalPages > 1) {
        for (let page = 2; page <= totalPages; page++) {
          const pageResponse = await apiService.getSales({ ...filtros, page })
          if (pageResponse.data?.data) {
            todasVendas = [...todasVendas, ...pageResponse.data.data]
          }
        }
      }

      // Se a API não retornou os relacionamentos, buscar dados adicionais
      if (todasVendas.length > 0 && (!todasVendas[0]?.seller || !todasVendas[0]?.category || !todasVendas[0]?.customer)) {
        console.log('⚠️ API não retornou relacionamentos, buscando dados adicionais...')
        
        // Buscar categorias únicas
        const categoryIds = Array.from(new Set(todasVendas.map((v: any) => v.category_id).filter(Boolean)))
        const categoriesMap = new Map()
        
        try {
          const categoriesResponse = await apiService.getCategories()
          const categories = Array.isArray(categoriesResponse.data) 
            ? categoriesResponse.data 
            : (categoriesResponse.data?.data || [])
          
          categories.forEach((cat: any) => {
            categoriesMap.set(cat.id, cat)
          })
        } catch (error) {
          console.error('Erro ao buscar categorias:', error)
        }

        // Buscar vendedores únicos
        const sellerIds = Array.from(new Set(todasVendas.map((v: any) => v.seller_id).filter(Boolean)))
        const sellersMap = new Map()
        
        try {
          // Buscar vendedores por estabelecimento ou todos
          if (isGerente && !isGestorOrAdmin && user?.establishment_id) {
            const sellersResponse = await apiService.getEstablishmentUsers(user.establishment_id)
            const sellers = Array.isArray(sellersResponse.data) 
              ? sellersResponse.data 
              : (sellersResponse.data?.data || [])
            
            sellers.forEach((seller: any) => {
              sellersMap.set(seller.id, seller)
            })
          } else if (isGestorOrAdmin) {
            // Para gestores/admin, buscar todos os vendedores
            for (const sellerId of sellerIds) {
              try {
                const sellerResponse = await apiService.getUser(sellerId as number)
                if (sellerResponse.data) {
                  sellersMap.set(sellerId, sellerResponse.data)
                }
              } catch (error) {
                // Ignorar erros individuais
              }
            }
          } else if (isVendedor && user?.id) {
            // Para vendedor, buscar apenas seu próprio perfil
            try {
              const sellerResponse = await apiService.getUser(user.id)
              if (sellerResponse.data) {
                sellersMap.set(user.id, sellerResponse.data)
              }
            } catch (error) {
              console.error('Erro ao buscar perfil do vendedor:', error)
            }
          }
        } catch (error) {
          console.error('Erro ao buscar vendedores:', error)
        }

        // Buscar estabelecimentos únicos
        const establishmentIds = Array.from(new Set(todasVendas.map((v: any) => v.establishment_id).filter(Boolean)))
        const establishmentsMap = new Map()
        
        try {
          for (const estId of establishmentIds) {
            try {
              const estResponse = await apiService.getEstablishment(estId as number)
              if (estResponse.data) {
                establishmentsMap.set(estId, estResponse.data)
              }
            } catch (error) {
              // Ignorar erros individuais
            }
          }
        } catch (error) {
          console.error('Erro ao buscar estabelecimentos:', error)
        }

        // Buscar clientes únicos
        const customerIds = Array.from(new Set(todasVendas.map((v: any) => v.customer_id).filter(Boolean)))
        const customersMap = new Map()
        
        try {
          for (const customerId of customerIds) {
            try {
              const customerResponse = await apiService.getCustomer(customerId as number)
              if (customerResponse.data) {
                customersMap.set(customerId, customerResponse.data)
              }
            } catch (error) {
              // Ignorar erros individuais
            }
          }
        } catch (error) {
          console.error('Erro ao buscar clientes:', error)
        }

        // Enriquecer vendas com dados relacionados
        todasVendas = todasVendas.map((venda: any) => ({
          ...venda,
          category: venda.category || categoriesMap.get(venda.category_id),
          seller: venda.seller || sellersMap.get(venda.seller_id),
          establishment: venda.establishment || establishmentsMap.get(venda.establishment_id),
          customer: venda.customer || customersMap.get(venda.customer_id)
        }))
      }

      setVendas(todasVendas)
    } catch (error) {
      console.error('Erro ao carregar vendas:', error)
      toast.error('Erro ao carregar vendas')
      setVendas([])
    } finally {
      setLoading(false)
    }
  }

  // Calcular ranking
  const calculateRanking = useMemo(() => {
    if (vendas.length === 0) return []

    // Filtrar vendas pelas categorias selecionadas
    let vendasFiltradas = vendas.filter((venda: any) => {
      const categoriaNome = venda.category?.name?.toUpperCase() || ''
      return selectedCategories.some(cat => {
        // Comparação exata ou parcial (para casos como "POS_PAGO" vs "POS")
        return categoriaNome === cat || categoriaNome.includes(cat) || cat.includes(categoriaNome)
      })
    })

    // Filtrar por produto se selecionado
    if (selectedProduct !== "todos") {
      vendasFiltradas = vendasFiltradas.filter((venda: any) => 
        venda.product_name === selectedProduct
      )
    }

    // Filtrar por vendedor se selecionado
    if (selectedVendedor !== null) {
      vendasFiltradas = vendasFiltradas.filter((venda: any) => {
        const vendedorId = venda.seller_id || venda.seller?.id
        return vendedorId === selectedVendedor
      })
    }

    // Agrupar por vendedor e produto
    const agrupado = new Map<string, {
      vendedorId: number
      vendedorNome: string
      estabelecimento?: string
      produto: string
      categoria: string
      faturamento: number
      quantidade: number
      clientes: Map<string, ClienteInfo>
    }>()

    vendasFiltradas.forEach((venda: any) => {
      const vendedorId = venda.seller_id || venda.seller?.id
      const vendedorNome = venda.seller?.name || 'Não informado'
      const estabelecimento = venda.establishment?.name || venda.seller?.establishment?.name
      const produto = venda.product_name || 'Não informado'
      const categoria = venda.category?.name || 'Não informado'
      const faturamento = parseFloat(venda.total_price || 0)

      // Extrair informações do cliente
      const clienteNome = venda.customer?.person?.name || venda.customer?.name || 'Não informado'
      const clienteTelefone = venda.customer?.person?.phone || venda.customer?.phone || venda.customer?.whatsapp || 'Não informado'
      const clienteId = venda.customer_id || venda.customer?.id

      const key = `${vendedorId}-${produto}-${categoria}`

      if (agrupado.has(key)) {
        const item = agrupado.get(key)!
        item.faturamento += faturamento
        item.quantidade += venda.quantity || 1
        
        // Adicionar cliente se ainda não estiver na lista
        if (clienteId) {
          const clienteKey = `${clienteId}`
          if (!item.clientes.has(clienteKey)) {
            item.clientes.set(clienteKey, {
              nome: clienteNome,
              telefone: clienteTelefone
            })
          }
        }
      } else {
        const clientesMap = new Map<string, ClienteInfo>()
        if (clienteId) {
          clientesMap.set(`${clienteId}`, {
            nome: clienteNome,
            telefone: clienteTelefone
          })
        }
        
        agrupado.set(key, {
          vendedorId,
          vendedorNome,
          estabelecimento,
          produto,
          categoria,
          faturamento,
          quantidade: venda.quantity || 1,
          clientes: clientesMap
        })
      }
    })

    // Converter para array e ordenar por faturamento
    const rankingArray: RankingProduto[] = Array.from(agrupado.values())
      .map((item, index) => ({
        posicao: 0, // Será calculado depois
        vendedor: {
          id: item.vendedorId,
          name: item.vendedorNome,
          establishment: item.estabelecimento
        },
        produto: item.produto,
        categoria: item.categoria,
        faturamento: item.faturamento,
        quantidadeVendas: item.quantidade,
        ticketMedio: item.quantidade > 0 ? item.faturamento / item.quantidade : 0,
        clientes: Array.from(item.clientes.values())
      }))
      .sort((a, b) => b.faturamento - a.faturamento)
      .map((item, index) => ({
        ...item,
        posicao: index + 1
      }))

    return rankingArray
  }, [vendas, selectedCategories, selectedProduct, selectedVendedor])

  // Carregar produtos únicos das categorias selecionadas
  useEffect(() => {
    if (vendas.length > 0) {
      const produtosUnicos = new Set<string>()
      vendas.forEach((venda: any) => {
        const categoriaNome = venda.category?.name?.toUpperCase() || ''
        if (selectedCategories.some(cat => categoriaNome.includes(cat))) {
          if (venda.product_name) {
            produtosUnicos.add(venda.product_name)
          }
        }
      })
      setProducts(Array.from(produtosUnicos).sort())
    }
  }, [vendas, selectedCategories])

  // Atualizar ranking quando calcular
  useEffect(() => {
    setRanking(calculateRanking)
    setCurrentPage(1) // Resetar para primeira página quando ranking mudar
  }, [calculateRanking])

  // Paginação
  const totalPages = Math.ceil(ranking.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedRanking = ranking.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value))
    setCurrentPage(1)
  }

  // Carregar vendedores disponíveis
  const loadVendedores = async () => {
    setLoadingVendedores(true)
    try {
      let vendedoresList: Array<{id: number, name: string, establishment_name?: string}> = []

      if (isGestorOrAdmin) {
        // Para gestores/admin, buscar todos os vendedores de todos os estabelecimentos
        const establishmentsResponse = await apiService.getEstablishments()
        const establishments = establishmentsResponse.data?.data || establishmentsResponse.data || []
        
        for (const establishment of establishments) {
          try {
            const usersResponse = await apiService.getEstablishmentUsers(establishment.id)
            const users = usersResponse.data?.data || usersResponse.data || []
            
            const vendedores = users.filter((user: any) => {
              const isVendedor = user.roles?.some((role: any) => role.name === 'vendedor')
              const isGerente = user.roles?.some((role: any) => role.name === 'gerente')
              return (isVendedor || isGerente) && user.is_active !== false
            })
            
            vendedores.forEach((vendedor: any) => {
              vendedoresList.push({
                id: vendedor.id,
                name: `${vendedor.name} (${establishment.name})`,
                establishment_name: establishment.name
              })
            })
          } catch (error) {
            // Ignorar erros individuais
          }
        }
      } else if (isGerente && user?.establishment_id) {
        // Para gerentes, buscar vendedores do seu estabelecimento
        const usersResponse = await apiService.getEstablishmentUsers(user.establishment_id)
        const users = usersResponse.data?.data || usersResponse.data || []
        
        const vendedores = users.filter((user: any) => {
          const isVendedor = user.roles?.some((role: any) => role.name === 'vendedor')
          const isGerente = user.roles?.some((role: any) => role.name === 'gerente')
          return (isVendedor || isGerente) && user.is_active !== false
        })
        
        vendedores.forEach((vendedor: any) => {
          vendedoresList.push({
            id: vendedor.id,
            name: vendedor.name
          })
        })
      } else if (isVendedor && user?.id) {
        // Para vendedores, apenas ele mesmo
        vendedoresList.push({
          id: user.id,
          name: user.name || 'Você'
        })
      }

      setVendedoresDisponiveis(vendedoresList)
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error)
      setVendedoresDisponiveis([])
    } finally {
      setLoadingVendedores(false)
    }
  }

  // Carregar vendas ao montar e quando filtros mudarem
  useEffect(() => {
    loadVendas()
  }, [selectedPeriod, customDateFrom, customDateTo, selectedVendedor, user])

  // Carregar vendedores ao montar
  useEffect(() => {
    loadVendedores()
  }, [user])

  // Métricas calculadas
  const metrics = useMemo(() => {
    const totalFaturamento = ranking.reduce((sum, item) => sum + item.faturamento, 0)
    const totalVendedores = new Set(ranking.map(item => item.vendedor.id)).size
    const melhorVendedor = ranking[0]?.vendedor.name || 'N/A'
    const produtoMaisVendido = ranking.reduce((prev, current) => 
      current.quantidadeVendas > prev.quantidadeVendas ? current : prev, 
      ranking[0] || { quantidadeVendas: 0, produto: 'N/A' }
    )

    return {
      totalFaturamento,
      totalVendedores,
      melhorVendedor,
      produtoMaisVendido: produtoMaisVendido.produto,
      totalVendas: ranking.reduce((sum, item) => sum + item.quantidadeVendas, 0)
    }
  }, [ranking])

  // Exportar PDF
  const exportarPDF = async () => {
    setIsExportingPDF(true)
    try {
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      let yPosition = 20

      // Cabeçalho
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Relatório de Produtos - TIM', pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 8

      // Informações do período
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      const dateRange = getDateRange(selectedPeriod, true)
      const periodoText = dateRange.from && dateRange.to 
        ? `${new Date(dateRange.from).toLocaleDateString('pt-BR')} a ${new Date(dateRange.to).toLocaleDateString('pt-BR')}`
        : 'Período não especificado'
      
      pdf.text(`Período: ${periodoText}`, 10, yPosition)
      yPosition += 8
      
      pdf.text(`Categorias: ${selectedCategories.map(c => CATEGORIAS_RANKING.find(cat => cat.value === c)?.label || c).join(', ')}`, 10, yPosition)
      yPosition += 8

      if (selectedProduct !== "todos") {
        pdf.text(`Produto: ${selectedProduct}`, 10, yPosition)
        yPosition += 8
      }

      pdf.text(`Data do relatório: ${new Date().toLocaleDateString('pt-BR')}`, 10, yPosition)
      yPosition += 15

      // Tabela
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'bold')
      
      // Cabeçalho da tabela - ajustado espaçamento
      pdf.text('Pos', 10, yPosition)
      pdf.text('Vendedor', 15, yPosition) // Reduzido de 20 para 15 (mais próximo de Pos)
      pdf.text('Produto', 55, yPosition) // Ajustado de 60 para 55
      pdf.text('Categoria', 85, yPosition) // Reduzido de 100 para 85 (mais próximo do Produto)
      pdf.text('Cliente', 100, yPosition) // Ajustado de 115 para 100 (mais próximo da Categoria)
      pdf.text('Telefone', 140, yPosition) // Aumentado de 130 para 140 (mais distante do Cliente)
      pdf.text('Faturamento', 160, yPosition) // Ajustado de 150 para 160
      pdf.text('Qtd', 180, yPosition) // Ajustado de 170 para 180
      if (isGestorOrAdmin) {
        pdf.text('Estabelecimento', 190, yPosition) // Ajustado de 180 para 190
      }
      
      yPosition += 4
      pdf.line(10, yPosition, 200, yPosition)
      yPosition += 4

      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)

      ranking.forEach((item) => {
        if (yPosition > pageHeight - 20) {
          pdf.addPage()
          yPosition = 20
        }
        
        // Escrever dados principais na primeira linha
        pdf.text(String(item.posicao), 10, yPosition)
        pdf.text(item.vendedor.name.substring(0, 20), 15, yPosition)
        pdf.text(item.produto.substring(0, 18), 55, yPosition) // Reduzido de 25 para 18 caracteres
        pdf.text(item.categoria.substring(0, 15), 85, yPosition)
        
        // Escrever faturamento e quantidade na primeira linha
        pdf.text(`R$ ${item.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 160, yPosition)
        pdf.text(String(item.quantidadeVendas), 180, yPosition)
        if (isGestorOrAdmin && item.vendedor.establishment) {
          pdf.text(item.vendedor.establishment.substring(0, 20), 190, yPosition)
        }
        
        // Escrever todos os clientes e telefones em linhas separadas
        if (item.clientes.length > 0) {
          item.clientes.forEach((cliente, index) => {
            if (index > 0) {
              yPosition += 3
              if (yPosition > pageHeight - 20) {
                pdf.addPage()
                yPosition = 20
                // Re-escrever cabeçalhos se necessário
                pdf.setFont('helvetica', 'normal')
                pdf.setFontSize(7)
              }
            }
            
            const clienteNome = cliente.nome.substring(0, 20)
            const clienteTelefone = cliente.telefone.substring(0, 14)
            
            // Se não for a primeira linha, deixar vazias as colunas anteriores
            if (index > 0) {
              pdf.text('', 10, yPosition) // Posição
              pdf.text('', 15, yPosition) // Vendedor
              pdf.text('', 55, yPosition) // Produto
              pdf.text('', 85, yPosition) // Categoria
            }
            
            pdf.text(clienteNome, 100, yPosition)
            pdf.text(clienteTelefone, 140, yPosition)
          })
        } else {
          // Se não houver clientes, escrever "Não informado"
          pdf.text('Não informado', 100, yPosition)
          pdf.text('Não informado', 140, yPosition)
        }
        
        yPosition += 5
      })

      pdf.save(`ranking_produtos_${Date.now()}.pdf`)
      toast.success('PDF exportado com sucesso!')
    } catch (error) {
      console.error('Erro ao exportar PDF:', error)
      toast.error('Erro ao exportar PDF')
    } finally {
      setIsExportingPDF(false)
    }
  }

  // Exportar Excel
  const exportarExcel = async () => {
    setIsExportingExcel(true)
    try {
      const data: any[] = []
      
      // Cabeçalho
      const headerRow: any[] = ['Posição', 'Vendedor', 'Produto', 'Categoria', 'Cliente', 'Telefone', 'Faturamento', 'Quantidade', 'Ticket Médio']
      if (isGestorOrAdmin) {
        headerRow.push('Estabelecimento')
      }
      data.push(headerRow)

      // Dados
      ranking.forEach((item) => {
        // Se houver múltiplos clientes, criar uma linha para cada cliente
        if (item.clientes.length > 0) {
          item.clientes.forEach((cliente, index) => {
            const row: any[] = [
              index === 0 ? item.posicao : '', // Posição apenas na primeira linha
              index === 0 ? item.vendedor.name : '', // Vendedor apenas na primeira linha
              index === 0 ? item.produto : '', // Produto apenas na primeira linha
              index === 0 ? item.categoria : '', // Categoria apenas na primeira linha
              cliente.nome,
              cliente.telefone,
              index === 0 ? item.faturamento : '', // Faturamento apenas na primeira linha
              index === 0 ? item.quantidadeVendas : '', // Quantidade apenas na primeira linha
              index === 0 ? item.ticketMedio : '' // Ticket médio apenas na primeira linha
            ]
            if (isGestorOrAdmin) {
              row.push(index === 0 ? (item.vendedor.establishment || 'N/A') : '')
            }
            data.push(row)
          })
        } else {
          // Se não houver clientes, criar linha vazia
          const row: any[] = [
            item.posicao,
            item.vendedor.name,
            item.produto,
            item.categoria,
            'Não informado',
            'Não informado',
            item.faturamento,
            item.quantidadeVendas,
            item.ticketMedio
          ]
          if (isGestorOrAdmin) {
            row.push(item.vendedor.establishment || 'N/A')
          }
          data.push(row)
        }
      })

      const ws = XLSX.utils.aoa_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Ranking Produtos')
      XLSX.writeFile(wb, `ranking_produtos_${Date.now()}.xlsx`)

      toast.success('Excel exportado com sucesso!')
    } catch (error) {
      console.error('Erro ao exportar Excel:', error)
      toast.error('Erro ao exportar Excel')
    } finally {
      setIsExportingExcel(false)
    }
  }

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category)
      } else {
        return [...prev, category]
      }
    })
  }

  return (
    <ProtectedPage requiredPermission="relatorios-ranking-produtos">
      <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Trophy className="w-8 h-8" style={{ color: '#0026d9' }} />
          Relatório de Produtos
        </h2>
        <p className="text-muted-foreground mt-2">Melhores vendedores por produto e categoria</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Configure os filtros para o ranking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={selectedPeriod} onValueChange={(value) => {
                setSelectedPeriod(value)
                // Limpar datas quando mudar de período pré-definido
                if (value !== 'custom') {
                  setCustomDateFrom('')
                  setCustomDateTo('')
                }
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1mes">Mês Atual</SelectItem>
                  <SelectItem value="mesAnterior">Mês Anterior</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Input
                type="date"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                placeholder="Selecione a data inicial"
              />
            </div>

            <div className="space-y-2">
              <Label>Data Final</Label>
              <Input
                type="date"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                placeholder="Selecione a data final"
              />
            </div>

            <div className="space-y-2">
              <Label>Vendedor</Label>
              <Select 
                value={selectedVendedor?.toString() || "todos"} 
                onValueChange={(value) => {
                  if (value === "todos") {
                    setSelectedVendedor(null)
                  } else {
                    setSelectedVendedor(parseInt(value))
                  }
                }}
                disabled={loadingVendedores || (isVendedor && !isGestorOrAdmin && !isGerente)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingVendedores ? "Carregando..." : "Todos os Vendedores"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Vendedores</SelectItem>
                  {vendedoresDisponiveis.map((vendedor) => (
                    <SelectItem key={vendedor.id} value={vendedor.id.toString()}>
                      {vendedor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isVendedor && !isGestorOrAdmin && !isGerente && (
                <p className="text-xs text-muted-foreground">
                  Você só pode visualizar seus próprios dados
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Produto</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Produtos</SelectItem>
                  {products.map((produto) => (
                    <SelectItem key={produto} value={produto}>
                      {produto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4">
            <Label className="mb-2 block">Categorias</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIAS_RANKING.map((categoria) => (
                <Button
                  key={categoria.value}
                  variant={selectedCategories.includes(categoria.value) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleCategoryToggle(categoria.value)}
                >
                  {categoria.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Métricas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Vendedores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5" />
              {loading ? '...' : metrics.totalVendedores}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              {loading ? '...' : `R$ ${metrics.totalFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Melhor Vendedor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              <span className="text-lg">{loading ? '...' : metrics.melhorVendedor}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {loading ? '...' : metrics.totalVendas}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Ranking */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Relatório de Produtos</CardTitle>
              <CardDescription>
                Ordenado por maior faturamento por produto
                {ranking.length > 0 && (
                  <span className="block mt-1">
                    Mostrando {startIndex + 1} a {Math.min(endIndex, ranking.length)} de {ranking.length} resultados
                  </span>
                )}
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowExportModal(true)}
              disabled={loading || ranking.length === 0}
              className="text-white"
              style={{ backgroundColor: '#0026d9' }}
              onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#001a99'}
              onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#0026d9'}
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <PanelTableSkeleton rows={10} columns={8} />
          ) : ranking.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Nenhum dado encontrado para os filtros selecionados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ borderSpacing: 0 }}>
                <thead>
                  <tr className="border-b border-secondary">
                    <th className="text-left p-3 font-medium text-muted-foreground">Posição</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Vendedor</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Produto</th>
                    <th className="text-left py-3 font-medium text-muted-foreground" style={{ paddingLeft: '12px', paddingRight: '4px' }}>Categoria</th>
                    <th className="text-left py-3 font-medium text-muted-foreground" style={{ paddingLeft: '4px', paddingRight: '12px' }}>Cliente</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Telefone</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Faturamento</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Qtd Vendas</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Ticket Médio</th>
                    {isGestorOrAdmin && (
                      <th className="text-left p-3 font-medium text-muted-foreground">Estabelecimento</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRanking.map((item) => {
                    // Se houver múltiplos clientes, mostrar o primeiro e indicar quantos há
                    const primeiroCliente = item.clientes[0] || { nome: 'Não informado', telefone: 'Não informado' }
                    const totalClientes = item.clientes.length
                    
                    return (
                      <tr key={`${item.vendedor.id}-${item.produto}-${item.posicao}`} className="border-b border-secondary hover:bg-secondary/50">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {item.posicao <= 3 && (
                              <Trophy className={`w-4 h-4 ${
                                item.posicao === 1 ? 'text-yellow-500' :
                                item.posicao === 2 ? 'text-gray-400' :
                                'text-orange-500'
                              }`} />
                            )}
                            <span className="font-semibold">{item.posicao}º</span>
                          </div>
                        </td>
                        <td className="p-3 font-medium">{item.vendedor.name}</td>
                        <td className="p-3">{item.produto}</td>
                        <td className="py-3 font-medium text-muted-foreground" style={{ paddingLeft: '12px', paddingRight: '4px' }}>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {item.categoria}
                          </span>
                        </td>
                        <td className="py-3" style={{ paddingLeft: '4px', paddingRight: '12px' }}>
                          <div className="space-y-1">
                            <div className="font-medium">{primeiroCliente.nome}</div>
                            {totalClientes > 1 && (
                              <div className="text-xs text-muted-foreground">
                                +{totalClientes - 1} outro(s) cliente(s)
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="space-y-1">
                            <div>{primeiroCliente.telefone}</div>
                            {totalClientes > 1 && (
                              <div className="text-xs text-muted-foreground">
                                {item.clientes.slice(1).map((c, idx) => (
                                  <div key={idx} className="mt-1">{c.telefone}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right font-semibold">
                          R$ {item.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right">{item.quantidadeVendas}</td>
                        <td className="p-3 text-right">
                          R$ {item.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        {isGestorOrAdmin && (
                          <td className="p-3 text-sm text-muted-foreground">
                            {item.vendedor.establishment || 'N/A'}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Controles de Paginação */}
          {ranking.length > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Label htmlFor="items-per-page" className="text-sm font-medium text-muted-foreground">
                  Itens por página:
                </Label>
                <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="15">15</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="w-10"
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>

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

      {/* Modal de Exportação */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Opções de Exportação</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Exportar ranking com os filtros aplicados
                </p>
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    <strong>Período:</strong> {
                      customDateFrom && customDateTo ?
                        `${new Date(customDateFrom).toLocaleDateString('pt-BR')} a ${new Date(customDateTo).toLocaleDateString('pt-BR')}` :
                        selectedPeriod === '1mes' ? 'Mês Atual' :
                        selectedPeriod === 'mesAnterior' ? 'Mês Anterior' :
                        'Não especificado'
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Categorias:</strong> {selectedCategories.map(c => CATEGORIAS_RANKING.find(cat => cat.value === c)?.label || c).join(', ')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Vendedor:</strong> {
                      selectedVendedor === null 
                        ? 'Todos os Vendedores' 
                        : vendedoresDisponiveis.find(v => v.id === selectedVendedor)?.name || 'Não encontrado'
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Produto:</strong> {selectedProduct === 'todos' ? 'Todos os Produtos' : selectedProduct}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Total de itens:</strong> {ranking.length}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExportModal(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                {/* Filtros */}
                <div>
                  <h3 className="font-semibold text-sm mb-4">Filtros</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Período</Label>
                      <Select value={selectedPeriod} onValueChange={(value) => {
                        setSelectedPeriod(value)
                        if (value !== 'custom') {
                          setCustomDateFrom('')
                          setCustomDateTo('')
                        }
                      }}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1mes">Mês Atual</SelectItem>
                          <SelectItem value="mesAnterior">Mês Anterior</SelectItem>
                          <SelectItem value="custom">Personalizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Data Inicial</Label>
                      <Input
                        type="date"
                        value={customDateFrom}
                        onChange={(e) => setCustomDateFrom(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Data Final</Label>
                      <Input
                        type="date"
                        value={customDateTo}
                        onChange={(e) => setCustomDateTo(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Vendedor</Label>
                      <Select 
                        value={selectedVendedor?.toString() || "todos"} 
                        onValueChange={(value) => {
                          if (value === "todos") {
                            setSelectedVendedor(null)
                          } else {
                            setSelectedVendedor(parseInt(value))
                          }
                        }}
                        disabled={loadingVendedores || (isVendedor && !isGestorOrAdmin && !isGerente)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={loadingVendedores ? "Carregando..." : "Todos os Vendedores"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos os Vendedores</SelectItem>
                          {vendedoresDisponiveis.map((vendedor) => (
                            <SelectItem key={vendedor.id} value={vendedor.id.toString()}>
                              {vendedor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Produto</Label>
                      <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos os Produtos</SelectItem>
                          {products.map((produto) => (
                            <SelectItem key={produto} value={produto}>
                              {produto}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Label className="mb-2 block">Categorias</Label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIAS_RANKING.map((categoria) => (
                        <Button
                          key={categoria.value}
                          variant={selectedCategories.includes(categoria.value) ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleCategoryToggle(categoria.value)}
                        >
                          {categoria.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Formato de Exportação */}
                <div>
                  <h3 className="font-semibold text-sm mb-2">Formato de Exportação</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Selecione o formato desejado para exportar o ranking
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t">
              <Button
                variant="outline"
                onClick={() => setShowExportModal(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  await exportarPDF()
                  setShowExportModal(false)
                }}
                disabled={isExportingPDF || ranking.length === 0}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isExportingPDF ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                {isExportingPDF ? 'Gerando PDF...' : 'Exportar PDF'}
              </Button>
              <Button
                onClick={async () => {
                  await exportarExcel()
                  setShowExportModal(false)
                }}
                disabled={isExportingExcel || ranking.length === 0}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isExportingExcel ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                {isExportingExcel ? 'Gerando Excel...' : 'Exportar Excel'}
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </ProtectedPage>
  )
}

