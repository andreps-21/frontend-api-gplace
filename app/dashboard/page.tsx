"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingCart, TrendingUp, Users, Target, Wifi, Smartphone, Headphones, Coins, Cake } from "lucide-react"
import { DashboardHomeSkeleton } from "@/components/dashboard/dashboard-home-skeleton"
import { apiService } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { isGestorLevelRole } from "@/lib/permissions-role"
import { notifications } from "@/lib/notifications"
import { TopLojasCard } from "@/components/TopLojasCard"

interface DashboardStats {
  vendasHoje: number
  vendasOntem: number
  variacaoVendas: number
  faturamentoMes: number
  metaMes: number
  vendedoresAtivos: number
  faturamentoServico: number
  faturamentoChip: number
  faturamentoAparelho: number
  faturamentoAcessorio: number
  quantidadeVendasServico: number
  quantidadeVendasChip: number
  quantidadeVendasAparelho: number
  quantidadeVendasAcessorio: number
  variacaoServico: number
  variacaoChip: number
  variacaoAparelho: number
  variacaoAcessorio: number
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

function todayIso(): string {
  return new Date().toISOString().split("T")[0]
}

function yesterdayIso(): string {
  const y = new Date()
  y.setDate(y.getDate() - 1)
  return y.toISOString().split("T")[0]
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    vendasHoje: 0,
    vendasOntem: 0,
    variacaoVendas: 0,
    faturamentoMes: 0,
    metaMes: 0,
    vendedoresAtivos: 0,
    faturamentoServico: 0,
    faturamentoChip: 0,
    faturamentoAparelho: 0,
    faturamentoAcessorio: 0,
    quantidadeVendasServico: 0,
    quantidadeVendasChip: 0,
    quantidadeVendasAparelho: 0,
    quantidadeVendasAcessorio: 0,
    variacaoServico: 0,
    variacaoChip: 0,
    variacaoAparelho: 0,
    variacaoAcessorio: 0,
  })
  const [recentSales, setRecentSales] = useState<RecentSale[]>([])
  const [establishments, setEstablishments] = useState<{ id: number; name: string }[]>([])
  const [aniversariantes, setAniversariantes] = useState<Aniversariante[]>([])

  const loadDashboard = useCallback(async () => {
    if (!user?.id) return

    const firstDay = startOfMonthIso()
    const lastDay = endOfMonthIso()
    const today = todayIso()
    const yesterday = yesterdayIso()

    const salesParams: Record<string, string | number> = {
      date_from: firstDay,
      date_to: lastDay,
        page: 1,
      per_page: 10000,
      }
      
    if (user.role === "vendedor") {
        salesParams.seller_id = user.id
      if (user.establishment_id) {
          salesParams.establishment_id = user.establishment_id
      }
    } else if (user.role === "gerente" && user.establishment_id) {
      salesParams.establishment_id = user.establishment_id
    }

    const statsParams: { establishment_id?: number; seller_id?: number } = {}
    if (isGestorLevelRole(user.role)) {
      /* escopo completo da loja do header `app` */
    } else if (user.role === "gerente" && user.establishment_id) {
      statsParams.establishment_id = user.establishment_id
    } else if (user.role === "vendedor") {
      statsParams.seller_id = user.id
    }

    const faturamentoParams: {
      date_from: string
      date_to: string
      seller_id?: number
    } = {
      date_from: firstDay,
      date_to: lastDay,
    }
    if (user.role === "vendedor") {
      faturamentoParams.seller_id = user.id
    }

    setLoading(true)
    try {
      const [salesEnvelope, statsEnvelope, fatEnvelope] = await Promise.all([
        apiService.getSales(salesParams),
        apiService.getDashboardStats(statsParams),
        apiService.getDashboardFaturamento(faturamentoParams),
      ])

      const paginator = salesEnvelope?.data as
        | { data?: unknown[] }
        | undefined
      const vendasRaw = Array.isArray(paginator?.data) ? paginator.data : []
      const vendas = vendasRaw as Record<string, unknown>[]

      const vendasHoje = vendas.filter((v) => {
        const d = v.created_at ? new Date(String(v.created_at)).toISOString().split("T")[0] : ""
        return d === today
      })
      const vendasOntem = vendas.filter((v) => {
        const d = v.created_at ? new Date(String(v.created_at)).toISOString().split("T")[0] : ""
        return d === yesterday
      })

      let variacaoVendas = 0
      if (vendasOntem.length > 0) {
        variacaoVendas =
          ((vendasHoje.length - vendasOntem.length) / vendasOntem.length) * 100
      } else if (vendasHoje.length > 0) {
        variacaoVendas = 100
      }

      const recentSalesData: RecentSale[] = vendas.slice(0, 5).map((venda: Record<string, unknown>) => {
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

      const fat = fatEnvelope?.data as
        | {
            faturamento?: Record<string, number>
            quantidade_vendas?: Record<string, number>
            variacoes?: Record<string, number>
          }
        | undefined

      setStats({
        vendasHoje: vendasHoje.length,
        vendasOntem: vendasOntem.length,
        variacaoVendas,
        faturamentoMes: statsData?.faturamento_mes_atual ?? 0,
        metaMes: 0,
        vendedoresAtivos: statsData?.vendedores_ativos ?? 0,
        faturamentoServico: fat?.faturamento?.servico ?? 0,
        faturamentoChip: fat?.faturamento?.chip ?? 0,
        faturamentoAparelho: fat?.faturamento?.aparelho ?? 0,
        faturamentoAcessorio: fat?.faturamento?.acessorio ?? 0,
        quantidadeVendasServico: fat?.quantidade_vendas?.servico ?? 0,
        quantidadeVendasChip: fat?.quantidade_vendas?.chip ?? 0,
        quantidadeVendasAparelho: fat?.quantidade_vendas?.aparelho ?? 0,
        quantidadeVendasAcessorio: fat?.quantidade_vendas?.acessorio ?? 0,
        variacaoServico: fat?.variacoes?.servico ?? 0,
        variacaoChip: fat?.variacoes?.chip ?? 0,
        variacaoAparelho: fat?.variacoes?.aparelho ?? 0,
        variacaoAcessorio: fat?.variacoes?.acessorio ?? 0,
      })

      setRecentSales(recentSalesData)
      setAniversariantes(
        Array.isArray(statsData?.aniversariantes_do_mes)
          ? statsData!.aniversariantes_do_mes!
          : []
      )

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
    color: "text-blue-600",
  },
  {
    title: "Faturamento do Mês",
      value: loading
        ? "..."
        : stats.faturamentoMes.toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
      change: "Mensal",
    icon: Coins,
    color: "text-green-600",
  },
  {
    title: "Meta do Mês",
      value: "0%",
      change: "Não definida",
    icon: Target,
      color: "text-gray-500",
  },
  {
    title: "Vendedores Ativos",
      value: loading ? "..." : stats.vendedoresAtivos.toString(),
      change:
        isGestorLevelRole(user?.role) || user?.role === "gerente"
          ? `${establishments.length} loja(s)`
          : "Sua loja",
    icon: Users,
    color: "text-purple-600",
  },
  {
    title: "Faturamento Serviço",
      value: loading
        ? "..."
        : `R$ ${stats.faturamentoServico.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      change: loading
        ? "..."
        : (() => {
      const quantity = stats.quantidadeVendasServico
      const variation = stats.variacaoServico
            const variationText =
              variation >= 0 ? `+${variation.toFixed(1)}%` : `${variation.toFixed(1)}%`
            return `${quantity} ${quantity === 1 ? "venda" : "vendas"} • ${variationText}`
    })(),
    icon: Wifi,
    color: "text-blue-600",
  },
  {
    title: "Faturamento Chip",
      value: loading
        ? "..."
        : `R$ ${stats.faturamentoChip.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      change: loading
        ? "..."
        : (() => {
      const quantity = stats.quantidadeVendasChip
      const variation = stats.variacaoChip
            const variationText =
              variation >= 0 ? `+${variation.toFixed(1)}%` : `${variation.toFixed(1)}%`
            return `${quantity} ${quantity === 1 ? "venda" : "vendas"} • ${variationText}`
    })(),
    icon: Smartphone,
    color: "text-green-600",
  },
  {
    title: "Faturamento Aparelho",
      value: loading
        ? "..."
        : `R$ ${stats.faturamentoAparelho.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      change: loading
        ? "..."
        : (() => {
      const quantity = stats.quantidadeVendasAparelho
      const variation = stats.variacaoAparelho
            const variationText =
              variation >= 0 ? `+${variation.toFixed(1)}%` : `${variation.toFixed(1)}%`
            return `${quantity} ${quantity === 1 ? "venda" : "vendas"} • ${variationText}`
    })(),
    icon: Smartphone,
    color: "text-purple-600",
  },
  {
    title: "Faturamento Acessório",
      value: loading
        ? "..."
        : `R$ ${stats.faturamentoAcessorio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      change: loading
        ? "..."
        : (() => {
      const quantity = stats.quantidadeVendasAcessorio
      const variation = stats.variacaoAcessorio
            const variationText =
              variation >= 0 ? `+${variation.toFixed(1)}%` : `${variation.toFixed(1)}%`
            return `${quantity} ${quantity === 1 ? "venda" : "vendas"} • ${variationText}`
    })(),
    icon: Headphones,
    color: "text-orange-600",
  },
]

  if (loading) {
    return <DashboardHomeSkeleton />
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-3xl font-bold text-foreground">Painel</h2>
        <p className="text-muted-foreground">
          Visão geral das operações da loja (dados de pedidos e vendedores)
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        {statsData.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-violet-200/80 bg-gradient-to-br from-violet-50/90 to-background dark:border-violet-800/60 dark:from-violet-950/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Cake className="h-5 w-5 text-violet-600" />
            Aniversariantes do mês
            <span className="text-sm font-normal text-muted-foreground">
              ({new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })})
            </span>
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
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Vendas recentes (mês atual)
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

        <TopLojasCard />
      </div>
    </div>
  )
}
