"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { apiService } from "@/lib/api"
import { laravelInnerData } from "@/lib/laravel-data"
import { useGplacePermissions } from "@/lib/use-gplace-permissions"
import { AccessDenied } from "@/components/ui/access-denied"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Layers,
  Loader2,
  Package,
  ScrollText,
  Pencil,
  Plus,
  Ruler,
  Search,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { formatMoneyCentsMask, formatPtBrMoney, numMoney } from "@/lib/money-cents-mask"
import { cn } from "@/lib/utils"

type Paginator<T> = { data: T[]; current_page: number; last_page: number; total: number; per_page?: number }

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

const BRAND_SUGGEST_LIMIT = 25

type ProductCommercialNameSuggestRow = {
  id: number
  commercial_name: string
  reference: string
  sku: string
}

/** Filtro por nome (substring), alinhado ao padrão do Monitor Operacional (Apollo). */
function filterBrandsForPicker(
  brands: Array<{ id: number; name: string }>,
  query: string,
  limit = BRAND_SUGGEST_LIMIT,
): Array<{ id: number; name: string }> {
  const t = query.trim().toLowerCase()
  if (!t) return brands.slice(0, limit)
  return brands.filter((b) => b.name.toLowerCase().includes(t)).slice(0, limit)
}

/** Nome exacto (ignorando maiúsculas) ou uma única correspondência com ≥2 caracteres → id; senão vazio. */
function resolveBrandIdFromTypedQuery(
  query: string,
  brands: Array<{ id: number; name: string }>,
): string {
  const t = query.trim().toLowerCase()
  if (!t) return ""
  const exact = brands.find((b) => b.name.trim().toLowerCase() === t)
  if (exact) return String(exact.id)
  const matches = brands.filter((b) => b.name.toLowerCase().includes(t))
  if (matches.length === 1 && t.length >= 2) return String(matches[0].id)
  return ""
}

type Meta = {
  sections: Array<{ id: number; name: string; parent_id?: number | null }>
  measurement_units: Array<{ id: number; name: string; initials?: string }>
  families: Array<{ id: number; name: string }>
  presentations: Array<{ id: number; name: string }>
}

const EMPTY_PRODUCT_META: Meta = {
  sections: [],
  measurement_units: [],
  families: [],
  presentations: [],
}

/** Passos alinhados ao fluxo «Novo utilizador» do Apollo (stepper + cartão + Voltar/Próximo). */
const PRODUCT_WIZARD_STEPS = [
  { id: 1, title: "Identificação", sub: "Referência, descrição do produto/serviço e tipo" },
  { id: 2, title: "Dados fiscais", sub: "NF-e, NCM e tributação de referência" },
  { id: 3, title: "Catálogo", sub: "Secção, marca, unidade de medida" },
  { id: 4, title: "Preços e estoque", sub: "Valores na nota, venda, promoção e quantidades" },
  { id: 5, title: "Conteúdo e revisão", sub: "Textos e confirmar" },
] as const

const PRODUCT_WIZARD_STEP_ICONS = [Package, ScrollText, Layers, Ruler, FileText] as const

function num(v: string): number {
  const n = parseFloat(String(v).replace(",", "."))
  return Number.isFinite(n) ? n : 0
}

function intQty(v: string): number {
  const n = parseInt(String(v).trim(), 10)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

/** Apenas dígitos; vazio → null (payload fiscal). */
function fiscalDigitsOrNull(v: string): string | null {
  const d = String(v).replace(/\D/g, "")
  return d.length > 0 ? d : null
}

function ProdutosListSkeleton({ rowCount = 8 }: { rowCount?: number }) {
  const rows = Array.from({ length: rowCount })
  return (
    <Card className="w-full overflow-hidden p-0" aria-busy="true" aria-label="A carregar listagem">
      <div className="hidden w-full overflow-x-auto md:block">
        <div className="min-w-max">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[64px]">ID</TableHead>
                <TableHead className="min-w-[180px]">Nome</TableHead>
                <TableHead className="min-w-[100px]">SKU</TableHead>
                <TableHead className="min-w-[120px]">Marca</TableHead>
                <TableHead className="min-w-[120px]">Secção</TableHead>
                <TableHead className="min-w-[100px] text-right">Preço venda</TableHead>
                <TableHead className="min-w-[80px] text-right">Estoque</TableHead>
                <TableHead className="min-w-[64px] text-right">Mín.</TableHead>
                <TableHead className="min-w-[72px]">Activo</TableHead>
                <TableHead className="min-w-[128px] text-right">Acções</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="py-3">
                    <Skeleton className="h-4 w-8" />
                  </TableCell>
                  <TableCell className="py-3">
                    <Skeleton className="h-4 w-[140px] max-w-full" />
                  </TableCell>
                  <TableCell className="py-3">
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell className="py-3">
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell className="py-3">
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell className="py-3 text-right">
                    <Skeleton className="ml-auto h-4 w-16" />
                  </TableCell>
                  <TableCell className="py-3 text-right">
                    <Skeleton className="ml-auto h-4 w-10" />
                  </TableCell>
                  <TableCell className="py-3 text-right">
                    <Skeleton className="ml-auto h-4 w-8" />
                  </TableCell>
                  <TableCell className="py-3">
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </TableCell>
                  <TableCell className="py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Skeleton className="h-7 w-7 rounded-md" />
                      <Skeleton className="h-7 w-7 rounded-md" />
                      <Skeleton className="h-7 w-7 rounded-md" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="space-y-4 p-4 md:hidden">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="p-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-5 w-[85%]" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-5 w-14 shrink-0 rounded-full" />
              </div>
              <div className="space-y-2 border-t pt-3">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/5" />
              </div>
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          </Card>
        ))}
      </div>
      <div className="flex w-full flex-col gap-3 border-t p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-20" />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Skeleton className="h-9 w-16" />
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-16" />
        </div>
      </div>
    </Card>
  )
}

export default function AdminProdutosPage() {
  const { can } = useGplacePermissions()
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [searchInput, setSearchInput] = useState("")
  const [effectiveSearch, setEffectiveSearch] = useState("")
  const [paginator, setPaginator] = useState<Paginator<Record<string, unknown>> | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<{ id: number; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  /** Garante rótulos correctos no sheet antes de qualquer await (ex.: «Descrição» em novo produto). */
  const [productDialogMode, setProductDialogMode] = useState<"create" | "edit" | "view">("create")
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

  const [brandQuickOpen, setBrandQuickOpen] = useState(false)
  /** Campo de marca com busca (padrão Monitor Operacional Apollo: input + lista em portal). */
  const [brandSearch, setBrandSearch] = useState("")
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false)
  const brandFieldWrapRef = useRef<HTMLDivElement>(null)
  const [brandMenuRect, setBrandMenuRect] = useState({ top: 0, left: 0, width: 0 })
  /** Nome comercial / descrição: sugestões de produtos já cadastrados (API + portal). */
  const [showCommercialNameSuggestions, setShowCommercialNameSuggestions] = useState(false)
  const commercialNameFieldWrapRef = useRef<HTMLDivElement>(null)
  const [commercialNameMenuRect, setCommercialNameMenuRect] = useState({ top: 0, left: 0, width: 0 })
  const [commercialNameSuggestions, setCommercialNameSuggestions] = useState<ProductCommercialNameSuggestRow[]>([])
  const [commercialNameSuggestLoading, setCommercialNameSuggestLoading] = useState(false)
  /** `window.setTimeout` devolve `number` no DOM; evita conflito com `NodeJS.Timeout` no build Next/Vercel. */
  const commercialSuggestDebounceRef = useRef<number | null>(null)
  const commercialSuggestReqId = useRef(0)
  const [umQuickOpen, setUmQuickOpen] = useState(false)
  const [newBrandName, setNewBrandName] = useState("")
  const [newBrandPublic, setNewBrandPublic] = useState(true)
  const [newBrandSaving, setNewBrandSaving] = useState(false)
  const [newUmName, setNewUmName] = useState("")
  const [newUmInitials, setNewUmInitials] = useState("")
  const [newUmSaving, setNewUmSaving] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)

  const [form, setForm] = useState({
    reference: "",
    commercial_name: "",
    description_reference: "",
    description: "",
    um_id: "",
    tag: "",
    price: formatPtBrMoney(0),
    promotion_price: formatPtBrMoney(0),
    invoice_price: formatPtBrMoney(0),
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
    origin: "0",
    ncm: "",
    cest: "",
    cfop_default: "",
    csosn_default: "",
    cst_icms_default: "",
    nf_number: "",
    quantity: "0",
    min_stock: "",
    stock_change_note: "",
  })

  useEffect(() => {
    const t = window.setTimeout(() => setEffectiveSearch(searchInput.trim()), 400)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const filteredBrandsForMenu = useMemo(
    () => filterBrandsForPicker(brands, brandSearch),
    [brands, brandSearch],
  )

  const updateBrandMenuPosition = useCallback(() => {
    const el = brandFieldWrapRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setBrandMenuRect({
      top: r.bottom + 4,
      left: r.left,
      width: Math.max(r.width, 220),
    })
  }, [])

  useLayoutEffect(() => {
    if (!showBrandSuggestions || !dialogOpen || wizardStep !== 3) return
    updateBrandMenuPosition()
  }, [
    showBrandSuggestions,
    dialogOpen,
    wizardStep,
    brandSearch,
    filteredBrandsForMenu.length,
    updateBrandMenuPosition,
  ])

  useEffect(() => {
    if (!showBrandSuggestions || !dialogOpen || wizardStep !== 3) return
    const onScrollOrResize = () => updateBrandMenuPosition()
    window.addEventListener("scroll", onScrollOrResize, true)
    window.addEventListener("resize", onScrollOrResize)
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true)
      window.removeEventListener("resize", onScrollOrResize)
    }
  }, [showBrandSuggestions, dialogOpen, wizardStep, updateBrandMenuPosition])

  const updateCommercialNameMenuPosition = useCallback(() => {
    const el = commercialNameFieldWrapRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setCommercialNameMenuRect({
      top: r.bottom + 4,
      left: r.left,
      width: Math.max(r.width, 220),
    })
  }, [])

  useLayoutEffect(() => {
    if (!showCommercialNameSuggestions || !dialogOpen || wizardStep !== 1) return
    updateCommercialNameMenuPosition()
  }, [
    showCommercialNameSuggestions,
    dialogOpen,
    wizardStep,
    form.commercial_name,
    commercialNameSuggestions.length,
    commercialNameSuggestLoading,
    updateCommercialNameMenuPosition,
  ])

  useEffect(() => {
    if (!showCommercialNameSuggestions || !dialogOpen || wizardStep !== 1) return
    const onScrollOrResize = () => updateCommercialNameMenuPosition()
    window.addEventListener("scroll", onScrollOrResize, true)
    window.addEventListener("resize", onScrollOrResize)
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true)
      window.removeEventListener("resize", onScrollOrResize)
    }
  }, [showCommercialNameSuggestions, dialogOpen, wizardStep, updateCommercialNameMenuPosition])

  useEffect(() => {
    if (!dialogOpen || wizardStep !== 1) {
      setCommercialNameSuggestions([])
      setCommercialNameSuggestLoading(false)
      return
    }
    const q = form.commercial_name.trim()
    if (q.length < 2) {
      setCommercialNameSuggestions([])
      setCommercialNameSuggestLoading(false)
      return
    }
    if (commercialSuggestDebounceRef.current) window.clearTimeout(commercialSuggestDebounceRef.current)
    commercialSuggestDebounceRef.current = window.setTimeout(() => {
      commercialSuggestDebounceRef.current = null
      const reqId = ++commercialSuggestReqId.current
      setCommercialNameSuggestLoading(true)
      void (async () => {
        try {
          const raw = await apiService.getAdminProducts({
            search: q,
            per_page: 15,
            page: 1,
          })
          if (commercialSuggestReqId.current !== reqId) return
          const inner = laravelInnerData<Paginator<Record<string, unknown>>>(raw)
          const rows = (inner?.data ?? [])
            .map((r) => ({
              id: Number(r.id),
              commercial_name: String(r.commercial_name ?? ""),
              reference: String(r.reference ?? ""),
              sku: String(r.sku ?? ""),
            }))
            .filter((r) => Number.isFinite(r.id) && (editingId == null || r.id !== editingId))
          setCommercialNameSuggestions(rows)
        } catch {
          if (commercialSuggestReqId.current === reqId) setCommercialNameSuggestions([])
        } finally {
          if (commercialSuggestReqId.current === reqId) setCommercialNameSuggestLoading(false)
        }
      })()
    }, 320)
    return () => {
      if (commercialSuggestDebounceRef.current) {
        window.clearTimeout(commercialSuggestDebounceRef.current)
        commercialSuggestDebounceRef.current = null
      }
    }
  }, [form.commercial_name, dialogOpen, wizardStep, editingId])

  useEffect(() => {
    setPage(1)
  }, [effectiveSearch, perPage])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await apiService.getAdminProducts({
        page,
        per_page: perPage,
        search: effectiveSearch || undefined,
      })
      const inner = laravelInnerData<Paginator<Record<string, unknown>>>(raw)
      setPaginator(inner)
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar produtos.")
    } finally {
      setLoading(false)
    }
  }, [page, perPage, effectiveSearch])

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
    const settled = await Promise.allSettled([
      apiService.getAdminProductFormMeta(),
      apiService.getAdminBrands(),
      apiService.getPaymentMethods(),
    ])

    const mRaw = settled[0].status === "fulfilled" ? settled[0].value : null
    const bRaw = settled[1].status === "fulfilled" ? settled[1].value : null
    const pRaw = settled[2].status === "fulfilled" ? settled[2].value : null

    const m = mRaw ? laravelInnerData<Meta>(mRaw) : EMPTY_PRODUCT_META
    const b = bRaw ? laravelInnerData<Array<{ id: number; name: string }>>(bRaw) : []
    const p = pRaw ? laravelInnerData<Array<{ id: number; name?: string }>>(pRaw) : []
    const brandsList = Array.isArray(b) ? b : []
    const paymentList = Array.isArray(p) ? p : []

    setMeta(m)
    setBrands(brandsList)
    setPaymentOpts(paymentList)

    if (settled[0].status === "rejected") {
      console.error(settled[0].reason)
      toast.error("Não foi possível carregar secções / unidades de medida / famílias.")
    }
    if (settled[1].status === "rejected") {
      console.error(settled[1].reason)
      toast.error("Não foi possível carregar marcas.")
    }
    if (settled[2].status === "rejected") {
      console.error(settled[2].reason)
      toast.error("Não foi possível carregar formas de pagamento.")
    }

    return { meta: m, brands: brandsList, paymentOpts: paymentList }
  }

  const submitQuickBrand = async () => {
    const n = newBrandName.trim()
    if (n.length < 3) {
      toast.error("Nome da marca: mínimo 3 caracteres.")
      return
    }
    setNewBrandSaving(true)
    try {
      const raw = await apiService.createAdminBrand({
        name: n,
        is_enabled: true,
        is_public: newBrandPublic,
      })
      const created = laravelInnerData<{ id: number; name: string }>(raw)
      setBrands((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name, "pt")))
      setForm((f) => ({ ...f, brand_id: String(created.id) }))
      setBrandSearch(created.name)
      setShowBrandSuggestions(false)
      setBrandQuickOpen(false)
      setNewBrandName("")
      toast.success("Marca criada.")
    } catch (e) {
      console.error(e)
      toast.error("Não foi possível criar a marca.")
    } finally {
      setNewBrandSaving(false)
    }
  }

  const submitQuickUm = async () => {
    const name = newUmName.trim()
    const ini = newUmInitials.trim().toUpperCase()
    if (!name) {
      toast.error("Indique o nome da unidade de medida.")
      return
    }
    if (!ini || ini.length > 4) {
      toast.error("Sigla (iniciais): 1 a 4 caracteres.")
      return
    }
    setNewUmSaving(true)
    try {
      const raw = await apiService.createAdminMeasurementUnit({
        name,
        initials: ini,
        is_enabled: true,
      })
      const created = laravelInnerData<{ id: number; name: string; initials?: string }>(raw)
      setMeta((prev) => {
        const base = prev ?? EMPTY_PRODUCT_META
        const units = [...(base.measurement_units ?? []), created].sort((a, b) =>
          a.name.localeCompare(b.name, "pt"),
        )
        return { ...base, measurement_units: units }
      })
      setForm((f) => ({ ...f, um_id: String(created.id) }))
      setUmQuickOpen(false)
      setNewUmName("")
      setNewUmInitials("")
      toast.success("Unidade de medida criada.")
    } catch (e) {
      console.error(e)
      toast.error("Não foi possível criar a unidade de medida.")
    } finally {
      setNewUmSaving(false)
    }
  }

  const openCreate = async () => {
    setProductDialogMode("create")
    setEditingId(null)
    setBrandSearch("")
    setShowBrandSuggestions(false)
    setShowCommercialNameSuggestions(false)
    setCommercialNameSuggestions([])
    setPaymentSel([])
    setExtraSections([])
    setForm({
      reference: "",
      commercial_name: "",
      description_reference: "",
      description: "",
      um_id: "",
      tag: "",
      price: formatPtBrMoney(0),
      promotion_price: formatPtBrMoney(0),
      invoice_price: formatPtBrMoney(0),
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
      origin: "0",
      ncm: "",
      cest: "",
      cfop_default: "",
      csosn_default: "",
      cst_icms_default: "",
      nf_number: "",
      quantity: "0",
      min_stock: "",
      stock_change_note: "",
    })
    setMovements(null)
    setWizardStep(1)
    const { meta: m } = await loadAux()
    setForm((prev) => ({
      ...prev,
      um_id: m.measurement_units?.length ? String(m.measurement_units[0].id) : prev.um_id,
      section_id: m.sections?.length ? String(m.sections[0].id) : prev.section_id,
    }))
    /** Só abrir o sheet depois de meta/marcas — evita guardar com brand_id ainda vazio antes do segundo setForm. */
    setDialogOpen(true)
  }

  const openEdit = async (row: Record<string, unknown>, mode: "edit" | "view" = "edit") => {
    const id = Number(row.id)
    setProductDialogMode(mode)
    setEditingId(id)
    setShowCommercialNameSuggestions(false)
    setCommercialNameSuggestions([])
    try {
      const { brands: brandsLoaded } = await loadAux()
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
        price: formatPtBrMoney(Number(d.price ?? 0)),
        promotion_price: formatPtBrMoney(Number(d.promotion_price ?? 0)),
        invoice_price: formatPtBrMoney(
          d.invoice_price != null && d.invoice_price !== "" ? Number(d.invoice_price) : 0,
        ),
        discount: d.discount != null ? String(d.discount) : "",
        payment_condition: String(d.payment_condition ?? ""),
        weight: d.weight != null ? String(d.weight) : "",
        width: String(d.width ?? "1"),
        height: String(d.height ?? "1"),
        length: String(d.length ?? "1"),
        cubic_weight: d.cubic_weight != null ? String(d.cubic_weight) : "",
        brand_id: d.brand_id != null && d.brand_id !== "" ? String(d.brand_id) : "",
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
        origin: String(d.origin ?? "0"),
        ncm: String(d.ncm ?? "")
          .replace(/\D/g, "")
          .slice(0, 8),
        cest: String(d.cest ?? ""),
        cfop_default: String(d.cfop_default ?? ""),
        csosn_default: String(d.csosn_default ?? ""),
        cst_icms_default: String(d.cst_icms_default ?? ""),
        nf_number: String(d.nf_number ?? ""),
        quantity: d.quantity != null ? String(Math.max(0, Math.floor(Number(d.quantity)))) : "0",
        min_stock: d.min_stock != null ? String(Math.max(0, Math.floor(Number(d.min_stock)))) : "",
        stock_change_note: "",
      })
      {
        const bid = d.brand_id != null && d.brand_id !== "" ? String(d.brand_id) : ""
        const nm = bid ? brandsLoaded.find((x) => String(x.id) === bid)?.name ?? "" : ""
        setBrandSearch(nm)
      }
      setShowBrandSuggestions(false)
      setLotQty("1")
      setLotDoc("")
      setLotWarehouseId("")
      void loadMovements(id)
      setWizardStep(1)
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
    const primary = form.section_id.trim() === "" ? null : Number(form.section_id)
    if (primary != null && !Number.isNaN(primary) && id === primary) return
    setExtraSections((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)))
  }

  const save = async () => {
    if (productDialogMode === "view") return
    const primary = form.section_id.trim() === "" ? null : Number(form.section_id)
    const sectionIds =
      primary != null && !Number.isNaN(primary) ? Array.from(new Set([primary, ...extraSections])) : [...extraSections]

    const brandTrim = form.brand_id.trim()
    const brandParsed = parseInt(brandTrim, 10)
    const brandId =
      brandTrim === "" || !Number.isFinite(brandParsed) || brandParsed < 1 ? null : brandParsed

    const umId = parseInt(String(form.um_id).trim(), 10)
    if (!Number.isFinite(umId) || umId < 1) {
      toast.error("Seleccione uma unidade de medida no passo «Catálogo».")
      return
    }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        video: form.video.trim() || null,
        reference: form.reference.trim(),
        origin: Number(form.origin),
        ncm: fiscalDigitsOrNull(form.ncm),
        cest: fiscalDigitsOrNull(form.cest),
        cfop_default: fiscalDigitsOrNull(form.cfop_default),
        csosn_default: fiscalDigitsOrNull(form.csosn_default),
        cst_icms_default: fiscalDigitsOrNull(form.cst_icms_default),
        nf_number: form.nf_number.trim() || null,
        commercial_name: form.commercial_name.trim(),
        description_reference: form.description_reference.trim() || null,
        description: form.description.trim() || null,
        um_id: umId,
        tag: form.tag.trim() || null,
        price: numMoney(form.price),
        promotion_price: numMoney(form.promotion_price),
        invoice_price: numMoney(form.invoice_price) === 0 ? null : numMoney(form.invoice_price),
        discount: form.discount.trim() ? num(form.discount) : null,
        payment_condition: form.payment_condition.trim() || null,
        weight: form.weight.trim() ? num(form.weight) : null,
        width: num(form.width),
        height: num(form.height),
        length: num(form.length),
        cubic_weight: form.cubic_weight.trim() ? num(form.cubic_weight) : null,
        brand_id: brandId,
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
        section_id: primary != null && !Number.isNaN(primary) ? primary : null,
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
    } catch (e: unknown) {
      console.error(e)
      const err = e as {
        response?: {
          data?: { message?: unknown; errors?: Record<string, string[] | string> }
          status?: number
        }
      }
      const raw = err.response?.data?.message
      const errors = err.response?.data?.errors
      let firstField: string | undefined
      if (errors && typeof errors === "object") {
        const key = Object.keys(errors)[0]
        const val = key ? errors[key] : undefined
        if (Array.isArray(val) && val[0]) firstField = String(val[0])
        else if (typeof val === "string") firstField = val
      }
      const msg =
        firstField && firstField.trim()
          ? firstField.trim()
          : typeof raw === "string" && raw.trim()
            ? raw.trim()
            : err.response?.status === 403
              ? "Sem permissão ou cabeçalho «app» inválido. Confirme NEXT_PUBLIC_APP_TOKEN e permissões."
              : "Erro ao guardar."
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClick = (row: Record<string, unknown>) => {
    setProductToDelete({ id: Number(row.id), name: String(row.commercial_name ?? "") })
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return
    setDeleting(true)
    try {
      await apiService.deleteAdminProduct(productToDelete.id)
      toast.success("Produto removido.")
      setDeleteDialogOpen(false)
      setProductToDelete(null)
      void load()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      const msg = err.response?.data?.message
      toast.error(typeof msg === "string" ? msg : "Não foi possível eliminar.")
    } finally {
      setDeleting(false)
    }
  }

  if (!can("products_view")) {
    return <AccessDenied />
  }

  const sheetReadOnly = productDialogMode === "view"

  const brandSuggestionsPortal =
    !sheetReadOnly &&
    showBrandSuggestions &&
    dialogOpen &&
    wizardStep === 3 &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        role="listbox"
        aria-label="Sugestões de marca"
        className="fixed z-[200] overflow-y-auto overscroll-contain rounded-md border border-border bg-popover text-popover-foreground shadow-xl"
        style={{
          top: brandMenuRect.top,
          left: brandMenuRect.left,
          width: brandMenuRect.width,
          maxHeight: "min(50vh, 320px)",
        }}
      >
        <button
          type="button"
          className="flex h-auto min-h-0 w-full items-start justify-start break-words px-3 py-2.5 text-left text-sm text-popover-foreground hover:bg-muted whitespace-normal"
          onMouseDown={(e) => {
            e.preventDefault()
            setForm((f) => ({ ...f, brand_id: "" }))
            setBrandSearch("")
            setShowBrandSuggestions(false)
          }}
        >
          — Nenhuma —
        </button>
        {filteredBrandsForMenu.map((b) => (
          <button
            key={b.id}
            type="button"
            className="flex h-auto min-h-0 w-full items-start justify-start break-words border-t border-border/60 px-3 py-2.5 text-left text-sm text-popover-foreground hover:bg-muted whitespace-normal"
            onMouseDown={(e) => {
              e.preventDefault()
              setForm((f) => ({ ...f, brand_id: String(b.id) }))
              setBrandSearch(b.name)
              setShowBrandSuggestions(false)
            }}
          >
            {b.name}
          </button>
        ))}
        {brandSearch.trim() !== "" && filteredBrandsForMenu.length === 0 ? (
          <div className="border-t border-border/60 px-3 py-2.5 text-sm text-muted-foreground">
            Nenhuma marca encontrada. Use «Nova marca» para criar.
          </div>
        ) : null}
      </div>,
      document.body,
    )

  const commercialNameQueryOk = form.commercial_name.trim().length >= 2
  const commercialNameSuggestionsPortal =
    !sheetReadOnly &&
    showCommercialNameSuggestions &&
    commercialNameQueryOk &&
    dialogOpen &&
    wizardStep === 1 &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        role="listbox"
        aria-label="Produtos com nome semelhante"
        className="fixed z-[200] overflow-y-auto overscroll-contain rounded-md border border-border bg-popover text-popover-foreground shadow-xl"
        style={{
          top: commercialNameMenuRect.top,
          left: commercialNameMenuRect.left,
          width: commercialNameMenuRect.width,
          maxHeight: "min(50vh, 320px)",
        }}
      >
        {commercialNameSuggestLoading ? (
          <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            A procurar…
          </div>
        ) : null}
        {!commercialNameSuggestLoading && commercialNameSuggestions.length === 0 ? (
          <div className="px-3 py-2.5 text-sm text-muted-foreground">Nenhum produto encontrado com esse nome.</div>
        ) : null}
        {commercialNameSuggestions.map((p, idx) => {
          const sub = [p.reference.trim() ? `Ref. ${p.reference}` : "", p.sku.trim() ? `SKU ${p.sku}` : ""]
            .filter(Boolean)
            .join(" · ")
          return (
            <button
              key={p.id}
              type="button"
              className={cn(
                "flex h-auto min-h-0 w-full flex-col items-start justify-start gap-0.5 break-words px-3 py-2.5 text-left hover:bg-muted",
                idx > 0 || commercialNameSuggestLoading ? "border-t border-border/60" : "",
              )}
              onMouseDown={(e) => {
                e.preventDefault()
                setForm((f) => ({ ...f, commercial_name: p.commercial_name }))
                setShowCommercialNameSuggestions(false)
              }}
            >
              <span className="text-sm font-medium text-popover-foreground">{p.commercial_name}</span>
              {sub ? <span className="text-xs text-muted-foreground">{sub}</span> : null}
            </button>
          )
        })}
      </div>,
      document.body,
    )

  const rows = paginator?.data ?? []
  const listTotal = paginator?.total ?? 0
  const totalPages = Math.max(1, paginator?.last_page ?? 1)
  const showingFrom = rows.length > 0 ? (page - 1) * perPage + 1 : 0
  const showingTo = rows.length > 0 ? Math.min(page * perPage, listTotal) : 0
  const hasFilters = effectiveSearch.length > 0

  const primarySection = form.section_id.trim() === "" ? null : Number(form.section_id)

  const listSection = (() => {
    if (loading) {
      return <ProdutosListSkeleton rowCount={Math.min(perPage, 10)} />
    }
    if (rows.length === 0) {
      return (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            {hasFilters
              ? "Nenhum produto encontrado com os filtros aplicados."
              : 'Nenhum produto nesta listagem. Clique em "Novo produto" para começar.'}
          </p>
        </Card>
      )
    }
    return (
      <Card className="w-full overflow-hidden p-0">
        <div className="hidden w-full overflow-x-auto md:block">
          <div className="min-w-max">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[64px]">ID</TableHead>
                  <TableHead className="min-w-[180px]">Nome</TableHead>
                  <TableHead className="min-w-[100px]">SKU</TableHead>
                  <TableHead className="min-w-[120px]">Marca</TableHead>
                  <TableHead className="min-w-[120px]">Secção</TableHead>
                  <TableHead className="min-w-[104px] text-right">Preço venda</TableHead>
                  <TableHead className="min-w-[88px] text-right">Estoque</TableHead>
                  <TableHead className="min-w-[64px] text-right">Mín.</TableHead>
                  <TableHead className="min-w-[72px]">Activo</TableHead>
                  <TableHead className="min-w-[128px] text-right">Acções</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const enabled = row.is_enabled === true || row.is_enabled === 1 || row.is_enabled === "1"
                  return (
                    <TableRow key={String(row.id)}>
                      <TableCell className="py-2 tabular-nums text-muted-foreground">{String(row.id)}</TableCell>
                      <TableCell className="py-2">
                        <span className="text-sm font-semibold text-foreground">{String(row.commercial_name ?? "")}</span>
                      </TableCell>
                      <TableCell className="py-2 text-sm text-muted-foreground">{String(row.sku ?? "")}</TableCell>
                      <TableCell className="py-2 text-sm">{String(row.brand ?? "")}</TableCell>
                      <TableCell className="py-2 text-sm text-muted-foreground">{String(row.section ?? "")}</TableCell>
                      <TableCell className="py-2 text-right text-sm font-medium tabular-nums text-foreground">
                        {formatPtBrMoney(Number(row.price ?? 0))}
                      </TableCell>
                      <TableCell className="py-2 text-right tabular-nums">
                        <span className="inline-flex items-center justify-end gap-2">
                          {row.quantity != null ? String(Math.floor(Number(row.quantity))) : "—"}
                          {isLowStock(row) ? (
                            <Badge variant="destructive" className="text-[10px] uppercase">
                              Baixo
                            </Badge>
                          ) : null}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 text-right text-muted-foreground tabular-nums text-sm">
                        {row.min_stock != null && row.min_stock !== "" ? String(Math.floor(Number(row.min_stock))) : "—"}
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge variant={enabled ? "secondary" : "outline"} className="text-[11px]">
                          {enabled ? "Sim" : "Não"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 hover:bg-sky-50 hover:text-sky-800"
                            onClick={() => void openEdit(row, "view")}
                            title="Visualizar"
                            aria-label="Visualizar produto"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 hover:bg-yellow-50 hover:text-yellow-800"
                            onClick={() => void openEdit(row)}
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 hover:bg-red-50 hover:text-red-600"
                            title="Eliminar"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteClick(row)
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="space-y-4 p-4 md:hidden">
          {rows.map((row) => {
            const enabled = row.is_enabled === true || row.is_enabled === 1 || row.is_enabled === "1"
            return (
              <Card key={String(row.id)} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <h3 className="truncate font-semibold text-foreground">{String(row.commercial_name ?? "")}</h3>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">ID {String(row.id)}</p>
                    </div>
                    <Badge variant={enabled ? "secondary" : "outline"} className="shrink-0 text-[10px]">
                      {enabled ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <dl className="grid grid-cols-[minmax(0,auto)_1fr] gap-x-3 gap-y-2 border-t pt-3 text-sm">
                    <dt className="text-xs text-muted-foreground">SKU</dt>
                    <dd className="m-0 text-muted-foreground">{String(row.sku ?? "—")}</dd>
                    <dt className="text-xs text-muted-foreground">Marca</dt>
                    <dd className="m-0 text-muted-foreground">{String(row.brand ?? "—")}</dd>
                    <dt className="text-xs text-muted-foreground">Secção</dt>
                    <dd className="m-0 text-muted-foreground">{String(row.section ?? "—")}</dd>
                    <dt className="text-xs text-muted-foreground">Preço venda</dt>
                    <dd className="m-0 font-medium tabular-nums text-foreground">
                      {formatPtBrMoney(Number(row.price ?? 0))}
                    </dd>
                    <dt className="text-xs text-muted-foreground">Estoque</dt>
                    <dd className="m-0 tabular-nums">
                      <span className="inline-flex items-center gap-2">
                        {row.quantity != null ? String(Math.floor(Number(row.quantity))) : "—"}
                        {isLowStock(row) ? (
                          <Badge variant="destructive" className="text-[10px] uppercase">
                            Baixo
                          </Badge>
                        ) : null}
                      </span>
                    </dd>
                  </dl>
                  <div className="flex flex-wrap gap-2 border-t pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-w-0 flex-1 basis-[100px] hover:bg-sky-50 hover:text-sky-800"
                      onClick={() => void openEdit(row, "view")}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Ver
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-w-0 flex-1 basis-[100px] hover:bg-yellow-50 hover:text-yellow-800"
                      onClick={() => void openEdit(row)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 hover:bg-red-50 hover:text-red-600"
                      onClick={() => handleDeleteClick(row)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        <div className="mt-0 flex w-full flex-col gap-3 border-t p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex shrink-0 items-center gap-2 self-start">
            <Label className="whitespace-nowrap text-xs">Itens por página:</Label>
            <Select
              value={String(perPage)}
              onValueChange={(v) => {
                setPerPage(parseInt(v, 10))
                setPage(1)
              }}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15</SelectItem>
                <SelectItem value="30">30</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 self-end sm:self-center">
            <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={page <= 1}>
              Primeira
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="whitespace-nowrap text-sm text-muted-foreground">
              Página <span className="font-medium text-foreground">{page}</span> de{" "}
              <span className="font-medium text-foreground">{totalPages}</span>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              aria-label="Próxima página"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(totalPages)} disabled={page >= totalPages}>
              Última
            </Button>
          </div>
        </div>
      </Card>
    )
  })()

  return (
    <div className="w-full min-w-0 overflow-x-hidden">
      <div className="mx-auto w-full max-w-none space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Produtos</h1>
            <p className="mt-1 text-muted-foreground">
              CRUD com meta <code className="text-xs">/admin/product-form-meta</code>. O saldo em estoque é{" "}
              <code className="text-xs">products.quantity</code>; vendas na loja online reduzem o saldo.
            </p>
            {loading ? (
              <div className="mt-2 space-y-2">
                <Skeleton className="h-3 w-72 max-w-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
            ) : (
              <>
                {paginator != null && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {listTotal === 0
                      ? "Nenhum produto nesta listagem."
                      : `Mostrando ${showingFrom}-${showingTo} de ${listTotal.toLocaleString("pt-BR")} produto(s)`}
                  </p>
                )}
                {listTotal > 0 && (
                  <div className="mt-1">
                    <Badge variant="secondary" className="text-[11px]">
                      Total: {listTotal.toLocaleString("pt-BR")}
                    </Badge>
                  </div>
                )}
              </>
            )}
          </div>
          <Button onClick={() => void openCreate()} className="gap-2 self-start sm:self-auto">
            <Plus className="h-4 w-4" />
            Novo produto
          </Button>
        </div>

        <Card className="p-4 sm:p-5">
          <div className="flex flex-wrap items-end gap-x-5 gap-y-4">
            <div className="min-w-0 w-full max-w-full sm:min-w-[220px] sm:max-w-md lg:max-w-xl">
              <Label htmlFor="search-products" className="mb-1.5 block text-xs text-muted-foreground">
                Busca
              </Label>
              {loading && paginator === null ? (
                <Skeleton className="h-9 w-full rounded-md" />
              ) : (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="search-products"
                    placeholder="Descrição (nome comercial), SKU…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="h-9 w-full pl-10"
                  />
                </div>
              )}
            </div>
          </div>
        </Card>

        {listSection}

        <Sheet
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) {
              setWizardStep(1)
              setProductDialogMode("create")
              setShowBrandSuggestions(false)
              setBrandSearch("")
              setShowCommercialNameSuggestions(false)
              setCommercialNameSuggestions([])
              setCommercialNameSuggestLoading(false)
            }
          }}
        >
          <SheetContent className="flex h-full max-h-[100dvh] flex-col p-0 !max-w-3xl">
            <div className="flex h-full min-h-0 flex-col">
              <SheetHeader className="space-y-1 border-b px-6 pb-4 pt-6 text-left">
                <SheetTitle>
                  {productDialogMode === "view" && editingId
                    ? `Ver produto #${editingId}`
                    : editingId
                      ? `Editar produto #${editingId}`
                      : "Novo produto"}
                </SheetTitle>
                <SheetDescription>
                  {productDialogMode === "view"
                    ? `Apenas leitura. Navegue pelas etapas para consultar os dados. ${PRODUCT_WIZARD_STEPS[wizardStep - 1]?.sub} — Etapa ${wizardStep} de ${PRODUCT_WIZARD_STEPS.length}`
                    : `${PRODUCT_WIZARD_STEPS[wizardStep - 1]?.sub} — Etapa ${wizardStep} de ${PRODUCT_WIZARD_STEPS.length}`}
                </SheetDescription>
              </SheetHeader>

              <div className="relative border-b bg-muted/30 px-4 py-4 sm:px-6">
                <div className="absolute left-4 right-4 top-[2.1rem] z-0 hidden h-0.5 bg-border sm:left-8 sm:right-8 sm:block" />
                <div className="relative z-10 grid grid-cols-5 gap-1 sm:gap-2">
                  {PRODUCT_WIZARD_STEPS.map((s, idx) => {
                    const n = idx + 1
                    const done = wizardStep > n
                    const active = wizardStep === n
                    const StepIco = PRODUCT_WIZARD_STEP_ICONS[idx]
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setWizardStep(n)}
                        className={cn(
                          "flex flex-col items-center rounded-md p-1 text-center outline-none transition-colors hover:bg-background/60 focus-visible:ring-2 focus-visible:ring-ring",
                        )}
                      >
                        <div
                          className={cn(
                            "mb-1 flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-semibold sm:mb-2 sm:h-10 sm:w-10 sm:text-sm",
                            done
                              ? "border-primary bg-primary text-primary-foreground"
                              : active
                                ? "border-primary bg-background text-primary"
                                : "border-muted-foreground/25 bg-background text-muted-foreground",
                          )}
                        >
                          {done ? (
                            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                          ) : (
                            <StepIco className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          )}
                        </div>
                        <p className={cn("line-clamp-2 text-[10px] font-medium leading-tight sm:text-xs", active && "text-primary")}>
                          {s.title}
                        </p>
                        <p className="text-[9px] text-muted-foreground sm:text-[10px]">Etapa {n}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <fieldset
                disabled={sheetReadOnly}
                className="min-h-0 flex-1 min-w-0 border-0 p-0 disabled:opacity-100"
              >
                <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-6 py-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{PRODUCT_WIZARD_STEPS[wizardStep - 1]?.title}</CardTitle>
                    <CardDescription>
                      {wizardStep === 5
                        ? sheetReadOnly
                          ? "Resumo dos dados do produto."
                          : "Revise o resumo e complete textos e opções finais antes de guardar."
                        : sheetReadOnly
                          ? "Consulte as informações; use as etapas em cima ou «Voltar» / «Próximo»."
                          : "Navegue livremente: toque nas etapas acima, em «Voltar» / «Próximo» ou complete os campos quando quiser."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {wizardStep === 1 ? (
                      <>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="grid gap-2">
                            <Label>Referência</Label>
                <Input value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} disabled={editingId != null} />
              </div>
              <div className="grid gap-2">
                <Label>SKU</Label>
                <Input value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{productDialogMode === "create" ? "Descrição do Produto/Serviço" : "Nome comercial"}</Label>
              <div ref={commercialNameFieldWrapRef} className="min-w-0">
                <Input
                  value={form.commercial_name}
                  onChange={(e) => {
                    const v = e.target.value
                    setForm((f) => ({ ...f, commercial_name: v }))
                    setShowCommercialNameSuggestions(v.trim().length >= 2)
                  }}
                  onFocus={() => {
                    setShowCommercialNameSuggestions(form.commercial_name.trim().length >= 2)
                  }}
                  onBlur={() => {
                    window.setTimeout(() => setShowCommercialNameSuggestions(false), 180)
                  }}
                  autoComplete="off"
                  placeholder="Comece a escrever para ver produtos já cadastrados…"
                  className="w-full"
                />
                {commercialNameSuggestionsPortal}
              </div>
            </div>
            <div className="grid gap-2 max-w-xs">
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
            </div>
                      </>
                    ) : null}
                    {wizardStep === 2 ? (
                      <>
                        <p className="text-xs text-muted-foreground">
                          Valores padrão do produto; a nota fiscal pode sobrescrever CFOP e tributos conforme a operação.
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="grid gap-2 sm:col-span-2">
                            <Label>Número da nota fiscal</Label>
                            <Input
                              value={form.nf_number}
                              onChange={(e) => setForm((f) => ({ ...f, nf_number: e.target.value }))}
                              placeholder="Opcional — ex.: n.º da NF de compra ou referência"
                              maxLength={20}
                            />
                          </div>
                          <div className="grid gap-2 sm:col-span-2">
                            <Label>Origem da mercadoria (NF-e)</Label>
                            <Select value={form.origin} onValueChange={(v) => setForm((f) => ({ ...f, origin: v }))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(
                                  [
                                    ["0", "0 — Nacional"],
                                    ["1", "1 — Estrangeira, importação directa"],
                                    ["2", "2 — Estrangeira, adquirida no mercado interno"],
                                    ["3", "3 — Nacional, mercadoria com conteúdo de importação superior a 40%"],
                                    ["4", "4 — Nacional, processos produtivos sem similares"],
                                    ["5", "5 — Nacional, mercadoria com conteúdo de importação inferior ou igual a 40%"],
                                    ["6", "6 — Estrangeira, importação directa, sem similar nacional"],
                                    ["7", "7 — Estrangeira, mercado interno, sem similar nacional"],
                                    ["8", "8 — Nacional, mercadoria com conteúdo de importação superior a 70%"],
                                  ] as const
                                ).map(([val, lab]) => (
                                  <SelectItem key={val} value={val}>
                                    {lab}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="grid gap-2">
                            <Label>NCM</Label>
                            <Input
                              inputMode="numeric"
                              placeholder="Ex.: 12345678"
                              maxLength={8}
                              value={form.ncm}
                              onChange={(e) => {
                                const digits = e.target.value.replace(/\D/g, "").slice(0, 8)
                                setForm((f) => ({ ...f, ncm: digits }))
                              }}
                              onBlur={(e) => {
                                const d = e.currentTarget.value.replace(/\D/g, "")
                                if (d.length > 0 && d.length < 8) {
                                  toast.warning(
                                    `NCM com ${d.length} dígito(s). O código completo tem 8 dígitos — pode guardar assim mesmo; confirme com a equipa fiscal.`,
                                  )
                                }
                              }}
                            />
                            <p className="text-xs text-muted-foreground">
                              Até 8 dígitos (só números). Ao sair do campo, aviso se tiver menos de 8; o guardar continua permitido.
                            </p>
                          </div>
                          <div className="grid gap-2">
                            <Label>CEST</Label>
                            <Input
                              inputMode="numeric"
                              placeholder="Até 20 dígitos"
                              maxLength={20}
                              value={form.cest}
                              onChange={(e) => setForm((f) => ({ ...f, cest: e.target.value }))}
                            />
                            <p className="text-xs text-muted-foreground">
                              Opcional; só números, até 20 dígitos (substituição tributária / anexo XXVII IPI-ICMS).
                            </p>
                          </div>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-3">
                          <div className="grid gap-2">
                            <Label>CFOP padrão (saída)</Label>
                            <Input
                              inputMode="numeric"
                              placeholder="Ex.: 5102"
                              maxLength={4}
                              value={form.cfop_default}
                              onChange={(e) => setForm((f) => ({ ...f, cfop_default: e.target.value }))}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label>CSOSN padrão (Simples Nacional)</Label>
                            <Input
                              inputMode="numeric"
                              placeholder="Ex.: 102"
                              maxLength={3}
                              value={form.csosn_default}
                              onChange={(e) => setForm((f) => ({ ...f, csosn_default: e.target.value }))}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label>CST ICMS padrão (Lucro real / presumido)</Label>
                            <Input
                              inputMode="numeric"
                              placeholder="Ex.: 00"
                              maxLength={2}
                              value={form.cst_icms_default}
                              onChange={(e) => setForm((f) => ({ ...f, cst_icms_default: e.target.value }))}
                            />
                          </div>
                        </div>
                      </>
                    ) : null}
                    {wizardStep === 3 ? (
                      <>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Secção principal</Label>
                <Select
                  value={form.section_id.trim() === "" ? "__none__" : form.section_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, section_id: v === "__none__" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Nenhuma —</SelectItem>
                    {(meta?.sections ?? []).map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Marca (opcional)</Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div ref={brandFieldWrapRef} className="min-w-0 flex-1">
                    <Input
                      placeholder={
                        brands.length ? "Nome da marca…" : "Sem marcas — use «Nova marca»"
                      }
                      value={brandSearch}
                      onChange={(e) => {
                        const v = e.target.value
                        setBrandSearch(v)
                        setShowBrandSuggestions(true)
                        const id = resolveBrandIdFromTypedQuery(v, brands)
                        setForm((f) => ({ ...f, brand_id: id }))
                      }}
                      onFocus={() => setShowBrandSuggestions(true)}
                      onBlur={() => {
                        window.setTimeout(() => setShowBrandSuggestions(false), 180)
                      }}
                      autoComplete="off"
                      disabled={!brands.length}
                      className="w-full"
                    />
                    {brandSuggestionsPortal}
                  </div>
                  <Button type="button" variant="secondary" size="sm" className="shrink-0" onClick={() => setBrandQuickOpen(true)}>
                    Nova marca
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="text-muted-foreground">Secções adicionais (opcional)</Label>
              <div className="max-h-32 space-y-2 overflow-y-auto rounded-md border p-3">
                {(meta?.sections ?? []).map((s) => (
                  <label key={s.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={extraSections.includes(s.id)}
                      disabled={primarySection != null && !Number.isNaN(primarySection) && s.id === primarySection}
                      onCheckedChange={(c) => toggleSec(s.id, c === true)}
                    />
                    <span>
                      {s.name}{" "}
                      {primarySection != null && !Number.isNaN(primarySection) && s.id === primarySection ? "(principal)" : ""}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="grid gap-2 sm:col-span-1">
                <Label>Unidade de medida</Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <Select
                      value={form.um_id || undefined}
                      onValueChange={(v) => setForm((f) => ({ ...f, um_id: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={(meta?.measurement_units ?? []).length ? "Seleccione" : "Sem unidades de medida — crie uma"}
                        />
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
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-lg font-medium leading-none"
                    onClick={() => setUmQuickOpen(true)}
                    title="Nova unidade de medida"
                    aria-label="Nova unidade de medida"
                  >
                    +
                  </Button>
                </div>
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
                      </>
                    ) : null}
                    {wizardStep === 4 ? (
                      <>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Preços</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label>Valor na nota</Label>
                  <Input
                    inputMode="numeric"
                    className="tabular-nums"
                    value={form.invoice_price}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, invoice_price: formatMoneyCentsMask(e.target.value) }))
                    }
                    onBlur={() => setForm((f) => ({ ...f, invoice_price: formatMoneyCentsMask(f.invoice_price) }))}
                    placeholder="0,00"
                  />
                  <p className="text-xs text-muted-foreground">Referência do valor constante na nota fiscal (ex.: compra).</p>
                </div>
                <div className="grid gap-2">
                  <Label>Valor para venda</Label>
                  <Input
                    inputMode="numeric"
                    className="tabular-nums"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: formatMoneyCentsMask(e.target.value) }))}
                    onBlur={() => setForm((f) => ({ ...f, price: formatMoneyCentsMask(f.price) }))}
                    placeholder="0,00"
                  />
                  <p className="text-xs text-muted-foreground">Preço praticado na loja / catálogo.</p>
                </div>
                <div className="grid gap-2">
                  <Label>Valor promocional</Label>
                  <Input
                    inputMode="numeric"
                    className="tabular-nums"
                    value={form.promotion_price}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, promotion_price: formatMoneyCentsMask(e.target.value) }))
                    }
                    onBlur={() => setForm((f) => ({ ...f, promotion_price: formatMoneyCentsMask(f.promotion_price) }))}
                    placeholder="0,00"
                  />
                  <p className="text-xs text-muted-foreground">Preço em campanha ou promoção.</p>
                </div>
              </div>
            </div>
            <div className="space-y-2 border-t pt-4">
              <h3 className="text-sm font-semibold text-foreground">Dimensões</h3>
              <div className="grid gap-2 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>Largura</Label>
                <Input type="number" step="any" value={form.width} onChange={(e) => setForm((f) => ({ ...f, width: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Altura</Label>
                <Input type="number" step="any" value={form.height} onChange={(e) => setForm((f) => ({ ...f, height: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Comprimento</Label>
                <Input type="number" step="any" value={form.length} onChange={(e) => setForm((f) => ({ ...f, length: e.target.value }))} />
              </div>
            </div>
            </div>
            <div className="grid gap-2 border-t pt-4 sm:grid-cols-2">
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
            <div className="space-y-2 border-t pt-4">
              <h3 className="text-sm font-semibold text-foreground">Estoque</h3>
              <div className="grid gap-2 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>Quantidade</Label>
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
                <Label>Estoque mínimo (alerta)</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  placeholder="Opcional"
                  value={form.min_stock}
                  onChange={(e) => setForm((f) => ({ ...f, min_stock: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Lista assinala «Baixo» quando o saldo ≤ este valor.</p>
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
            </div>
            {editingId ? (
              <div className="grid gap-2">
                <Label>Nota do ajuste de estoque (opcional)</Label>
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
                      </>
                    ) : null}
                    {wizardStep === 5 ? (
                      <>
                        <dl className="grid gap-3 rounded-lg border bg-muted/40 p-4 text-sm sm:grid-cols-2">
                          <div>
                            <dt className="text-xs text-muted-foreground">Referência</dt>
                            <dd className="font-medium">{form.reference.trim() || "—"}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">
                              {productDialogMode === "create" ? "Descrição do Produto/Serviço" : "Nome comercial"}
                            </dt>
                            <dd className="font-medium">{form.commercial_name.trim() || "—"}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">Secção principal</dt>
                            <dd className="font-medium">
                              {form.section_id.trim() === ""
                                ? "— Nenhuma —"
                                : (meta?.sections ?? []).find((sec) => String(sec.id) === form.section_id)?.name ?? form.section_id}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">Marca (opcional)</dt>
                            <dd className="font-medium">
                              {form.brand_id.trim() === ""
                                ? "—"
                                : (brands.find((b) => String(b.id) === form.brand_id)?.name ?? `#${form.brand_id}`)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">Unidade de medida</dt>
                            <dd className="font-medium">
                              {(() => {
                                const u = (meta?.measurement_units ?? []).find((x) => String(x.id) === form.um_id)
                                if (!u) return form.um_id ? `#${form.um_id}` : "—"
                                return u.initials ? `${u.name} (${u.initials})` : u.name
                              })()}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">Preços (nota / venda / promoção)</dt>
                            <dd className="font-medium tabular-nums">
                              {form.invoice_price} / {form.price} / {form.promotion_price}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">Dimensões (L × A × C)</dt>
                            <dd className="font-medium tabular-nums">
                              {form.width} × {form.height} × {form.length}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">Quantidade / mínimo</dt>
                            <dd className="font-medium tabular-nums">
                              {form.quantity}
                              {form.min_stock.trim() !== "" ? ` / mín. ${form.min_stock}` : ""}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">N.º nota fiscal</dt>
                            <dd className="font-medium">{form.nf_number.trim() || "—"}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">Origem (NF-e)</dt>
                            <dd className="font-medium tabular-nums">{form.origin}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">NCM</dt>
                            <dd className="font-medium tabular-nums">{fiscalDigitsOrNull(form.ncm) ?? "—"}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">CEST</dt>
                            <dd className="font-medium tabular-nums">{fiscalDigitsOrNull(form.cest) ?? "—"}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">CFOP / CSOSN / CST ICMS</dt>
                            <dd className="font-medium tabular-nums">
                              {[fiscalDigitsOrNull(form.cfop_default), fiscalDigitsOrNull(form.csosn_default), fiscalDigitsOrNull(form.cst_icms_default)]
                                .filter(Boolean)
                                .join(" / ") || "—"}
                            </dd>
                          </div>
                        </dl>
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
                      </>
                    ) : null}
                  </CardContent>
                </Card>
                </div>
              </fieldset>
              <SheetFooter className="shrink-0 flex-col gap-3 border-t bg-background px-6 py-3 sm:flex-row sm:items-center sm:justify-between sm:space-x-2">
                <Button type="button" variant="ghost" size="sm" className="w-full sm:w-auto" onClick={() => setDialogOpen(false)}>
                  {sheetReadOnly ? "Fechar" : "Cancelar"}
                </Button>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
                  {wizardStep > 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => setWizardStep((s) => Math.max(1, s - 1))}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Voltar
                    </Button>
                  ) : null}
                  {wizardStep < 5 ? (
                    <Button
                      type="button"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => setWizardStep((s) => Math.min(5, s + 1))}
                    >
                      Próximo
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  ) : !sheetReadOnly ? (
                    <Button type="button" size="sm" className="w-full sm:w-auto" onClick={() => void save()} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? "Guardar" : "Criar"}
                    </Button>
                  ) : null}
                </div>
              </SheetFooter>
            </div>
          </SheetContent>
        </Sheet>

        <Dialog open={brandQuickOpen} onOpenChange={setBrandQuickOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nova marca</DialogTitle>
              <DialogDescription>
                A marca fica associada ao tenant da loja activa (mesmo fluxo que «Marca» no menu).
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid gap-2">
                <Label htmlFor="quick-brand-name">Nome (mín. 3 caracteres)</Label>
                <Input
                  id="quick-brand-name"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="Ex.: Minha marca"
                  maxLength={30}
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={newBrandPublic} onCheckedChange={(c) => setNewBrandPublic(c === true)} />
                Visível no catálogo público (is_public)
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBrandQuickOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" disabled={newBrandSaving} onClick={() => void submitQuickBrand()}>
                {newBrandSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar marca"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={umQuickOpen} onOpenChange={setUmQuickOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nova unidade de medida</DialogTitle>
              <DialogDescription>Unidade de medida global (partilhada por lojas), como no cadastro Blade.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid gap-2">
                <Label htmlFor="quick-um-initials">Sigla (1–4 caracteres)</Label>
                <Input
                  id="quick-um-initials"
                  value={newUmInitials}
                  onChange={(e) => setNewUmInitials(e.target.value.toUpperCase())}
                  maxLength={4}
                  placeholder="UN"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="quick-um-name">Nome</Label>
                <Input
                  id="quick-um-name"
                  value={newUmName}
                  onChange={(e) => setNewUmName(e.target.value)}
                  placeholder="Ex.: Unidade"
                  maxLength={20}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUmQuickOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" disabled={newUmSaving} onClick={() => void submitQuickUm()}>
                {newUmSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar unidade"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            setDeleteDialogOpen(open)
            if (!open) setProductToDelete(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <AlertDialogTitle>Eliminar produto</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="pt-1">
                Tem a certeza de que deseja eliminar o produto{" "}
                <strong className="text-foreground">{productToDelete?.name ? `«${productToDelete.name}»` : ""}</strong>
                {productToDelete?.id != null ? ` (ID ${productToDelete.id})` : ""}? Esta acção não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={() => void handleDeleteConfirm()}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Eliminar"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
