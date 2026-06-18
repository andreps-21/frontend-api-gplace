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
type StateRow = { id: number; title: string; letter: string }
type CityRow = { id: number; title: string; state_id?: number; state?: string; letter?: string; lat?: string | null; long?: string | null }

export default function CidadesAdminPage() {
  const { can } = useGplacePermissions()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Paginator<CityRow> | null>(null)
  const [states, setStates] = useState<StateRow[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CityRow | null>(null)
  const [form, setForm] = useState({ title: "", state_id: "", lat: "", long: "" })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [citiesRaw, statesRaw] = await Promise.all([
        apiService.getAdminCities({ page: 1, per_page: 100 }),
        apiService.getAdminStates({ per_page: 100 }),
      ])
      setRows(laravelInnerData<Paginator<CityRow>>(citiesRaw))
      const s = laravelInnerData<StateRow[] | Paginator<StateRow>>(statesRaw)
      setStates(Array.isArray(s) ? s : s.data ?? [])
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar cidades.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const open = (row?: CityRow) => {
    setEditing(row ?? null)
    setForm({ title: row?.title ?? "", state_id: row?.state_id ? String(row.state_id) : "", lat: row?.lat ?? "", long: row?.long ?? "" })
    setDialogOpen(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      const payload = { ...form, state_id: Number(form.state_id), lat: form.lat || null, long: form.long || null }
      if (editing) await apiService.updateAdminCity(editing.id, payload)
      else await apiService.createAdminCity(payload)
      toast.success(editing ? "Cidade atualizada." : "Cidade criada.")
      setDialogOpen(false)
      void load()
    } catch (e) {
      console.error(e)
      toast.error(laravelValidationErrorText(e) ?? "Erro ao salvar cidade.")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row: CityRow) => {
    if (!confirm(`Remover cidade "${row.title}"?`)) return
    try {
      await apiService.deleteAdminCity(row.id)
      toast.success("Cidade removida.")
      void load()
    } catch (e) {
      console.error(e)
      toast.error("Erro ao remover cidade.")
    }
  }

  if (!can("cities_view")) return <AccessDenied />
  const mayCreate = can("cities_create")
  const mayEdit = can("cities_edit")
  const mayDelete = can("cities_delete")

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between gap-3">
        <div><h1 className="text-2xl font-semibold tracking-tight">Cidades</h1><p className="text-muted-foreground mt-1 text-sm">CRUD admin de cidades.</p></div>
        {mayCreate ? <Button onClick={() => open()}><Plus className="mr-2 h-4 w-4" />Nova cidade</Button> : null}
      </div>
      <Card><CardHeader><CardTitle>Listagem</CardTitle></CardHeader><CardContent>{loading ? <PanelTableSkeleton rows={10} columns={5} /> : <Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Nome</TableHead><TableHead>Estado</TableHead><TableHead>Coordenadas</TableHead>{mayEdit || mayDelete ? <TableHead className="text-right">Ações</TableHead> : null}</TableRow></TableHeader><TableBody>{(rows?.data ?? []).map((row) => <TableRow key={row.id}><TableCell>{row.id}</TableCell><TableCell>{row.title}</TableCell><TableCell>{row.state ?? row.letter}</TableCell><TableCell>{[row.lat, row.long].filter(Boolean).join(", ")}</TableCell>{mayEdit || mayDelete ? <TableCell className="text-right">{mayEdit ? <Button variant="ghost" size="icon" onClick={() => open(row)}><Pencil className="h-4 w-4" /></Button> : null}{mayDelete ? <Button variant="ghost" size="icon" onClick={() => void remove(row)}><Trash2 className="h-4 w-4 text-destructive" /></Button> : null}</TableCell> : null}</TableRow>)}</TableBody></Table>}</CardContent></Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>{editing ? "Editar cidade" : "Nova cidade"}</DialogTitle></DialogHeader><div className="grid gap-3"><div className="grid gap-1"><Label>Nome</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div><div className="grid gap-1"><Label>Estado</Label><Select value={form.state_id || undefined} onValueChange={(v) => setForm((f) => ({ ...f, state_id: v }))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{states.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.title} ({s.letter})</SelectItem>)}</SelectContent></Select></div><div className="grid gap-1"><Label>Latitude</Label><Input value={form.lat} onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))} /></div><div className="grid gap-1"><Label>Longitude</Label><Input value={form.long} onChange={(e) => setForm((f) => ({ ...f, long: e.target.value }))} /></div></div><DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={() => void save()} disabled={saving || (editing ? !mayEdit : !mayCreate)}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  )
}
