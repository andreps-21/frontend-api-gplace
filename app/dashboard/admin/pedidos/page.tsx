"use client"

import { useCallback, useEffect, useState } from "react"
import { apiService } from "@/lib/api"
import { laravelInnerData } from "@/lib/laravel-data"
import { useGplacePermissions } from "@/lib/use-gplace-permissions"
import { AccessDenied } from "@/components/ui/access-denied"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2 } from "lucide-react"
import { PanelTableSkeleton } from "@/components/dashboard/panel-content-skeleton"
import { toast } from "sonner"

type Paginator<T> = { data: T[]; current_page: number; last_page: number; total: number }

function orderCustomerLabel(row: Record<string, unknown>): string {
  const c = row.customer as Record<string, unknown> | undefined | null
  if (!c) return ""
  if (typeof c.name === "string" && c.name.trim()) return c.name
  const people = c.people as Record<string, unknown> | undefined
  if (people && typeof people.name === "string" && people.name.trim()) return people.name
  if (c.id != null) return `#${String(c.id)}`
  return ""
}

export default function AdminPedidosPage() {
  const { can } = useGplacePermissions()
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [paginator, setPaginator] = useState<Paginator<Record<string, unknown>> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await apiService.getAdminOrders({ page, per_page: 15 })
      const inner = laravelInnerData<{ orders: Paginator<Record<string, unknown>> }>(raw)
      setPaginator(inner.orders)
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar pedidos.")
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    void load()
  }, [load])

  if (!can("orders_view")) {
    return <AccessDenied />
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pedido de venda</h1>
        <p className="text-muted-foreground mt-1 text-sm">Listagem alinhada à API <code className="text-xs">GET /admin/orders</code>.</p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Pedidos</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar"}
          </Button>
        </CardHeader>
        <CardContent>
          {loading && !paginator ? (
            <PanelTableSkeleton rows={10} columns={4} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(paginator?.data ?? []).map((row) => (
                    <TableRow key={String(row.id)}>
                      <TableCell>{String(row.id)}</TableCell>
                      <TableCell>{orderCustomerLabel(row)}</TableCell>
                      <TableCell>{String(row.purchase_date ?? row.created_at ?? "")}</TableCell>
                      <TableCell>{String(row.status ?? "")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {paginator && paginator.last_page > 1 ? (
                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    Página {paginator.current_page} de {paginator.last_page} ({paginator.total})
                  </span>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
                      Anterior
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page >= paginator.last_page || loading}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Seguinte
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
