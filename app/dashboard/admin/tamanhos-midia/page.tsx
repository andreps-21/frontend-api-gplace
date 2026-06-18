"use client"

import { useCallback, useEffect, useState } from "react"
import { apiService } from "@/lib/api"
import { laravelInnerData, laravelValidationErrorText } from "@/lib/laravel-data"
import { useGplacePermissions } from "@/lib/use-gplace-permissions"
import { AccessDenied } from "@/components/ui/access-denied"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { PanelTableSkeleton } from "@/components/dashboard/panel-content-skeleton"
import { toast } from "sonner"

type Paginator<T> = { data: T[] }
type Position = { id: number; id_position: string; position_name: string }
type SizeRow = { id: number; name: string; size_width: number; size_height: number; is_enabled?: boolean | number; type: number; code?: string | null; interface_positions?: Position[] }
type Options = { types: Record<string, string>; interface_positions: Position[] }

const emptyForm = { name: "", size_width: "1200", size_height: "420", is_enabled: "1", type: "1", code: "", interface_positions: [] as number[] }

export default function AdminTamanhosMidiaPage() {
  const { can } = useGplacePermissions()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<SizeRow[]>([])
  const [options, setOptions] = useState<Options>({ types: {}, interface_positions: [] })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<SizeRow | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [listRaw, optionsRaw] = await Promise.all([
        apiService.getAdminSizeImages({ page: 1, per_page: 100 }),
        apiService.getAdminSizeImageOptions(),
      ])
      const payload = laravelInnerData<Paginator<SizeRow>>(listRaw)
      setRows(payload?.data ?? [])
      setOptions(laravelInnerData<Options>(optionsRaw) ?? { types: {}, interface_positions: [] })
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar tamanhos de mídia.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (!can("size-image_view")) return <AccessDenied />
  const mayCreate = can("size-image_create")
  const mayEdit = can("size-image_edit")
  const mayDelete = can("size-image_delete")

  const open = (row?: SizeRow) => {
    setEditing(row ?? null)
    setForm(row ? {
      name: row.name,
      size_width: String(row.size_width ?? ""),
      size_height: String(row.size_height ?? ""),
      is_enabled: String(Number(row.is_enabled ?? 1)),
      type: String(row.type ?? 1),
      code: row.code ?? "",
      interface_positions: (row.interface_positions ?? []).map((p) => p.id),
    } : emptyForm)
    setDialogOpen(true)
  }

  const togglePosition = (id: number, checked: boolean) => {
    setForm((f) => ({
      ...f,
      interface_positions: checked
        ? Array.from(new Set([...f.interface_positions, id]))
        : f.interface_positions.filter((value) => value !== id),
    }))
  }

  const save = async () => {
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        size_width: Number(form.size_width),
        size_height: Number(form.size_height),
        is_enabled: form.is_enabled === "1",
        type: Number(form.type),
        code: form.code || null,
        interface_positions: form.interface_positions,
      }
      if (editing) await apiService.updateAdminSizeImage(editing.id, payload)
      else await apiService.createAdminSizeImage(payload)
      toast.success(editing ? "Tamanho atualizado." : "Tamanho criado.")
      setDialogOpen(false)
      void load()
    } catch (e) {
      console.error(e)
      toast.error(laravelValidationErrorText(e) ?? "Erro ao salvar tamanho.")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row: SizeRow) => {
    if (!confirm(`Remover tamanho "${row.name}"?`)) return
    try {
      await apiService.deleteAdminSizeImage(row.id)
      toast.success("Tamanho removido.")
      void load()
    } catch (e) {
      console.error(e)
      toast.error("Erro ao remover tamanho.")
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between gap-3">
        <div><h1 className="text-2xl font-semibold tracking-tight">Tamanho mídia</h1><p className="text-muted-foreground mt-1 text-sm">Dimensões e posições aceitas para banners.</p></div>
        {mayCreate ? <Button onClick={() => open()}><Plus className="mr-2 h-4 w-4" />Novo tamanho</Button> : null}
      </div>
      <Card><CardHeader><CardTitle>Listagem</CardTitle></CardHeader><CardContent>{loading ? <PanelTableSkeleton rows={8} columns={6} /> : <Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Dimensão</TableHead><TableHead>Tipo</TableHead><TableHead>Posições</TableHead><TableHead>Ativo</TableHead>{mayEdit || mayDelete ? <TableHead className="text-right">Ações</TableHead> : null}</TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell className="font-medium">{row.name}</TableCell><TableCell>{row.size_width} x {row.size_height}</TableCell><TableCell>{options.types[String(row.type)] ?? row.type}</TableCell><TableCell>{(row.interface_positions ?? []).map((p) => `${p.id_position} - ${p.position_name}`).join(", ") || "-"}</TableCell><TableCell>{Number(row.is_enabled ?? 0) ? "Sim" : "Não"}</TableCell>{mayEdit || mayDelete ? <TableCell className="text-right">{mayEdit ? <Button variant="ghost" size="icon" onClick={() => open(row)}><Pencil className="h-4 w-4" /></Button> : null}{mayDelete ? <Button variant="ghost" size="icon" onClick={() => void remove(row)}><Trash2 className="h-4 w-4 text-destructive" /></Button> : null}</TableCell> : null}</TableRow>)}</TableBody></Table>}</CardContent></Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Editar tamanho" : "Novo tamanho"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid gap-1"><Label>Código</Label><Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} /></div>
            <div className="grid gap-1"><Label>Largura</Label><Input type="number" value={form.size_width} onChange={(e) => setForm((f) => ({ ...f, size_width: e.target.value }))} /></div>
            <div className="grid gap-1"><Label>Altura</Label><Input type="number" value={form.size_height} onChange={(e) => setForm((f) => ({ ...f, size_height: e.target.value }))} /></div>
            <div className="grid gap-1"><Label>Tipo</Label><Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(options.types).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-1"><Label>Ativo</Label><Select value={form.is_enabled} onValueChange={(v) => setForm((f) => ({ ...f, is_enabled: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">Sim</SelectItem><SelectItem value="0">Não</SelectItem></SelectContent></Select></div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>Posições permitidas</Label>
              <div className="grid max-h-56 gap-2 overflow-auto rounded-md border p-3 sm:grid-cols-2">
                {options.interface_positions.map((position) => (
                  <label className="flex items-center gap-2 text-sm" key={position.id}>
                    <Checkbox checked={form.interface_positions.includes(position.id)} onCheckedChange={(checked) => togglePosition(position.id, checked === true)} />
                    {position.id_position} - {position.position_name}
                  </label>
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
