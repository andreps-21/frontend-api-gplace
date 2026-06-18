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

type Paginator<T> = { data: T[] }
type FreightRow = { id: number; name: string; description?: string; city_id: number; city?: string; zip_code_start?: string; zip_code_end?: string; percentage?: number | string; value_freight_fix?: number | string | null; free_shipping_sales?: number | string | null; notes?: string | null; is_enabled?: boolean | number }
type CityRow = { id: number; title?: string; city?: string; state?: { letter?: string }; letter?: string }

const emptyForm = { name: "", description: "", city_id: "", zip_code_start: "", zip_code_end: "", percentage: "0", value_freight_fix: "0", free_shipping_sales: "0", notes: "", is_enabled: "1" }

export default function AdminRegrasFretePage() {
  const { can } = useGplacePermissions()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<FreightRow[]>([])
  const [cities, setCities] = useState<CityRow[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<FreightRow | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [freightsRaw, citiesRaw] = await Promise.all([
        apiService.getAdminFreights({ page: 1, per_page: 100 }),
        apiService.getAdminCities({ page: 1, per_page: 500 }),
      ])
      setRows(laravelInnerData<Paginator<FreightRow>>(freightsRaw)?.data ?? [])
      setCities(laravelInnerData<Paginator<CityRow>>(citiesRaw)?.data ?? [])
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar regras de frete.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (!can("freights_view")) return <AccessDenied />
  const mayCreate = can("freights_create")
  const mayEdit = can("freights_edit")
  const mayDelete = can("freights_delete")

  const open = (row?: FreightRow) => {
    setEditing(row ?? null)
    setForm(row ? {
      name: row.name ?? "",
      description: row.description ?? "",
      city_id: String(row.city_id ?? ""),
      zip_code_start: row.zip_code_start ?? "",
      zip_code_end: row.zip_code_end ?? "",
      percentage: String(row.percentage ?? "0"),
      value_freight_fix: String(row.value_freight_fix ?? "0"),
      free_shipping_sales: String(row.free_shipping_sales ?? "0"),
      notes: row.notes ?? "",
      is_enabled: String(Number(row.is_enabled ?? 1)),
    } : emptyForm)
    setDialogOpen(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        description: form.description,
        city_id: Number(form.city_id),
        zip_code_start: form.zip_code_start,
        zip_code_end: form.zip_code_end,
        percentage: Number(form.percentage || 0),
        value_freight_fix: Number(form.value_freight_fix || 0),
        free_shipping_sales: Number(form.free_shipping_sales || 0),
        notes: form.notes || null,
        is_enabled: form.is_enabled === "1",
      }
      if (editing) await apiService.updateAdminFreight(editing.id, payload)
      else await apiService.createAdminFreight(payload)
      toast.success(editing ? "Regra atualizada." : "Regra criada.")
      setDialogOpen(false)
      void load()
    } catch (e) {
      console.error(e)
      toast.error(laravelValidationErrorText(e) ?? "Erro ao salvar regra de frete.")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row: FreightRow) => {
    if (!confirm(`Remover regra "${row.name}"?`)) return
    try {
      await apiService.deleteAdminFreight(row.id)
      toast.success("Regra removida.")
      void load()
    } catch (e) {
      console.error(e)
      toast.error("Erro ao remover regra.")
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between gap-3">
        <div><h1 className="text-2xl font-semibold tracking-tight">Regras de frete</h1><p className="text-muted-foreground mt-1 text-sm">Faixas de CEP e cidade para cálculo de frete.</p></div>
        {mayCreate ? <Button onClick={() => open()}><Plus className="mr-2 h-4 w-4" />Nova regra</Button> : null}
      </div>
      <Card><CardHeader><CardTitle>Listagem</CardTitle></CardHeader><CardContent>{loading ? <PanelTableSkeleton rows={8} columns={8} /> : <Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Cidade</TableHead><TableHead>CEP</TableHead><TableHead>%</TableHead><TableHead>Fixo</TableHead><TableHead>Frete grátis acima de</TableHead><TableHead>Ativo</TableHead>{mayEdit || mayDelete ? <TableHead className="text-right">Ações</TableHead> : null}</TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell className="font-medium">{row.name}</TableCell><TableCell>{row.city}</TableCell><TableCell>{row.zip_code_start} - {row.zip_code_end}</TableCell><TableCell>{row.percentage}</TableCell><TableCell>{row.value_freight_fix}</TableCell><TableCell>{row.free_shipping_sales}</TableCell><TableCell>{Number(row.is_enabled ?? 0) ? "Sim" : "Não"}</TableCell>{mayEdit || mayDelete ? <TableCell className="text-right">{mayEdit ? <Button variant="ghost" size="icon" onClick={() => open(row)}><Pencil className="h-4 w-4" /></Button> : null}{mayDelete ? <Button variant="ghost" size="icon" onClick={() => void remove(row)}><Trash2 className="h-4 w-4 text-destructive" /></Button> : null}</TableCell> : null}</TableRow>)}</TableBody></Table>}</CardContent></Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Editar regra" : "Nova regra"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid gap-1"><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid gap-1 sm:col-span-2"><Label>Cidade</Label><Select value={form.city_id || undefined} onValueChange={(v) => setForm((f) => ({ ...f, city_id: v }))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{cities.map((city) => <SelectItem key={city.id} value={String(city.id)}>{city.city ?? `${city.title ?? city.id}${city.letter ? ` - ${city.letter}` : ""}`}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-1"><Label>CEP inicial</Label><Input value={form.zip_code_start} onChange={(e) => setForm((f) => ({ ...f, zip_code_start: e.target.value }))} /></div>
            <div className="grid gap-1"><Label>CEP final</Label><Input value={form.zip_code_end} onChange={(e) => setForm((f) => ({ ...f, zip_code_end: e.target.value }))} /></div>
            <div className="grid gap-1"><Label>Percentual</Label><Input type="number" step="0.01" value={form.percentage} onChange={(e) => setForm((f) => ({ ...f, percentage: e.target.value }))} /></div>
            <div className="grid gap-1"><Label>Valor fixo</Label><Input type="number" step="0.01" value={form.value_freight_fix} onChange={(e) => setForm((f) => ({ ...f, value_freight_fix: e.target.value }))} /></div>
            <div className="grid gap-1"><Label>Frete grátis acima de</Label><Input type="number" step="0.01" value={form.free_shipping_sales} onChange={(e) => setForm((f) => ({ ...f, free_shipping_sales: e.target.value }))} /></div>
            <div className="grid gap-1"><Label>Ativo</Label><Select value={form.is_enabled} onValueChange={(v) => setForm((f) => ({ ...f, is_enabled: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">Sim</SelectItem><SelectItem value="0">Não</SelectItem></SelectContent></Select></div>
            <div className="grid gap-1 sm:col-span-2"><Label>Observações</Label><Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={() => void save()} disabled={saving || (editing ? !mayEdit : !mayCreate)}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
