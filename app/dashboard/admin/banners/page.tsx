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
type Placement = { size_image_id: number; size_image_name: string; size_width: number; size_height: number; interface_position_id: number; id_position: string; position_name: string }
type Options = { types: Record<string, string>; placements: Placement[] }
type BannerRow = { id: number; name: string; image_url?: string | null; url?: string | null; is_enabled?: boolean | number; type: number; sequence: number; size_images?: Array<{ id: number; name: string; pivot?: { interface_position_id?: number; interface_position?: { id_position: string; position_name: string } } }> }

const emptyForm = { name: "", url: "", is_enabled: "1", type: "1", sequence: "1", placements: [] as string[] }

function placementKey(sizeImageId: number, interfacePositionId: number) {
  return `${sizeImageId}:${interfacePositionId}`
}

export default function AdminBannersPage() {
  const { can } = useGplacePermissions()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<BannerRow[]>([])
  const [options, setOptions] = useState<Options>({ types: {}, placements: [] })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<BannerRow | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [listRaw, optionsRaw] = await Promise.all([
        apiService.getAdminBanners({ page: 1, per_page: 100 }),
        apiService.getAdminBannerOptions(),
      ])
      const payload = laravelInnerData<Paginator<BannerRow>>(listRaw)
      setRows(payload?.data ?? [])
      setOptions(laravelInnerData<Options>(optionsRaw) ?? { types: {}, placements: [] })
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar banners.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (!can("banners_view")) return <AccessDenied />
  const mayCreate = can("banners_create")
  const mayEdit = can("banners_edit")
  const mayDelete = can("banners_delete")

  const open = (row?: BannerRow) => {
    setEditing(row ?? null)
    setImageFile(null)
    setImagePreview(row?.image_url ?? null)
    setForm(row ? {
      name: row.name,
      url: row.url ?? "",
      is_enabled: String(Number(row.is_enabled ?? 1)),
      type: String(row.type ?? 1),
      sequence: String(row.sequence ?? 1),
      placements: (row.size_images ?? []).map((s) => placementKey(s.id, Number(s.pivot?.interface_position_id ?? 0))).filter((key) => !key.endsWith(":0")),
    } : emptyForm)
    setDialogOpen(true)
  }

  const handleImageChange = (file?: File | null) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.")
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const togglePlacement = (key: string, checked: boolean) => {
    setForm((f) => ({ ...f, placements: checked ? Array.from(new Set([...f.placements, key])) : f.placements.filter((value) => value !== key) }))
  }

  const buildPayload = () => {
    const payload = new FormData()
    payload.append("name", form.name)
    payload.append("url", form.url)
    payload.append("is_enabled", form.is_enabled)
    payload.append("type", form.type)
    payload.append("sequence", form.sequence)
    form.placements.forEach((key, index) => {
      const [sizeImageId, interfacePositionId] = key.split(":")
      payload.append(`placements[${index}][size_image_id]`, sizeImageId)
      payload.append(`placements[${index}][interface_position_id]`, interfacePositionId)
    })
    if (imageFile) payload.append("image", imageFile)
    return payload
  }

  const save = async () => {
    setSaving(true)
    try {
      const payload = buildPayload()
      if (editing) await apiService.updateAdminBanner(editing.id, payload)
      else await apiService.createAdminBanner(payload)
      toast.success(editing ? "Banner atualizado." : "Banner criado.")
      setDialogOpen(false)
      void load()
    } catch (e) {
      console.error(e)
      toast.error(laravelValidationErrorText(e) ?? "Erro ao salvar banner.")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row: BannerRow) => {
    if (!confirm(`Remover banner "${row.name}"?`)) return
    try {
      await apiService.deleteAdminBanner(row.id)
      toast.success("Banner removido.")
      void load()
    } catch (e) {
      console.error(e)
      toast.error("Erro ao remover banner.")
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between gap-3">
        <div><h1 className="text-2xl font-semibold tracking-tight">Mídias / anúncios</h1><p className="text-muted-foreground mt-1 text-sm">Banners exibidos na home do ecommerce por posição da interface.</p></div>
        {mayCreate ? <Button onClick={() => open()}><Plus className="mr-2 h-4 w-4" />Novo banner</Button> : null}
      </div>
      <Card><CardHeader><CardTitle>Listagem</CardTitle></CardHeader><CardContent>{loading ? <PanelTableSkeleton rows={8} columns={7} /> : <Table><TableHeader><TableRow><TableHead>Imagem</TableHead><TableHead>Nome</TableHead><TableHead>Posições</TableHead><TableHead>Ordem</TableHead><TableHead>Ativo</TableHead>{mayEdit || mayDelete ? <TableHead className="text-right">Ações</TableHead> : null}</TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell>{row.image_url ? <div className="h-14 w-24 rounded border bg-cover bg-center" style={{ backgroundImage: `url(${row.image_url})` }} /> : "Sem imagem"}</TableCell><TableCell className="font-medium">{row.name}</TableCell><TableCell>{(row.size_images ?? []).map((s) => s.pivot?.interface_position ? `${s.pivot.interface_position.id_position} - ${s.pivot.interface_position.position_name}` : s.name).join(", ") || "-"}</TableCell><TableCell>{row.sequence}</TableCell><TableCell>{Number(row.is_enabled ?? 0) ? "Sim" : "Não"}</TableCell>{mayEdit || mayDelete ? <TableCell className="text-right">{mayEdit ? <Button variant="ghost" size="icon" onClick={() => open(row)}><Pencil className="h-4 w-4" /></Button> : null}{mayDelete ? <Button variant="ghost" size="icon" onClick={() => void remove(row)}><Trash2 className="h-4 w-4 text-destructive" /></Button> : null}</TableCell> : null}</TableRow>)}</TableBody></Table>}</CardContent></Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{editing ? "Editar banner" : "Novo banner"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2"><Label>Imagem</Label><div className="grid gap-3 sm:grid-cols-[180px_1fr]"><div className="flex h-32 items-center justify-center rounded-lg border bg-muted bg-cover bg-center text-xs text-muted-foreground" style={imagePreview ? { backgroundImage: `url(${imagePreview})` } : undefined}>{!imagePreview ? "Sem imagem" : null}</div><label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground transition hover:bg-muted/50"><span className="font-medium text-foreground">Clique para enviar</span><span className="mt-1">PNG, JPG, WEBP, GIF ou SVG até 5MB.</span><Input accept="image/*" className="hidden" type="file" onChange={(e) => handleImageChange(e.target.files?.[0])} /></label></div></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
              <div className="grid gap-1"><Label>URL ao clicar</Label><Input value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} /></div>
              <div className="grid gap-1"><Label>Tipo</Label><Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(options.types).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid gap-1"><Label>Ordem</Label><Input type="number" value={form.sequence} onChange={(e) => setForm((f) => ({ ...f, sequence: e.target.value }))} /></div>
              <div className="grid gap-1"><Label>Ativo</Label><Select value={form.is_enabled} onValueChange={(v) => setForm((f) => ({ ...f, is_enabled: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">Sim</SelectItem><SelectItem value="0">Não</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid gap-2"><Label>Posições/tamanhos</Label><div className="grid max-h-64 gap-2 overflow-auto rounded-md border p-3 sm:grid-cols-2">{options.placements.map((placement) => { const key = placementKey(placement.size_image_id, placement.interface_position_id); return <label className="flex items-start gap-2 text-sm" key={key}><Checkbox checked={form.placements.includes(key)} onCheckedChange={(checked) => togglePlacement(key, checked === true)} /><span>{placement.id_position} - {placement.position_name}<br /><span className="text-muted-foreground">{placement.size_image_name} ({placement.size_width}x{placement.size_height})</span></span></label> })}</div></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={() => void save()} disabled={saving || (editing ? !mayEdit : !mayCreate)}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
