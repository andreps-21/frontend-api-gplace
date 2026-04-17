"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Download, Store, Trophy, TrendingUp, DollarSign, Loader2, X, ChevronLeft, ChevronRight } from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"
import { usePermissions } from "@/lib/use-permissions"
import { apiService, type EstablishmentReportItem } from "@/lib/api"
import { ProtectedPage } from "@/components/auth/protected-page"
import { PanelTableSkeleton } from "@/components/dashboard/panel-content-skeleton"

interface RankingLoja {
  posicao: number
  loja: {
    id: number
    name: string
  }
  faturamento: number
  quantidadeVendas: number
  ticketMedio: number
  vendedoresAtivos: number
}

export default function RelatorioLojaPage() {
  const { user } = useAuth()
  const { hasRole } = usePermissions()
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState("1mes")
  const [customDateFrom, setCustomDateFrom] = useState("")
  const [customDateTo, setCustomDateTo] = useState("")
  const [selectedEstablishment, setSelectedEstablishment] = useState<number | null>(null)
  const [ranking, setRanking] = useState<RankingLoja[]>([])
  const [reportData, setReportData] = useState<EstablishmentReportItem[]>([])
  const [establishments, setEstablishments] = useState<any[]>([])
  const [isExportingPDF, setIsExportingPDF] = useState(false)
  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(15)

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

  // Carregar estabelecimentos
  const loadEstablishments = async () => {
    try {
      const response = await apiService.getEstablishments({ is_active: true })
      const establishmentsData = response.data?.data || response.data || []
      setEstablishments(establishmentsData)
    } catch (error) {
      console.error('Erro ao carregar estabelecimentos:', error)
      toast.error('Erro ao carregar estabelecimentos')
      setEstablishments([])
    }
  }

  // Carregar ranking por loja via GET /establishments/report
  const loadRanking = async () => {
    setLoading(true)
    try {
      const dateRange = getDateRange(selectedPeriod, true)

      const params: { date_from?: string; date_to?: string; establishment_id?: number } = {}
      if (dateRange.from && dateRange.to) {
        params.date_from = dateRange.from
        params.date_to = dateRange.to
      }
      // Gestor/Master: filtrar por estabelecimento se selecionou um
      if (isGestorOrAdmin && selectedEstablishment !== null) {
        params.establishment_id = selectedEstablishment
      }
      // Vendedor/Gerente: não enviar establishment_id (backend retorna só o deles)

      const response = await apiService.getEstablishmentsReport(params)
      const data: EstablishmentReportItem[] = response.data ?? []

      const rankingArray: RankingLoja[] = data
        .map((item) => ({
          posicao: 0,
          loja: {
            id: item.establishment.id,
            name: item.establishment.name || 'Não informado'
          },
          faturamento: Number(item.total_revenue) || 0,
          quantidadeVendas: Number(item.total_sales) || 0,
          ticketMedio: Number(item.average_sale_value) || 0,
          vendedoresAtivos: item.sellers?.length ?? 0
        }))
        .sort((a, b) => b.faturamento - a.faturamento)
        .map((item, index) => ({
          ...item,
          posicao: index + 1
        }))

      setRanking(rankingArray)
      setReportData(data)
    } catch (error) {
      console.error('Erro ao carregar ranking:', error)
      toast.error('Erro ao carregar ranking de lojas')
      setRanking([])
      setReportData([])
    } finally {
      setLoading(false)
    }
  }

  // Métricas calculadas
  const metrics = useMemo(() => {
    const totalFaturamento = ranking.reduce((sum, item) => sum + item.faturamento, 0)
    const totalLojas = ranking.length
    const melhorLoja = ranking[0]?.loja.name || 'N/A'
    const totalVendas = ranking.reduce((sum, item) => sum + item.quantidadeVendas, 0)

    return {
      totalFaturamento,
      totalLojas,
      melhorLoja,
      totalVendas
    }
  }, [ranking])

  const checkPdfPageBreak = (pdf: jsPDF, y: number, pageHeight: number, margin = 25) => {
    if (y > pageHeight - margin) {
      pdf.addPage()
      return 20
    }
    return y
  }

  // Exportar PDF
  const exportarPDF = async () => {
    setIsExportingPDF(true)
    try {
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      let yPosition = 20

      // Cabeçalho
      pdf.setFontSize(20)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Relatório de Lojas - TIM', pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 10

      // Informações do período
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'normal')
      const dateRange = getDateRange(selectedPeriod, true)
      const periodoText = dateRange.from && dateRange.to 
        ? `${new Date(dateRange.from).toLocaleDateString('pt-BR')} a ${new Date(dateRange.to).toLocaleDateString('pt-BR')}`
        : 'Período não especificado'
      
      pdf.text(`Período: ${periodoText}`, 20, yPosition)
      yPosition += 8
      pdf.text(`Data do relatório: ${new Date().toLocaleDateString('pt-BR')}`, 20, yPosition)
      yPosition += 15

      // Tabela do ranking
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Pos', 20, yPosition)
      pdf.text('Loja', 30, yPosition)
      pdf.text('Faturamento', 100, yPosition)
      pdf.text('Vendas', 140, yPosition)
      pdf.text('Ticket Médio', 160, yPosition)
      pdf.text('Vendedores', 190, yPosition)
      yPosition += 5
      pdf.setDrawColor(200, 200, 200)
      pdf.line(20, yPosition, pageWidth - 20, yPosition)
      yPosition += 8

      pdf.setFont('helvetica', 'normal')
      ranking.forEach((item) => {
        yPosition = checkPdfPageBreak(pdf, yPosition, pageHeight)
        pdf.text(item.posicao.toString(), 20, yPosition)
        pdf.text(item.loja.name.substring(0, 30), 30, yPosition)
        pdf.text(`R$ ${item.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 100, yPosition)
        pdf.text(item.quantidadeVendas.toString(), 140, yPosition)
        pdf.text(`R$ ${item.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 160, yPosition)
        pdf.text(item.vendedoresAtivos.toString(), 190, yPosition)
        yPosition += 7
      })

      yPosition += 10

      // Detalhamento por estabelecimento: vendedores e vendas
      reportData.forEach((item) => {
        const estabelecimentoNome = item.establishment?.name || 'N/A'
        const sellers = item.sellers || []

        yPosition = checkPdfPageBreak(pdf, yPosition + 5, pageHeight)
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(11)
        pdf.text(`Estabelecimento: ${estabelecimentoNome}`, 20, yPosition)
        yPosition += 8

        sellers.forEach((seller) => {
          yPosition = checkPdfPageBreak(pdf, yPosition, pageHeight)
          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(9)
          pdf.text(`Vendedor: ${seller.name} (${seller.email || '-'}) — Vendas: ${seller.total_sales} — Faturamento: R$ ${Number(seller.total_revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 22, yPosition)
          yPosition += 6

          const vendas = seller.sales || []
          if (vendas.length > 0) {
            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(8)
            pdf.text('Data', 24, yPosition)
            pdf.text('Cliente', 42, yPosition)
            pdf.text('Produto', 95, yPosition)
            pdf.text('Valor', 165, yPosition)
            yPosition += 5
            pdf.setFont('helvetica', 'normal')
            vendas.forEach((venda: any) => {
              yPosition = checkPdfPageBreak(pdf, yPosition, pageHeight)
              const row = formatSaleRow(venda)
              pdf.text(row.data, 24, yPosition)
              pdf.text((row.cliente || '').substring(0, 22), 42, yPosition)
              pdf.text((row.produto || '').substring(0, 28), 95, yPosition)
              pdf.text(`R$ ${row.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 165, yPosition)
              yPosition += 5
            })
            yPosition += 4
          }
        })

        yPosition += 5
      })

      pdf.save(`ranking_lojas_${Date.now()}.pdf`)
      toast.success('PDF exportado com sucesso!')
    } catch (error) {
      console.error('Erro ao exportar PDF:', error)
      toast.error('Erro ao exportar PDF')
    } finally {
      setIsExportingPDF(false)
    }
  }

  // Helper: formata uma venda para linha do Excel/PDF
  const formatSaleRow = (venda: any) => ({
    data: venda.sale_date ? new Date(venda.sale_date).toLocaleDateString('pt-BR') : (venda.created_at ? new Date(venda.created_at).toLocaleDateString('pt-BR') : 'N/A'),
    cliente: venda.customer?.person?.name || venda.customer?.name || 'N/A',
    nif: venda.customer?.person?.nif || venda.customer?.nif || '-',
    produto: venda.product_name || 'N/A',
    categoria: venda.category?.name || '-',
    quantidade: venda.quantity ?? 1,
    valor: parseFloat(venda.total_price || 0)
  })

  // Monta as linhas do detalhamento (vendas por estabelecimento e vendedor) a partir de reportData
  const buildDetalheRows = (): any[] => {
    const detalheHeader = ['Estabelecimento', 'Vendedor', 'E-mail', 'Data Venda', 'Cliente', 'NIF/CPF', 'Produto', 'Categoria', 'Quantidade', 'Valor Total']
    const rows: any[] = [detalheHeader]
    reportData.forEach((item) => {
      const estabelecimentoNome = item.establishment?.name || 'N/A'
      ;(item.sellers || []).forEach((seller) => {
        const vendas = seller.sales || []
        if (vendas.length === 0) {
          rows.push([estabelecimentoNome, seller.name, seller.email || '-', '-', '-', '-', '-', '-', 0, 0])
        } else {
          vendas.forEach((venda: any) => {
            const row = formatSaleRow(venda)
            rows.push([
              estabelecimentoNome,
              seller.name,
              seller.email || '-',
              row.data,
              row.cliente,
              row.nif,
              row.produto,
              row.categoria,
              row.quantidade,
              row.valor
            ])
          })
        }
      })
    })
    return rows
  }

  // Exportar Excel
  const exportarExcel = async () => {
    setIsExportingExcel(true)
    try {
      const data: any[] = []

      // --- Bloco 1: Ranking ---
      data.push(['Relatório de Lojas - TIM'])
      data.push([])
      const dateRange = getDateRange(selectedPeriod, true)
      const periodoText = dateRange.from && dateRange.to 
        ? `${new Date(dateRange.from).toLocaleDateString('pt-BR')} a ${new Date(dateRange.to).toLocaleDateString('pt-BR')}`
        : 'Período não especificado'
      data.push(['Período:', periodoText])
      data.push(['Data do relatório:', new Date().toLocaleDateString('pt-BR')])
      data.push([])
      data.push(['Posição', 'Loja', 'Faturamento', 'Quantidade de Vendas', 'Ticket Médio', 'Vendedores Ativos'])
      ranking.forEach((item) => {
        data.push([
          item.posicao,
          item.loja.name,
          item.faturamento,
          item.quantidadeVendas,
          item.ticketMedio,
          item.vendedoresAtivos
        ])
      })

      // --- Bloco 2: Detalhamento (vendas de todos os vendedores por loja) na mesma aba ---
      data.push([])
      data.push(['Detalhamento - Vendas por Estabelecimento e Vendedor'])
      data.push([])
      const detalheRows = buildDetalheRows()
      detalheRows.forEach((row) => data.push(row))
      if (detalheRows.length === 1) {
        data.push(['(Nenhuma venda no detalhamento para o período e loja(s) selecionados.)'])
      }

      const wsPrincipal = XLSX.utils.aoa_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, wsPrincipal, 'Relatório por Lojas')

      // Aba extra só com o detalhamento (para filtrar/ordenar com facilidade)
      const detalheRowsOnly = buildDetalheRows()
      const wsDetalhe = XLSX.utils.aoa_to_sheet(detalheRowsOnly)
      XLSX.utils.book_append_sheet(wb, wsDetalhe, 'Vendedores e Vendas')

      XLSX.writeFile(wb, `ranking_lojas_${Date.now()}.xlsx`)

      toast.success('Excel exportado com sucesso!')
    } catch (error) {
      console.error('Erro ao exportar Excel:', error)
      toast.error('Erro ao exportar Excel')
    } finally {
      setIsExportingExcel(false)
    }
  }

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

  // Carregar estabelecimentos ao montar (para o dropdown de filtro)
  useEffect(() => {
    loadEstablishments()
  }, [])

  // Carregar ranking quando filtros mudarem (usa GET /establishments/report)
  useEffect(() => {
    loadRanking()
  }, [selectedPeriod, customDateFrom, customDateTo, selectedEstablishment, user?.role, user?.establishment_id])

  return (
    <ProtectedPage requiredPermission="relatorios-loja">
      <div className="space-y-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Store className="w-8 h-8" style={{ color: '#0026d9' }} />
            Relatório de Lojas
          </h2>
          <p className="text-muted-foreground mt-2">Ranking de estabelecimentos por faturamento</p>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Configure os filtros para o ranking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <Label>Estabelecimento</Label>
                <Select 
                  value={selectedEstablishment?.toString() || "todos"} 
                  onValueChange={(value) => {
                    if (value === "todos") {
                      setSelectedEstablishment(null)
                    } else {
                      setSelectedEstablishment(parseInt(value))
                    }
                  }}
                  disabled={isGerente && !isGestorOrAdmin}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os Estabelecimentos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Estabelecimentos</SelectItem>
                    {establishments.map((establishment) => (
                      <SelectItem key={establishment.id} value={establishment.id.toString()}>
                        {establishment.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isGerente && !isGestorOrAdmin && (
                  <p className="text-xs text-muted-foreground">
                    Você só pode visualizar seu estabelecimento
                  </p>
                )}
              </div>

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
            </div>
          </CardContent>
        </Card>

        {/* Cards de Métricas */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Lojas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Store className="w-5 h-5" />
                {loading ? '...' : metrics.totalLojas}
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Melhor Loja</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                <span className="text-lg">{loading ? '...' : metrics.melhorLoja}</span>
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
                <CardTitle>Relatório de Lojas</CardTitle>
                <CardDescription>
                  Ordenado por maior faturamento
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
              <PanelTableSkeleton rows={10} columns={6} />
            ) : ranking.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum dado encontrado para o período selecionado
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium text-muted-foreground w-16">Pos</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Loja</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Faturamento</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Vendas</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Ticket Médio</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Vendedores</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRanking.map((item) => (
                        <tr key={item.loja.id} className="border-b hover:bg-muted/50">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {item.posicao <= 3 && (
                                <Trophy 
                                  className={`w-5 h-5 ${
                                    item.posicao === 1 ? 'text-yellow-500' :
                                    item.posicao === 2 ? 'text-gray-400' :
                                    'text-orange-600'
                                  }`}
                                />
                              )}
                              <span className="font-semibold">{item.posicao}º</span>
                            </div>
                          </td>
                          <td className="p-3 font-medium">{item.loja.name}</td>
                          <td className="p-3 text-right font-semibold">
                            R$ {item.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right">{item.quantidadeVendas}</td>
                          <td className="p-3 text-right">
                            R$ {item.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right">{item.vendedoresAtivos}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

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
              </>
            )}
          </CardContent>
        </Card>

        {/* Modal de Exportação */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Opções de Exportação</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Exportar ranking com os filtros aplicados
                  </p>
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
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-2">
                        <Label>Estabelecimento</Label>
                        <Select 
                          value={selectedEstablishment?.toString() || "todos"} 
                          onValueChange={(value) => {
                            if (value === "todos") {
                              setSelectedEstablishment(null)
                            } else {
                              setSelectedEstablishment(parseInt(value))
                            }
                          }}
                          disabled={isGerente && !isGestorOrAdmin}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Todos os Estabelecimentos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos os Estabelecimentos</SelectItem>
                            {establishments.map((establishment) => (
                              <SelectItem key={establishment.id} value={establishment.id.toString()}>
                                {establishment.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {isGerente && !isGestorOrAdmin && (
                          <p className="text-xs text-muted-foreground">
                            Você só pode visualizar seu estabelecimento
                          </p>
                        )}
                      </div>

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
                    </div>
                  </div>

                  {/* Resumo */}
                  <div>
                    <h3 className="font-semibold text-sm mb-2">Resumo</h3>
                    <div className="space-y-1 bg-muted/50 p-3 rounded-md">
                      <p className="text-xs text-muted-foreground">
                        <strong>Estabelecimento:</strong> {
                          selectedEstablishment === null 
                            ? 'Todos os Estabelecimentos' 
                            : establishments.find(e => e.id === selectedEstablishment)?.name || 'Não encontrado'
                        }
                      </p>
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
                        <strong>Total de itens:</strong> {ranking.length}
                      </p>
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
