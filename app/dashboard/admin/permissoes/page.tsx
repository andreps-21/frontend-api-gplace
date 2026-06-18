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

type PermRow = { id: number; name: string; description?: string; guard_name?: string }

export default function PermissoesGplacePage() {
  const { can } = useGplacePermissions()
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [paginator, setPaginator] = useState<Paginator<PermRow> | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<PermRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: "", description: "", guard_name: "web" })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await apiService.getAdminPermissions({ page, per_page: 20 })
      const inner = laravelInnerData<Paginator<PermRow>>(raw)
      setPaginator(inner)
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar permissões.")
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    void load()
  }, [load])

  if (!can("permissions_view")) {
    return <AccessDenied />
  }

  const mayCreatePermission = can("permissions_create")
  const mayEditPermission = can("permissions_edit")
  const mayDeletePermission = can("permissions_delete")

  const openCreate = () => {
    setEditing(null)
    setForm({ name: "", description: "", guard_name: "web" })
    setDialogOpen(true)
  }

  const openEdit = (row: PermRow) => {
    setEditing(row)
    setForm({ name: row.name ?? "", description: row.description ?? "", guard_name: row.guard_name ?? "web" })
    setDialogOpen(true)
  }

  const submit = async () => {
    setSaving(true)
    try {
      if (editing) {
        await apiService.updateAdminPermission(editing.id, form)
      } else {
        await apiService.createAdminPermission(form)
      }
      toast.success(editing ? "Permissão atualizada." : "Permissão criada.")
      setDialogOpen(false)
      void load()
    } catch (e) {
      console.error(e)
      toast.error(laravelValidationErrorText(e) ?? "Erro ao salvar permissão.")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row: PermRow) => {
    if (!confirm(`Remover permissão "${row.name}"?`)) return
    try {
      await apiService.deleteAdminPermission(row.id)
      toast.success("Permissão removida.")
      void load()
    } catch (e) {
      console.error(e)
      toast.error("Erro ao remover permissão.")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Permissões</h1>
        <p className="text-muted-foreground mt-1 text-sm">Equivalente ao Blade <code className="text-xs">permissions.index</code>.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Listagem</CardTitle>
          <div className="flex gap-2">
            {mayCreatePermission ? (
              <Button type="button" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Nova permissão</Button>
            ) : null}
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
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Guard</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(paginator?.data ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.id}</TableCell>
                      <TableCell className="font-mono text-xs">{row.name}</TableCell>
                      <TableCell>{row.description}</TableCell>
                      <TableCell>{row.guard_name}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(row)} disabled={!mayEditPermission}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => void remove(row)} disabled={!mayDeletePermission}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar permissão" : "Nova permissão"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1"><Label>Nome técnico</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid gap-1"><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid gap-1"><Label>Guard</Label><Input value={form.guard_name} onChange={(e) => setForm((f) => ({ ...f, guard_name: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => void submit()} disabled={saving || (editing ? !mayEditPermission : !mayCreatePermission)}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
