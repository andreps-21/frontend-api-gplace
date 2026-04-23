"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingCart, TrendingUp, Coins, Cake } from "lucide-react"
import { DashboardHomeSkeleton } from "@/components/dashboard/dashboard-home-skeleton"
import {
  apiService,
  type DashboardOrdersYearlyPayload,
  type DashboardSalesSummaryPayload,
} from "@/lib/api"
import { OrdersYearlyChart } from "@/components/dashboard/orders-yearly-chart"
import { useAuth } from "@/lib/auth"
import { isGestorLevelRole } from "@/lib/permissions-role"
import { notifications } from "@/lib/notifications"
import { TopProdutosVendidosCard } from "@/components/TopProdutosVendidosCard"

interface DashboardStats {
  vendasHoje: number
  vendasOntem: number
  variacaoVendas: number
  faturamentoMes: number
}

interface RecentSale {
  id: number
  vendedor: string
  produto: string
  valor: number
  loja: string
  data: string
}

interface Aniversariante {
  id: number
  name: string
  email: string
  birthdate: string | null
  day_of_month: number | null
  establishment_name?: string | null
}

function startOfMonthIso(): string {
  const t = new Date()
  return new Date(t.getFullYear(), t.getMonth(), 1).toISOString().split("T")[0]
}

function endOfMonthIso(): string {
  const t = new Date()
  return new Date(t.getFullYear(), t.getMonth() + 1, 0).toISOString().split("T")[0]
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    vendasHoje: 0,
    vendasOntem: 0,
    variacaoVendas: 0,
    faturamentoMes: 0,
  })
  const [recentSales, setRecentSales] = useState<RecentSale[]>([])
  const [establishments, setEstablishments] = useState<{ id: number; name: string }[]>([])
  const [aniversariantes, setAniversariantes] = useState<Aniversariante[]>([])
  const [ordersYearly, setOrdersYearly] = useState<DashboardOrdersYearlyPayload | null>(null)

  const loadDashboard = useCallback(async () => {
    if (!user?.id) return

    const firstDay = startOfMonthIso()
    const lastDay = endOfMonthIso()

    const activityScope: { seller_id?: number; establishment_id?: number } = {}
    if (user.role === "vendedor") {
      activityScope.seller_id = user.id
      if (user.establishment_id) {
        activityScope.establishment_id = user.establishment_id
      }
    } else if (user.role === "gerente" && user.establishment_id) {
      activityScope.establishment_id = user.establishment_id
    }

    const statsParams: { establishment_id?: number; seller_id?: number } = {}
    if (isGestorLevelRole(user.role)) {
      /* escopo completo da loja do header `app` */
    } else if (user.role === "gerente" && user.establishment_id) {
      statsParams.establishment_id = user.establishment_id
    } else if (user.role === "vendedor") {
      statsParams.seller_id = user.id
    }

    const yearlyParams: { years_back: number; seller_id?: number } = { years_back: 2 }
    if (user.role === "vendedor") {
      yearlyParams.seller_id = user.id
    }

    setLoading(true)
    try {
      const [summaryEnvelope, recentEnvelope, statsEnvelope, yearlyEnvelope] = await Promise.all([
        apiService.getDashboardSalesSummary(activityScope),
        apiService.getDashboardRecentSales({
          date_from: firstDay,
          date_to: lastDay,
          limit: 5,
          ...activityScope,
        }),
        apiService.getDashboardStats(statsParams),
        apiService.getDashboardOrdersYearly(yearlyParams).catch(() => ({ message: "", data: null })),
      ])

      const summary = summaryEnvelope?.data as DashboardSalesSummaryPayload | undefined
      const recentRaw = recentEnvelope?.data
      const recentList = Array.isArray(recentRaw) ? recentRaw : []
      const recentSalesData: RecentSale[] = recentList.map((venda: Record<string, unknown>) => {
        const seller = venda.seller as { name?: string } | undefined
        const prod = venda.product as { name?: string } | undefined
        const est = venda.establishment as { name?: string } | undefined
        return {
          id: Number(venda.id),
          vendedor: seller?.name ?? "—",
          produto:
            (venda.product_name as string) ||
            prod?.name ||
            "Produto",
          valor: parseFloat(String(venda.total_price ?? 0)) || 0,
          loja: est?.name ?? "—",
          data: String(venda.created_at ?? ""),
        }
      })

      const statsData = statsEnvelope?.data as
        | {
            vendedores_ativos?: number
            faturamento_mes_atual?: number
            aniversariantes_do_mes?: Aniversariante[]
          }
        | undefined

      setStats({
        vendasHoje: summary?.vendas_hoje ?? 0,
        vendasOntem: summary?.vendas_ontem ?? 0,
        variacaoVendas: summary?.variacao_vendas_percent ?? 0,
        faturamentoMes: statsData?.faturamento_mes_atual ?? 0,
      })

      setRecentSales(recentSalesData)
      setAniversariantes(
        Array.isArray(statsData?.aniversariantes_do_mes)
          ? statsData!.aniversariantes_do_mes!
          : []
      )

      const yPayload = yearlyEnvelope?.data as DashboardOrdersYearlyPayload | null | undefined
      if (
        yPayload &&
        Array.isArray(yPayload.anos) &&
        yPayload.anos.length > 0 &&
        Array.isArray(yPayload.meses)
      ) {
        setOrdersYearly(yPayload)
      } else {
        setOrdersYearly(null)
      }

      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
        if (token && (isGestorLevelRole(user.role) || user.role === "gerente")) {
          const estRes = await apiService.getEstablishments()
          const raw = estRes?.data
          const list = Array.isArray(raw) ? raw : (raw as { data?: unknown })?.data
          if (Array.isArray(list)) {
            setEstablishments(
              list.map((e: { id: number; name: string }) => ({
                id: e.id,
                name: e.name,
              }))
            )
          }
        } else if (token && user.establishment_id && user.establishment_id > 0) {
          try {
            const my = await apiService.getMyEstablishment()
            const e = my?.data as { id?: number; name?: string } | undefined
            if (e?.id) {
              setEstablishments([{ id: e.id, name: e.name ?? "Minha loja" }])
            }
          } catch {
            setEstablishments([{ id: user.establishment_id, name: "Minha loja" }])
          }
          } else {
            setEstablishments([])
        }
      } catch {
        setEstablishments([])
      }
    } catch {
      setOrdersYearly(null)
      notifications.custom.error("Erro ao carregar dados do dashboard")
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user?.id) {
      loadDashboard()
    }
  }, [user, loadDashboard])

  /** Mesma cor de marca do sidebar (`bg-[#2f3a8f]`). */
  const kpiIconClass = "h-5 w-5 shrink-0 text-[#2f3a8f]"

  const statsData = [
    {
      title: "Vendas Hoje",
      value: loading ? "..." : stats.vendasHoje.toString(),
      change: loading
        ? "..."
        : (() => {
            if (stats.variacaoVendas > 0) return `+${stats.variacaoVendas.toFixed(1)}%`
            if (stats.variacaoVendas < 0) return `${stats.variacaoVendas.toFixed(1)}%`
            return "0%"
          })(),
      icon: ShoppingCart,
    },
    {
      title: "Faturamento do Mês",
      value: loading
        ? "..."
        : stats.faturamentoMes.toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
      change: "Mensal",
      icon: Coins,
    },
  ]

  if (loading) {
    return <DashboardHomeSkeleton />
  }

  const labelMesAtual = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })

  return (
    <div className="space-y-6">
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4">
        {statsData.map((stat) => (
          <Card key={stat.title} className="flex h-full min-h-0 min-w-0 flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="min-w-0 text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={kpiIconClass} />
            </CardHeader>
            <CardContent className="flex-1">
              <div className="text-2xl font-bold tabular-nums text-foreground">{stat.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <OrdersYearlyChart payload={ordersYearly} />

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
            <span className="flex items-center gap-2 text-lg">
              <Cake className="h-5 w-5 text-primary" />
              Aniversariantes do mês
            </span>
            <span className="text-sm font-normal text-muted-foreground">({labelMesAtual})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {aniversariantes.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              Nenhum vendedor com data de nascimento neste mês no âmbito desta loja, ou os cadastros ainda não
              têm a data preenchida.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {aniversariantes.map((p) => {
                const hoje = new Date()
                const aniversarioHoje = p.day_of_month != null && p.day_of_month === hoje.getDate()

                return (
                <li
                  key={p.id}
                  className="flex flex-col rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm"
                >
                    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-semibold text-foreground">
                      <span>Dia {p.day_of_month ?? "—"} —</span>
                    {aniversarioHoje ? (
                        <Cake className="h-4 w-4 shrink-0 text-pink-500" aria-label="Aniversário hoje" />
                    ) : null}
                    <span>{p.name}</span>
                  </span>
                  {p.establishment_name ? (
                      <span className="truncate text-xs text-muted-foreground">{p.establishment_name}</span>
                  ) : null}
                </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
              <span className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
                Vendas recentes
              </span>
              <span className="text-sm font-normal text-muted-foreground">({labelMesAtual})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSales.length > 0 ? (
                recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{sale.vendedor}</p>
                    <p className="text-sm text-muted-foreground">
                      {sale.produto} • {sale.loja}
                    </p>
                  </div>
                    <div className="font-semibold text-foreground">
                      R${" "}
                      {sale.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center">
                  <ShoppingCart className="mx-auto mb-2 h-12 w-12 text-gray-300" />
                  <p className="text-muted-foreground">Nenhuma venda no mês atual</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <TopProdutosVendidosCard />
      </div>
    </div>
  )
}
