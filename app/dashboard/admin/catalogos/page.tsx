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
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Paginator<T> = { data: T[]; current_page: number; last_page: number; total: number }

type CatalogRow = {
  id: number
  name?: string
  url?: string
  text_email?: string | null
  subject?: string | null
  is_enabled?: number | boolean
}

export default function CatalogosGplacePage() {
  const { can } = useGplacePermissions()
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [paginator, setPaginator] = useState<Paginator<CatalogRow> | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CatalogRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: "", url: "", text_email: "", subject: "", is_enabled: "1" })
  const [imageFile, setImageFile] = useState<File | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await apiService.getAdminStoreCatalogs({ page, per_page: 10 })
      const inner = laravelInnerData<Paginator<CatalogRow>>(raw)
      setPaginator(inner)
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar catálogos.")
    } finally {
      setLoading(false)
    }
  }, [page])

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
    setSaving(true)
    try {
      const useMultipart = imageFile != null
      if (useMultipart) {
        const fd = new FormData()
        fd.append("name", form.name.trim())
        fd.append("url", form.url.trim())
        if (form.text_email.trim()) fd.append("text_email", form.text_email.trim())
        if (form.subject.trim()) fd.append("subject", form.subject.trim())
        fd.append("is_enabled", form.is_enabled === "1" ? "1" : "0")
        fd.append("image", imageFile)
        if (editing) {
          await apiService.updateAdminStoreCatalog(editing.id, fd)
          toast.success("Catálogo actualizado.")
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
          toast.success("Catálogo actualizado.")
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
    if (!confirm(`Eliminar catálogo «${row.name}»?`)) return
    try {
      await apiService.deleteAdminStoreCatalog(row.id)
      toast.success("Eliminado.")
      void load()
    } catch (e) {
      console.error(e)
      toast.error("Não foi possível eliminar.")
    }
  }

  if (!can("catalogs_view")) {
    return <AccessDenied />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Catálogos</h1>
        <p className="text-muted-foreground mt-1 text-sm">CRUD com upload opcional de imagem (multipart).</p>
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
            <div className="flex justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Activo</TableHead>
                    <TableHead className="w-[100px]">Acções</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(paginator?.data ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.id}</TableCell>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">{row.url}</TableCell>
                      <TableCell>{row.is_enabled === true || row.is_enabled === 1 ? "Sim" : "Não"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(row)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" onClick={() => void remove(row)}>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar catálogo" : "Novo catálogo"}</DialogTitle>
            <DialogDescription>Campos alinhados ao Blade.</DialogDescription>
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
              <Label>Activo</Label>
              <Select value={form.is_enabled} onValueChange={(v) => setForm((f) => ({ ...f, is_enabled: v }))}>
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
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              />
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
    </div>
  )
}
