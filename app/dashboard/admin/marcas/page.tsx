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

type BrandRow = { id: number; name?: string; image_url?: string; is_enabled?: boolean | number; is_public?: boolean | number }

export default function AdminMarcasPage() {
  const { can } = useGplacePermissions()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<BrandRow[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<BrandRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: "", is_enabled: "1", is_public: "1" })
  const [brandImageFile, setBrandImageFile] = useState<File | null>(null)
  const [brandImagePreview, setBrandImagePreview] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await apiService.getAdminBrands()
      const data = laravelInnerData<BrandRow[]>(raw)
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar marcas.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: "", is_enabled: "1", is_public: "1" })
    setBrandImageFile(null)
    setBrandImagePreview(null)
    setDialogOpen(true)
  }

  const openEdit = (row: BrandRow) => {
    setEditing(row)
    setForm({
      name: row.name ?? "",
      is_enabled: String(Number(row.is_enabled ?? 1)),
      is_public: String(Number(row.is_public ?? 1)),
    })
    setBrandImageFile(null)
    setBrandImagePreview(row.image_url ?? null)
    setDialogOpen(true)
  }

  const handleImageChange = (file?: File | null) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.")
      return
    }
    setBrandImageFile(file)
    setBrandImagePreview(URL.createObjectURL(file))
  }

  const buildPayload = () => {
    const payload = new FormData()
    payload.append("name", form.name)
    payload.append("is_enabled", form.is_enabled)
    payload.append("is_public", form.is_public)
    if (brandImageFile) {
      payload.append("image", brandImageFile)
    }
    return payload
  }

  const submit = async () => {
    setSaving(true)
    try {
      const payload = buildPayload()
      if (editing) {
        await apiService.updateAdminBrand(editing.id, payload)
      } else {
        await apiService.createAdminBrand(payload)
      }
      toast.success(editing ? "Marca atualizada." : "Marca criada.")
      setDialogOpen(false)
      void load()
    } catch (e) {
      console.error(e)
      toast.error(laravelValidationErrorText(e) ?? "Erro ao salvar marca.")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row: BrandRow) => {
    if (!confirm(`Remover marca "${row.name}"?`)) return
    try {
      await apiService.deleteAdminBrand(row.id)
      toast.success("Marca removida.")
      void load()
    } catch (e) {
      console.error(e)
      toast.error("Erro ao remover marca.")
    }
  }

  if (!can("brands_view")) return <AccessDenied />
  const mayCreate = can("brands_create")
  const mayEdit = can("brands_edit")
  const mayDelete = can("brands_delete")

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Marcas</h1>
          <p className="text-muted-foreground mt-1 text-sm">CRUD de marcas do tenant da loja.</p>
        </div>
        {mayCreate ? <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Nova marca</Button> : null}
      </div>
      <Card>
        <CardHeader><CardTitle>Listagem</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <PanelTableSkeleton rows={10} columns={4} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>ID</TableHead><TableHead>Imagem</TableHead><TableHead>Nome</TableHead>{mayEdit || mayDelete ? <TableHead className="text-right">Ações</TableHead> : null}</TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.id}</TableCell>
                    <TableCell>
                      {row.image_url ? (
                        <div
                          aria-label={`Imagem da marca ${row.name ?? row.id}`}
                          className="h-12 w-12 rounded-md border bg-cover bg-center bg-no-repeat"
                          style={{ backgroundImage: `url(${row.image_url})` }}
                        />
                      ) : (
                        <span className="text-muted-foreground text-sm">Sem imagem</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{row.name}</TableCell>
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
          <DialogHeader><DialogTitle>{editing ? "Editar marca" : "Nova marca"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>Imagem da marca</Label>
              <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                <div
                  className="flex h-32 w-full items-center justify-center rounded-lg border bg-muted bg-cover bg-center text-center text-xs text-muted-foreground sm:w-40"
                  style={brandImagePreview ? { backgroundImage: `url(${brandImagePreview})` } : undefined}
                >
                  {!brandImagePreview ? "Sem imagem" : null}
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
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1"><Label>Activa</Label><Select value={form.is_enabled} onValueChange={(v) => setForm((f) => ({ ...f, is_enabled: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">Sim</SelectItem><SelectItem value="0">Não</SelectItem></SelectContent></Select></div>
              <div className="grid gap-1"><Label>Pública</Label><Select value={form.is_public} onValueChange={(v) => setForm((f) => ({ ...f, is_public: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">Sim</SelectItem><SelectItem value="0">Não</SelectItem></SelectContent></Select></div>
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
