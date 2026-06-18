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
type VariationRow = { id?: number; abbreviation: string; variation: string; representation: string; is_enabled?: boolean | number }
type GridRow = { id: number; grid: string; description?: string | null; type: string; is_enabled?: boolean | number; variation?: VariationRow[] }

const emptyVariation = (): VariationRow => ({ abbreviation: "", variation: "", representation: "", is_enabled: 1 })
const emptyForm = () => ({ grid: "", description: "", type: "Tamanho", is_enabled: "1", variations: [emptyVariation()] })

export default function AdminGradesProdutoPage() {
  const { can } = useGplacePermissions()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<GridRow[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<GridRow | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const payload = laravelInnerData<Paginator<GridRow>>(await apiService.getAdminGrids({ page: 1, per_page: 100 }))
      setRows(payload?.data ?? [])
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar grades.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (!can("grid_view")) return <AccessDenied />
  const mayCreate = can("grid_create")
  const mayEdit = can("grid_edit")
  const mayDelete = can("grid_delete")

  const open = (row?: GridRow) => {
    setEditing(row ?? null)
    setForm(row ? {
      grid: row.grid,
      description: row.description ?? "",
      type: row.type ?? "Tamanho",
      is_enabled: String(Number(row.is_enabled ?? 1)),
      variations: (row.variation?.length ? row.variation : [emptyVariation()]).map((v) => ({
        id: v.id,
        abbreviation: v.abbreviation ?? "",
        variation: v.variation ?? "",
        representation: v.representation ?? "",
        is_enabled: Number(v.is_enabled ?? 1),
      })),
    } : emptyForm())
    setDialogOpen(true)
  }

  const updateVariation = (index: number, patch: Partial<VariationRow>) => {
    setForm((f) => ({
      ...f,
      variations: f.variations.map((variation, i) => i === index ? { ...variation, ...patch } : variation),
    }))
  }

  const save = async () => {
    setSaving(true)
    try {
      const payload = {
        grid: form.grid,
        description: form.description || null,
        type: form.type,
        is_enabled: form.is_enabled === "1",
        variations: form.variations.map((variation) => ({
          id: variation.id,
          abbreviation: variation.abbreviation,
          variation: variation.variation,
          representation: variation.representation,
          is_enabled: Number(variation.is_enabled ?? 1) === 1,
        })),
      }
      if (editing) await apiService.updateAdminGrid(editing.id, payload)
      else await apiService.createAdminGrid(payload)
      toast.success(editing ? "Grade atualizada." : "Grade criada.")
      setDialogOpen(false)
      void load()
    } catch (e) {
      console.error(e)
      toast.error(laravelValidationErrorText(e) ?? "Erro ao salvar grade.")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row: GridRow) => {
    if (!confirm(`Remover grade "${row.grid}"?`)) return
    try {
      await apiService.deleteAdminGrid(row.id)
      toast.success("Grade removida.")
      void load()
    } catch (e) {
      console.error(e)
      toast.error("Erro ao remover grade.")
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between gap-3">
        <div><h1 className="text-2xl font-semibold tracking-tight">Grade de produto</h1><p className="text-muted-foreground mt-1 text-sm">Grades e variações usadas em produtos com grade.</p></div>
        {mayCreate ? <Button onClick={() => open()}><Plus className="mr-2 h-4 w-4" />Nova grade</Button> : null}
      </div>
      <Card><CardHeader><CardTitle>Listagem</CardTitle></CardHeader><CardContent>{loading ? <PanelTableSkeleton rows={8} columns={5} /> : <Table><TableHeader><TableRow><TableHead>Grade</TableHead><TableHead>Tipo</TableHead><TableHead>Variações</TableHead><TableHead>Ativa</TableHead>{mayEdit || mayDelete ? <TableHead className="text-right">Ações</TableHead> : null}</TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell className="font-medium">{row.grid}</TableCell><TableCell>{row.type}</TableCell><TableCell>{row.variation?.map((v) => v.abbreviation).join(", ")}</TableCell><TableCell>{Number(row.is_enabled ?? 0) ? "Sim" : "Não"}</TableCell>{mayEdit || mayDelete ? <TableCell className="text-right">{mayEdit ? <Button variant="ghost" size="icon" onClick={() => open(row)}><Pencil className="h-4 w-4" /></Button> : null}{mayDelete ? <Button variant="ghost" size="icon" onClick={() => void remove(row)}><Trash2 className="h-4 w-4 text-destructive" /></Button> : null}</TableCell> : null}</TableRow>)}</TableBody></Table>}</CardContent></Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>{editing ? "Editar grade" : "Nova grade"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1"><Label>Grade</Label><Input value={form.grid} onChange={(e) => setForm((f) => ({ ...f, grid: e.target.value }))} /></div>
            <div className="grid gap-1"><Label>Tipo</Label><Input value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} /></div>
            <div className="grid gap-1"><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid gap-1"><Label>Ativa</Label><Select value={form.is_enabled} onValueChange={(v) => setForm((f) => ({ ...f, is_enabled: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">Sim</SelectItem><SelectItem value="0">Não</SelectItem></SelectContent></Select></div>
            <div className="grid gap-2 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label>Variações</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setForm((f) => ({ ...f, variations: [...f.variations, emptyVariation()] }))}>Adicionar variação</Button>
              </div>
              <div className="grid gap-2">
                {form.variations.map((variation, index) => (
                  <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_1.5fr_1fr_120px_auto]" key={variation.id ?? index}>
                    <Input placeholder="Sigla" value={variation.abbreviation} onChange={(e) => updateVariation(index, { abbreviation: e.target.value })} />
                    <Input placeholder="Descrição" value={variation.variation} onChange={(e) => updateVariation(index, { variation: e.target.value })} />
                    <Input placeholder="Representação" value={variation.representation} onChange={(e) => updateVariation(index, { representation: e.target.value })} />
                    <Select value={String(Number(variation.is_enabled ?? 1))} onValueChange={(v) => updateVariation(index, { is_enabled: Number(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">Ativa</SelectItem><SelectItem value="0">Inativa</SelectItem></SelectContent></Select>
                    <Button type="button" variant="ghost" size="icon" disabled={form.variations.length === 1} onClick={() => setForm((f) => ({ ...f, variations: f.variations.filter((_, i) => i !== index) }))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={() => void save()} disabled={saving || (editing ? !mayEdit : !mayCreate)}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
