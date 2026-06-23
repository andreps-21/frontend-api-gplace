"use client"

import { useCallback, useEffect, useState } from "react"
import { apiService } from "@/lib/api"
import { laravelInnerData } from "@/lib/laravel-data"
import { useGplacePermissions } from "@/lib/use-gplace-permissions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PanelTableSkeleton } from "@/components/dashboard/panel-content-skeleton"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

type Paginator<T> = { data: T[]; current_page: number; last_page: number; total: number }
type CatalogRow = {
  id: number
  name?: string
  url?: string
  text_email?: string | null
  subject?: string | null
  is_enabled?: number | boolean
}

export function StoreCatalogTab() {
  const { can } = useGplacePermissions()
  const mayView = can("catalogs_view")
  const mayCreate = can("catalogs_create")
  const mayEdit = can("catalogs_edit")
  const mayDelete = can("catalogs_delete")
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [paginator, setPaginator] = useState<Paginator<CatalogRow> | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CatalogRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: "", url: "", text_email: "", subject: "", is_enabled: "1" })
  const [imageFile, setImageFile] = useState<File | null>(null)

  const load = useCallback(async () => {
    if (!mayView) return
    setLoading(true)
    try {
      const raw = await apiService.getAdminStoreCatalogs({ page, per_page: 10 })
      setPaginator(laravelInnerData<Paginator<CatalogRow>>(raw))
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar catálogos.")
    } finally {
      setLoading(false)
    }
  }, [mayView, page])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: "", url: "", text_email: "", subject: "", is_enabled: "1" })
    setImageFile(null)
    setDialogOpen(true)
  }

  const openEdit = (row: CatalogRow) => {
    setEditing(row)
    setForm({
      name: row.name ?? "",
      url: row.url ?? "",
      text_email: row.text_email ?? "",
      subject: row.subject ?? "",
      is_enabled: row.is_enabled === true || row.is_enabled === 1 ? "1" : "0",
    })
    setImageFile(null)
    setDialogOpen(true)
  }

  const save = async () => {
    if (editing ? !mayEdit : !mayCreate) return
    setSaving(true)
    try {
      if (imageFile) {
        const fd = new FormData()
        fd.append("name", form.name.trim())
        fd.append("url", form.url.trim())
        if (form.text_email.trim()) fd.append("text_email", form.text_email.trim())
        if (form.subject.trim()) fd.append("subject", form.subject.trim())
        fd.append("is_enabled", form.is_enabled === "1" ? "1" : "0")
        fd.append("image", imageFile)
        if (editing) {
          await apiService.updateAdminStoreCatalog(editing.id, fd)
          toast.success("Catálogo atualizado.")
        } else {
          await apiService.createAdminStoreCatalog(fd)
          toast.success("Catálogo criado.")
        }
      } else {
        const payload: Record<string, unknown> = {
          name: form.name.trim(),
          url: form.url.trim(),
          text_email: form.text_email.trim() || null,
          subject: form.subject.trim() || null,
          is_enabled: form.is_enabled === "1",
        }
        if (editing) {
          await apiService.updateAdminStoreCatalog(editing.id, payload)
          toast.success("Catálogo atualizado.")
        } else {
          await apiService.createAdminStoreCatalog(payload)
          toast.success("Catálogo criado.")
        }
      }
      setDialogOpen(false)
      void load()
    } catch (e) {
      console.error(e)
      toast.error("Erro ao guardar.")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row: CatalogRow) => {
    if (!mayDelete) return
    if (!confirm(`Eliminar catálogo "${row.name}"?`)) return
    try {
      await apiService.deleteAdminStoreCatalog(row.id)
      toast.success("Catálogo eliminado.")
      void load()
    } catch (e) {
      console.error(e)
      toast.error("Não foi possível eliminar.")
    }
  }

  if (!mayView) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Catálogo</CardTitle>
          <CardDescription>Você não tem permissão para visualizar os catálogos da loja.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Catálogo da loja</CardTitle>
            <CardDescription>Materiais e links de catálogo vinculados ao ecommerce desta loja.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar"}
            </Button>
            {mayCreate ? (
              <Button type="button" size="sm" onClick={openCreate}>
                <Plus className="mr-1 h-4 w-4" />
                Novo catálogo
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {loading && !paginator ? (
            <PanelTableSkeleton rows={10} columns={5} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Ativo</TableHead>
                    {(mayEdit || mayDelete) ? <TableHead className="w-[100px]">Ações</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(paginator?.data ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">{row.url}</TableCell>
                      <TableCell>{row.is_enabled === true || row.is_enabled === 1 ? "Sim" : "Não"}</TableCell>
                      {(mayEdit || mayDelete) ? (
                        <TableCell>
                          <div className="flex gap-1">
                            {mayEdit ? (
                              <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(row)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            ) : null}
                            {mayDelete ? (
                              <Button type="button" variant="ghost" size="icon" onClick={() => void remove(row)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      ) : null}
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
                    <Button type="button" variant="outline" size="sm" disabled={page >= paginator.last_page || loading} onClick={() => setPage((p) => p + 1)}>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar catálogo" : "Novo catálogo"}</DialogTitle>
            <DialogDescription>Cadastre o link e, opcionalmente, uma imagem do catálogo.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} maxLength={120} />
            </div>
            <div className="grid gap-1">
              <Label>URL</Label>
              <Input value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} />
            </div>
            <div className="grid gap-1">
              <Label>Texto e-mail</Label>
              <Input value={form.text_email} onChange={(e) => setForm((f) => ({ ...f, text_email: e.target.value }))} />
            </div>
            <div className="grid gap-1">
              <Label>Assunto</Label>
              <Input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
            </div>
            <div className="grid gap-1">
              <Label>Ativo</Label>
              <Select value={form.is_enabled} onValueChange={(value) => setForm((f) => ({ ...f, is_enabled: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Sim</SelectItem>
                  <SelectItem value="0">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label>Imagem (opcional)</Label>
              <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving || !form.name.trim() || !form.url.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
