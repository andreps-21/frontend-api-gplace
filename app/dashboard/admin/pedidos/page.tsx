"use client"

import { useCallback, useEffect, useState } from "react"
import { apiService } from "@/lib/api"
import { laravelInnerData, laravelValidationErrorText } from "@/lib/laravel-data"
import { useGplacePermissions } from "@/lib/use-gplace-permissions"
import { AccessDenied } from "@/components/ui/access-denied"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Eye, Loader2, Printer } from "lucide-react"
import { PanelTableSkeleton } from "@/components/dashboard/panel-content-skeleton"
import { toast } from "sonner"

type Paginator<T> = { data: T[]; current_page: number; last_page: number; total: number }
type CustomerRow = { id: number; name?: string; people?: { name?: string } }

const STATUS: Record<string, string> = {
  "1": "Em Aprovação",
  "2": "Aprovado",
  "3": "Pendente",
  "4": "Em Faturamento",
  "5": "Em expedição",
  "6": "Despachado",
  "7": "Entregue",
  "8": "Cancelado",
}

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
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [status, setStatus] = useState("")
  const [customerId, setCustomerId] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [sync, setSync] = useState("")
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Record<string, unknown> | null>(null)
  const [nextStatus, setNextStatus] = useState("")
  const [trackingCode, setTrackingCode] = useState("")
  const [savingStatus, setSavingStatus] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await apiService.getAdminOrders({
        page,
        per_page: 15,
        status: status || undefined,
        customer: customerId ? Number(customerId) : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        sync: sync === "" ? undefined : sync === "1",
      })
      const inner = laravelInnerData<{ orders: Paginator<Record<string, unknown>>; customers?: CustomerRow[] }>(raw)
      setPaginator(inner.orders)
      setCustomers(inner.customers ?? [])
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar pedidos.")
    } finally {
      setLoading(false)
    }
  }, [page, status, customerId, startDate, endDate, sync])

  useEffect(() => {
    void load()
  }, [load])

  if (!can("orders_view")) {
    return <AccessDenied />
  }

  const openDetail = async (id: number) => {
    setDetailLoading(true)
    setDetailOpen(true)
    try {
      const raw = await apiService.getAdminOrder(id)
      const order = laravelInnerData<Record<string, unknown>>(raw)
      setSelectedOrder(order)
      setNextStatus(String(order.status ?? ""))
      setTrackingCode(String(order.tracking_code ?? ""))
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar pedido.")
    } finally {
      setDetailLoading(false)
    }
  }

  const saveStatus = async () => {
    if (!selectedOrder?.id || !nextStatus) return
    setSavingStatus(true)
    try {
      await apiService.updateOrderStatus({
        id: Number(selectedOrder.id),
        status: nextStatus,
        tracking_code: trackingCode || undefined,
      })
      toast.success("Estado atualizado.")
      await openDetail(Number(selectedOrder.id))
      void load()
    } catch (e) {
      console.error(e)
      toast.error(laravelValidationErrorText(e) ?? "Erro ao atualizar estado.")
    } finally {
      setSavingStatus(false)
    }
  }

  const items = Array.isArray(selectedOrder?.items) ? (selectedOrder.items as Record<string, unknown>[]) : []
  const payment = selectedOrder?.payment as Record<string, unknown> | undefined
  const address = selectedOrder?.address as Record<string, unknown> | undefined
  const printOrder = () => {
    const html = document.getElementById("order-print-area")?.innerHTML
    if (!html) return
    const win = window.open("", "_blank", "width=960,height=720")
    if (!win) {
      window.print()
      return
    }
    win.document.write(`<!doctype html><html><head><title>Pedido ${String(selectedOrder?.code ?? selectedOrder?.id ?? "")}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{font-size:22px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ddd;padding:8px;text-align:left}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.card{border:1px solid #ddd;border-radius:8px;padding:12px;margin-bottom:16px}.muted{color:#666;font-size:12px}@media print{button{display:none}}</style></head><body>${html}</body></html>`)
    win.document.close()
    win.focus()
    win.print()
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pedido de venda</h1>
        <p className="text-muted-foreground mt-1 text-sm">Listagem alinhada à API <code className="text-xs">GET /admin/orders</code>.</p>
      </div>
      <Card>
        <CardHeader className="space-y-4">
          <CardTitle>Pedidos</CardTitle>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <Select value={status || "all"} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1) }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os estados</SelectItem>
                {Object.entries(STATUS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={customerId || "all"} onValueChange={(v) => { setCustomerId(v === "all" ? "" : v); setPage(1) }}>
              <SelectTrigger><SelectValue placeholder="Cliente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={String(customer.id)}>{customer.name || customer.people?.name || `#${customer.id}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1) }} />
            <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1) }} />
            <Select value={sync || "all"} onValueChange={(v) => { setSync(v === "all" ? "" : v); setPage(1) }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos sync</SelectItem>
                <SelectItem value="1">Sincronizados</SelectItem>
                <SelectItem value="0">Não sincronizados</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar"}
            </Button>
          </div>
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
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(paginator?.data ?? []).map((row) => (
                    <TableRow key={String(row.id)}>
                      <TableCell>{String(row.id)}</TableCell>
                      <TableCell>{orderCustomerLabel(row)}</TableCell>
                      <TableCell>{String(row.purchase_date ?? row.created_at ?? "")}</TableCell>
                      <TableCell>{STATUS[String(row.status ?? "")] ?? String(row.status ?? "")}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => void openDetail(Number(row.id))}><Eye className="h-4 w-4" /></Button>
                      </TableCell>
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

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Pedido {selectedOrder?.code ? `#${String(selectedOrder.code)}` : ""}</DialogTitle>
            <DialogDescription>Detalhe administrativo do pedido da loja.</DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <PanelTableSkeleton rows={4} columns={4} />
          ) : selectedOrder ? (
            <div id="order-print-area" className="space-y-5">
              <h1 className="hidden text-xl font-bold print:block">Pedido {String(selectedOrder.code ?? selectedOrder.id ?? "")}</h1>
              <div className="card grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-3">
                <div><span className="muted text-muted-foreground">Cliente</span><div className="font-medium">{orderCustomerLabel(selectedOrder)}</div></div>
                <div><span className="muted text-muted-foreground">Data</span><div className="font-medium">{String(selectedOrder.purchase_date ?? selectedOrder.created_at ?? "")}</div></div>
                <div><span className="muted text-muted-foreground">Estado</span><div className="font-medium">{STATUS[String(selectedOrder.status ?? "")] ?? String(selectedOrder.status ?? "")}</div></div>
                <div><span className="muted text-muted-foreground">Subtotal</span><div className="font-medium">{String(selectedOrder.vl_amount ?? "")}</div></div>
                <div><span className="muted text-muted-foreground">Frete</span><div className="font-medium">{String(selectedOrder.vl_freight ?? "")}</div></div>
                <div><span className="muted text-muted-foreground">Desconto</span><div className="font-medium">{String(selectedOrder.vl_discount ?? "")}</div></div>
                <div><span className="muted text-muted-foreground">Total</span><div className="font-medium">{String(selectedOrder.total ?? "")}</div></div>
                <div><span className="muted text-muted-foreground">Pagamento</span><div className="font-medium">{String(payment?.description ?? payment?.name ?? "")}</div></div>
                <div><span className="muted text-muted-foreground">Rastreio</span><div className="font-medium">{String(selectedOrder.tracking_code ?? "")}</div></div>
                <div className="sm:col-span-3"><span className="muted text-muted-foreground">Entrega</span><div className="font-medium">{String(address?.street ?? address?.address ?? selectedOrder.delivery_place ?? "")}</div></div>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead>Qtd.</TableHead><TableHead>Vl. unit.</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {items.map((item, idx) => {
                    const product = item.product as Record<string, unknown> | undefined
                    return (
                      <TableRow key={String(item.id ?? idx)}>
                        <TableCell>{String(product?.commercial_name ?? product?.name ?? item.product_id ?? "")}</TableCell>
                        <TableCell>{String(item.quantity ?? item.qtd ?? "")}</TableCell>
                        <TableCell>{String(item.vl_unit ?? item.unit_value ?? "")}</TableCell>
                        <TableCell>{String(item.total ?? "")}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1">
                  <Label>Estado</Label>
                  <Select value={nextStatus} onValueChange={setNextStatus}>
                    <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
                    <SelectContent>{Object.entries(STATUS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1">
                  <Label>Código de rastreio</Label>
                  <Input value={trackingCode} onChange={(e) => setTrackingCode(e.target.value)} />
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={printOrder}><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
            <Button onClick={() => void saveStatus()} disabled={savingStatus || !selectedOrder}>{savingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar estado"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
