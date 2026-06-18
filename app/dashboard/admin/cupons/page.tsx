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
type CouponRow = { id: number; name: string; description?: string; start_at?: string; end_at?: string; is_enabled?: boolean; sponsor?: string; apply?: string; discount?: string | number; min_order?: string | number; quantity?: number; balance?: number; business_unit_id?: number | null }
type UnitRow = { id: number; name?: string; description?: string }
type Bundle = { coupons: Paginator<CouponRow>; business_units: UnitRow[]; sponsors: Record<string, string>; applies: Record<string, string> }

const emptyForm = { name: "", description: "", start_at: "", end_at: "", sponsor: "", apply: "D", business_unit_id: "", is_enabled: "1", discount: "0", min_order: "0", quantity: "1" }

function dateValue(value?: string) {
  return value ? value.slice(0, 10) : ""
}

export default function CuponsPage() {
  const { can } = useGplacePermissions()
  const [loading, setLoading] = useState(true)
  const [bundle, setBundle] = useState<Bundle | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CouponRow | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setBundle(laravelInnerData<Bundle>(await apiService.getAdminCoupons({ page: 1, per_page: 100 })))
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar cupons.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (!can("coupons_view")) return <AccessDenied />

  const mayCreateCoupon = can("coupons_create")
  const mayEditCoupon = can("coupons_edit")
  const mayDeleteCoupon = can("coupons_delete")

  const open = (row?: CouponRow) => {
    if (row && !mayEditCoupon) {
      toast.error("Sem permissão para editar cupons.")
      return
    }
    if (!row && !mayCreateCoupon) {
      toast.error("Sem permissão para criar cupons.")
      return
    }
    setEditing(row ?? null)
    setForm(row ? {
      name: row.name ?? "",
      description: row.description ?? "",
      start_at: dateValue(row.start_at),
      end_at: dateValue(row.end_at),
      sponsor: row.sponsor ?? "",
      apply: row.apply ?? "D",
      business_unit_id: row.business_unit_id ? String(row.business_unit_id) : "",
      is_enabled: row.is_enabled ? "1" : "0",
      discount: String(row.discount ?? "0"),
      min_order: String(row.min_order ?? "0"),
      quantity: String(row.quantity ?? "1"),
    } : emptyForm)
    setDialogOpen(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        sponsor: form.sponsor || null,
        business_unit_id: form.business_unit_id ? Number(form.business_unit_id) : null,
        is_enabled: form.is_enabled === "1",
        discount: Number(form.discount),
        min_order: Number(form.min_order),
        quantity: Number(form.quantity),
      }
      if (editing) await apiService.updateAdminCoupon(editing.id, payload)
      else await apiService.createAdminCoupon(payload)
      toast.success(editing ? "Cupom atualizado." : "Cupom criado.")
      setDialogOpen(false)
      void load()
    } catch (e) {
      console.error(e)
      const status = typeof e === "object" && e !== null && "status" in e ? Number((e as { status?: unknown }).status) : null
      toast.error(status === 403 ? "Sem permissão para salvar cupom." : laravelValidationErrorText(e) ?? "Erro ao salvar cupom.")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row: CouponRow) => {
    if (!mayDeleteCoupon) {
      toast.error("Sem permissão para excluir cupons.")
      return
    }
    if (!confirm(`Remover cupom "${row.name}"?`)) return
    try {
      await apiService.deleteAdminCoupon(row.id)
      toast.success("Cupom removido.")
      void load()
    } catch (e) {
      console.error(e)
      const status = typeof e === "object" && e !== null && "status" in e ? Number((e as { status?: unknown }).status) : null
      toast.error(status === 403 ? "Sem permissão para excluir cupom." : "Erro ao remover cupom.")
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between gap-3">
        <div><h1 className="text-2xl font-semibold tracking-tight">Cupons</h1><p className="text-muted-foreground mt-1 text-sm">CRUD admin equivalente ao Blade coupons.</p></div>
        {mayCreateCoupon ? <Button onClick={() => open()}><Plus className="mr-2 h-4 w-4" />Novo cupom</Button> : null}
      </div>
      <Card>
        <CardHeader><CardTitle>Listagem</CardTitle></CardHeader>
        <CardContent>{loading ? <PanelTableSkeleton rows={8} columns={8} /> : <Table><TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Período</TableHead><TableHead>Aplicação</TableHead><TableHead>Desconto</TableHead><TableHead>Mínimo</TableHead><TableHead>Qtd.</TableHead><TableHead>Saldo</TableHead><TableHead>Ativo</TableHead>{mayEditCoupon || mayDeleteCoupon ? <TableHead className="text-right">Ações</TableHead> : null}</TableRow></TableHeader><TableBody>{(bundle?.coupons.data ?? []).map((row) => <TableRow key={row.id}><TableCell className="font-medium">{row.name}</TableCell><TableCell>{dateValue(row.start_at)} até {dateValue(row.end_at)}</TableCell><TableCell>{bundle?.applies[row.apply ?? ""] ?? row.apply}</TableCell><TableCell>{String(row.discount ?? "")}</TableCell><TableCell>{String(row.min_order ?? "")}</TableCell><TableCell>{row.quantity}</TableCell><TableCell>{row.balance}</TableCell><TableCell>{row.is_enabled ? "Sim" : "Não"}</TableCell>{mayEditCoupon || mayDeleteCoupon ? <TableCell className="text-right">{mayEditCoupon ? <Button variant="ghost" size="icon" onClick={() => open(row)}><Pencil className="h-4 w-4" /></Button> : null}{mayDeleteCoupon ? <Button variant="ghost" size="icon" onClick={() => void remove(row)}><Trash2 className="h-4 w-4 text-destructive" /></Button> : null}</TableCell> : null}</TableRow>)}</TableBody></Table>}</CardContent>
      </Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Editar cupom" : "Novo cupom"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1"><Label>Código</Label><Input maxLength={15} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid gap-1"><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid gap-1"><Label>Início</Label><Input type="date" value={form.start_at} onChange={(e) => setForm((f) => ({ ...f, start_at: e.target.value }))} /></div>
            <div className="grid gap-1"><Label>Fim</Label><Input type="date" value={form.end_at} onChange={(e) => setForm((f) => ({ ...f, end_at: e.target.value }))} /></div>
            <div className="grid gap-1"><Label>Aplicação</Label><Select value={form.apply} onValueChange={(v) => setForm((f) => ({ ...f, apply: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(bundle?.applies ?? {}).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-1"><Label>Patrocinador</Label><Select value={form.sponsor || "__none__"} onValueChange={(v) => setForm((f) => ({ ...f, sponsor: v === "__none__" ? "" : v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none__">Sem patrocinador</SelectItem>{Object.entries(bundle?.sponsors ?? {}).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-1"><Label>Unidade de negócio</Label><Select value={form.business_unit_id || "__none__"} onValueChange={(v) => setForm((f) => ({ ...f, business_unit_id: v === "__none__" ? "" : v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none__">Todas</SelectItem>{(bundle?.business_units ?? []).map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.name ?? u.description ?? `#${u.id}`}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-1"><Label>Ativo</Label><Select value={form.is_enabled} onValueChange={(v) => setForm((f) => ({ ...f, is_enabled: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">Sim</SelectItem><SelectItem value="0">Não</SelectItem></SelectContent></Select></div>
            <div className="grid gap-1"><Label>Desconto</Label><Input type="number" step="0.01" value={form.discount} onChange={(e) => setForm((f) => ({ ...f, discount: e.target.value }))} /></div>
            <div className="grid gap-1"><Label>Pedido mínimo</Label><Input type="number" step="0.01" value={form.min_order} onChange={(e) => setForm((f) => ({ ...f, min_order: e.target.value }))} /></div>
            <div className="grid gap-1"><Label>Quantidade</Label><Input type="number" min={1} value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={() => void save()} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
