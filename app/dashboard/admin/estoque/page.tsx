"use client"

import { useCallback, useEffect, useState } from "react"
import { apiService } from "@/lib/api"
import { laravelInnerData, laravelValidationErrorText } from "@/lib/laravel-data"
import { useGplacePermissions } from "@/lib/use-gplace-permissions"
import { AccessDenied } from "@/components/ui/access-denied"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { PanelTableSkeleton } from "@/components/dashboard/panel-content-skeleton"
import { toast } from "sonner"

type Paginator<T> = { data: T[]; current_page: number; last_page: number; total: number }
type Warehouse = { id: number; name: string; code?: string | null; is_default?: boolean }
type ProductRow = { id: number; commercial_name?: string; sku?: string; reference?: string; quantity?: number }
type LotRow = { id: number; product?: ProductRow; warehouse?: Warehouse; quantity_received?: number; quantity_remaining?: number; document_reference?: string; received_at?: string }
type MovementRow = { id: number; product?: ProductRow; type?: string; quantity_delta?: number; quantity_after?: number; note?: string; created_at?: string }

export default function AdminEstoquePage() {
  const { can } = useGplacePermissions()
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [products, setProducts] = useState<ProductRow[]>([])
  const [lots, setLots] = useState<Paginator<LotRow> | null>(null)
  const [movements, setMovements] = useState<Paginator<MovementRow> | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null)
  const [warehouseForm, setWarehouseForm] = useState({ name: "", code: "", is_default: "0" })
  const [lotForm, setLotForm] = useState({ product_id: "", warehouse_id: "", quantity_received: "1", document_reference: "", unit_cost: "", received_at: "", note: "" })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [wRaw, pRaw, lRaw, mRaw] = await Promise.all([
        apiService.getAdminWarehouses(),
        apiService.getAdminProducts({ page: 1, per_page: 100 }),
        apiService.getAdminStockLots({ page: 1, per_page: 25 }),
        apiService.getAdminStockMovements({ page: 1, per_page: 25 }),
      ])
      setWarehouses(laravelInnerData<Warehouse[]>(wRaw) ?? [])
      const productsPayload = laravelInnerData<Paginator<ProductRow>>(pRaw)
      setProducts(productsPayload.data ?? [])
      setLots(laravelInnerData<Paginator<LotRow>>(lRaw))
      setMovements(laravelInnerData<Paginator<MovementRow>>(mRaw))
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar estoque.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openWarehouse = (row?: Warehouse) => {
    setEditingWarehouse(row ?? null)
    setWarehouseForm({
      name: row?.name ?? "",
      code: row?.code ?? "",
      is_default: row?.is_default ? "1" : "0",
    })
    setDialogOpen(true)
  }

  const saveWarehouse = async () => {
    setSaving(true)
    try {
      const payload = { name: warehouseForm.name, code: warehouseForm.code || null, is_default: warehouseForm.is_default === "1" }
      if (editingWarehouse) {
        await apiService.updateAdminWarehouse(editingWarehouse.id, payload)
      } else {
        await apiService.createAdminWarehouse(payload)
      }
      toast.success(editingWarehouse ? "Armazém atualizado." : "Armazém criado.")
      setDialogOpen(false)
      void load()
    } catch (e) {
      console.error(e)
      toast.error(laravelValidationErrorText(e) ?? "Erro ao salvar armazém.")
    } finally {
      setSaving(false)
    }
  }

  const deleteWarehouse = async (row: Warehouse) => {
    if (!confirm(`Remover armazém "${row.name}"?`)) return
    try {
      await apiService.deleteAdminWarehouse(row.id)
      toast.success("Armazém removido.")
      void load()
    } catch (e) {
      console.error(e)
      toast.error("Erro ao remover armazém.")
    }
  }

  const receiveLot = async () => {
    setSaving(true)
    try {
      await apiService.createAdminStockLot({
        product_id: Number(lotForm.product_id),
        warehouse_id: lotForm.warehouse_id ? Number(lotForm.warehouse_id) : null,
        quantity_received: Number(lotForm.quantity_received),
        document_reference: lotForm.document_reference || null,
        unit_cost: lotForm.unit_cost ? Number(lotForm.unit_cost) : null,
        received_at: lotForm.received_at || null,
        note: lotForm.note || null,
      })
      toast.success("Entrada registrada.")
      setLotForm({ product_id: "", warehouse_id: "", quantity_received: "1", document_reference: "", unit_cost: "", received_at: "", note: "" })
      void load()
    } catch (e) {
      console.error(e)
      toast.error(laravelValidationErrorText(e) ?? "Erro ao registrar entrada.")
    } finally {
      setSaving(false)
    }
  }

  if (!can("products_view")) return <AccessDenied />

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Estoque e armazéns</h1>
        <p className="text-muted-foreground mt-1 text-sm">Gestão dedicada de armazéns, entradas por lote e auditoria de movimentos.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Armazéns</CardTitle>
          <Button onClick={() => openWarehouse()}><Plus className="mr-2 h-4 w-4" />Novo armazém</Button>
        </CardHeader>
        <CardContent>
          {loading ? <PanelTableSkeleton rows={4} columns={4} /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Código</TableHead><TableHead>Padrão</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
              <TableBody>{warehouses.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{w.name}</TableCell>
                  <TableCell>{w.code}</TableCell>
                  <TableCell>{w.is_default ? "Sim" : "Não"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openWarehouse(w)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => void deleteWarehouse(w)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Registrar entrada por lote</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-1 sm:col-span-2">
            <Label>Produto</Label>
            <Select value={lotForm.product_id || undefined} onValueChange={(v) => setLotForm((f) => ({ ...f, product_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{products.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.commercial_name || p.sku || `#${p.id}`}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-1"><Label>Armazém</Label><Select value={lotForm.warehouse_id || "__none__"} onValueChange={(v) => setLotForm((f) => ({ ...f, warehouse_id: v === "__none__" ? "" : v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none__">Sem armazém</SelectItem>{warehouses.map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-1"><Label>Quantidade</Label><Input type="number" min={1} value={lotForm.quantity_received} onChange={(e) => setLotForm((f) => ({ ...f, quantity_received: e.target.value }))} /></div>
          <div className="grid gap-1"><Label>Documento</Label><Input value={lotForm.document_reference} onChange={(e) => setLotForm((f) => ({ ...f, document_reference: e.target.value }))} /></div>
          <div className="grid gap-1"><Label>Custo unitário</Label><Input type="number" step="0.0001" value={lotForm.unit_cost} onChange={(e) => setLotForm((f) => ({ ...f, unit_cost: e.target.value }))} /></div>
          <div className="grid gap-1"><Label>Recebido em</Label><Input type="date" value={lotForm.received_at} onChange={(e) => setLotForm((f) => ({ ...f, received_at: e.target.value }))} /></div>
          <div className="grid gap-1 sm:col-span-2"><Label>Nota</Label><Input value={lotForm.note} onChange={(e) => setLotForm((f) => ({ ...f, note: e.target.value }))} /></div>
          <div className="flex items-end"><Button onClick={() => void receiveLot()} disabled={saving || !lotForm.product_id}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Registrar entrada"}</Button></div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Lotes recentes</CardTitle></CardHeader>
          <CardContent>{loading ? <PanelTableSkeleton rows={8} columns={5} /> : <Table><TableHeader><TableRow><TableHead>Produto</TableHead><TableHead>Armazém</TableHead><TableHead>Qtd.</TableHead><TableHead>Restante</TableHead><TableHead>Documento</TableHead></TableRow></TableHeader><TableBody>{(lots?.data ?? []).map((l) => <TableRow key={l.id}><TableCell>{l.product?.commercial_name ?? l.product?.sku ?? l.id}</TableCell><TableCell>{l.warehouse?.name ?? "-"}</TableCell><TableCell>{l.quantity_received}</TableCell><TableCell>{l.quantity_remaining}</TableCell><TableCell>{l.document_reference}</TableCell></TableRow>)}</TableBody></Table>}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Movimentos recentes</CardTitle></CardHeader>
          <CardContent>{loading ? <PanelTableSkeleton rows={8} columns={5} /> : <Table><TableHeader><TableRow><TableHead>Produto</TableHead><TableHead>Tipo</TableHead><TableHead>Delta</TableHead><TableHead>Saldo</TableHead><TableHead>Nota</TableHead></TableRow></TableHeader><TableBody>{(movements?.data ?? []).map((m) => <TableRow key={m.id}><TableCell>{m.product?.commercial_name ?? m.product?.sku ?? m.id}</TableCell><TableCell>{m.type}</TableCell><TableCell>{m.quantity_delta}</TableCell><TableCell>{m.quantity_after}</TableCell><TableCell>{m.note}</TableCell></TableRow>)}</TableBody></Table>}</CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingWarehouse ? "Editar armazém" : "Novo armazém"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1"><Label>Nome</Label><Input value={warehouseForm.name} onChange={(e) => setWarehouseForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid gap-1"><Label>Código</Label><Input value={warehouseForm.code} onChange={(e) => setWarehouseForm((f) => ({ ...f, code: e.target.value }))} /></div>
            <div className="grid gap-1"><Label>Padrão</Label><Select value={warehouseForm.is_default} onValueChange={(v) => setWarehouseForm((f) => ({ ...f, is_default: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">Sim</SelectItem><SelectItem value="0">Não</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={() => void saveWarehouse()} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
