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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { PanelTableSkeleton } from "@/components/dashboard/panel-content-skeleton"
import { toast } from "sonner"

type Paginator<T> = { data: T[]; current_page: number; last_page: number; total: number }
type UmRow = { id: number; name?: string; initials?: string; is_enabled?: boolean | number }

export default function AdminUnidadesMedidaPage() {
  const { can } = useGplacePermissions()
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [paginator, setPaginator] = useState<Paginator<UmRow> | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<UmRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ initials: "", name: "", is_enabled: "1" })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await apiService.getAdminMeasurementUnits({ page, per_page: 25 })
      setPaginator(laravelInnerData<Paginator<UmRow>>(raw))
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar unidades de medida.")
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm({ initials: "", name: "", is_enabled: "1" })
    setDialogOpen(true)
  }

  const openEdit = (row: UmRow) => {
    setEditing(row)
    setForm({ initials: row.initials ?? "", name: row.name ?? "", is_enabled: String(Number(row.is_enabled ?? 1)) })
    setDialogOpen(true)
  }

  const submit = async () => {
    setSaving(true)
    try {
      const payload = { initials: form.initials, name: form.name, is_enabled: form.is_enabled === "1" }
      if (editing) {
        await apiService.updateAdminMeasurementUnit(editing.id, payload)
      } else {
        await apiService.createAdminMeasurementUnit(payload)
      }
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

  const remove = async (row: UmRow) => {
    if (!confirm(`Remover unidade "${row.initials}"?`)) return
    try {
      await apiService.deleteAdminMeasurementUnit(row.id)
      toast.success("Unidade removida.")
      void load()
    } catch (e) {
      console.error(e)
      toast.error("Erro ao remover unidade.")
    }
  }

  if (!can("measurement-units_view")) return <AccessDenied />
  const mayCreate = can("measurement-units_create")
  const mayEdit = can("measurement-units_edit")
  const mayDelete = can("measurement-units_delete")

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Unidades de medida</h1>
          <p className="text-muted-foreground mt-1 text-sm">CRUD alinhado a <code className="text-xs">/admin/measurement-units</code>.</p>
        </div>
        {mayCreate ? <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Nova unidade</Button> : null}
      </div>
      <Card>
        <CardHeader><CardTitle>Registos</CardTitle></CardHeader>
        <CardContent>
          {loading && !paginator ? (
            <PanelTableSkeleton rows={10} columns={5} />
          ) : (
            <>
              <Table>
                <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Sigla</TableHead><TableHead>Nome</TableHead><TableHead>Activo</TableHead>{mayEdit || mayDelete ? <TableHead className="text-right">Ações</TableHead> : null}</TableRow></TableHeader>
                <TableBody>
                  {(paginator?.data ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.id}</TableCell>
                      <TableCell>{row.initials}</TableCell>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>{Number(row.is_enabled ?? 0) ? "Sim" : "Não"}</TableCell>
                      {mayEdit || mayDelete ? (
                        <TableCell className="text-right">
                          {mayEdit ? <Button variant="ghost" size="icon" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button> : null}
                          {mayDelete ? <Button variant="ghost" size="icon" onClick={() => void remove(row)}><Trash2 className="h-4 w-4" /></Button> : null}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {paginator && paginator.last_page > 1 ? (
                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                  <span>Página {paginator.current_page} de {paginator.last_page} ({paginator.total})</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
                    <Button variant="outline" size="sm" disabled={page >= paginator.last_page || loading} onClick={() => setPage((p) => p + 1)}>Seguinte</Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar unidade" : "Nova unidade"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1"><Label>Sigla</Label><Input maxLength={4} value={form.initials} onChange={(e) => setForm((f) => ({ ...f, initials: e.target.value.toUpperCase() }))} /></div>
            <div className="grid gap-1"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid gap-1"><Label>Activa</Label><Select value={form.is_enabled} onValueChange={(v) => setForm((f) => ({ ...f, is_enabled: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">Sim</SelectItem><SelectItem value="0">Não</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => void submit()} disabled={saving || (editing ? !mayEdit : !mayCreate)}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
