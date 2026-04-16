import { useMemo } from 'react'
import { useEstabelecimentosStats } from './useEstabelecimentosStats'

interface TopLoja {
  id: number
  nome: string
  vendas: number
  faturamento: number
  posicao: number
  vendedoresAtivos: number
  ticketMedio: number
}

export const useTopLojasMes = () => {
  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString().split('T')[0]
  const monthEnd = today.toISOString().split('T')[0]

  const { stats, loading, error } = useEstabelecimentosStats({
    date_from: monthStart,
    date_to: monthEnd
  })

  const topLojas = useMemo((): TopLoja[] => {
    if (!stats || stats.length === 0) return []

    return stats
      .map((estabelecimento) => ({
        id: estabelecimento.id,
        nome: estabelecimento.name,
        vendas: estabelecimento.total_sales,
        faturamento: estabelecimento.total_revenue,
        posicao: 0, // Será recalculado após ordenação
        vendedoresAtivos: estabelecimento.active_sellers,
        ticketMedio: estabelecimento.average_sale_value
      }))
      .sort((a, b) => b.faturamento - a.faturamento) // Ordenar por faturamento
      .map((loja, index) => ({ ...loja, posicao: index + 1 })) // Recalcular posições
  }, [stats])

  return {
    topLojas,
    loading,
    error,
    totalLojas: topLojas.length,
    faturamentoTotal: topLojas.reduce((sum, loja) => sum + loja.faturamento, 0)
  }
}
