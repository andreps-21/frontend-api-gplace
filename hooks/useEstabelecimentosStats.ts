import { useState, useEffect } from 'react'
import { apiService } from '@/lib/api'

interface EstabelecimentoStats {
  id: number
  name: string
  manager: string
  total_sales: number
  total_revenue: number
  active_sellers: number
  sales_by_category: Array<{
    category_id: number
    category_name: string
    count: number
    revenue: number
  }>
  average_sale_value: number
}

interface UseEstabelecimentosStatsParams {
  date_from?: string
  date_to?: string
}

export const useEstabelecimentosStats = (filters: UseEstabelecimentosStatsParams = {}) => {
  const [stats, setStats] = useState<EstabelecimentoStats[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await apiService.get('/establishments/stats', {
        params: filters
      })
      
      if (response.data && Array.isArray(response.data)) {
        setStats(response.data)
      } else {
        throw new Error('Formato de resposta inválido')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar estatísticas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [filters.date_from, filters.date_to])

  return { stats, loading, error, refetch: fetchStats }
}
