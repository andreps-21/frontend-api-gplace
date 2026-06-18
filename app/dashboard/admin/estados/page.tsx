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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { PanelTableSkeleton } from "@/components/dashboard/panel-content-skeleton"
import { toast } from "sonner"

type Paginator<T> = { data: T[]; current_page: number; last_page: number; total: number }
type StateRow = { id: number; title: string; letter: string }

export default function EstadosAdminPage() {
  const { can } = useGplacePermissions()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Paginator<StateRow> | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<StateRow | null>(null)
  const [form, setForm] = useState({ title: "", letter: "" })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(laravelInnerData<Paginator<StateRow>>(await apiService.getAdminStates({ page: 1, per_page: 100 })))
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar estados.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const open = (row?: StateRow) => {
    setEditing(row ?? null)
    setForm({ title: row?.title ?? "", letter: row?.letter ?? "" })
    setDialogOpen(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      if (editing) await apiService.updateAdminState(editing.id, form)
      else await apiService.createAdminState(form)
      toast.success(editing ? "Estado atualizado." : "Estado criado.")
      setDialogOpen(false)
      void load()
    } catch (e) {
      console.error(e)
      toast.error(laravelValidationErrorText(e) ?? "Erro ao salvar estado.")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row: StateRow) => {
    if (!confirm(`Remover estado "${row.title}"?`)) return
    try {
      await apiService.deleteAdminState(row.id)
      toast.success("Estado removido.")
      void load()
    } catch (e) {
      console.error(e)
      toast.error("Erro ao remover estado.")
    }
  }

  if (!can("states_view")) return <AccessDenied />
  const mayCreate = can("states_create")
  const mayEdit = can("states_edit")
  const mayDelete = can("states_delete")

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between gap-3">
        <div><h1 className="text-2xl font-semibold tracking-tight">Estados</h1><p className="text-muted-foreground mt-1 text-sm">CRUD admin de estados.</p></div>
        {mayCreate ? <Button onClick={() => open()}><Plus className="mr-2 h-4 w-4" />Novo estado</Button> : null}
      </div>
      <Card><CardHeader><CardTitle>Listagem</CardTitle></CardHeader><CardContent>{loading ? <PanelTableSkeleton rows={10} columns={4} /> : <Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Nome</TableHead><TableHead>UF</TableHead>{mayEdit || mayDelete ? <TableHead className="text-right">Ações</TableHead> : null}</TableRow></TableHeader><TableBody>{(rows?.data ?? []).map((row) => <TableRow key={row.id}><TableCell>{row.id}</TableCell><TableCell>{row.title}</TableCell><TableCell>{row.letter}</TableCell>{mayEdit || mayDelete ? <TableCell className="text-right">{mayEdit ? <Button variant="ghost" size="icon" onClick={() => open(row)}><Pencil className="h-4 w-4" /></Button> : null}{mayDelete ? <Button variant="ghost" size="icon" onClick={() => void remove(row)}><Trash2 className="h-4 w-4 text-destructive" /></Button> : null}</TableCell> : null}</TableRow>)}</TableBody></Table>}</CardContent></Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>{editing ? "Editar estado" : "Novo estado"}</DialogTitle></DialogHeader><div className="grid gap-3"><div className="grid gap-1"><Label>Nome</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div><div className="grid gap-1"><Label>UF</Label><Input maxLength={2} value={form.letter} onChange={(e) => setForm((f) => ({ ...f, letter: e.target.value.toUpperCase() }))} /></div></div><DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={() => void save()} disabled={saving || (editing ? !mayEdit : !mayCreate)}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  )
}
