"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { PanelTableSkeleton } from "@/components/dashboard/panel-content-skeleton"
import { toast } from "sonner"

type CategoryRow = {
  id: number
  name: string
  descriptive?: string | null
  type?: "A" | "S"
  is_enabled?: boolean | number
  order?: number
  parent_id?: number | null
  image_url?: string | null
  children?: CategoryRow[]
}

const emptyForm = () => ({
  name: "",
  descriptive: "",
  type: "S",
  is_enabled: "1",
  order: "0",
  parent_id: "",
})

function flattenCategories(rows: CategoryRow[], level = 0): Array<CategoryRow & { level: number }> {
  return rows.flatMap((row) => [{ ...row, level }, ...flattenCategories(row.children ?? [], level + 1)])
}

export default function AdminCategoriasPage() {
  const { can } = useGplacePermissions()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<CategoryRow[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CategoryRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [categoryImageFile, setCategoryImageFile] = useState<File | null>(null)
  const [categoryImagePreview, setCategoryImagePreview] = useState<string | null>(null)

  const flatRows = useMemo(() => flattenCategories(rows), [rows])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await apiService.getAdminSections()
      const data = laravelInnerData<CategoryRow[]>(raw)
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar categorias.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setCategoryImageFile(null)
    setCategoryImagePreview(null)
    setDialogOpen(true)
  }

  const openEdit = (row: CategoryRow) => {
    setEditing(row)
    setForm({
      name: row.name ?? "",
      descriptive: row.descriptive ?? "",
      type: row.type ?? "S",
      is_enabled: String(Number(row.is_enabled ?? 1)),
      order: String(row.order ?? 0),
      parent_id: row.parent_id != null ? String(row.parent_id) : "",
    })
    setCategoryImageFile(null)
    setCategoryImagePreview(row.image_url ?? null)
    setDialogOpen(true)
  }

  const handleImageChange = (file?: File | null) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.")
      return
    }
    setCategoryImageFile(file)
    setCategoryImagePreview(URL.createObjectURL(file))
  }

  const buildPayload = () => {
    const payload = new FormData()
    payload.append("name", form.name)
    payload.append("descriptive", form.descriptive || "")
    payload.append("type", form.type)
    payload.append("is_enabled", form.is_enabled)
    payload.append("is_home", "0")
    payload.append("order", String(Number(form.order || 0)))
    payload.append("order_home", "")
    payload.append("parent_id", form.type === "A" ? form.parent_id : "")
    if (categoryImageFile) {
      payload.append("image", categoryImageFile)
    }
    return payload
  }

  const submit = async () => {
    setSaving(true)
    try {
      const payload = buildPayload()
      if (editing) {
        await apiService.updateAdminSection(editing.id, payload)
      } else {
        await apiService.createAdminSection(payload)
      }
      toast.success(editing ? "Categoria atualizada." : "Categoria criada.")
      setDialogOpen(false)
      void load()
    } catch (e) {
      console.error(e)
      toast.error(laravelValidationErrorText(e) ?? "Erro ao salvar categoria.")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row: CategoryRow) => {
    if (!confirm(`Remover categoria "${row.name}"?`)) return
    try {
      await apiService.deleteAdminSection(row.id)
      toast.success("Categoria removida.")
      void load()
    } catch (e) {
      console.error(e)
      toast.error("Erro ao remover categoria.")
    }
  }

  if (!can("sections_view")) return <AccessDenied />
  const mayCreate = can("sections_create")
  const mayEdit = can("sections_edit")
  const mayDelete = can("sections_delete")

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categorias</h1>
          <p className="text-muted-foreground mt-1 text-sm">Categorias usadas para organizar e filtrar os produtos no ecommerce.</p>
        </div>
        {mayCreate ? (
          <Button type="button" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nova categoria
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader><CardTitle>Listagem</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <PanelTableSkeleton rows={10} columns={5} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Imagem</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Ordem</TableHead>
                  <TableHead>Ativa</TableHead>
                  {mayEdit || mayDelete ? <TableHead className="text-right">Ações</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {flatRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      {row.image_url ? (
                        <div
                          aria-label={`Imagem da categoria ${row.name}`}
                          className="h-12 w-12 rounded-md border bg-cover bg-center bg-no-repeat"
                          style={{ backgroundImage: `url(${row.image_url})` }}
                        />
                      ) : (
                        <span className="text-muted-foreground text-sm">Sem imagem</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium" style={{ paddingLeft: `${16 + row.level * 18}px` }}>{row.name}</TableCell>
                    <TableCell>{row.type === "A" ? "Subcategoria" : "Categoria"}</TableCell>
                    <TableCell>{row.order ?? 0}</TableCell>
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
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar categoria" : "Nova categoria"}</DialogTitle>
            <DialogDescription>Crie categorias e subcategorias para vincular aos produtos.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>Imagem da categoria</Label>
              <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                <div
                  className="flex h-32 w-full items-center justify-center rounded-lg border bg-muted bg-cover bg-center text-center text-xs text-muted-foreground sm:w-40"
                  style={categoryImagePreview ? { backgroundImage: `url(${categoryImagePreview})` } : undefined}
                >
                  {!categoryImagePreview ? "Sem imagem" : null}
                </div>
                <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground transition hover:bg-muted/50">
                  <span className="font-medium text-foreground">Clique para enviar uma imagem</span>
                  <span className="mt-1">PNG, JPG, WEBP, GIF ou SVG até 5MB.</span>
                  <Input
                    accept="image/*"
                    className="hidden"
                    type="file"
                    onChange={(e) => handleImageChange(e.target.files?.[0])}
                  />
                </label>
              </div>
            </div>
            <div className="grid gap-1"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid gap-1"><Label>Descrição</Label><Input value={form.descriptive} onChange={(e) => setForm((f) => ({ ...f, descriptive: e.target.value }))} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="S">Categoria</SelectItem><SelectItem value="A">Subcategoria</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="grid gap-1"><Label>Ordem</Label><Input type="number" value={form.order} onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))} /></div>
            </div>
            {form.type === "A" ? (
              <div className="grid gap-1">
                <Label>Categoria pai</Label>
                <Select value={form.parent_id || undefined} onValueChange={(v) => setForm((f) => ({ ...f, parent_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {flatRows.filter((r) => r.id !== editing?.id).map((row) => (
                      <SelectItem key={row.id} value={String(row.id)}>{row.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="grid gap-1">
              <Label>Ativa</Label>
              <Select value={form.is_enabled} onValueChange={(v) => setForm((f) => ({ ...f, is_enabled: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="1">Sim</SelectItem><SelectItem value="0">Não</SelectItem></SelectContent>
              </Select>
            </div>
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
