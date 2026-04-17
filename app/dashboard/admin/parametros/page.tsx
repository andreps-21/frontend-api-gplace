"use client"

import { useCallback, useEffect, useState } from "react"
import { apiService } from "@/lib/api"
import { laravelInnerData } from "@/lib/laravel-data"
import { useGplacePermissions } from "@/lib/use-gplace-permissions"
import { AccessDenied } from "@/components/ui/access-denied"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { PanelTableSkeleton } from "@/components/dashboard/panel-content-skeleton"
import { toast } from "sonner"

type Paginator<T> = {
  data: T[]
  current_page: number
  last_page: number
  total: number
}

type ParameterRow = {
  id: number
  name: string
  type?: number
  value?: string
  description?: string
}

export default function ParametrosGplacePage() {
  const { can } = useGplacePermissions()
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [paginator, setPaginator] = useState<Paginator<ParameterRow> | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ParameterRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: "", type: "1", value: "", description: "" })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await apiService.getAdminParameters({ page, per_page: 15 })
      const inner = laravelInnerData<Paginator<ParameterRow>>(raw)
      setPaginator(inner)
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar parâmetros.")
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: "", type: "1", value: "", description: "" })
    setDialogOpen(true)
  }

  const openEdit = (row: ParameterRow) => {
    setEditing(row)
    setForm({
      name: row.name,
      type: String(row.type ?? 1),
      value: row.value ?? "",
      description: row.description ?? "",
    })
    setDialogOpen(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        type: Number(form.type),
        value: form.value.trim(),
        description: form.description.trim() || null,
      }
      if (editing) {
        await apiService.updateAdminParameter(editing.id, payload)
        toast.success("Parâmetro actualizado.")
      } else {
        await apiService.createAdminParameter(payload)
        toast.success("Parâmetro criado.")
      }
      setDialogOpen(false)
      void load()
    } catch (e: unknown) {
      console.error(e)
      toast.error("Erro ao guardar.")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row: ParameterRow) => {
    if (!confirm(`Eliminar parâmetro «${row.name}»?`)) return
    try {
      await apiService.deleteAdminParameter(row.id)
      toast.success("Eliminado.")
      void load()
    } catch (e) {
      console.error(e)
      toast.error("Não foi possível eliminar.")
    }
  }

  if (!can("parameters_view")) {
    return <AccessDenied />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Parâmetros</h1>
        <p className="text-muted-foreground mt-1 text-sm">CRUD alinhado ao Blade <code className="text-xs">parameters</code>.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Registos</CardTitle>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar"}
            </Button>
            <Button type="button" size="sm" onClick={openCreate}>
              <Plus className="mr-1 h-4 w-4" />
              Novo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && !paginator ? (
            <PanelTableSkeleton rows={10} columns={6} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[120px]">Acções</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(paginator?.data ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.id}</TableCell>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>{row.type}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{row.value}</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">{row.description}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(row)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" onClick={() => void remove(row)} title="Eliminar">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {paginator && paginator.last_page > 1 ? (
                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    Página {paginator.current_page} de {paginator.last_page} ({paginator.total} itens)
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar parâmetro" : "Novo parâmetro"}</DialogTitle>
            <DialogDescription>Campos obrigatórios conforme validação da API.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1">
              <Label htmlFor="p-name">Nome</Label>
              <Input id="p-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} maxLength={30} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="p-type">Tipo</Label>
              <Input id="p-type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="p-value">Valor</Label>
              <Input id="p-value" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} maxLength={250} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="p-desc">Descrição</Label>
              <Input id="p-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} maxLength={120} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving || !form.name.trim() || !form.value.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
