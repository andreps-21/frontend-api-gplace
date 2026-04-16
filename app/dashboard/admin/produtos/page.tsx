"use client"

import { useCallback, useEffect, useState } from "react"
import { apiService } from "@/lib/api"
import { laravelInnerData } from "@/lib/laravel-data"
import { useGplacePermissions } from "@/lib/use-gplace-permissions"
import { AccessDenied } from "@/components/ui/access-denied"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

type Paginator<T> = { data: T[]; current_page: number; last_page: number; total: number }

function movementLabel(type: string): string {
  const m: Record<string, string> = {
    admin_create: "Cadastro",
    admin_adjust: "Ajuste manual",
    order_sale: "Venda",
    lot_receipt: "Entrada (lote)",
  }
  return m[type] ?? type
}

function isLowStock(row: Record<string, unknown>): boolean {
  const q = row.quantity != null ? Number(row.quantity) : 0
  const min = row.min_stock != null ? Number(row.min_stock) : null
  return min != null && !Number.isNaN(min) && q <= min
}

type Meta = {
  sections: Array<{ id: number; name: string; parent_id?: number | null }>
  measurement_units: Array<{ id: number; name: string; initials?: string }>
  families: Array<{ id: number; name: string }>
  presentations: Array<{ id: number; name: string }>
}

function num(v: string): number {
  const n = parseFloat(String(v).replace(",", "."))
  return Number.isFinite(n) ? n : 0
}

function intQty(v: string): number {
  const n = parseInt(String(v).trim(), 10)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

export default function AdminProdutosPage() {
  const { can } = useGplacePermissions()
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [paginator, setPaginator] = useState<Paginator<Record<string, unknown>> | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [meta, setMeta] = useState<Meta | null>(null)
  const [brands, setBrands] = useState<Array<{ id: number; name: string }>>([])
  const [paymentOpts, setPaymentOpts] = useState<Array<{ id: number; name?: string }>>([])
  const [paymentSel, setPaymentSel] = useState<number[]>([])
  const [extraSections, setExtraSections] = useState<number[]>([])
  const [movements, setMovements] = useState<Paginator<Record<string, unknown>> | null>(null)
  const [movementsLoading, setMovementsLoading] = useState(false)
  const [warehouses, setWarehouses] = useState<Array<{ id: number; name: string; code?: string }>>([])
  const [lotQty, setLotQty] = useState("1")
  const [lotDoc, setLotDoc] = useState("")
  const [lotWarehouseId, setLotWarehouseId] = useState<string>("")
  const [lotSaving, setLotSaving] = useState(false)

  const [form, setForm] = useState({
    reference: "",
    commercial_name: "",
    description_reference: "",
    description: "",
    um_id: "",
    tag: "",
    price: "",
    promotion_price: "",
    discount: "",
    payment_condition: "",
    weight: "",
    width: "1",
    height: "1",
    length: "1",
    cubic_weight: "",
    brand_id: "",
    about: "",
    recommendation: "",
    benefits: "",
    formula: "",
    application_mode: "",
    dosage: "",
    lack: "",
    other_information: "",
    is_enabled: "1",
    type: "P",
    section_id: "",
    family_id: "",
    presentation_id: "",
    sku: "",
    is_grid: "0",
    video: "",
    origin: "1",
    quantity: "0",
    min_stock: "",
    stock_change_note: "",
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await apiService.getAdminProducts({ page, per_page: 15, search: search || undefined })
      const inner = laravelInnerData<Paginator<Record<string, unknown>>>(raw)
      setPaginator(inner)
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar produtos.")
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    void load()
  }, [load])

  const loadMovements = useCallback(async (productId: number) => {
    setMovementsLoading(true)
    try {
      const raw = await apiService.getAdminStockMovements({ product_id: productId, per_page: 25 })
      const inner = laravelInnerData<Paginator<Record<string, unknown>>>(raw)
      setMovements(inner)
    } catch (e) {
      console.error(e)
      setMovements(null)
    } finally {
      setMovementsLoading(false)
    }
  }, [])

  const loadAux = async () => {
    const [mRaw, bRaw, pRaw] = await Promise.all([
      apiService.getAdminProductFormMeta(),
      apiService.getBrands(),
      apiService.getPaymentMethods(),
    ])
    const m = laravelInnerData<Meta>(mRaw)
    const b = laravelInnerData<Array<{ id: number; name: string }>>(bRaw)
    const p = laravelInnerData<Array<{ id: number; name?: string }>>(pRaw)
    setMeta(m)
    setBrands(Array.isArray(b) ? b : [])
    setPaymentOpts(Array.isArray(p) ? p : [])
    return { meta: m, brands: Array.isArray(b) ? b : [], paymentOpts: Array.isArray(p) ? p : [] }
  }

  const openCreate = async () => {
    setEditingId(null)
    try {
      const { meta: m, brands: bl } = await loadAux()
      if (!bl.length) {
        toast.error("Sem marcas activas para esta loja.")
        return
      }
      if (!m.sections?.length || !m.measurement_units?.length) {
        toast.error("Meta incompleto: secções ou unidades de medida em falta.")
        return
      }
      setPaymentSel([])
      setExtraSections([])
      setForm({
        reference: "",
        commercial_name: "",
        description_reference: "",
        description: "",
        um_id: String(m.measurement_units[0].id),
        tag: "",
        price: "0",
        promotion_price: "0",
        discount: "",
        payment_condition: "",
        weight: "",
        width: "1",
        height: "1",
        length: "1",
        cubic_weight: "",
        brand_id: String(bl[0].id),
        about: "",
        recommendation: "",
        benefits: "",
        formula: "",
        application_mode: "",
        dosage: "",
        lack: "",
        other_information: "",
        is_enabled: "1",
        type: "P",
        section_id: String(m.sections[0].id),
        family_id: "",
        presentation_id: "",
        sku: "",
        is_grid: "0",
        video: "",
        origin: "1",
        quantity: "0",
        min_stock: "",
        stock_change_note: "",
      })
      setMovements(null)
      setDialogOpen(true)
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar metadados.")
    }
  }

  const openEdit = async (row: Record<string, unknown>) => {
    const id = Number(row.id)
    setEditingId(id)
    try {
      await loadAux()
      try {
        const wRaw = await apiService.getAdminWarehouses()
        const wInner = laravelInnerData<Array<{ id: number; name: string; code?: string }>>(wRaw)
        setWarehouses(Array.isArray(wInner) ? wInner : [])
      } catch {
        setWarehouses([])
      }
      const raw = await apiService.getAdminProduct(id)
      const d = laravelInnerData<Record<string, unknown>>(raw)
      const pms = (d.payment_methods ?? d.paymentMethods) as Array<{ id: number }> | undefined
      setPaymentSel(Array.isArray(pms) ? pms.map((x) => x.id) : [])
      const secs = (d.sections as Array<{ id: number }> | undefined) ?? []
      const primary = Number(d.section_id)
      setExtraSections(secs.map((s) => s.id).filter((sid) => sid !== primary))

      setForm({
        reference: String(d.reference ?? ""),
        commercial_name: String(d.commercial_name ?? ""),
        description_reference: String(d.description_reference ?? ""),
        description: String(d.description ?? ""),
        um_id: String(d.um_id ?? ""),
        tag: String(d.tag ?? ""),
        price: String(d.price ?? "0"),
        promotion_price: String(d.promotion_price ?? "0"),
        discount: d.discount != null ? String(d.discount) : "",
        payment_condition: String(d.payment_condition ?? ""),
        weight: d.weight != null ? String(d.weight) : "",
        width: String(d.width ?? "1"),
        height: String(d.height ?? "1"),
        length: String(d.length ?? "1"),
        cubic_weight: d.cubic_weight != null ? String(d.cubic_weight) : "",
        brand_id: String(d.brand_id ?? ""),
        about: String(d.about ?? ""),
        recommendation: String(d.recommendation ?? ""),
        benefits: String(d.benefits ?? ""),
        formula: String(d.formula ?? ""),
        application_mode: String(d.application_mode ?? ""),
        dosage: String(d.dosage ?? ""),
        lack: String(d.lack ?? ""),
        other_information: String(d.other_information ?? ""),
        is_enabled: d.is_enabled === true || d.is_enabled === 1 || d.is_enabled === "1" ? "1" : "0",
        type: String(d.type ?? "P"),
        section_id: String(d.section_id ?? ""),
        family_id: d.family_id != null ? String(d.family_id) : "",
        presentation_id: d.presentation_id != null ? String(d.presentation_id) : "",
        sku: String(d.sku ?? ""),
        is_grid: String(d.is_grid ?? "0"),
        video: String(d.video ?? ""),
        origin: String(d.origin ?? "1"),
        quantity: d.quantity != null ? String(Math.max(0, Math.floor(Number(d.quantity)))) : "0",
        min_stock: d.min_stock != null ? String(Math.max(0, Math.floor(Number(d.min_stock)))) : "",
        stock_change_note: "",
      })
      setLotQty("1")
      setLotDoc("")
      setLotWarehouseId("")
      void loadMovements(id)
      setDialogOpen(true)
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar produto.")
    }
  }

  const submitLotReceipt = async () => {
    if (!editingId) return
    const q = intQty(lotQty)
    if (q < 1) {
      toast.error("Quantidade do lote deve ser ≥ 1.")
      return
    }
    setLotSaving(true)
    try {
      await apiService.createAdminStockLot({
        product_id: editingId,
        quantity_received: q,
        document_reference: lotDoc.trim() || null,
        warehouse_id: lotWarehouseId ? Number(lotWarehouseId) : null,
      })
      toast.success("Entrada de lote registada.")
      setLotQty("1")
      setLotDoc("")
      const raw = await apiService.getAdminProduct(editingId)
      const d = laravelInnerData<Record<string, unknown>>(raw)
      setForm((f) => ({
        ...f,
        quantity: d.quantity != null ? String(Math.max(0, Math.floor(Number(d.quantity)))) : "0",
      }))
      void loadMovements(editingId)
      void load()
    } catch (e) {
      console.error(e)
      toast.error("Erro ao registar lote.")
    } finally {
      setLotSaving(false)
    }
  }

  const togglePm = (id: number, checked: boolean) => {
    setPaymentSel((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)))
  }

  const toggleSec = (id: number, checked: boolean) => {
    const primary = Number(form.section_id)
    if (id === primary) return
    setExtraSections((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)))
  }

  const save = async () => {
    if (!meta?.measurement_units?.length || !form.um_id) {
      toast.error("Seleccione a unidade de medida.")
      return
    }
    if (!form.section_id || !form.brand_id) {
      toast.error("Secção e marca são obrigatórios.")
      return
    }
    const primary = Number(form.section_id)
    const sectionIds = Array.from(new Set([primary, ...extraSections]))

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        video: form.video.trim() || null,
        reference: form.reference.trim(),
        origin: Number(form.origin),
        commercial_name: form.commercial_name.trim(),
        description_reference: form.description_reference.trim() || null,
        description: form.description.trim() || null,
        um_id: Number(form.um_id),
        tag: form.tag.trim() || null,
        price: num(form.price),
        promotion_price: num(form.promotion_price),
        discount: form.discount.trim() ? num(form.discount) : null,
        payment_condition: form.payment_condition.trim() || null,
        weight: form.weight.trim() ? num(form.weight) : null,
        width: num(form.width),
        height: num(form.height),
        length: num(form.length),
        cubic_weight: form.cubic_weight.trim() ? num(form.cubic_weight) : null,
        brand_id: Number(form.brand_id),
        about: form.about.trim() || null,
        recommendation: form.recommendation.trim() || null,
        benefits: form.benefits.trim() || null,
        formula: form.formula.trim() || null,
        application_mode: form.application_mode.trim() || null,
        dosage: form.dosage.trim() || null,
        lack: form.lack.trim() || null,
        other_information: form.other_information.trim() || null,
        is_enabled: form.is_enabled === "1",
        type: form.type,
        section_id: primary,
        family_id: form.family_id ? Number(form.family_id) : null,
        presentation_id: form.presentation_id ? Number(form.presentation_id) : null,
        sku: form.sku.trim() || null,
        is_grid: form.is_grid,
        quantity: intQty(form.quantity),
        min_stock: form.min_stock.trim() === "" ? null : intQty(form.min_stock),
        stock_change_note: editingId && form.stock_change_note.trim() ? form.stock_change_note.trim() : null,
        payment_methods: paymentSel,
        sections: sectionIds,
      }

      if (form.is_grid === "1" && !String(payload.description_reference ?? "").trim()) {
        toast.error("Referência da descrição é obrigatória para grelha.")
        setSaving(false)
        return
      }

      if (editingId) {
        await apiService.updateAdminProduct(editingId, payload)
        toast.success("Produto actualizado.")
        void loadMovements(editingId)
      } else {
        await apiService.createAdminProduct(payload)
        toast.success("Produto criado.")
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

  const remove = async (row: Record<string, unknown>) => {
    if (!confirm(`Eliminar produto #${row.id}?`)) return
    try {
      await apiService.deleteAdminProduct(Number(row.id))
      toast.success("Eliminado.")
      void load()
    } catch (e) {
      console.error(e)
      toast.error("Não foi possível eliminar.")
    }
  }

  if (!can("products_view")) {
    return <AccessDenied />
  }

  const primarySection = Number(form.section_id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Produtos</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          CRUD com meta <code className="text-xs">/admin/product-form-meta</code>. A quantidade em estoque corresponde a <code className="text-xs">products.quantity</code>; vendas na loja online reduzem o saldo.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Listagem</CardTitle>
            <Button type="button" size="sm" onClick={() => void openCreate()}>
              <Plus className="mr-1 h-4 w-4" />
              Novo
            </Button>
          </div>
          <form
            className="flex w-full max-w-md gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              setPage(1)
              setSearch(searchInput.trim())
            }}
          >
            <Input placeholder="Nome comercial…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
            <Button type="submit" variant="secondary">
              Pesquisar
            </Button>
          </form>
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
                    <TableHead>SKU</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead>Secção</TableHead>
                    <TableHead className="text-right">Estoque</TableHead>
                    <TableHead className="text-right">Mín.</TableHead>
                    <TableHead>Activo</TableHead>
                    <TableHead className="w-[100px]">Acções</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(paginator?.data ?? []).map((row) => (
                    <TableRow key={String(row.id)}>
                      <TableCell>{String(row.id)}</TableCell>
                      <TableCell className="font-medium">{String(row.commercial_name ?? "")}</TableCell>
                      <TableCell>{String(row.sku ?? "")}</TableCell>
                      <TableCell>{String(row.brand ?? "")}</TableCell>
                      <TableCell>{String(row.section ?? "")}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className="inline-flex items-center justify-end gap-2">
                          {row.quantity != null ? String(Math.floor(Number(row.quantity))) : "—"}
                          {isLowStock(row) ? (
                            <Badge variant="destructive" className="text-[10px] uppercase">
                              Baixo
                            </Badge>
                          ) : null}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums text-sm">
                        {row.min_stock != null && row.min_stock !== "" ? String(Math.floor(Number(row.min_stock))) : "—"}
                      </TableCell>
                      <TableCell>{row.is_enabled === true || row.is_enabled === 1 || row.is_enabled === "1" ? "Sim" : "Não"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button type="button" variant="ghost" size="icon" onClick={() => void openEdit(row)}>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingId ? `Editar produto #${editingId}` : "Novo produto"}</DialogTitle>
            <DialogDescription>Campos obrigatórios conforme validação Laravel.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Referência *</Label>
                <Input value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} disabled={editingId != null} />
              </div>
              <div className="grid gap-2">
                <Label>SKU</Label>
                <Input value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Nome comercial *</Label>
              <Input value={form.commercial_name} onChange={(e) => setForm((f) => ({ ...f, commercial_name: e.target.value }))} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="P">Produto</SelectItem>
                    <SelectItem value="S">Serviço</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Origem</Label>
                <Input value={form.origin} onChange={(e) => setForm((f) => ({ ...f, origin: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Secção principal *</Label>
                <Select value={form.section_id || undefined} onValueChange={(v) => setForm((f) => ({ ...f, section_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione" />
                  </SelectTrigger>
                  <SelectContent>
                    {(meta?.sections ?? []).map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Marca *</Label>
                <Select value={form.brand_id || undefined} onValueChange={(v) => setForm((f) => ({ ...f, brand_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="text-muted-foreground">Secções adicionais (opcional)</Label>
              <div className="max-h-32 space-y-2 overflow-y-auto rounded-md border p-3">
                {(meta?.sections ?? []).map((s) => (
                  <label key={s.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={extraSections.includes(s.id)}
                      disabled={s.id === primarySection}
                      onCheckedChange={(c) => toggleSec(s.id, c === true)}
                    />
                    <span>
                      {s.name} {s.id === primarySection ? "(principal)" : ""}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>UM *</Label>
                <Select value={form.um_id || undefined} onValueChange={(v) => setForm((f) => ({ ...f, um_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione" />
                  </SelectTrigger>
                  <SelectContent>
                    {(meta?.measurement_units ?? []).map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.initials ? `${u.name} (${u.initials})` : u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Família</Label>
                <Select
                  value={form.family_id || "__none__"}
                  onValueChange={(v) => setForm((f) => ({ ...f, family_id: v === "__none__" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {(meta?.families ?? []).map((x) => (
                      <SelectItem key={x.id} value={String(x.id)}>
                        {x.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Apresentação</Label>
                <Select
                  value={form.presentation_id || "__none__"}
                  onValueChange={(v) => setForm((f) => ({ ...f, presentation_id: v === "__none__" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {(meta?.presentations ?? []).map((x) => (
                      <SelectItem key={x.id} value={String(x.id)}>
                        {x.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Preço *</Label>
                <Input type="number" step="any" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Preço promoção *</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.promotion_price}
                  onChange={(e) => setForm((f) => ({ ...f, promotion_price: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>Largura *</Label>
                <Input type="number" step="any" value={form.width} onChange={(e) => setForm((f) => ({ ...f, width: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Altura *</Label>
                <Input type="number" step="any" value={form.height} onChange={(e) => setForm((f) => ({ ...f, height: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Comprimento *</Label>
                <Input type="number" step="any" value={form.length} onChange={(e) => setForm((f) => ({ ...f, length: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Grelha</Label>
                <Select value={form.is_grid} onValueChange={(v) => setForm((f) => ({ ...f, is_grid: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Não</SelectItem>
                    <SelectItem value="1">Sim</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Referência descrição (grelha)</Label>
                <Input value={form.description_reference} onChange={(e) => setForm((f) => ({ ...f, description_reference: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>Quantidade em estoque *</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Saldo na loja; pedidos na loja online baixam este valor.</p>
              </div>
              <div className="grid gap-2">
                <Label>Stock mínimo (alerta)</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  placeholder="Opcional"
                  value={form.min_stock}
                  onChange={(e) => setForm((f) => ({ ...f, min_stock: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Lista assinala «Baixo» quando saldo ≤ este valor.</p>
              </div>
              <div className="grid gap-2">
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
            </div>
            {editingId ? (
              <div className="grid gap-2">
                <Label>Nota do ajuste de stock (opcional)</Label>
                <Textarea
                  rows={2}
                  placeholder="Motivo da alteração manual de quantidade…"
                  value={form.stock_change_note}
                  onChange={(e) => setForm((f) => ({ ...f, stock_change_note: e.target.value }))}
                />
              </div>
            ) : null}
            {editingId ? (
              <details className="rounded-lg border p-3">
                <summary className="cursor-pointer text-sm font-medium">Movimentos de estoque</summary>
                <div className="mt-3 max-h-48 overflow-auto text-xs">
                  {movementsLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (movements?.data ?? []).length === 0 ? (
                    <p className="text-muted-foreground">Sem registos.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">Δ</TableHead>
                          <TableHead className="text-right">Saldo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(movements?.data ?? []).map((m) => (
                          <TableRow key={String(m.id)}>
                            <TableCell>
                              {m.created_at ? String(new Date(String(m.created_at)).toLocaleString("pt-PT")) : "—"}
                            </TableCell>
                            <TableCell>{movementLabel(String(m.movement_type ?? ""))}</TableCell>
                            <TableCell className="text-right tabular-nums">{String(m.quantity_delta ?? "")}</TableCell>
                            <TableCell className="text-right tabular-nums">{String(m.balance_after ?? "")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </details>
            ) : null}
            {editingId ? (
              <details className="rounded-lg border p-3">
                <summary className="cursor-pointer text-sm font-medium">Entrada de mercadoria (lote / documento)</summary>
                <p className="mt-2 text-xs text-muted-foreground">
                  Regista entrada e referência (ex. NF futura); aumenta o saldo do produto. Consumo FIFO nos pedidos pode ser ligado numa fase seguinte.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Quantidade</Label>
                    <Input type="number" min={1} step={1} value={lotQty} onChange={(e) => setLotQty(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Ref. documento (NF, etc.)</Label>
                    <Input value={lotDoc} onChange={(e) => setLotDoc(e.target.value)} placeholder="Opcional" />
                  </div>
                  <div className="grid gap-2 sm:col-span-2">
                    <Label>Armazém</Label>
                    <Select value={lotWarehouseId || "__none__"} onValueChange={(v) => setLotWarehouseId(v === "__none__" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Opcional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {warehouses.map((w) => (
                          <SelectItem key={w.id} value={String(w.id)}>
                            {w.name}
                            {w.code ? ` (${w.code})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="button" className="mt-3" size="sm" disabled={lotSaving} onClick={() => void submitLotReceipt()}>
                  {lotSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Registar entrada"}
                </Button>
              </details>
            ) : null}
            <div className="grid gap-2">
              <Label>Métodos de pagamento</Label>
              <div className="max-h-36 space-y-2 overflow-y-auto rounded-md border p-3">
                {paymentOpts.map((pm) => (
                  <label key={pm.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox checked={paymentSel.includes(pm.id)} onCheckedChange={(c) => togglePm(pm.id, c === true)} />
                    <span>{pm.name ?? `ID ${pm.id}`}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Descrição</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Tag</Label>
                <Input value={form.tag} onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Condição de pagamento</Label>
                <Input value={form.payment_condition} onChange={(e) => setForm((f) => ({ ...f, payment_condition: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>Peso</Label>
                <Input type="number" step="any" value={form.weight} onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Desconto</Label>
                <Input type="number" step="any" value={form.discount} onChange={(e) => setForm((f) => ({ ...f, discount: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Peso cúbico</Label>
                <Input type="number" step="any" value={form.cubic_weight} onChange={(e) => setForm((f) => ({ ...f, cubic_weight: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="text-muted-foreground">Textos complementares</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-1">
                  <Label className="text-xs">Sobre</Label>
                  <Textarea rows={2} value={form.about} onChange={(e) => setForm((f) => ({ ...f, about: e.target.value }))} />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Recomendação</Label>
                  <Textarea rows={2} value={form.recommendation} onChange={(e) => setForm((f) => ({ ...f, recommendation: e.target.value }))} />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Benefícios</Label>
                  <Textarea rows={2} value={form.benefits} onChange={(e) => setForm((f) => ({ ...f, benefits: e.target.value }))} />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Fórmula</Label>
                  <Textarea rows={2} value={form.formula} onChange={(e) => setForm((f) => ({ ...f, formula: e.target.value }))} />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Modo de aplicação</Label>
                  <Textarea rows={2} value={form.application_mode} onChange={(e) => setForm((f) => ({ ...f, application_mode: e.target.value }))} />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Dosagem</Label>
                  <Textarea rows={2} value={form.dosage} onChange={(e) => setForm((f) => ({ ...f, dosage: e.target.value }))} />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Falta / ruptura</Label>
                  <Input value={form.lack} onChange={(e) => setForm((f) => ({ ...f, lack: e.target.value }))} />
                </div>
                <div className="grid gap-1 sm:col-span-2">
                  <Label className="text-xs">Outras informações</Label>
                  <Textarea rows={2} value={form.other_information} onChange={(e) => setForm((f) => ({ ...f, other_information: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Vídeo (URL)</Label>
              <Input value={form.video} onChange={(e) => setForm((f) => ({ ...f, video: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
