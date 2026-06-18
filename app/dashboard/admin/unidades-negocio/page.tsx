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
import CitySearch from "@/components/ui/city-search"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { PanelTableSkeleton } from "@/components/dashboard/panel-content-skeleton"
import { toast } from "sonner"

type Paginator<T> = { data: T[]; current_page: number; last_page: number; total: number }
type UnitRow = { id: number; name: string; description: string; city_id?: number; city?: string; zip_code_start?: string; zip_code_end?: string; is_enabled?: boolean }

const emptyForm = { name: "", description: "", city_id: "", zip_code_start: "", zip_code_end: "", is_enabled: "1" }

export default function UnidadesNegocioPage() {
  const { can } = useGplacePermissions()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Paginator<UnitRow> | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<UnitRow | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(laravelInnerData<Paginator<UnitRow>>(await apiService.getAdminBusinessUnits({ page: 1, per_page: 100 })))
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar unidades.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (!can("businessunits_view")) return <AccessDenied />
  const mayCreate = can("businessunits_create")
  const mayEdit = can("businessunits_edit")
  const mayDelete = can("businessunits_delete")

  const open = (row?: UnitRow) => {
    setEditing(row ?? null)
    setForm(row ? {
      name: row.name ?? "",
      description: row.description ?? "",
      city_id: row.city_id ? String(row.city_id) : "",
      zip_code_start: row.zip_code_start ?? "",
      zip_code_end: row.zip_code_end ?? "",
      is_enabled: row.is_enabled ? "1" : "0",
    } : emptyForm)
    setDialogOpen(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        city_id: Number(form.city_id),
        is_enabled: form.is_enabled === "1",
      }
      if (editing) await apiService.updateAdminBusinessUnit(editing.id, payload)
      else await apiService.createAdminBusinessUnit(payload)
      toast.success(editing ? "Unidade atualizada." : "Unidade criada.")
      setDialogOpen(false)
      void load()
    } catch (e) {
      console.error(e)
      toast.error(laravelValidationErrorText(e) ?? "Erro ao salvar unidade.")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row: UnitRow) => {
    if (!confirm(`Remover unidade "${row.name}"?`)) return
    try {
      await apiService.deleteAdminBusinessUnit(row.id)
      toast.success("Unidade removida.")
      void load()
    } catch (e) {
      console.error(e)
      toast.error("Erro ao remover unidade.")
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between gap-3">
        <div><h1 className="text-2xl font-semibold tracking-tight">Unidades de negócio</h1><p className="text-muted-foreground mt-1 text-sm">CRUD admin equivalente ao Blade business-units.</p></div>
        {mayCreate ? <Button onClick={() => open()}><Plus className="mr-2 h-4 w-4" />Nova unidade</Button> : null}
      </div>
      <Card>
        <CardHeader><CardTitle>Listagem</CardTitle></CardHeader>
        <CardContent>{loading ? <PanelTableSkeleton rows={8} columns={6} /> : <Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Descrição</TableHead><TableHead>Cidade</TableHead><TableHead>CEP inicial</TableHead><TableHead>CEP final</TableHead><TableHead>Ativa</TableHead>{mayEdit || mayDelete ? <TableHead className="text-right">Ações</TableHead> : null}</TableRow></TableHeader><TableBody>{(rows?.data ?? []).map((row) => <TableRow key={row.id}><TableCell className="font-medium">{row.name}</TableCell><TableCell>{row.description}</TableCell><TableCell>{row.city}</TableCell><TableCell>{row.zip_code_start}</TableCell><TableCell>{row.zip_code_end}</TableCell><TableCell>{row.is_enabled ? "Sim" : "Não"}</TableCell>{mayEdit || mayDelete ? <TableCell className="text-right">{mayEdit ? <Button variant="ghost" size="icon" onClick={() => open(row)}><Pencil className="h-4 w-4" /></Button> : null}{mayDelete ? <Button variant="ghost" size="icon" onClick={() => void remove(row)}><Trash2 className="h-4 w-4 text-destructive" /></Button> : null}</TableCell> : null}</TableRow>)}</TableBody></Table>}</CardContent>
      </Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Editar unidade" : "Nova unidade"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid gap-1"><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid gap-1"><Label>CEP inicial</Label><Input value={form.zip_code_start} onChange={(e) => setForm((f) => ({ ...f, zip_code_start: e.target.value }))} /></div>
            <div className="grid gap-1"><Label>CEP final</Label><Input value={form.zip_code_end} onChange={(e) => setForm((f) => ({ ...f, zip_code_end: e.target.value }))} /></div>
            <div className="grid gap-1"><Label>Ativa</Label><Select value={form.is_enabled} onValueChange={(v) => setForm((f) => ({ ...f, is_enabled: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">Sim</SelectItem><SelectItem value="0">Não</SelectItem></SelectContent></Select></div>
            <div className="grid gap-1 sm:col-span-2"><CitySearch value={form.city_id ? `Cidade #${form.city_id}` : ""} onCitySelect={(city) => setForm((f) => ({ ...f, city_id: String(city.id) }))} onStateChange={() => undefined} label="Cidade" required /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={() => void save()} disabled={saving || (editing ? !mayEdit : !mayCreate)}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
