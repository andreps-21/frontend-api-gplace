"use client"

import { useCallback, useEffect, useState } from "react"
import { apiService } from "@/lib/api"
import { laravelInnerData, laravelValidationErrorText } from "@/lib/laravel-data"
import { useGplacePermissions } from "@/lib/use-gplace-permissions"
import { AccessDenied } from "@/components/ui/access-denied"
import { StateCitySelects } from "@/components/admin/state-city-selects"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, Mail, Pencil, Plus, Search, Store, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { maskCpfCnpj, maskPhone, unmaskDocument, unmaskPhone } from "@/lib/masks"

type Paginator<T> = { data: T[]; current_page: number; last_page: number; total: number; per_page?: number }

function readCityId(d: Record<string, unknown>): number | null {
  const v = d.city_id
  if (typeof v === "number" && !Number.isNaN(v)) return v
  if (typeof v === "string" && v.trim()) return Number(v)
  return null
}

function tenantPersonName(row: Record<string, unknown>): string {
  const tenant = row.tenant as Record<string, unknown> | undefined
  if (!tenant) return ""
  const people = tenant.people as Record<string, unknown> | undefined
  return people?.name ? String(people.name) : ""
}

const STORE_STATUS_LABEL: Record<string, string> = {
  "1": "Ativo",
  "2": "Bloqueado",
  "3": "Cancelado",
}

function storeStatusBadgeVariant(status: unknown): "default" | "secondary" | "destructive" | "outline" {
  const s = String(status ?? "")
  if (s === "3") return "destructive"
  if (s === "2") return "secondary"
  return "outline"
}

function StoresListSkeleton({ rowCount = 8 }: { rowCount?: number }) {
  const rows = Array.from({ length: rowCount })
  return (
    <Card className="w-full overflow-hidden p-0" aria-busy="true" aria-label="A carregar listagem">
      <div className="hidden w-full overflow-x-auto md:block">
        <div className="min-w-max">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[72px]">ID</TableHead>
                <TableHead className="min-w-[200px]">Loja</TableHead>
                <TableHead className="min-w-[140px] whitespace-nowrap">CNPJ</TableHead>
                <TableHead className="min-w-[180px]">Titular</TableHead>
                <TableHead className="min-w-[120px]">Situação</TableHead>
                <TableHead className="min-w-[120px] text-right">Acções</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="py-3">
                    <Skeleton className="h-4 w-9" />
                  </TableCell>
                  <TableCell className="py-3">
                    <Skeleton className="h-4 w-[140px] max-w-full" />
                  </TableCell>
                  <TableCell className="py-3">
                    <Skeleton className="h-4 w-[120px]" />
                  </TableCell>
                  <TableCell className="py-3">
                    <Skeleton className="h-4 w-[160px] max-w-full" />
                  </TableCell>
                  <TableCell className="py-3">
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </TableCell>
                  <TableCell className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
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
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
              </div>
              <div className="space-y-2 border-t pt-3">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
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

export default function AdminLojasPage() {
  const { can } = useGplacePermissions()
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [searchInput, setSearchInput] = useState("")
  const [effectiveSearch, setEffectiveSearch] = useState("")
  const [paginator, setPaginator] = useState<Paginator<Record<string, unknown>> | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("edit")
  const [storeId, setStoreId] = useState<number | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [storeToDelete, setStoreToDelete] = useState<{ id: number; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [stateId, setStateId] = useState("")
  const [cityId, setCityId] = useState("")
  const [paymentMethods, setPaymentMethods] = useState<Array<{ id: number; name?: string }>>([])
  const [paymentSel, setPaymentSel] = useState<number[]>([])
  /** Titular (tenant) ao criar loja — só editável com permissão de contratantes. */
  const [tenantOptions, setTenantOptions] = useState<Array<{ id: number; label: string }>>([])
  const [createTenantId, setCreateTenantId] = useState("")
  const [tenantsLoading, setTenantsLoading] = useState(false)
  const [form, setForm] = useState({
    name: "",
    formal_name: "",
    nif: "",
    email: "",
    phone: "",
    street: "",
    status: "1",
  })

  const loadPm = useCallback(async () => {
    try {
      const raw = await apiService.getPaymentMethods()
      const data = laravelInnerData<Array<{ id: number; name?: string }>>(raw)
      setPaymentMethods(Array.isArray(data) ? data : [])
    } catch {
      setPaymentMethods([])
    }
  }, [])

  useEffect(() => {
    void loadPm()
  }, [loadPm])

  useEffect(() => {
    const t = window.setTimeout(() => setEffectiveSearch(searchInput.trim()), 400)
    return () => window.clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    setPage(1)
  }, [effectiveSearch, perPage])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await apiService.getAdminStores({
        page,
        per_page: perPage,
        search: effectiveSearch || undefined,
      })
      const inner = laravelInnerData<Paginator<Record<string, unknown>>>(raw)
      setPaginator(inner)
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar lojas.")
    } finally {
      setLoading(false)
    }
  }, [page, perPage, effectiveSearch])

  useEffect(() => {
    void load()
  }, [load])

  const mayPickTenantForNewStore = can("tenants_create") || can("tenants_edit")

  const openCreate = async () => {
    setDialogMode("create")
    setStoreId(null)
    setForm({ name: "", formal_name: "", nif: "", email: "", phone: "", street: "", status: "1" })
    setStateId("")
    setCityId("")
    setPaymentSel([])
    setTenantOptions([])
    setCreateTenantId("")

    if (mayPickTenantForNewStore) {
      setTenantsLoading(true)
      try {
        const raw = await apiService.getAdminTenants({ per_page: 200 })
        const inner = laravelInnerData<Paginator<Record<string, unknown>>>(raw)
        const list = inner?.data ?? []
        const opts = list.map((t) => ({
          id: Number(t.id),
          label: [t.formal_name, t.name].map((x) => (x != null ? String(x).trim() : "")).find(Boolean) || `Titular #${t.id}`,
        }))
        setTenantOptions(opts)
        const firstRow = paginator?.data?.[0] as Record<string, unknown> | undefined
        const tid = firstRow?.tenant_id
        const currentTid = tid != null && tid !== "" ? String(tid) : ""
        const match = currentTid && opts.some((o) => String(o.id) === currentTid)
        setCreateTenantId(match ? currentTid : opts.length > 0 ? String(opts[0].id) : "")
      } catch (e) {
        console.error(e)
        toast.error("Não foi possível carregar a lista de titulares.")
      } finally {
        setTenantsLoading(false)
      }
    }

    setDialogOpen(true)
  }

  const openEdit = async (row: Record<string, unknown>) => {
    const id = Number(row.id)
    setDialogMode("edit")
    setStoreId(id)
    setTenantOptions([])
    setCreateTenantId("")
    try {
      const raw = await apiService.getAdminStore(id)
      const d = laravelInnerData<Record<string, unknown>>(raw)
      const cid = readCityId(d)
      let st = ""
      if (cid) {
        const cRaw = await apiService.getCity(cid)
        const city = laravelInnerData<{ state_id?: number }>(cRaw)
        st = city.state_id != null ? String(city.state_id) : ""
      }
      setStateId(st)
      setCityId(cid ? String(cid) : "")
      const pms = (d.payment_methods ?? d.paymentMethods) as Array<{ id: number }> | undefined
      const ids = Array.isArray(pms) ? pms.map((x) => x.id) : []
      setPaymentSel(ids)
      setForm({
        name: String(d.name ?? ""),
        formal_name: String(d.formal_name ?? ""),
        nif: maskCpfCnpj(String(d.nif ?? "")),
        email: String(d.email ?? ""),
        phone: maskPhone(String(d.phone ?? "")),
        street: String(d.street ?? ""),
        status: String(d.status ?? "1"),
      })

      if (mayPickTenantForNewStore) {
        setTenantsLoading(true)
        try {
          const tenantsRaw = await apiService.getAdminTenants({ per_page: 200 })
          const inner = laravelInnerData<Paginator<Record<string, unknown>>>(tenantsRaw)
          const list = inner?.data ?? []
          let opts = list.map((t) => ({
            id: Number(t.id),
            label: [t.formal_name, t.name].map((x) => (x != null ? String(x).trim() : "")).find(Boolean) || `Titular #${t.id}`,
          }))
          const currentTid = d.tenant_id != null && d.tenant_id !== "" ? String(d.tenant_id) : ""
          if (currentTid && !opts.some((o) => String(o.id) === currentTid)) {
            const fallback = tenantPersonName(d).trim() || `Titular #${currentTid}`
            opts = [{ id: Number(currentTid), label: fallback }, ...opts]
          }
          setTenantOptions(opts)
          const match = currentTid && opts.some((o) => String(o.id) === currentTid)
          setCreateTenantId(match ? currentTid : opts.length > 0 ? String(opts[0].id) : "")
        } catch (e) {
          console.error(e)
          toast.error("Não foi possível carregar a lista de titulares.")
        } finally {
          setTenantsLoading(false)
        }
      }

      setDialogOpen(true)
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar loja.")
    }
  }

  const togglePm = (id: number, checked: boolean) => {
    setPaymentSel((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)))
  }

  const save = async () => {
    if (!cityId) {
      toast.error("Seleccione estado e cidade.")
      return
    }
    if (dialogMode === "edit" && !storeId) {
      toast.error("ID inválido.")
      return
    }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        formal_name: form.formal_name.trim(),
        nif: String(unmaskDocument(form.nif.trim())),
        email: form.email.trim(),
        phone: String(unmaskPhone(form.phone.trim())),
        street: form.street.trim(),
        city_id: Number(cityId),
        status: Number(form.status),
        paymentMethods: paymentSel.map((id) => Number(id)),
      }
      if (dialogMode === "create") {
        if (mayPickTenantForNewStore && tenantOptions.length > 0 && !createTenantId) {
          toast.error("Seleccione o titular (contratante) para esta loja.")
          return
        }
        if (mayPickTenantForNewStore && createTenantId) {
          payload.tenant_id = Number(createTenantId)
        }
        await apiService.createAdminStore(payload)
        toast.success("Loja criada.")
      } else {
        if (mayPickTenantForNewStore && tenantOptions.length > 0 && !createTenantId) {
          toast.error("Seleccione o titular (contratante) para esta loja.")
          return
        }
        if (mayPickTenantForNewStore && createTenantId) {
          payload.tenant_id = Number(createTenantId)
        }
        await apiService.updateAdminStore(storeId!, payload)
        toast.success("Loja actualizada.")
      }
      setDialogOpen(false)
      void load()
    } catch (e: unknown) {
      console.error(e)
      const err = e as { response?: { data?: unknown; status?: number } }
      const body = err.response?.data
      const validationMsg = laravelValidationErrorText(body)
      const topMsg =
        body !== null && typeof body === "object" && "message" in body && typeof (body as { message: unknown }).message === "string"
          ? (body as { message: string }).message.trim()
          : ""
      const msg =
        validationMsg ||
        (topMsg.length > 0 ? topMsg : "") ||
        (err.response?.status === 403 ? "Sem permissão ou cabeçalho «app» inválido." : "") ||
        "Erro ao guardar."
      toast.error(msg, { duration: validationMsg ? 10000 : 5000 })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClick = (row: Record<string, unknown>) => {
    setStoreToDelete({ id: Number(row.id), name: String(row.name ?? "") })
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!storeToDelete) return
    setDeleting(true)
    try {
      await apiService.deleteAdminStore(storeToDelete.id)
      toast.success("Loja removida.")
      setDeleteDialogOpen(false)
      setStoreToDelete(null)
      void load()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      const m = err.response?.data?.message
      toast.error(typeof m === "string" ? m : "Não foi possível eliminar.")
    } finally {
      setDeleting(false)
    }
  }

  if (!can("stores_view")) {
    return <AccessDenied />
  }

  const mayEditStoreRow = can("stores_edit") || (paginator != null && paginator.total === 1)
  const mayDeleteStore = can("stores_delete")
  const mayCreateStore = can("stores_create") || can("stores_edit")

  const rows = paginator?.data ?? []
  const listTotal = paginator?.total ?? 0
  const totalPages = Math.max(1, paginator?.last_page ?? 1)
  const showingFrom = rows.length > 0 ? (page - 1) * perPage + 1 : 0
  const showingTo = rows.length > 0 ? Math.min(page * perPage, listTotal) : 0
  const hasFilters = effectiveSearch.length > 0

  const listSection = (() => {
    if (loading) {
      return <StoresListSkeleton rowCount={Math.min(perPage, 10)} />
    }
    if (rows.length === 0) {
      return (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            {hasFilters
              ? "Nenhuma loja encontrada com os filtros aplicados."
              : 'Nenhuma loja nesta listagem. Clique em "Nova loja" para começar.'}
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
                  <TableHead className="min-w-[72px]">ID</TableHead>
                  <TableHead className="min-w-[200px]">Loja</TableHead>
                  <TableHead className="min-w-[140px] whitespace-nowrap">CNPJ</TableHead>
                  <TableHead className="min-w-[180px]">Titular</TableHead>
                  <TableHead className="min-w-[120px]">Situação</TableHead>
                  <TableHead className="min-w-[120px] text-right">Acções</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const st = String(row.status ?? "")
                  return (
                    <TableRow key={String(row.id)}>
                      <TableCell className="py-2 tabular-nums text-muted-foreground">{String(row.id)}</TableCell>
                      <TableCell className="py-2">
                        <span className="text-sm font-semibold text-foreground">{String(row.name ?? "")}</span>
                      </TableCell>
                      <TableCell className="py-2 text-sm tabular-nums text-muted-foreground">
                        {maskCpfCnpj(String(row.nif ?? ""))}
                      </TableCell>
                      <TableCell className="py-2 text-sm text-muted-foreground">{tenantPersonName(row) || "—"}</TableCell>
                      <TableCell className="py-2">
                        <Badge variant={storeStatusBadgeVariant(st)} className="text-[11px]">
                          {STORE_STATUS_LABEL[st] ?? st}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 hover:bg-yellow-50 hover:text-yellow-800"
                            onClick={() => void openEdit(row)}
                            disabled={!mayEditStoreRow}
                            title={!mayEditStoreRow ? "Sem permissão para editar" : "Editar"}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {mayDeleteStore ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 hover:bg-red-50 hover:text-red-600"
                              title="Excluir loja"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteClick(row)
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          ) : null}
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
            const st = String(row.status ?? "")
            const email = row.email != null ? String(row.email) : ""
            return (
              <Card key={String(row.id)} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <h3 className="truncate font-semibold text-foreground">{String(row.name ?? "")}</h3>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">ID {String(row.id)}</p>
                    </div>
                    <Badge variant={storeStatusBadgeVariant(st)} className="shrink-0 text-[10px]">
                      {STORE_STATUS_LABEL[st] ?? st}
                    </Badge>
                  </div>
                  <dl className="grid grid-cols-[minmax(0,auto)_1fr] gap-x-3 gap-y-2 border-t pt-3 text-sm">
                    <dt className="text-xs text-muted-foreground">CNPJ</dt>
                    <dd className="m-0 font-mono text-xs text-muted-foreground">
                      {row.nif != null && String(row.nif).trim() !== "" ? maskCpfCnpj(String(row.nif)) : "—"}
                    </dd>
                    <dt className="text-xs text-muted-foreground">Titular</dt>
                    <dd className="m-0 text-muted-foreground">{tenantPersonName(row) || "—"}</dd>
                    <dt className="text-xs text-muted-foreground">E-mail</dt>
                    <dd className="m-0 flex min-w-0 items-center gap-2 break-all text-muted-foreground">
                      {email ? (
                        <>
                          <Mail className="h-3 w-3 shrink-0" />
                          <span>{email}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </dl>
                  <div className="flex gap-2 border-t pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 hover:bg-yellow-50 hover:text-yellow-800"
                      disabled={!mayEditStoreRow}
                      onClick={() => void openEdit(row)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    {mayDeleteStore ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 hover:bg-red-50 hover:text-red-600"
                        onClick={() => handleDeleteClick(row)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </Button>
                    ) : null}
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
            <h1 className="text-3xl font-bold text-foreground">Lojas</h1>
            <p className="mt-1 text-muted-foreground">
              Lojas por titular. Com permissão de contratantes, ao criar pode escolher o titular; caso contrário usa-se o titular da loja do cabeçalho «app».
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
                      ? "Nenhuma loja nesta listagem."
                      : `Mostrando ${showingFrom}-${showingTo} de ${listTotal.toLocaleString("pt-BR")} loja(s)`}
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
          {mayCreateStore ? (
            <Button onClick={() => openCreate()} className="gap-2 self-start sm:self-auto">
              <Plus className="h-4 w-4" />
              Nova loja
            </Button>
          ) : null}
        </div>

        <Card className="p-4 sm:p-5">
          <div className="flex flex-wrap items-end gap-x-5 gap-y-4">
            <div className="min-w-0 w-full max-w-full sm:min-w-[220px] sm:max-w-md lg:max-w-xl">
              <Label htmlFor="search-stores" className="mb-1.5 block text-xs text-muted-foreground">
                Busca
              </Label>
              {loading && paginator === null ? (
                <Skeleton className="h-9 w-full rounded-md" />
              ) : (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="search-stores"
                    placeholder="Nome ou CNPJ…"
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

        <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
          <SheetContent className="p-0">
            <div className="flex h-full min-h-0 flex-col">
              <SheetHeader>
                <SheetTitle>{dialogMode === "create" ? "Nova loja" : `Editar loja #${storeId}`}</SheetTitle>
                <SheetDescription>
                  {mayPickTenantForNewStore
                    ? dialogMode === "create"
                      ? "Escolha o titular e preencha os dados da loja. O CNPJ não pode ser alterado após a criação."
                      : "Pode alterar o titular desta loja. O CNPJ não pode ser alterado após a criação."
                    : "Dados da pessoa jurídica e métodos de pagamento aceites nesta loja. O CNPJ não pode ser alterado após a criação."}
                </SheetDescription>
              </SheetHeader>
              <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto px-6 py-4">
                {mayPickTenantForNewStore && (dialogMode === "create" || dialogMode === "edit") ? (
                  <div className="grid gap-2">
                    <Label>Titular (contratante)</Label>
                    {tenantsLoading ? (
                      <Skeleton className="h-9 w-full rounded-md" />
                    ) : tenantOptions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {dialogMode === "create"
                          ? "Nenhum titular na listagem. A loja será criada para o titular da loja do cabeçalho «app», ou crie um contratante primeiro."
                          : "Não foi possível listar titulares. Guarde sem alterar o titular ou tente recarregar a página."}
                      </p>
                    ) : (
                      <Select value={createTenantId} onValueChange={setCreateTenantId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Escolha o titular" />
                        </SelectTrigger>
                        <SelectContent>
                          {tenantOptions.map((t) => (
                            <SelectItem key={t.id} value={String(t.id)}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ) : null}
                <div className="grid gap-2">
                  <Label>CNPJ</Label>
                  <Input
                    inputMode="numeric"
                    autoComplete="off"
                    value={form.nif}
                    onChange={(e) => setForm((f) => ({ ...f, nif: maskCpfCnpj(e.target.value) }))}
                    disabled={dialogMode === "edit"}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Nome fantasia</Label>
                  <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>Razão social</Label>
                  <Input value={form.formal_name} onChange={(e) => setForm((f) => ({ ...f, formal_name: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>E-mail</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>Telefone</Label>
                  <Input
                    inputMode="tel"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: maskPhone(e.target.value) }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Rua</Label>
                  <Input value={form.street} onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))} />
                </div>
                <StateCitySelects
                  stateId={stateId}
                  cityId={cityId}
                  onStateChange={(s) => {
                    setStateId(s)
                    setCityId("")
                  }}
                  onCityChange={setCityId}
                  idPrefix="loja"
                />
                <div className="grid gap-2">
                  <Label>Situação</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Ativo</SelectItem>
                      <SelectItem value="2">Bloqueado</SelectItem>
                      <SelectItem value="3">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Métodos de pagamento</Label>
                  <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
                    {paymentMethods.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum método disponível.</p>
                    ) : (
                      paymentMethods.map((pm) => (
                        <label key={pm.id} className="flex cursor-pointer items-center gap-2 text-sm">
                          <Checkbox checked={paymentSel.includes(pm.id)} onCheckedChange={(c) => togglePm(pm.id, c === true)} />
                          <span>{pm.name ?? `ID ${pm.id}`}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>
              <SheetFooter className="sm:space-x-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="button" onClick={() => void save()} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : dialogMode === "create" ? "Criar" : "Guardar"}
                </Button>
              </SheetFooter>
            </div>
          </SheetContent>
        </Sheet>

        <AlertDialog
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            setDeleteDialogOpen(open)
            if (!open) setStoreToDelete(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <AlertDialogTitle>Excluir loja</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="pt-1">
                Tem a certeza de que deseja excluir a loja{" "}
                <strong className="text-foreground">{storeToDelete?.name ? `«${storeToDelete.name}»` : ""}</strong>
                {storeToDelete?.id != null ? ` (ID ${storeToDelete.id})` : ""}? Esta acção não pode ser desfeita. A API pode recusar se existirem
                vendas ou outros registos vinculados.
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
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
