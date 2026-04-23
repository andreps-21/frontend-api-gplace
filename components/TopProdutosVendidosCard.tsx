"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, TrendingUp } from "lucide-react"
import { useTopProdutosVendidosMes } from "@/hooks/useTopProdutosVendidosMes"
import { Skeleton } from "@/components/ui/skeleton"

export function TopProdutosVendidosCard() {
  const { topProducts, loading, error, period, maxQty, totalRevenue, totalQuantity } = useTopProdutosVendidosMes()

  const labelMes =
    period != null
      ? new Date(period.date_from + "T12:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
      : ""

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 text-primary" />
            Top produtos mais vendidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
          <span className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 text-primary" />
            Top produtos mais vendidos
          </span>
          {labelMes ? (
            <span className="text-sm font-normal text-muted-foreground">({labelMes})</span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loading ? (
            <>
              {[1, 2, 3].map((index) => (
                <div key={index} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <div className="space-y-1 text-right">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </>
          ) : topProducts.length > 0 ? (
            <>
              {topProducts.map((p) => {
                const widthPct = maxQty > 0 ? Math.min(100, (p.quantity_sold / maxQty) * 100) : 0
                return (
                  <div key={p.product_id} className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <span className="text-sm font-bold text-primary">{p.posicao}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{p.commercial_name || "—"}</p>
                          <p className="truncate text-sm text-muted-foreground">
                            {p.reference ? `Ref. ${p.reference}` : "—"}
                            {p.sku ? ` · SKU ${p.sku}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-semibold text-foreground">
                          {Number.isInteger(p.quantity_sold) || p.quantity_sold % 1 === 0
                            ? String(Math.round(p.quantity_sold))
                            : p.quantity_sold.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}{" "}
                          <span className="text-sm font-normal text-muted-foreground">un.</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          R$ {p.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-primary/80 to-emerald-500/90 transition-all duration-500"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                )
              })}

              <div className="mt-6 rounded-lg bg-muted/30 p-4">
                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                  <div>
                    <p className="text-muted-foreground">Itens no ranking</p>
                    <p className="font-semibold">{topProducts.length}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Qtd. total (top {topProducts.length})</p>
                    <p className="font-semibold tabular-nums">
                      {totalQuantity.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Faturamento (top {topProducts.length})</p>
                    <p className="font-semibold tabular-nums">
                      R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5" />
                      Líder
                    </p>
                    <p className="line-clamp-2 font-semibold" title={topProducts[0]?.commercial_name}>
                      {topProducts[0]?.commercial_name ?? "—"}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhuma venda de produto registada no mês corrente nesta loja.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
