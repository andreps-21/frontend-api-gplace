import { useState, useEffect, useCallback, useMemo } from "react"
import { apiService } from "@/lib/api"
import { laravelInnerData } from "@/lib/laravel-data"
import { useAuth } from "@/lib/auth"

export type TopProductRow = {
  product_id: number
  commercial_name: string
  sku: string
  reference: string
  quantity_sold: number
  revenue: number
}

function currentMonthRange(): { date_from: string; date_to: string } {
  const t = new Date()
  const from = new Date(t.getFullYear(), t.getMonth(), 1).toISOString().split("T")[0]
  const to = new Date(t.getFullYear(), t.getMonth() + 1, 0).toISOString().split("T")[0]
  return { date_from: from, date_to: to }
}

export function useTopProdutosVendidosMes() {
  const { user } = useAuth()
  const [products, setProducts] = useState<TopProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<{ date_from: string; date_to: string } | null>(null)

  const load = useCallback(async () => {
    if (!user?.id) return
    const { date_from, date_to } = currentMonthRange()
    const params: { date_from: string; date_to: string; limit: number; seller_id?: number } = {
      date_from,
      date_to,
      limit: 10,
    }
    if (user.role === "vendedor") {
      params.seller_id = user.id
    }
    setLoading(true)
    setError(null)
    try {
      const raw = await apiService.getDashboardTopProducts(params)
      const inner = laravelInnerData<{
        period?: { date_from: string; date_to: string }
        products?: TopProductRow[]
      }>(raw)
      setPeriod(inner?.period ?? { date_from, date_to })
      setProducts(Array.isArray(inner?.products) ? inner.products : [])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar ranking"
      setError(msg)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [user?.id, user?.role])

  useEffect(() => {
    void load()
  }, [load])

  const topProducts = useMemo(
    () => products.map((p, i) => ({ ...p, posicao: i + 1 })),
    [products],
  )

  const maxQty = useMemo(
    () => (products.length > 0 ? Math.max(...products.map((p) => p.quantity_sold), 0) : 0),
    [products],
  )

  const totalRevenue = useMemo(() => products.reduce((s, p) => s + p.revenue, 0), [products])
  const totalQuantity = useMemo(() => products.reduce((s, p) => s + p.quantity_sold, 0), [products])

  return {
    topProducts,
    loading,
    error,
    period,
    maxQty,
    totalRevenue,
    totalQuantity,
    refetch: load,
  }
}
