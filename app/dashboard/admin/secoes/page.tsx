"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { apiService } from "@/lib/api"
import { laravelInnerData, laravelValidationErrorText } from "@/lib/laravel-data"
import { useGplacePermissions } from "@/lib/use-gplace-permissions"
import { AccessDenied } from "@/components/ui/access-denied"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

type HomeSectionContentType = "categories" | "products" | "brands"

type HomeSection = {
  id: number
  title: string
  type: HomeSectionContentType | "banners"
  is_enabled: boolean | number
  sort_order: number
  items?: Array<{ item_id: number; sort_order?: number }>
}

type RefItem = { id: number; name: string }
type ProductRef = { id: number; commercial_name?: string; sku?: string; reference?: string }
type CategoryRow = RefItem & { children?: CategoryRow[] }

const contentTypeLabels: Record<string, string> = {
  categories: "Categorias",
  products: "Produtos",
  brands: "Marcas",
  banners: "Banners",
}

const emptyForm = () => ({
  title: "",
  content_type: "categories" as HomeSectionContentType,
  is_enabled: "1",
  sort_order: "0",
  item_ids: [] as number[],
})

function flattenCategories(rows: CategoryRow[]): RefItem[] {
  return rows.flatMap((row) => [{ id: row.id, name: row.name }, ...flattenCategories(row.children ?? [])])
}

function paginatorData<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === "object" && Array.isArray((value as { data?: unknown }).data)) {
    return (value as { data: T[] }).data
  }
  return []
}

export default function AdminSecoesPage() {
  const { can } = useGplacePermissions()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [rows, setRows] = useState<HomeSection[]>([])
  const [categories, setCategories] = useState<RefItem[]>([])
  const [products, setProducts] = useState<RefItem[]>([])
  const [brands, setBrands] = useState<RefItem[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<HomeSection | null>(null)
  const [form, setForm] = useState(emptyForm)

  const availableItems = useMemo(() => {
    if (form.content_type === "products") return products
    if (form.content_type === "brands") return brands
    return categories
  }, [brands, categories, form.content_type, products])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [sectionsRaw, categoriesRaw, productsRaw, brandsRaw] = await Promise.all([
        apiService.getAdminHomeBlocks(),
        apiService.getAdminSections(),
        apiService.getAdminProducts({ per_page: 100 }),
        apiService.getAdminBrands(),
      ])

      setRows(laravelInnerData<HomeSection[]>(sectionsRaw) ?? [])
      setCategories(flattenCategories(laravelInnerData<CategoryRow[]>(categoriesRaw) ?? []))

      const productsPayload = laravelInnerData<unknown>(productsRaw)
      setProducts(
        paginatorData<ProductRef>(productsPayload).map((p) => ({
          id: p.id,
          name: p.commercial_name || p.sku || p.reference || `Produto #${p.id}`,
        })),
      )

      const brandsPayload = laravelInnerData<unknown>(brandsRaw)
      setBrands(paginatorData<RefItem>(brandsPayload).map((b) => ({ id: b.id, name: b.name })))
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar seções da home.")
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
    setDialogOpen(true)
  }

  const openEdit = (row: HomeSection) => {
    setEditing(row)
    setForm({
      title: row.title,
      content_type: row.type === "banners" ? "categories" : row.type,
      is_enabled: String(Number(row.is_enabled ?? 1)),
      sort_order: String(row.sort_order ?? 0),
      item_ids: (row.items ?? []).map((item) => Number(item.item_id)),
    })
    setDialogOpen(true)
  }

  const toggleItem = (id: number, checked: boolean) => {
    setForm((current) => ({
      ...current,
      item_ids: checked ? [...current.item_ids, id] : current.item_ids.filter((itemId) => itemId !== id),
    }))
  }

  const save = async () => {
    setSaving(true)
    try {
      const payload = {
        title: form.title,
        type: form.content_type,
        is_enabled: form.is_enabled === "1",
        sort_order: Number(form.sort_order || 0),
        items: form.item_ids.map((itemId, index) => ({
          item_id: itemId,
          sort_order: index,
        })),
      }
      if (editing) {
        await apiService.updateAdminHomeBlock(editing.id, payload)
      } else {
        await apiService.createAdminHomeBlock(payload)
      }
      toast.success(editing ? "Seção atualizada." : "Seção criada.")
      setDialogOpen(false)
      await load()
    } catch (e) {
      console.error(e)
      toast.error(laravelValidationErrorText(e) ?? "Erro ao salvar seção.")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row: HomeSection) => {
    if (!confirm(`Remover seção "${row.title}"?`)) return
    try {
      await apiService.deleteAdminHomeBlock(row.id)
      toast.success("Seção removida.")
      await load()
    } catch (e) {
      console.error(e)
      toast.error("Erro ao remover seção.")
    }
  }

  if (!can("sections_view")) return <AccessDenied />

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Seções da home</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Monte as seções visuais da home escolhendo se cada uma exibe categorias, produtos ou marcas.
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nova seção
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Seções configuradas</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo de conteúdo</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead>Ordem</TableHead>
                  <TableHead>Ativa</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.title}</TableCell>
                    <TableCell>{contentTypeLabels[row.type] ?? row.type}</TableCell>
                    <TableCell>{row.items?.length ?? 0}</TableCell>
                    <TableCell>{row.sort_order ?? 0}</TableCell>
                    <TableCell>{Number(row.is_enabled ?? 0) ? "Sim" : "Não"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => void remove(row)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar seção da home" : "Nova seção da home"}</DialogTitle>
            <DialogDescription>
              Primeiro escolha o tipo de conteúdo da seção; depois selecione quais itens aparecerão nela.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Título da seção</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>Tipo de conteúdo</Label>
                <Select value={form.content_type} onValueChange={(v) => setForm((f) => ({ ...f, content_type: v as HomeSectionContentType, item_ids: [] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="categories">Categorias</SelectItem>
                    <SelectItem value="products">Produtos</SelectItem>
                    <SelectItem value="brands">Marcas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Ativa</Label>
                <Select value={form.is_enabled} onValueChange={(v) => setForm((f) => ({ ...f, is_enabled: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Sim</SelectItem>
                    <SelectItem value="0">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Ordem</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))} />
              </div>
            </div>
            <div className="max-h-72 space-y-2 overflow-auto rounded border p-3">
              {availableItems.map((item) => (
                <label key={item.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.item_ids.includes(item.id)} onCheckedChange={(checked) => toggleItem(item.id, checked === true)} />
                  <span>{item.name}</span>
                </label>
              ))}
              {availableItems.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum item disponível para este tipo.</p> : null}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => void save()} disabled={saving || !form.title.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
