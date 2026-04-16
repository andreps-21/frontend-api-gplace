"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Download, User, Award, ChevronDown, ChevronRight, X, Loader2 } from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'
import { toast } from "sonner"
import html2canvas from 'html2canvas'
import { useAuth } from "@/lib/auth"
import { usePermissions } from "@/lib/use-permissions"
import { apiService } from "@/lib/api"
import { useVendedoresGestor } from "@/hooks/useVendedoresGestor"
import { useVendedoresComVendas } from "@/hooks/useVendedoresComVendas"
import { useDateRange } from "@/hooks/useDateRange"
import { useVendasPaginacao, FiltrosVendas } from "@/hooks/useVendasPaginacao"
import { calculateVendedorRanking as calculateVendedorRankingUtil } from "@/lib/calculateVendedorRanking"
import { RankingTableSkeleton } from "@/components/ui/ranking-table-skeleton"
import { unmaskPhone } from "@/lib/masks"

// Dados mock removidos - agora consumindo apenas dados reais da API

export default function RelatorioVendedorPage() {
  const [selectedVendedor, setSelectedVendedor] = useState<{id: number | null, name: string}>({id: null, name: "todos"})
  const [vendedoresDisponiveis, setVendedoresDisponiveis] = useState<Array<{id: number | null, name: string}>>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState("1ano")
  const [customDateFrom, setCustomDateFrom] = useState("")
  const [customDateTo, setCustomDateTo] = useState("")
  
  // Hooks de autenticação e permissões
  const { user } = useAuth()
  const { hasRole } = usePermissions()
  
  // Hook para gestores carregarem todos os vendedores
  const { vendedores: vendedoresGestor, loading: loadingGestor, error: errorGestor } = useVendedoresGestor()
  
  // Hook para carregar vendedores com vendas do estabelecimento
  const { vendedores: vendedoresComVendas, loading: loadingVendedores, error: errorVendedores } = useVendedoresComVendas(user?.establishment_id || null)
  
  // Hook para calcular período de datas
  const { dateRange } = useDateRange(selectedPeriod)
  
  
  const [reportMetrics, setReportMetrics] = useState({
    totalVendas: 0,
    faturamento: 0,
    comissao: 0,
    ticketMedio: 0,
    ranking: [] as any[]
  })
  const [expandedSale, setExpandedSale] = useState<number | null>(null)
  const [rankingCompleto, setRankingCompleto] = useState<Array<{nome: string, faturamento: number, posicao: number, establishment?: { id: number; name: string; cnpj?: string } | null}>>([])
  const [isAllVendorsMode, setIsAllVendorsMode] = useState(true)
  const [isLoadingRanking, setIsLoadingRanking] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportOptions, setExportOptions] = useState({
    includeDate: true,
    useSaleDate: true, // Usar data da venda (sale_date)
    useCreatedAt: true, // Usar data de criação (created_at)
    includeClient: true,
    includeCPF: true,
    includeProduct: true,
    includeCategory: true,
    includeValue: true,
    includePayment: true,
    includeMeuTim: true,
    includePortability: true,
    includeIMEI: true,
    includeICCID: true,
    includeActivationNumber: true,
    includeProvisionalNumber: true,
    includeSeller: true,
    includeEstablishment: true,
    includeSummary: true,
    includeRanking: true
  })
  const [filterActivationNumber, setFilterActivationNumber] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("")
  const [categoriasDisponiveis, setCategoriasDisponiveis] = useState<Array<{id: number, name: string}>>([])
  const [loadingCategorias, setLoadingCategorias] = useState(false)
  const [isExportingPDF, setIsExportingPDF] = useState(false)
  const [isExportingExcel, setIsExportingExcel] = useState(false)
  
  // Hook de paginação para vendas
  const {
    vendas: salesData,
    loading: loadingSales,
    error: salesError,
    pagination: salesPagination,
    carregarVendas,
    proximaPagina,
    paginaAnterior,
    irParaPagina,
    aplicarFiltros,
    limparFiltros
  } = useVendasPaginacao()
  
  // Verificação direta do role para evitar problemas de timing
  const userRole = user?.role || user?.roles?.[0]?.name || null
  const isVendedorDirect = userRole === 'vendedor'
  const isGerenteDirect = userRole === 'gerente'
  const isGestorDirect = userRole === 'gestor'
  
  
  
  // Função para calcular período baseado na seleção
  const getDateRange = (period: string, useCustomDates: boolean = false) => {
    // Se as datas customizadas estiverem preenchidas e devem ser usadas, usar elas
    if (useCustomDates && customDateFrom && customDateTo) {
      return {
        dateFrom: customDateFrom,
        dateTo: customDateTo
      }
    }
    
    // Se for período customizado na página, usar as datas informadas
    if (period === 'custom' && customDateFrom && customDateTo) {
      return {
        dateFrom: customDateFrom,
        dateTo: customDateTo
      }
    }
    
    // Usar data atual do sistema
    const now = new Date()
    const dateTo = now.toISOString().split('T')[0]
    
    switch (period) {
      case '1mes':
        const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        return {
          dateFrom: oneMonthAgo.toISOString().split('T')[0],
          dateTo
        }
      case '3meses':
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
        return {
          dateFrom: threeMonthsAgo.toISOString().split('T')[0],
          dateTo
        }
      case '6meses':
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
        return {
          dateFrom: sixMonthsAgo.toISOString().split('T')[0],
          dateTo
        }
      case '1ano':
        const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        return {
          dateFrom: oneYearAgo.toISOString().split('T')[0],
          dateTo
        }
      default:
        return {
          dateFrom: new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()).toISOString().split('T')[0],
          dateTo
        }
    }
  }
  
  // Estado para controlar se já está calculando ranking
  const [calculandoRanking, setCalculandoRanking] = useState(false)
  
  // Função para carregar todas as vendas do período (todas as páginas)
  const carregarTodasVendas = async () => {
    try {
      const filtros: FiltrosVendas = {
        establishment_id: user?.establishment_id || undefined
      }
      
      // Aplicar filtro de vendedor se um vendedor específico foi selecionado
      if (selectedVendedor.id !== null) {
        filtros.seller_id = selectedVendedor.id
      }
      
      // Aplicar filtro de data para todos os períodos exceto "todos"
      if (selectedPeriod && selectedPeriod !== 'todos') {
        filtros.date_from = dateRange.date_from
        filtros.date_to = dateRange.date_to
      }
      
      
      // Primeiro, obter informações de paginação
      const primeiraPagina = await apiService.getSales({
        ...filtros,
        page: 1,
        per_page: 15
      })
      
      const totalVendas = primeiraPagina.data?.total || 0
      const totalPaginas = primeiraPagina.data?.last_page || 1
      
      
      if (totalPaginas === 1) {
        // Se só há uma página, retornar os dados já carregados
        return primeiraPagina.data?.data || []
      }
      
      // Carregar todas as páginas
      const todasVendas = [...(primeiraPagina.data?.data || [])]
      
      for (let pagina = 2; pagina <= totalPaginas; pagina++) {
        console.log(`📊 PDF - Carregando página ${pagina} de ${totalPaginas}...`)
        
        const paginaAtual = await apiService.getSales({
          ...filtros,
          page: pagina,
          per_page: 15
        })
        
        if (paginaAtual.data?.data) {
          todasVendas.push(...paginaAtual.data.data)
          console.log(`📊 PDF - Página ${pagina}: +${paginaAtual.data.data.length} vendas (total: ${todasVendas.length})`)
        }
      }
      
      console.log('📊 PDF - Carregamento concluído:', {
        totalEsperado: totalVendas,
        totalCarregado: todasVendas.length,
        paginasProcessadas: totalPaginas
      })
      
      return todasVendas
    } catch (error) {
      console.error('Erro ao carregar todas as vendas:', error)
      return []
    }
  }

  // Função para carregar todas as vendas (sem paginação) com filtro específico
  const carregarTodasVendasComFiltro = async (periodo: string, dataInicial: string, dataFinal: string) => {
    try {
      // Primeira requisição para obter a paginação
      const filtros: any = {
        page: 1,
        per_page: 15,
        include: 'seller,establishment,customer,category',
      }

      // Aplicar filtro de vendedor
      if (selectedVendedor.id !== null) {
        filtros.seller_id = selectedVendedor.id
      }

      // Aplicar filtro de data baseado no período fornecido
      if (periodo && periodo !== 'todos') {
        filtros.date_from = dataInicial
        filtros.date_to = dataFinal
      }

      const primeiraPagina = await apiService.getSales(filtros)
      
      const totalPaginas = primeiraPagina.data?.last_page || 1
      let todasVendas = [...(primeiraPagina.data?.data || [])]
      
      // Carregar páginas restantes
      if (totalPaginas > 1) {
        for (let pagina = 2; pagina <= totalPaginas; pagina++) {
          const paginaAtual = await apiService.getSales({ ...filtros, page: pagina })
          if (paginaAtual.data?.data) {
            todasVendas.push(...paginaAtual.data.data)
          }
        }
      }
      
      // Aplicar filtro de categoria se fornecido
      if (filterCategory && filterCategory.trim() !== '') {
        todasVendas = todasVendas.filter((venda: any) => {
          const categoriaVenda = venda.category?.name || ''
          return categoriaVenda.toLowerCase() === filterCategory.toLowerCase()
        })
      }
      
      return todasVendas
    } catch (error) {
      console.error('Erro ao carregar vendas:', error)
      return []
    }
  }
  
  // Função para exportar Excel
  const exportarExcel = async (datasCustomizadas?: {from?: string, to?: string}) => {
    setIsExportingExcel(true)
    try {
      // Reutilizar a mesma lógica do PDF para obter as vendas
      let periodoParaFiltro = selectedPeriod
      let dataInicial = ''
      let dataFinal = ''
      
      const customFrom = datasCustomizadas?.from || customDateFrom
      const customTo = datasCustomizadas?.to || customDateTo
      
      if (customFrom && customTo) {
        periodoParaFiltro = 'custom'
        dataInicial = customFrom
        dataFinal = customTo
      } else {
        periodoParaFiltro = 'todos'
        dataInicial = ''
        dataFinal = ''
      }
      
      let todasVendas = await carregarTodasVendasComFiltro(periodoParaFiltro, dataInicial, dataFinal)
      
      // Aplicar filtro por número de ativação se fornecido
      if (filterActivationNumber && filterActivationNumber.trim()) {
        todasVendas = todasVendas.filter((venda: any) => 
          venda.activation_number && 
          venda.activation_number.toString().toLowerCase().includes(filterActivationNumber.toLowerCase().trim())
        )
      }
      
      // Criar dados para o Excel
      const data: any[] = []
      
      // Cabeçalho da tabela
      const headerRow: any[] = []
      if (exportOptions.includeDate) {
        if (exportOptions.useSaleDate) headerRow.push('Data da Venda')
        if (exportOptions.useCreatedAt) headerRow.push('Data de Criação')
      }
      if (exportOptions.includeClient) headerRow.push('Cliente')
      if (exportOptions.includeCPF) headerRow.push('CPF')
      if (exportOptions.includeProduct) headerRow.push('Produto')
      if (exportOptions.includeCategory) headerRow.push('Categoria')
      if (exportOptions.includeValue) headerRow.push('Valor')
      if (exportOptions.includePayment) headerRow.push('Pagamento')
      if (exportOptions.includeMeuTim) headerRow.push('Meu TIM')
      if (exportOptions.includeIMEI) headerRow.push('IMEI')
      if (exportOptions.includeICCID) headerRow.push('ICCID')
      if (exportOptions.includeActivationNumber) headerRow.push('Número de Ativação')
      if (exportOptions.includeProvisionalNumber) headerRow.push('Número Provisório')
      if (exportOptions.includePortability) headerRow.push('Portabilidade')
      if (exportOptions.includeSeller) headerRow.push('Vendedor')
      if (exportOptions.includeEstablishment) headerRow.push('Estabelecimento')
      data.push(headerRow)
      
      todasVendas.forEach((venda: any) => {
        const row: any = []
        if (exportOptions.includeDate) {
          if (exportOptions.useSaleDate) {
            const saleDate = venda.sale_date 
              ? new Date(venda.sale_date).toLocaleDateString('pt-BR')
              : (venda.created_at ? new Date(venda.created_at).toLocaleDateString('pt-BR') : 'N/A')
            row.push(saleDate)
          }
          if (exportOptions.useCreatedAt) {
            row.push(venda.created_at ? new Date(venda.created_at).toLocaleDateString('pt-BR') : 'N/A')
          }
        }
        if (exportOptions.includeClient) row.push(venda.customer?.person?.name || venda.customer?.name || 'N/A')
        if (exportOptions.includeCPF) row.push(venda.customer?.person?.nif || '-')
        if (exportOptions.includeProduct) row.push(venda.product_name || 'N/A')
        if (exportOptions.includeCategory) row.push(venda.category?.name || 'N/A')
        if (exportOptions.includeValue) row.push(`R$ ${parseFloat(venda.total_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
        if (exportOptions.includePayment) row.push(venda.payment_method || '-')
        if (exportOptions.includeMeuTim) row.push(venda.meu_tim ? 'SIM' : 'NÃO')
        if (exportOptions.includeIMEI) row.push(venda.imei || '-')
        if (exportOptions.includeICCID) row.push(venda.iccid || 'N/A')
        if (exportOptions.includeActivationNumber) {
          // Remover formatação do número de ativação (parênteses, espaços, traços, etc)
          const activationNumber = venda.activation_number 
            ? unmaskPhone(venda.activation_number.toString())
            : '-'
          row.push(activationNumber)
        }
        if (exportOptions.includeProvisionalNumber) {
          // Remover formatação do número provisório (parênteses, espaços, traços, etc)
          const provisionalNumber = venda.provisional_number 
            ? unmaskPhone(venda.provisional_number.toString())
            : '-'
          row.push(provisionalNumber)
        }
        if (exportOptions.includePortability) row.push(venda.portability ? 'SIM' : 'NÃO')
        if (exportOptions.includeSeller) row.push(venda.seller_name || venda.seller?.name || 'N/A')
        if (exportOptions.includeEstablishment) row.push(venda.establishment?.name ?? '—')
        data.push(row)
      })
      
      const ws = XLSX.utils.aoa_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Vendas')
      XLSX.writeFile(wb, `relatorio_vendas_${Date.now()}.xlsx`)
      
      toast.success('Relatório Excel exportado com sucesso!')
    } catch (error) {
      console.error('Erro ao exportar Excel:', error)
      toast.error('Erro ao exportar Excel.')
    } finally {
      setIsExportingExcel(false)
    }
  }

  // Função para exportar PDF
  const exportarPDF = async (datasCustomizadas?: {from?: string, to?: string}) => {
    setIsExportingPDF(true)
    try {
      // Determinar qual período usar para o filtro
      let periodoParaFiltro = selectedPeriod
      let dataInicial = ''
      let dataFinal = ''
      
      // Usar datas customizadas passadas como parâmetro ou do estado
      const customFrom = datasCustomizadas?.from || customDateFrom
      const customTo = datasCustomizadas?.to || customDateTo
      
      // Se datas customizadas estão preenchidas, usar elas
      if (customFrom && customTo) {
        periodoParaFiltro = 'custom'
        dataInicial = customFrom
        dataFinal = customTo
      } else {
        // Se não houver datas customizadas, usar TODOS os dados (sem filtro de data)
        periodoParaFiltro = 'todos'
        dataInicial = ''
        dataFinal = ''
      }
      
      // Carregar vendas com o filtro correto
      let todasVendas = await carregarTodasVendasComFiltro(periodoParaFiltro, dataInicial, dataFinal)
      
      // Aplicar filtro por número de ativação se fornecido
      if (filterActivationNumber && filterActivationNumber.trim()) {
        todasVendas = todasVendas.filter((venda: any) => 
          venda.activation_number && 
          venda.activation_number.toString().toLowerCase().includes(filterActivationNumber.toLowerCase().trim())
        )
      }
      
      // Recalcular métricas baseado nas vendas filtradas
      const totalVendasFiltradas = todasVendas.length
      const faturamentoFiltrado = todasVendas.reduce((sum: number, v: any) => sum + parseFloat(v.total_price || 0), 0)
      const ticketMedioFiltrado = totalVendasFiltradas > 0 ? faturamentoFiltrado / totalVendasFiltradas : 0
      const comissaoFiltrada = todasVendas.reduce((sum: number, v: any) => sum + parseFloat(v.commission || 0), 0)
      
      
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      let yPosition = 20

      // Cabeçalho do relatório
      pdf.setFontSize(20)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Relatório de Vendas - TIM', pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 15

      // Informações do filtro aplicado
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`Vendedor: ${selectedVendedor.name}`, 20, yPosition)
      yPosition += 8
      
      const periodoText = {
        '1mes': 'Último mês',
        '3meses': 'Últimos 3 meses', 
        '6meses': 'Últimos 6 meses',
        '1ano': 'Último ano',
        'todos': 'Todos os períodos',
        'custom': customDateFrom && customDateTo ? 
          `${new Date(customDateFrom).toLocaleDateString('pt-BR')} a ${new Date(customDateTo).toLocaleDateString('pt-BR')}` : 
          'Período personalizado'
      }[selectedPeriod] || 'Período não especificado'
      
      // Usar o período que foi efetivamente aplicado no filtro
      let periodoFinal = ''
      if (customFrom && customTo) {
        periodoFinal = `${new Date(customFrom + 'T00:00:00').toLocaleDateString('pt-BR')} a ${new Date(customTo + 'T00:00:00').toLocaleDateString('pt-BR')}`
      } else {
        periodoFinal = 'Todos os períodos'
      }
      
      pdf.text(`Período: ${periodoFinal}`, 20, yPosition)
      yPosition += 8
      
      const dataAtual = new Date().toLocaleDateString('pt-BR')
      pdf.text(`Data do relatório: ${dataAtual}`, 20, yPosition)
      yPosition += 15

      // Métricas do vendedor
      if (exportOptions.includeSummary) {
        pdf.setFontSize(14)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Resumo de Desempenho', 20, yPosition)
      yPosition += 10

      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
        pdf.text(`Total de Vendas: ${totalVendasFiltradas}`, 20, yPosition)
        yPosition += 6
        pdf.text(`Total de Linhas no Relatório: ${totalVendasFiltradas}`, 20, yPosition)
        yPosition += 6
        pdf.text(`Faturamento: R$ ${faturamentoFiltrado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, yPosition)
        yPosition += 6
        pdf.text(`Ticket Médio: R$ ${ticketMedioFiltrado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, yPosition)
        yPosition += 6
        pdf.text(`Comissão: R$ ${comissaoFiltrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, yPosition)
        yPosition += 15
      }

      // Recalcular ranking baseado nas vendas filtradas
      let rankingFiltrado: any[] = []
      if (exportOptions.includeRanking) {
        // Primeiro, buscar todos os vendedores para ter os nomes
        let usuarios: any[] = []
        
        try {
          if (user?.establishment_id) {
            const usersResponse = await apiService.getEstablishmentUsers(user.establishment_id)
            usuarios = usersResponse.data?.data || []
          } else {
            const usersResponse = await apiService.getUsers()
            usuarios = usersResponse.data?.data || []
          }
        } catch (error) {
          console.error('Erro ao buscar vendedores:', error)
        }
        
        // Criar mapa de IDs para nomes
        const sellerNamesMap = new Map<number, string>()
        usuarios.forEach((usuario: any) => {
          sellerNamesMap.set(usuario.id, usuario.name)
        })
        
        // Calcular ranking apenas com as vendas do período filtrado
        const rankingMap = new Map<number, {name: string, vendas: number, faturamento: number, establishment?: string}>()
        
        todasVendas.forEach((venda: any) => {
          const sellerId = venda.seller_id
          const sellerName = sellerNamesMap.get(sellerId) || venda.seller?.name || venda.seller_name || 'Vendedor não identificado'
          const establishmentName = venda.establishment?.name ?? ''
          
          if (!rankingMap.has(sellerId)) {
            rankingMap.set(sellerId, {
              name: sellerName,
              vendas: 0,
              faturamento: 0,
              establishment: establishmentName
            })
          }
          
          const sellerData = rankingMap.get(sellerId)!
          sellerData.vendas += 1
          sellerData.faturamento += parseFloat(venda.total_price || 0)
          if (establishmentName && !sellerData.establishment) sellerData.establishment = establishmentName
        })
        
        // Converter para array e ordenar por faturamento
        rankingFiltrado = Array.from(rankingMap.values())
          .sort((a, b) => b.faturamento - a.faturamento)
          .map((seller, index) => ({
            ...seller,
            posicao: index + 1
          }))
        
      }

      // Ranking de vendedores
      if (exportOptions.includeRanking && rankingFiltrado.length > 0) {
        pdf.setFontSize(14)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Ranking de Vendedores', 20, yPosition)
        yPosition += 10

        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'bold')
        
        // Cabeçalho da tabela
        pdf.text('Pos.', 10, yPosition)
        pdf.text('Vendedor', 25, yPosition)
        pdf.text('Estabelecimento', 75, yPosition)
        pdf.text('Faturamento', 115, yPosition)
        pdf.text('Status', 155, yPosition)
        yPosition += 5

        // Linha separadora
        pdf.line(10, yPosition, 200, yPosition)
        yPosition += 5

        pdf.setFont('helvetica', 'normal')
        
        rankingFiltrado.forEach((vendedor, index) => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage()
            yPosition = 20
          }

          const status = vendedor.posicao === 1 ? 'Líder' :
                       vendedor.posicao === 2 ? 'Vice' :
                       vendedor.posicao === 3 ? 'Terceiro' :
                       `${vendedor.posicao}º lugar`

          pdf.text(String(vendedor.posicao || ''), 10, yPosition)
          pdf.text(String(vendedor.name || '').substring(0, 22), 25, yPosition)
          pdf.text(String(vendedor.establishment || '—').substring(0, 22), 75, yPosition)
          pdf.text(`R$ ${(vendedor.faturamento || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 115, yPosition)
          pdf.text(String(status || ''), 155, yPosition)
          yPosition += 6
        })
      }

      // Detalhes das vendas - Carregar TODAS as vendas
      if (salesData && salesData.length > 0) {
        yPosition += 10
        if (yPosition > pageHeight - 40) {
          pdf.addPage()
          yPosition = 20
        }

        pdf.setFontSize(14)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Detalhes das Vendas', 20, yPosition)
        yPosition += 10

        pdf.setFontSize(7)
        pdf.setFont('helvetica', 'bold')
        
        // Construir cabeçalho dinamicamente baseado nas opções
        const columns: Array<{type: string, x: number, width?: number}> = []
        let currentX = 10
        const columnWidth = 15
        const maxCharsPorMM = 0.5 // Aproximadamente 0.5 caracteres por mm com fonte 6
        
        if (exportOptions.includeDate) {
          if (exportOptions.useSaleDate) {
            pdf.text('Data Venda', currentX, yPosition)
            columns.push({ type: 'saleDate', x: currentX, width: 12 })
            currentX += 14
          }
          if (exportOptions.useCreatedAt) {
            pdf.text('Data Criação', currentX, yPosition)
            columns.push({ type: 'createdAt', x: currentX, width: 12 })
            currentX += 14
          }
        }
       if (exportOptions.includeClient) {
         pdf.text('Cliente', currentX, yPosition)
         columns.push({ type: 'client', x: currentX, width: 35 }) // 35mm de largura
         currentX += 40 // Largura total da coluna (incluindo margem)
       }
        if (exportOptions.includeCPF) {
          pdf.text('CPF', currentX, yPosition)
          columns.push({ type: 'cpf', x: currentX })
          currentX += columnWidth
        }
        if (exportOptions.includeProduct) {
          pdf.text('Produto', currentX, yPosition)
          columns.push({ type: 'product', x: currentX, width: 45 })
          currentX += 30 // Aumentar largura da coluna do produto
        }
        if (exportOptions.includeCategory) {
          pdf.text('Categoria', currentX, yPosition)
          columns.push({ type: 'category', x: currentX, width: 30 })
          currentX += 25
        }
        if (exportOptions.includeValue) {
          pdf.text('Valor', currentX, yPosition)
          columns.push({ type: 'value', x: currentX })
          currentX += columnWidth
        }
        if (exportOptions.includePayment) {
          pdf.text('Pag.', currentX, yPosition)
          columns.push({ type: 'payment', x: currentX, width: 20 })
          currentX += 15 // Aumentar largura da coluna de pagamento
        }
        if (exportOptions.includeMeuTim) {
          pdf.text('Meu TIM', currentX, yPosition)
          columns.push({ type: 'meuTim', x: currentX })
          currentX += columnWidth
        }
        if (exportOptions.includeIMEI) {
          pdf.text('IMEI', currentX, yPosition)
          columns.push({ type: 'imei', x: currentX })
          currentX += columnWidth
        }
        if (exportOptions.includeICCID) {
          pdf.text('ICCID', currentX, yPosition)
          columns.push({ type: 'iccid', x: currentX, width: 25 })
          currentX += 20
        }
        if (exportOptions.includeActivationNumber) {
          pdf.text('Nº Ativação', currentX, yPosition)
          columns.push({ type: 'activationNumber', x: currentX, width: 25 })
          currentX += 20
        }
        if (exportOptions.includeProvisionalNumber) {
          pdf.text('Nº Provisório', currentX, yPosition)
          columns.push({ type: 'provisionalNumber', x: currentX, width: 25 })
          currentX += 20
        }
        if (exportOptions.includePortability) {
          pdf.text('Port.', currentX, yPosition)
          columns.push({ type: 'portability', x: currentX })
          currentX += columnWidth
        }
        if (exportOptions.includeSeller) {
          pdf.text('Vendedor', currentX, yPosition)
          columns.push({ type: 'seller', x: currentX, width: 30 })
          currentX += 35
        }
        if (exportOptions.includeEstablishment) {
          pdf.text('Estabelecimento', currentX, yPosition)
          columns.push({ type: 'establishment', x: currentX, width: 28 })
          currentX += 32
        }
        
        yPosition += 4

        // Linha separadora
        pdf.line(15, yPosition, 190, yPosition)
        yPosition += 4

        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(6)
        
        // Usar as vendas já carregadas com o filtro correto
        try {
          console.log('📊 PDF - Total de vendas carregadas:', todasVendas.length)
          
          todasVendas.forEach((venda: any) => {
            if (yPosition > pageHeight - 20) {
              pdf.addPage()
              yPosition = 20
            }

            // Datas
            const saleDate = venda.sale_date 
              ? new Date(venda.sale_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
              : (venda.created_at ? new Date(venda.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'N/A')
            const createdAt = venda.created_at 
              ? new Date(venda.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
              : 'N/A'
            
            const clienteNome = venda.customer?.person?.name || venda.customer?.name || 'N/A'
            const cpf = venda.customer?.person?.nif || '-'
            const produtoNome = venda.product_name || 'N/A'
            const categoriaNome = venda.category?.name || 'N/A'
            const valor = parseFloat(venda.total_price || 0)
            
            // Método de pagamento abreviado
            const pagamento = venda.payment_method ? venda.payment_method.toUpperCase() : '-'
            
            // Meu TIM
            const meuTim = venda.meu_tim ? 'SIM' : 'NÃO'
            
            // Portabilidade
            const portabilidade = venda.portability ? 'SIM' : 'NÃO'
            
            // IMEI
            const imei = venda.imei ? venda.imei.substring(0, 8) : '-'
            
            // ICCID
            const iccid = venda.iccid || '-'
            
            // Número de Ativação (remover formatação)
            const activationNumber = venda.activation_number 
              ? unmaskPhone(venda.activation_number.toString())
              : '-'
            
            // Número Provisório (remover formatação)
            const provisionalNumber = venda.provisional_number 
              ? unmaskPhone(venda.provisional_number.toString())
              : '-'
            
            // Nome do Vendedor
            const sellerName = venda.seller_name || venda.seller?.name || 'N/A'

            // Renderizar apenas colunas selecionadas
            columns.forEach((col) => {
              switch(col.type) {
                case 'saleDate':
                  pdf.text(String(saleDate || ''), col.x, yPosition)
                  break
                case 'createdAt':
                  pdf.text(String(createdAt || ''), col.x, yPosition)
                  break
                case 'client':
                  const nomeClient = String(clienteNome || '').substring(0, 30)
                  pdf.text(nomeClient, col.x, yPosition)
                  break
                case 'cpf':
                  pdf.text(String(cpf || '').substring(0, 14), col.x, yPosition)
                  break
                case 'product':
                  const maxProdChars = col.width ? Math.floor(col.width * maxCharsPorMM) : 6
                  const nomeProduto = String(produtoNome || '').substring(0, maxProdChars)
                  pdf.text(nomeProduto, col.x, yPosition)
                  break
                case 'category':
                  const maxCatChars = col.width ? Math.floor(col.width * maxCharsPorMM) : 15
                  const nomeCategoria = String(categoriaNome || '').substring(0, maxCatChars)
                  pdf.text(nomeCategoria, col.x, yPosition)
                  break
                case 'value':
                  pdf.text(`R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, col.x, yPosition)
                  break
                case 'payment':
                  const maxPagChars = col.width ? Math.floor(col.width * maxCharsPorMM) : 10
                  const pagamentoText = String(pagamento || '').substring(0, maxPagChars)
                  pdf.text(pagamentoText, col.x, yPosition)
                  break
                case 'meuTim':
                  pdf.text(String(meuTim || ''), col.x, yPosition)
                  break
                case 'portability':
                  pdf.text(String(portabilidade || ''), col.x, yPosition)
                  break
                case 'imei':
                  pdf.text(String(imei || ''), col.x, yPosition)
                  break
                case 'iccid':
                  pdf.text(String(iccid || '').substring(0, 20), col.x, yPosition)
                  break
                case 'activationNumber':
                  pdf.text(String(activationNumber).substring(0, 15), col.x, yPosition)
                  break
                case 'provisionalNumber':
                  pdf.text(String(provisionalNumber).substring(0, 15), col.x, yPosition)
                  break
                case 'seller':
                  const maxSellerChars = col.width ? Math.floor(col.width * maxCharsPorMM) : 15
                  const nomeVendedor = String(sellerName || '').substring(0, maxSellerChars)
                  pdf.text(nomeVendedor, col.x, yPosition)
                  break
                case 'establishment':
                  const establishmentNome = String(venda.establishment?.name ?? '—').substring(0, col.width ? Math.floor(col.width * maxCharsPorMM) : 14)
                  pdf.text(establishmentNome, col.x, yPosition)
                  break
              }
            })
            yPosition += 5
          })
        } catch (error) {
          console.error('Erro ao carregar todas as vendas:', error)
          // Fallback para as vendas já carregadas
          salesData.forEach((venda: any) => {
            if (yPosition > pageHeight - 20) {
              pdf.addPage()
              yPosition = 20
            }

            // Datas
            const saleDate = venda.sale_date 
              ? new Date(venda.sale_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
              : (venda.created_at ? new Date(venda.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'N/A')
            const createdAt = venda.created_at 
              ? new Date(venda.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
              : 'N/A'
            
            const clienteNome = venda.customer?.person?.name || venda.customer?.name || 'N/A'
            const cpf = venda.customer?.person?.nif || '-'
            const produtoNome = venda.product_name || 'N/A'
            const categoriaNome = venda.category?.name || 'N/A'
            const valor = parseFloat(venda.total_price || 0)
            
            // Método de pagamento abreviado
            const pagamento = venda.payment_method ? venda.payment_method.toUpperCase() : '-'
            
            // Meu TIM
            const meuTim = venda.meu_tim ? 'SIM' : 'NÃO'
            
            // Portabilidade
            const portabilidade = venda.portability ? 'SIM' : 'NÃO'
            
            // IMEI
            const imei = venda.imei ? venda.imei.substring(0, 8) : '-'
            
            // ICCID
            const iccid = venda.iccid || '-'
            
            // Número de Ativação (remover formatação)
            const activationNumber = venda.activation_number 
              ? unmaskPhone(venda.activation_number.toString())
              : '-'
            
            // Número Provisório (remover formatação)
            const provisionalNumber = venda.provisional_number 
              ? unmaskPhone(venda.provisional_number.toString())
              : '-'
            
            // Nome do Vendedor
            const sellerName = venda.seller_name || venda.seller?.name || 'N/A'

            // Renderizar apenas colunas selecionadas
            columns.forEach((col) => {
              switch(col.type) {
                case 'saleDate':
                  pdf.text(String(saleDate || ''), col.x, yPosition)
                  break
                case 'createdAt':
                  pdf.text(String(createdAt || ''), col.x, yPosition)
                  break
                case 'client':
                  const nomeClient = String(clienteNome || '').substring(0, 35)
                  pdf.text(nomeClient, col.x, yPosition)
                  break
                case 'cpf':
                  pdf.text(String(cpf || '').substring(0, 14), col.x, yPosition)
                  break
                case 'product':
                  const maxProdChars = col.width ? Math.floor(col.width * maxCharsPorMM) : 15
                  const nomeProduto = String(produtoNome || '').substring(0, maxProdChars)
                  pdf.text(nomeProduto, col.x, yPosition)
                  break
                case 'category':
                  const maxCatChars = col.width ? Math.floor(col.width * maxCharsPorMM) : 15
                  const nomeCategoria = String(categoriaNome || '').substring(0, maxCatChars)
                  pdf.text(nomeCategoria, col.x, yPosition)
                  break
                case 'value':
                  pdf.text(`R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, col.x, yPosition)
                  break
                case 'payment':
                  const maxPagChars = col.width ? Math.floor(col.width * maxCharsPorMM) : 10
                  const pagamentoText = String(pagamento || '').substring(0, maxPagChars)
                  pdf.text(pagamentoText, col.x, yPosition)
                  break
                case 'meuTim':
                  pdf.text(String(meuTim || ''), col.x, yPosition)
                  break
                case 'portability':
                  pdf.text(String(portabilidade || ''), col.x, yPosition)
                  break
                case 'imei':
                  pdf.text(String(imei || ''), col.x, yPosition)
                  break
                case 'iccid':
                  pdf.text(String(iccid || '').substring(0, 20), col.x, yPosition)
                  break
                case 'activationNumber':
                  pdf.text(String(activationNumber).substring(0, 15), col.x, yPosition)
                  break
                case 'provisionalNumber':
                  pdf.text(String(provisionalNumber).substring(0, 15), col.x, yPosition)
                  break
                case 'seller':
                  const maxSellerChars = col.width ? Math.floor(col.width * maxCharsPorMM) : 15
                  const nomeVendedor = String(sellerName || '').substring(0, maxSellerChars)
                  pdf.text(nomeVendedor, col.x, yPosition)
                  break
                case 'establishment':
                  const establishmentNomePdf = String(venda.establishment?.name ?? '—').substring(0, col.width ? Math.floor(col.width * maxCharsPorMM) : 14)
                  pdf.text(establishmentNomePdf, col.x, yPosition)
                  break
              }
            })
            yPosition += 5
          })
        }
      }

      // Rodapé
      const totalPages = pdf.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i)
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'normal')
        pdf.text(`Página ${i} de ${String(totalPages)}`, pageWidth - 30, pageHeight - 10)
        pdf.text(`TIM - Relatório de Vendas | Total de Linhas: ${totalVendasFiltradas}`, 20, pageHeight - 10)
      }

      // Salvar o PDF
      const fileName = `relatorio_vendas_${selectedVendedor.name.replace(/\s+/g, '_')}_${dataAtual.replace(/\//g, '-')}.pdf`
      pdf.save(fileName)
      
      toast.success('Relatório PDF exportado com sucesso!')

    } catch (error) {
      console.error('Erro ao exportar PDF:', error)
      toast.error('Erro ao exportar PDF. Tente novamente.')
    } finally {
      setIsExportingPDF(false)
    }
  }
  
  // Função para calcular ranking de vendedores usando a nova implementação
  const calculateVendedorRanking = async (vendedorName: string, period: string) => {
    // Evitar múltiplas execuções simultâneas
    if (calculandoRanking) {
      console.log('⏳ calculateVendedorRanking já está executando, aguardando...')
      return 999
    }
    
    try {
      setCalculandoRanking(true)
      const dateRange = getDateRange(period)
      
      console.log('🔍 calculateVendedorRanking - Iniciando cálculo:', {
        vendedorName,
        period,
        dateRange,
        establishment_id: user?.establishment_id
      })
      
      // Usar a nova função de cálculo de ranking
      const ranking = await calculateVendedorRankingUtil({
        vendedorName,
        period: period === 'todos' ? 'todos' : period,
        dateRange: {
        date_from: dateRange.dateFrom,
        date_to: dateRange.dateTo
        },
        establishment_id: user?.establishment_id || null
      })
      
      console.log('🏆 calculateVendedorRanking - Ranking calculado:', ranking)
      console.log('📋 calculateVendedorRanking - Primeiro vendedor:', ranking[0])
      
      // Converter para formato esperado pelo componente
      const rankingVendedores = ranking.map(vendedor => ({
        nome: vendedor.name,
        faturamento: vendedor.faturamento,
        posicao: vendedor.posicao,
        establishment: vendedor.establishment ?? null
      }))
      
      console.log('📋 calculateVendedorRanking - Ranking vendedores convertido:', rankingVendedores.slice(0, 3))
      setRankingCompleto(rankingVendedores)
      
      // Se vendedor específico foi selecionado, encontrar sua posição
      if (vendedorName && vendedorName !== 'todos') {
        const vendedorEncontrado = rankingVendedores.find(v => {
          const nomeRanking = v.nome?.toLowerCase().trim()
          const nomeProcurado = vendedorName?.toLowerCase().trim()
          
          // Comparação exata
          if (nomeRanking === nomeProcurado) return true
          
          // Comparação parcial
          if (nomeProcurado && nomeRanking) {
            const nomeRankingLimpo = nomeRanking.replace(/\s*\([^)]*\)\s*$/, '')
            const nomeProcuradoLimpo = nomeProcurado.replace(/\s*\([^)]*\)\s*$/, '')
            
            if (nomeRankingLimpo === nomeProcuradoLimpo) return true
            
            // Comparação por palavras-chave
            const palavrasRanking = nomeRankingLimpo.split(' ')
            const palavrasProcurado = nomeProcuradoLimpo.split(' ')
            
            if (palavrasRanking.length >= 2 && palavrasProcurado.length >= 2) {
              const primeiroSobrenomeRanking = palavrasRanking[0] + ' ' + palavrasRanking[palavrasRanking.length - 1]
              const primeiroSobrenomeProcurado = palavrasProcurado[0] + ' ' + palavrasProcurado[palavrasProcurado.length - 1]
              
              if (primeiroSobrenomeRanking === primeiroSobrenomeProcurado) return true
            }
          }
          
          return false
        })
        
        if (vendedorEncontrado) {
          console.log('✅ calculateVendedorRanking - Vendedor encontrado:', {
            nome: vendedorEncontrado.nome,
            posicao: vendedorEncontrado.posicao,
            faturamento: vendedorEncontrado.faturamento
          })
          // Retornar o vendedor encontrado no formato original do ranking
          const vendedorOriginal = ranking.find(v => v.name === vendedorEncontrado.nome)
          return vendedorOriginal ? [vendedorOriginal] : []
        } else {
          console.log('⚠️ calculateVendedorRanking - Vendedor não encontrado, posição:', rankingVendedores.length + 1)
          return []
        }
      }
      
      return rankingVendedores.length
    } catch (error) {
      console.error('❌ calculateVendedorRanking - Erro:', error)
      return 999
    } finally {
      setCalculandoRanking(false)
    }
  }

  // Função para buscar dados do dashboard com filtro por vendedor
  const fetchSalesData = async (vendedor: {id: number | null, name: string}, period: string) => {
    if (!vendedor) return
    
    try {
      const dateRange = getDateRange(period)
      
      // Usar novo endpoint do dashboard com filtro por vendedor
      const response = await apiService.getDashboardFaturamento({
        establishment_id: user?.establishment_id || undefined, // Gestores podem não ter establishment_id específico
        date_from: dateRange.dateFrom,
        date_to: dateRange.dateTo,
        seller_id: vendedor.id || undefined
      })
      
      if (response.data) {
        const dashboardData = response.data
        
        if (vendedor.name === "todos") {
          // Modo todos os vendedores - mostrar dados agregados
          setIsAllVendorsMode(true)
          
          // Usar dados do dashboard para métricas
          const totalVendas = dashboardData.quantidade_vendas?.total || 0
          const faturamento = dashboardData.faturamento?.total || 0
          const ticketMedio = totalVendas > 0 ? faturamento / totalVendas : 0
          const comissao = 0 // Mock - regra de comissão será elaborada posteriormente
          
          setReportMetrics({
            totalVendas,
            faturamento,
            comissao,
            ticketMedio,
            ranking: [] // Não aplicável no modo todos
          })
          
          // Para vendas individuais, usar paginação correta
          const filtros: FiltrosVendas = {
            establishment_id: user?.establishment_id || undefined
          }
          
          // Aplicar filtro de data para todos os períodos exceto "todos"
          if (period && period !== 'todos') {
            filtros.date_from = dateRange.dateFrom
            filtros.date_to = dateRange.dateTo
          }
          
            console.log('📊 VENDAS CARREGADAS - Modo Todos os Vendedores:')
            console.log('📅 Período:', dateRange.dateFrom, 'a', dateRange.dateTo)
            console.log('🏢 Estabelecimento ID:', user?.establishment_id)
          
          await carregarVendas(1, filtros)
          
          // Calcular ranking completo
          setIsLoadingRanking(true)
          const rankingCompleto = await calculateVendedorRanking("todos", period)
          
        } else {
          // Modo vendedor específico
          setIsAllVendorsMode(false)
          
          // Calcular ranking do vendedor específico PRIMEIRO
          const ranking = await calculateVendedorRanking(vendedor.name, period)
          
          // Usar dados REAIS do ranking calculado, não do dashboard
          console.log('🔍 Debug - ranking completo recebido:', ranking)
          console.log('🔍 Debug - tipo do ranking:', typeof ranking)
          console.log('🔍 Debug - é array?', Array.isArray(ranking))
          console.log('🔍 Debug - length:', Array.isArray(ranking) ? (ranking as any[]).length : 'N/A')
          
          const vendedorRanking = Array.isArray(ranking) && (ranking as any[]).length > 0 ? (ranking as any[])[0] : { vendas: 0, faturamento: 0 }
          const totalVendas = vendedorRanking.vendas || 0
          const faturamento = vendedorRanking.faturamento || 0
          
          console.log('🔍 Debug - vendedorRanking extraído:', vendedorRanking)
          const ticketMedio = totalVendas > 0 ? faturamento / totalVendas : 0
          const comissao = 0 // Mock - regra de comissão será elaborada posteriormente
          
          console.log('✅ Dados reais do vendedor:', {
            nome: vendedor.name,
            vendas: totalVendas,
            faturamento: faturamento,
            ticketMedio: ticketMedio
          })
          
          setReportMetrics({
            totalVendas: totalVendas,
            faturamento: faturamento,
            comissao: comissao,
            ticketMedio: ticketMedio,
            ranking: Array.isArray(ranking) ? ranking : []
          })
          
          // Para vendas individuais, usar paginação correta
          const filtros: FiltrosVendas = {
            establishment_id: user?.establishment_id || undefined,
            date_from: dateRange.dateFrom,
            date_to: dateRange.dateTo,
            seller_id: vendedor.id || undefined
          }
          
            console.log('📊 VENDAS CARREGADAS - Modo Vendedor Específico:')
            console.log('👤 Vendedor:', vendedor.name, '(ID:', vendedor.id, ')')
            console.log('📅 Período:', dateRange.dateFrom, 'a', dateRange.dateTo)
            console.log('🏢 Estabelecimento ID:', user?.establishment_id)
          
          await carregarVendas(1, filtros)
        }
      }
    } catch (error) {
      console.error('❌ Erro ao buscar dados do dashboard:', error)
    }
  }
  
  // Controlar loading do ranking baseado no estado do rankingCompleto
  useEffect(() => {
    if (rankingCompleto.length > 0 && isLoadingRanking) {
      // Aguardar um pouco para garantir que a tabela seja renderizada
      const timer = setTimeout(() => {
        setIsLoadingRanking(false)
      }, 300)
      
      return () => clearTimeout(timer)
    }
  }, [rankingCompleto, isLoadingRanking])

  // Carregar vendedores usando o novo hook
  useEffect(() => {
    console.log('🚀 useEffect executado - carregarVendedores')
    
    if (!user) return
        
        // Verificação direta do role para evitar problemas de timing
        const userRole = user?.role || user?.roles?.[0]?.name || null
        const isVendedorDirect = userRole === 'vendedor'
        const isGerenteDirect = userRole === 'gerente'
        const isGestorDirect = userRole === 'gestor'
        
        if (isVendedorDirect) {
          // Vendedor só vê seu próprio nome
          setVendedoresDisponiveis([{id: user?.id || null, name: user?.name || "Vendedor Capim Dourado"}])
          setSelectedVendedor({id: user?.id || null, name: user?.name || "Vendedor Capim Dourado"})
      setLoading(false)
    } else if (isGestorDirect && !user?.establishment_id) {
            // Gestor sem establishment_id específico - usar hook especializado
            if (vendedoresGestor.length > 0) {
              setVendedoresDisponiveis(vendedoresGestor)
              setSelectedVendedor({id: null, name: "todos"})
            } else if (errorGestor) {
              setVendedoresDisponiveis([{id: null, name: "todos"}])
              setSelectedVendedor({id: null, name: "todos"})
            }
      setLoading(false)
          } else if (user?.establishment_id) {
      // Gerente ou Gestor com establishment_id específico - usar novo hook
      if (loadingVendedores) {
        return // Não definir loading como false ainda
      }
      
      if (vendedoresComVendas.length > 0) {
        const vendedores = vendedoresComVendas.map((vendedor) => ({
          id: vendedor.id,
          name: vendedor.name
        }))
        
        setVendedoresDisponiveis([{id: null, name: "todos"}, ...vendedores])
        setSelectedVendedor({id: null, name: "todos"})
      } else if (errorVendedores) {
        setVendedoresDisponiveis([{id: null, name: "todos"}])
        setSelectedVendedor({id: null, name: "todos"})
      } else {
        setVendedoresDisponiveis([{id: null, name: "todos"}])
        setSelectedVendedor({id: null, name: "todos"})
      }
      setLoading(false)
        } else {
          // Fallback para outros casos
          setVendedoresDisponiveis([{id: null, name: "todos"}])
          setSelectedVendedor({id: null, name: "todos"})
        setLoading(false)
      }
  }, [user, vendedoresGestor, errorGestor, vendedoresComVendas, errorVendedores])
  
  // Carregar categorias disponíveis
  useEffect(() => {
    const loadCategorias = async () => {
      try {
        setLoadingCategorias(true)
        const response = await apiService.getCategoriesActive()
        if (response && response.data && Array.isArray(response.data)) {
          setCategoriasDisponiveis(response.data.map((cat: any) => ({
            id: cat.id,
            name: cat.name
          })))
        }
      } catch (error) {
        console.error('Erro ao carregar categorias:', error)
        setCategoriasDisponiveis([])
      } finally {
        setLoadingCategorias(false)
      }
    }
    loadCategorias()
  }, [])

  // Buscar dados de vendas quando vendedor ou período mudarem
  useEffect(() => {
    if (selectedVendedor && !loading) {
      fetchSalesData(selectedVendedor, selectedPeriod)
    }
  }, [selectedVendedor, selectedPeriod, loading, customDateFrom, customDateTo])
  

  // Funções de paginação para vendas (usando hook)
  const handleSalesPageChange = (newPage: number) => {
    irParaPagina(newPage)
  }

  // Log do total de vendas carregadas
  useEffect(() => {
    if (salesData.length > 0) {
      console.log('🎯 RESUMO FINAL DE VENDAS:')
      console.log('📊 Total de vendas carregadas:', salesData.length)
      console.log('📄 Página atual:', salesPagination.current_page)
      console.log('📄 Total de páginas:', salesPagination.last_page)
      console.log('📄 Itens por página:', salesPagination.per_page)
      console.log('📄 Total de vendas no sistema:', salesPagination.total)
      console.log('📄 Vendas na página atual:', salesData.length)
    }
  }, [salesData.length, salesPagination])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <User className="w-8 h-8 text-blue-600" />
            Relatório por Vendedor
          </h2>
          <p className="text-muted-foreground mt-2">Análise individual de desempenho de vendedores</p>
        </div>
        <Button 
          className="text-white"
          style={{ backgroundColor: '#0026d9' }}
          onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#001a99'}
          onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#0026d9'}
          onClick={() => {
            console.log('Exportar clicado')
            setShowExportModal(true)
          }}
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar Relatório
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Selecione o vendedor e o período para análise</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="vendedor">Vendedor</Label>
              <Select 
                value={selectedVendedor.name} 
                onValueChange={(value) => {
                  const vendedor = vendedoresDisponiveis.find(v => v.name === value)
                  if (vendedor) {
                    setSelectedVendedor(vendedor)
                  }
                }}
                disabled={loading} // Desabilitar apenas se estiver carregando
              >
                <SelectTrigger id="vendedor">
                  <SelectValue placeholder={loading ? "Carregando vendedores..." : vendedoresDisponiveis.length > 0 ? "Selecione o vendedor" : "Nenhum vendedor encontrado"} />
                </SelectTrigger>
                <SelectContent>
                  {vendedoresDisponiveis.length > 0 ? (
                    vendedoresDisponiveis.map((vendedor) => (
                      <SelectItem key={vendedor.name} value={vendedor.name}>
                        {vendedor.name === "todos" ? "Todos os Vendedores" : vendedor.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="empty" disabled>
                      Nenhum vendedor encontrado
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {isVendedorDirect && (
                <p className="text-xs text-muted-foreground">
                  Você só pode visualizar seus próprios relatórios
                </p>
              )}
              {isGerenteDirect && (
                <p className="text-xs text-muted-foreground">
                  Você pode visualizar relatórios dos vendedores da sua loja
                </p>
              )}
              {!isVendedorDirect && vendedoresDisponiveis.length === 0 && !loading && (
                <p className="text-xs text-red-500">
                  ⚠️ Nenhum vendedor encontrado. Verifique as permissões.
                </p>
              )}
              {loading && (isGerenteDirect || isGestorDirect) && (
                <p className="text-xs text-muted-foreground">
                  Carregando vendedores da loja...
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodo">Período</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger id="periodo">
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1mes">Último mês</SelectItem>
                  <SelectItem value="3meses">Últimos 3 meses</SelectItem>
                  <SelectItem value="6meses">Últimos 6 meses</SelectItem>
                  <SelectItem value="1ano">Último ano</SelectItem>
                  <SelectItem value="custom">Período personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Campos de data customizada */}
          {selectedPeriod === 'custom' && (
            <div className="grid gap-4 md:grid-cols-2 mt-4">
              <div className="space-y-2">
                <Label htmlFor="dateFrom">Data Inicial</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">Data Final</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {loadingSales ? '...' : reportMetrics.totalVendas}
            </div>
            <p className="text-xs text-muted-foreground mt-1">No período selecionado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {loadingSales ? '...' : `R$ ${reportMetrics.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Comissão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {loadingSales ? '...' : `R$ ${reportMetrics.comissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Regra em elaboração</p>
          </CardContent>
        </Card>

      </div>



      {/* Tabela Comparativa Detalhada */}
      {(isGerenteDirect || isGestorDirect) && (
        isLoadingRanking ? (
          <RankingTableSkeleton />
        ) : rankingCompleto.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Comparação Detalhada de Vendedores
            </CardTitle>
            <CardDescription>
              {isGestorDirect 
                ? "Tabela completa com métricas de todos os vendedores" 
                : "Tabela com métricas dos vendedores do seu estabelecimento"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-secondary">
                    <th className="text-left p-3 font-medium text-muted-foreground">Posição</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Vendedor</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Estabelecimento</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Faturamento</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">% do Total</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingCompleto
                    .filter((vendedor) => {
                      // Se for gestor, mostra todos os vendedores
                      if (isGestorDirect) return true
                      
                      // Se for gerente, filtra apenas vendedores do seu estabelecimento
                      if (isGerenteDirect) {
                        // Verificar se o vendedor pertence ao estabelecimento do gerente
                        // Comparar com os vendedores disponíveis (que já foram filtrados por estabelecimento)
                        const match = vendedoresDisponiveis.some(v => {
                          // Comparação exata
                          if (v.name === vendedor.nome) return true
                          
                          // Comparação por partes do nome (mais flexível)
                          const vendedorNome = vendedor.nome.toLowerCase()
                          const vendedorDisponivel = v.name.toLowerCase()
                          
                          // Verificar se um nome contém o outro
                          return vendedorNome.includes(vendedorDisponivel) || 
                                 vendedorDisponivel.includes(vendedorNome)
                        })
                        
                        console.log('🔍 Debug - Vendedor ranking:', vendedor.nome, 'Match:', match)
                        return match
                      }
                      
                      return true
                    })
                    .map((vendedor, index) => {
                    // Usar os vendedores já filtrados para calcular o total
                    const vendedoresFiltrados = rankingCompleto.filter((v) => {
                      if (isGestorDirect) return true
                      if (isGerenteDirect) {
                        return vendedoresDisponiveis.some(vd => {
                          // Comparação exata
                          if (vd.name === v.nome) return true
                          
                          // Comparação por partes do nome (mais flexível)
                          const vendedorNome = v.nome.toLowerCase()
                          const vendedorDisponivel = vd.name.toLowerCase()
                          
                          // Verificar se um nome contém o outro
                          return vendedorNome.includes(vendedorDisponivel) || 
                                 vendedorDisponivel.includes(vendedorNome)
                        })
                      }
                      return true
                    })
                    const totalFaturamento = vendedoresFiltrados.reduce((sum, v) => sum + v.faturamento, 0)
                    const percentual = totalFaturamento > 0 ? (vendedor.faturamento / totalFaturamento) * 100 : 0
                    const isSelectedVendedor = vendedor.nome === selectedVendedor.name
                    
                    return (
                      <tr 
                        key={vendedor.nome}
                        className={`border-b border-secondary/50 hover:bg-secondary/30 ${
                          isSelectedVendedor ? 'bg-blue-50 dark:bg-blue-950' : ''
                        }`}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              index === 0 ? 'bg-yellow-500 text-white' :
                              index === 1 ? 'bg-gray-400 text-white' :
                              index === 2 ? 'bg-orange-600 text-white' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {index + 1}
                            </div>
                            {index < 3 && (
                              <span className="text-lg">
                                {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div>
                            <p className={`font-medium ${isSelectedVendedor ? 'text-blue-700 dark:text-blue-300' : 'text-foreground'}`}>
                              {vendedor.nome}
                              {isSelectedVendedor && <span className="ml-2 text-xs text-blue-600">(Atual)</span>}
                            </p>
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          <span className="text-sm">{vendedor.establishment?.name ?? '—'}</span>
                        </td>
                        <td className="p-3 text-right">
                          <p className="font-semibold text-foreground">
                            {vendedor.faturamento.toLocaleString('pt-BR', { 
                              style: 'currency', 
                              currency: 'BRL' 
                            })}
                          </p>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-secondary rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  index === 0 ? 'bg-yellow-500' :
                                  index === 1 ? 'bg-gray-400' :
                                  index === 2 ? 'bg-orange-600' :
                                  'bg-blue-500'
                                }`}
                                style={{ width: `${Math.min(percentual, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground w-12 text-right">
                              {percentual.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            vendedor.posicao === 1 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                            vendedor.posicao === 2 ? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' :
                            vendedor.posicao === 3 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                            'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          }`}>
                            {vendedor.posicao === 1 ? 'Líder' :
                             vendedor.posicao === 2 ? 'Vice' :
                             vendedor.posicao === 3 ? 'Terceiro' :
                             `${vendedor.posicao}º lugar`}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Resumo Estatístico */}
            <div className="mt-6 p-4 bg-secondary/30 rounded-lg">
              <h4 className="font-semibold text-foreground mb-3">Resumo Estatístico</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total de Vendedores:</p>
                  <p className="font-semibold">{rankingCompleto.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Faturamento Total:</p>
                  <p className="font-semibold">
                    {rankingCompleto.reduce((sum, v) => sum + v.faturamento, 0).toLocaleString('pt-BR', { 
                      style: 'currency', 
                      currency: 'BRL' 
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Faturamento Médio:</p>
                  <p className="font-semibold">
                    {(rankingCompleto.reduce((sum, v) => sum + v.faturamento, 0) / rankingCompleto.length).toLocaleString('pt-BR', { 
                      style: 'currency', 
                      currency: 'BRL' 
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Melhor Vendedor:</p>
                  <p className="font-semibold">{rankingCompleto[0]?.nome || 'N/A'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        ) : null
      )}


      <Card>
        <CardHeader>
          <CardTitle>
            {isAllVendorsMode 
              ? "Detalhamento de Todas as Vendas" 
              : `Detalhamento de Vendas - ${selectedVendedor.name}`
            }
          </CardTitle>
          <CardDescription>
            {loadingSales ? 'Carregando vendas...' : (
              <>
                {salesPagination.total > 0 ? (
                  <>
                    Mostrando {salesPagination.from} a {salesPagination.to} de {salesPagination.total} vendas
                    {salesPagination.last_page > 1 && (
                      <span className="block text-xs text-muted-foreground mt-1">
                        Página {salesPagination.current_page} de {salesPagination.last_page}
                      </span>
                    )}
                  </>
                ) : (
                  'Nenhuma venda encontrada'
                )}
            {!loadingSales && salesData.length > 0 && (
              <span className="block text-xs text-muted-foreground mt-1">
                {isAllVendorsMode 
                  ? 'Vendas de todos os vendedores - Clique em uma venda para ver mais detalhes'
                  : 'Clique em uma venda para ver mais detalhes'
                }
              </span>
                )}
              </>
            )}
          </CardDescription>
        </CardHeader>
        
        
        <CardContent>
          {loadingSales ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Carregando vendas...</div>
            </div>
          ) : salesData.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Nenhuma venda encontrada para o período selecionado</div>
            </div>
          ) : (
            <div className="space-y-3">
              {salesData.map((venda: any, index: number) => {
                const dataVenda = new Date(venda.created_at).toLocaleDateString('pt-BR')
                const horaVenda = new Date(venda.created_at).toLocaleTimeString('pt-BR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })
                const valorFormatado = (venda.total_price || 0).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })
                const valorUnitario = venda.unit_price ? venda.unit_price.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }) : null
                
                const isExpanded = expandedSale === venda.id
                
                return (
                  <div key={venda.id || index} className="bg-secondary rounded-lg overflow-hidden">
                    <div 
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/80 transition-colors"
                      onClick={() => setExpandedSale(isExpanded ? null : venda.id)}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {venda.product_name || venda.category?.name || 'Produto não especificado'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {venda.customer?.person?.name || venda.customer?.name || 'Cliente não informado'} • {dataVenda} às {horaVenda}
                          {isAllVendorsMode && venda.seller?.name && (
                            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              {venda.seller.name}
                            </span>
                          )}
                        </p>
                        
                        {venda.activation_number && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Número: {venda.activation_number}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div>
                          <div className="font-semibold text-foreground">{valorFormatado}</div>
                          <div className="text-xs text-muted-foreground">
                            Qtd: {venda.quantity || 1}
                          </div>
                        </div>
                        <div className="text-muted-foreground">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="px-3 pb-3 border-t border-secondary/50">
                        <div className="pt-3 space-y-2">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Cliente:</p>
                              <p className="font-medium">{venda.customer?.person?.name || venda.customer?.name || 'Não informado'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">CPF:</p>
                              <p className="font-medium">{venda.customer?.person?.nif || 'Não informado'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Email:</p>
                              <p className="font-medium">{venda.customer?.person?.email || venda.customer?.email || 'Não informado'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Telefone:</p>
                              <p className="font-medium">{venda.customer?.person?.phone || venda.customer?.phone || 'Não informado'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">WhatsApp:</p>
                              <p className="font-medium">{venda.customer?.whatsapp || venda.customer?.person?.phone || 'Não informado'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Data Nascimento:</p>
                              <p className="font-medium">{venda.customer?.person?.birthdate ? new Date(venda.customer.person.birthdate).toLocaleDateString('pt-BR') : 'Não informado'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Endereço:</p>
                              <p className="font-medium">{venda.customer?.person?.address || 'Não informado'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Bairro:</p>
                              <p className="font-medium">{venda.customer?.person?.district || 'Não informado'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Cidade:</p>
                              <p className="font-medium">{venda.customer?.person?.city?.name || 'Não informado'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Estado:</p>
                              <p className="font-medium">{venda.customer?.person?.city?.state?.name || 'Não informado'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">CEP:</p>
                              <p className="font-medium">{venda.customer?.person?.zip_code || 'Não informado'}</p>
                            </div>
                          </div>
                          
                          {/* Campos TIM */}
                          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                            <h4 className="text-sm font-medium text-blue-900 mb-2">Campos TIM</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Meu TIM:</span>
                                <span className={`px-2 py-1 rounded text-xs ${venda.meu_tim ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                  {venda.meu_tim ? '✅ Sim' : '❌ Não'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Débito Automático:</span>
                                <span className={`px-2 py-1 rounded text-xs ${venda.debit_automatic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                  {venda.debit_automatic ? '✅ Sim' : '❌ Não'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Portabilidade:</span>
                                <span className={`px-2 py-1 rounded text-xs ${venda.portability ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                  {venda.portability ? '✅ Sim' : '❌ Não'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Resgate:</span>
                                <span className={`px-2 py-1 rounded text-xs ${venda.rescue ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                  {venda.rescue ? '✅ Sim' : '❌ Não'}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Produto:</p>
                              <p className="font-medium">{venda.product_name || 'Não especificado'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Categoria:</p>
                              <p className="font-medium">{venda.category?.name || 'Não especificada'}</p>
                            </div>
                            {valorUnitario && (
                              <div>
                                <p className="text-muted-foreground">Valor Unitário:</p>
                                <p className="font-medium">{valorUnitario}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-muted-foreground">Quantidade:</p>
                              <p className="font-medium">{venda.quantity || 1}</p>
                            </div>
                          </div>

                          {/* Informações da Venda */}
                          <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                            <h4 className="text-sm font-medium text-purple-900 mb-2">Informações da Venda</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Status:</p>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  venda.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  venda.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  venda.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {venda.status === 'approved' ? 'Aprovada' :
                                   venda.status === 'pending' ? 'Pendente' :
                                   venda.status === 'cancelled' ? 'Cancelada' :
                                   venda.status || 'Não informado'}
                                </span>
                              </div>
                              {venda.payment_method && (
                                <div>
                                  <p className="text-muted-foreground">Método de Pagamento:</p>
                                  <p className="font-medium">{venda.payment_method}</p>
                                </div>
                              )}
                              {venda.seller?.name && isAllVendorsMode && (
                                <div>
                                  <p className="text-muted-foreground">Vendedor:</p>
                                  <p className="font-medium">{venda.seller.name}</p>
                                </div>
                              )}
                              {venda.establishment?.name && (
                                <div>
                                  <p className="text-muted-foreground">Estabelecimento:</p>
                                  <p className="font-medium">{venda.establishment.name}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Informações Técnicas */}
                          {(venda.imei || venda.activation_number || venda.provisional_number || venda.device_value) && (
                            <div className="mt-4 p-3 bg-green-50 rounded-lg">
                              <h4 className="text-sm font-medium text-green-900 mb-2">Informações Técnicas</h4>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                {venda.imei && (
                                  <div>
                                    <p className="text-muted-foreground">IMEI:</p>
                                    <p className="font-medium">{venda.imei}</p>
                                  </div>
                                )}
                                {venda.activation_number && (
                                  <div>
                                    <p className="text-muted-foreground">Número de Ativação:</p>
                                    <p className="font-medium">{venda.activation_number}</p>
                                  </div>
                                )}
                                {venda.provisional_number && (
                                  <div>
                                    <p className="text-muted-foreground">Número Provisório:</p>
                                    <p className="font-medium">{venda.provisional_number}</p>
                                  </div>
                                )}
                                {venda.device_value && venda.device_value > 0 && (
                                  <div>
                                    <p className="text-muted-foreground">Valor do Dispositivo:</p>
                                    <p className="font-medium">
                                      R$ {venda.device_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                  </div>
                                )}
                                {venda.approved_at && (
                                  <div>
                                    <p className="text-muted-foreground">Aprovado em:</p>
                                    <p className="font-medium">{new Date(venda.approved_at).toLocaleString('pt-BR')}</p>
                                  </div>
                                )}
                                {venda.approved_by && (
                                  <div>
                                    <p className="text-muted-foreground">Aprovado por:</p>
                                    <p className="font-medium">ID: {venda.approved_by}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {venda.observations && (
                            <div>
                              <p className="text-muted-foreground text-sm">Observações:</p>
                              <p className="font-medium text-sm">{venda.observations}</p>
                            </div>
                          )}
                          
                          <div className="text-xs text-muted-foreground pt-2 border-t border-secondary/50">
                            <p>ID da Venda: {venda.id}</p>
                            <p>Criado em: {new Date(venda.created_at).toLocaleString('pt-BR')}</p>
                            {venda.updated_at !== venda.created_at && (
                              <p>Atualizado em: {new Date(venda.updated_at).toLocaleString('pt-BR')}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          
          {/* Controles de paginação na parte inferior */}
          {salesPagination.last_page > 1 && !loadingSales && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={paginaAnterior}
                disabled={salesPagination.current_page === 1}
              >
                Anterior
              </Button>
              
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, salesPagination.last_page) }, (_, i) => {
                  let pageNumber;
                  if (salesPagination.last_page <= 5) {
                    pageNumber = i + 1;
                  } else if (salesPagination.current_page <= 3) {
                    pageNumber = i + 1;
                  } else if (salesPagination.current_page >= salesPagination.last_page - 2) {
                    pageNumber = salesPagination.last_page - 4 + i;
                  } else {
                    pageNumber = salesPagination.current_page - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNumber}
                      variant={salesPagination.current_page === pageNumber ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleSalesPageChange(pageNumber)}
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
                onClick={proximaPagina}
                disabled={salesPagination.current_page === salesPagination.last_page}
              >
                Próximo
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Opções de Exportação */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Opções de Exportação</h2>
                <p className="text-sm text-muted-foreground">
                  Selecione quais informações incluir no Relatório
                </p>
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">
                    <strong>Vendedor:</strong> {selectedVendedor.name === "todos" ? "Todos" : selectedVendedor.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Período:</strong> {customDateFrom && customDateTo ? 
                      `${new Date(customDateFrom + 'T00:00:00').toLocaleDateString('pt-BR')} a ${new Date(customDateTo + 'T00:00:00').toLocaleDateString('pt-BR')}` :
                      selectedPeriod === 'custom' ? 'Personalizado (sem datas)' :
                      selectedPeriod === '1mes' ? 'Último mês' :
                      selectedPeriod === '3meses' ? 'Últimos 3 meses' :
                      selectedPeriod === '6meses' ? 'Últimos 6 meses' :
                      selectedPeriod === '1ano' ? 'Último ano' :
                      'Não especificado'}
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

            {/* Campos de período personalizado no modal */}
            <div className="px-6 pt-4 pb-6 border-b">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">Período Personalizado</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCustomDateFrom('')
                    setCustomDateTo('')
                  }}
                  className="h-7 px-2 text-xs"
                >
                  Limpar
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="modalDateFrom" className="text-xs">Data Inicial</Label>
                  <Input
                    id="modalDateFrom"
                    type="date"
                    value={customDateFrom}
                    onChange={(e) => setCustomDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modalDateTo" className="text-xs">Data Final</Label>
                  <Input
                    id="modalDateTo"
                    type="date"
                    value={customDateTo}
                    onChange={(e) => setCustomDateTo(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <h3 className="font-semibold text-sm mb-3">Resumo</h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="summary" 
                      checked={exportOptions.includeSummary}
                      onCheckedChange={(checked) => 
                        setExportOptions({...exportOptions, includeSummary: checked as boolean})
                      }
                    />
                    <Label htmlFor="summary">Métricas de desempenho</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="ranking" 
                      checked={exportOptions.includeRanking}
                      onCheckedChange={(checked) => 
                        setExportOptions({...exportOptions, includeRanking: checked as boolean})
                      }
                    />
                    <Label htmlFor="ranking">Ranking de vendedores</Label>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-3">Detalhes das Vendas</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="date" 
                      checked={exportOptions.includeDate}
                      onCheckedChange={(checked) => {
                        const newOptions = {...exportOptions, includeDate: checked as boolean}
                        // Se desmarcar "Incluir Data", manter as opções de data para quando reativar
                        if (!checked) {
                          // Garantir que pelo menos uma data esteja marcada quando reativar
                          if (!newOptions.useSaleDate && !newOptions.useCreatedAt) {
                            newOptions.useSaleDate = true
                          }
                        }
                        setExportOptions(newOptions)
                      }}
                    />
                    <Label htmlFor="date">Incluir Data</Label>
                  </div>
                  {exportOptions.includeDate && (
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="useSaleDate" 
                        checked={exportOptions.useSaleDate}
                        onCheckedChange={(checked) => {
                          const newOptions = {...exportOptions, useSaleDate: checked as boolean}
                          // Se desmarcar ambas as datas, manter pelo menos uma marcada
                          if (!checked && !newOptions.useCreatedAt) {
                            newOptions.useCreatedAt = true
                          }
                          setExportOptions(newOptions)
                        }}
                      />
                      <Label htmlFor="useSaleDate">Data da Venda</Label>
                    </div>
                  )}
                  {exportOptions.includeDate && (
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="useCreatedAt" 
                        checked={exportOptions.useCreatedAt}
                        onCheckedChange={(checked) => {
                          const newOptions = {...exportOptions, useCreatedAt: checked as boolean}
                          // Se desmarcar ambas as datas, manter pelo menos uma marcada
                          if (!checked && !newOptions.useSaleDate) {
                            newOptions.useSaleDate = true
                          }
                          setExportOptions(newOptions)
                        }}
                      />
                      <Label htmlFor="useCreatedAt">Data de Criação</Label>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="client" 
                      checked={exportOptions.includeClient}
                      onCheckedChange={(checked) => 
                        setExportOptions({...exportOptions, includeClient: checked as boolean})
                      }
                    />
                    <Label htmlFor="client">Cliente</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="cpf" 
                      checked={exportOptions.includeCPF}
                      onCheckedChange={(checked) => 
                        setExportOptions({...exportOptions, includeCPF: checked as boolean})
                      }
                    />
                    <Label htmlFor="cpf">CPF</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="product" 
                      checked={exportOptions.includeProduct}
                      onCheckedChange={(checked) => 
                        setExportOptions({...exportOptions, includeProduct: checked as boolean})
                      }
                    />
                    <Label htmlFor="product">Produto</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="category" 
                      checked={exportOptions.includeCategory}
                      onCheckedChange={(checked) => 
                        setExportOptions({...exportOptions, includeCategory: checked as boolean})
                      }
                    />
                    <Label htmlFor="category">Categoria</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="value" 
                      checked={exportOptions.includeValue}
                      onCheckedChange={(checked) => 
                        setExportOptions({...exportOptions, includeValue: checked as boolean})
                      }
                    />
                    <Label htmlFor="value">Valor</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="payment" 
                      checked={exportOptions.includePayment}
                      onCheckedChange={(checked) => 
                        setExportOptions({...exportOptions, includePayment: checked as boolean})
                      }
                    />
                    <Label htmlFor="payment">Método de Pagamento</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="meuTim" 
                      checked={exportOptions.includeMeuTim}
                      onCheckedChange={(checked) => 
                        setExportOptions({...exportOptions, includeMeuTim: checked as boolean})
                      }
                    />
                    <Label htmlFor="meuTim">Meu TIM</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="imei" 
                      checked={exportOptions.includeIMEI}
                      onCheckedChange={(checked) => 
                        setExportOptions({...exportOptions, includeIMEI: checked as boolean})
                      }
                    />
                    <Label htmlFor="imei">IMEI</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="iccid" 
                      checked={exportOptions.includeICCID}
                      onCheckedChange={(checked) => 
                        setExportOptions({...exportOptions, includeICCID: checked as boolean})
                      }
                    />
                    <Label htmlFor="iccid">ICCID</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="activationNumber" 
                      checked={exportOptions.includeActivationNumber}
                      onCheckedChange={(checked) => 
                        setExportOptions({...exportOptions, includeActivationNumber: checked as boolean})
                      }
                    />
                    <Label htmlFor="activationNumber">Número de Ativação</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="provisionalNumber" 
                      checked={exportOptions.includeProvisionalNumber}
                      onCheckedChange={(checked) => 
                        setExportOptions({...exportOptions, includeProvisionalNumber: checked as boolean})
                      }
                    />
                    <Label htmlFor="provisionalNumber">Número Provisório</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="portability" 
                      checked={exportOptions.includePortability}
                      onCheckedChange={(checked) => 
                        setExportOptions({...exportOptions, includePortability: checked as boolean})
                      }
                    />
                    <Label htmlFor="portability">Portabilidade</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="seller" 
                      checked={exportOptions.includeSeller}
                      onCheckedChange={(checked) => 
                        setExportOptions({...exportOptions, includeSeller: checked as boolean})
                      }
                    />
                    <Label htmlFor="seller">Vendedor</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="establishment" 
                      checked={exportOptions.includeEstablishment}
                      onCheckedChange={(checked) => 
                        setExportOptions({...exportOptions, includeEstablishment: checked as boolean})
                      }
                    />
                    <Label htmlFor="establishment">Estabelecimento</Label>
                  </div>
                </div>
              </div>
              
              {/* Filtros */}
              <div className="mt-4">
                <h3 className="font-semibold text-sm mb-3">Filtros</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="filterActivationNumber" className="text-xs">Filtrar por Número de Ativação</Label>
                    <Input
                      id="filterActivationNumber"
                      type="text"
                      placeholder="Digite o número de ativação..."
                      value={filterActivationNumber}
                      onChange={(e) => setFilterActivationNumber(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="filterCategory" className="text-xs">Filtrar por Categoria</Label>
                    <Select
                      value={filterCategory || undefined}
                      onValueChange={(value) => setFilterCategory(value === "all" ? "" : value)}
                      disabled={loadingCategorias}
                    >
                      <SelectTrigger id="filterCategory">
                        <SelectValue placeholder={loadingCategorias ? "Carregando categorias..." : "Todas as categorias"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as categorias</SelectItem>
                        {categoriasDisponiveis.map((categoria) => (
                          <SelectItem key={categoria.id} value={categoria.name}>
                            {categoria.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                   // Capturar valores das datas antes de fechar o modal
                   const datasParaExportar = {
                     from: customDateFrom,
                     to: customDateTo
                   }
                   // Exportar sem fechar o modal primeiro
                   await exportarPDF(datasParaExportar)
                   // Fechar modal apenas após a exportação
                   setShowExportModal(false)
                 }}
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
                   // Capturar valores das datas antes de fechar o modal
                   const datasParaExportar = {
                     from: customDateFrom,
                     to: customDateTo
                   }
                   // Exportar sem fechar o modal primeiro
                   await exportarExcel(datasParaExportar)
                   // Fechar modal apenas após a exportação
                   setShowExportModal(false)
                 }}
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
      )}    </div>
  )
}
