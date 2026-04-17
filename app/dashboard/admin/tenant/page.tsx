"use client"

import { useCallback, useEffect, useState } from "react"
import { apiService } from "@/lib/api"
import { laravelInnerData } from "@/lib/laravel-data"
import { useGplacePermissions } from "@/lib/use-gplace-permissions"
import { AccessDenied } from "@/components/ui/access-denied"
import { StateCitySelects } from "@/components/admin/state-city-selects"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, Mail, Pencil, Plus, Search, Trash2, Users } from "lucide-react"
import { toast } from "sonner"
import { maskCpfCnpj, maskPhone, unmaskDocument, unmaskPhone } from "@/lib/masks"

type Paginator<T> = { data: T[]; current_page: number; last_page: number; total: number; per_page?: number }

function readCityId(d: Record<string, unknown>): number | null {
  const v = d.city_id
  if (typeof v === "number" && !Number.isNaN(v)) return v
  if (typeof v === "string" && v.trim()) return Number(v)
  return null
}

const TENANT_STATUS_LABEL: Record<string, string> = {
  "1": "Habilitado",
  "2": "Inadimplente",
  "3": "Suspenso",
  "4": "Cancelado",
}

function tenantStatusBadgeVariant(status: unknown): "default" | "secondary" | "destructive" | "outline" {
  const s = String(status ?? "")
  if (s === "4") return "destructive"
  if (s === "2" || s === "3") return "secondary"
  return "outline"
}

function TenantsListSkeleton({ rowCount = 8 }: { rowCount?: number }) {
  const rows = Array.from({ length: rowCount })
  return (
    <Card className="w-full overflow-hidden p-0" aria-busy="true" aria-label="A carregar listagem">
      <div className="hidden w-full overflow-x-auto md:block">
        <div className="min-w-max">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[72px]">ID</TableHead>
                <TableHead className="min-w-[200px]">Contratante</TableHead>
                <TableHead className="min-w-[200px]">E-mail</TableHead>
                <TableHead className="min-w-[140px] whitespace-nowrap">CPF/CNPJ</TableHead>
                <TableHead className="min-w-[160px]">Cidade</TableHead>
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
                    <Skeleton className="h-4 w-[180px] max-w-full" />
                  </TableCell>
                  <TableCell className="py-3">
                    <Skeleton className="h-4 w-[120px]" />
                  </TableCell>
                  <TableCell className="py-3">
                    <Skeleton className="h-4 w-[100px]" />
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
                <Skeleton className="h-3 w-2/3" />
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

export default function AdminTenantPage() {
  const { can } = useGplacePermissions()
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [searchInput, setSearchInput] = useState("")
  const [effectiveSearch, setEffectiveSearch] = useState("")
  const [paginator, setPaginator] = useState<Paginator<Record<string, unknown>> | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("edit")
  const [tenantId, setTenantId] = useState<number | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [tenantToDelete, setTenantToDelete] = useState<{ id: number; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [stateId, setStateId] = useState("")
  const [cityId, setCityId] = useState("")
  const [form, setForm] = useState({
    name: "",
    formal_name: "",
    nif: "",
    email: "",
    phone: "",
    street: "",
    status: "1",
    dt_accession: "",
    due_date: "",
    due_day: "5",
    value: "",
    signature: "1",
  })

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
      const raw = await apiService.getAdminTenants({
        page,
        per_page: perPage,
        search: effectiveSearch || undefined,
      })
      const inner = laravelInnerData<Paginator<Record<string, unknown>>>(raw)
      setPaginator(inner)
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar titular.")
    } finally {
      setLoading(false)
    }
  }, [page, perPage, effectiveSearch])

  useEffect(() => {
    void load()
  }, [load])

  const defaultCreateForm = () => {
    const today = new Date()
    const due = new Date(today)
    due.setFullYear(due.getFullYear() + 1)
    const iso = (d: Date) => d.toISOString().slice(0, 10)
    return {
      name: "",
      formal_name: "",
      nif: "",
      email: "",
      phone: "",
      street: "",
      status: "1",
      dt_accession: iso(today),
      due_date: iso(due),
      due_day: "5",
      value: "0",
      signature: "1",
    }
  }

  const openCreate = () => {
    setDialogMode("create")
    setTenantId(null)
    setStateId("")
    setCityId("")
    setForm(defaultCreateForm())
    setDialogOpen(true)
  }

  const openEdit = async (idArg?: number) => {
    const first = paginator?.data?.[0]
    const rawId = idArg ?? (first?.id != null ? Number(first.id) : NaN)
    if (Number.isNaN(rawId)) {
      toast.error("Sem titular na listagem.")
      return
    }
    const id = rawId
    setDialogMode("edit")
    setTenantId(id)
    try {
      const raw = await apiService.getAdminTenant(id)
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
      setForm({
        name: String(d.name ?? ""),
        formal_name: String(d.formal_name ?? ""),
        nif: maskCpfCnpj(String(d.nif ?? "")),
        email: String(d.email ?? ""),
        phone: maskPhone(String(d.phone ?? "")),
        street: String(d.street ?? ""),
        status: String(d.status ?? "1"),
        dt_accession: d.dt_accession ? String(d.dt_accession).slice(0, 10) : "",
        due_date: d.due_date ? String(d.due_date).slice(0, 10) : "",
        due_day: String(d.due_day ?? "5"),
        value: d.value != null ? String(d.value) : "",
        signature: String(d.signature ?? "1"),
      })
      setDialogOpen(true)
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar detalhe.")
    }
  }

  const save = async () => {
    if (!cityId) {
      toast.error("Seleccione cidade ou dados incompletos.")
      return
    }
    if (dialogMode === "edit" && !tenantId) {
      toast.error("ID inválido.")
      return
    }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        formal_name: form.formal_name.trim(),
        nif: unmaskDocument(form.nif.trim()),
        email: form.email.trim(),
        phone: unmaskPhone(form.phone.trim()),
        street: form.street.trim(),
        city_id: Number(cityId),
        contact: null,
        contact_phone: null,
        status: form.status,
        dt_accession: form.dt_accession,
        due_date: form.due_date,
        due_day: Number(form.due_day),
        value: parseFloat(String(form.value).replace(",", ".")) || 0,
        signature: Number(form.signature),
      }
      if (dialogMode === "create") {
        const raw = await apiService.createAdminTenant(payload)
        const msg = typeof raw?.message === "string" && raw.message.trim() ? raw.message.trim() : "Contratante criado."
        toast.success(msg)
      } else {
        await apiService.updateAdminTenant(tenantId!, payload)
        toast.success("Titular actualizado.")
      }
      setDialogOpen(false)
      void load()
    } catch (e: unknown) {
      console.error(e)
      const err = e as { response?: { data?: { message?: unknown }; status?: number } }
      const raw = err.response?.data?.message
      const msg =
        typeof raw === "string" && raw.trim()
          ? raw.trim()
          : err.response?.status === 403
            ? "Sem permissão ou cabeçalho «app» inválido. Confirme NEXT_PUBLIC_APP_TOKEN e permissões de contratantes."
            : "Erro ao guardar."
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleCopyCpfCnpj = useCallback(async (raw: string) => {
    const digits = raw.replace(/\D/g, "")
    const text = digits.length > 0 ? digits : raw.trim()
    try {
      await navigator.clipboard.writeText(text)
      toast.success("CPF/CNPJ copiado para a área de transferência.")
    } catch {
      toast.error("Não foi possível copiar.")
    }
  }, [])

  const handleDeleteClick = (row: Record<string, unknown>) => {
    setTenantToDelete({ id: Number(row.id), name: String(row.name ?? "") })
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!tenantToDelete) return
    setDeleting(true)
    try {
      const raw = await apiService.deleteAdminTenant(tenantToDelete.id)
      toast.success(typeof raw?.message === "string" ? raw.message : "Contratante removido.")
      setDeleteDialogOpen(false)
      setTenantToDelete(null)
      void load()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      const msg = err.response?.data?.message
      toast.error(typeof msg === "string" ? msg : "Não foi possível excluir.")
    } finally {
      setDeleting(false)
    }
  }

  if (!can("tenants_view")) {
    return <AccessDenied />
  }

  const mayEditTenantRow = can("tenants_edit") || (paginator != null && paginator.total === 1)
  const mayDeleteTenant = can("tenants_delete")

  const rows = paginator?.data ?? []
  const listTotal = paginator?.total ?? 0
  const totalPages = Math.max(1, paginator?.last_page ?? 1)
  const showingFrom = rows.length > 0 ? (page - 1) * perPage + 1 : 0
  const showingTo = rows.length > 0 ? Math.min(page * perPage, listTotal) : 0

  const hasFilters = effectiveSearch.length > 0

  const listSection = (() => {
    if (loading) {
      return <TenantsListSkeleton rowCount={Math.min(perPage, 10)} />
    }
    if (rows.length === 0) {
      return (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            {hasFilters
              ? "Nenhum contratante encontrado com os filtros aplicados."
              : 'Nenhum contratante nesta listagem. Clique em "Novo contratante" para começar.'}
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
                  <TableHead className="min-w-[200px]">Contratante</TableHead>
                  <TableHead className="min-w-[200px]">E-mail</TableHead>
                  <TableHead className="min-w-[140px] whitespace-nowrap">CPF/CNPJ</TableHead>
                  <TableHead className="min-w-[160px]">Cidade</TableHead>
                  <TableHead className="min-w-[120px]">Situação</TableHead>
                  <TableHead className="min-w-[120px] text-right">Acções</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const st = String(row.status ?? "")
                  const email = row.email != null ? String(row.email) : ""
                  const nif = row.nif != null ? String(row.nif) : ""
                  const nifMasked = nif ? maskCpfCnpj(nif) : ""
                  return (
                    <TableRow key={String(row.id)}>
                      <TableCell className="py-2 tabular-nums text-muted-foreground">{String(row.id)}</TableCell>
                      <TableCell className="py-2">
                        <span className="text-sm font-semibold text-foreground">{String(row.name ?? "")}</span>
                      </TableCell>
                      <TableCell className="py-2">
                        {email ? (
                          <div className="flex min-w-0 items-center gap-2 text-sm">
                            <Mail className="h-3 w-3 shrink-0 text-muted-foreground" />
                            <span className="truncate text-muted-foreground">{email}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2 text-sm tabular-nums">
                        {nif ? (
                          <button
                            type="button"
                            title="Clique para copiar"
                            className="cursor-pointer border-0 bg-transparent p-0 text-left font-inherit text-muted-foreground hover:text-foreground hover:underline"
                            onClick={() => void handleCopyCpfCnpj(nif)}
                          >
                            {nifMasked}
                          </button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2 text-sm text-muted-foreground">{String(row.city ?? "")}</TableCell>
                      <TableCell className="py-2">
                        <Badge variant={tenantStatusBadgeVariant(st)} className="text-[11px]">
                          {TENANT_STATUS_LABEL[st] ?? st}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 hover:bg-yellow-50 hover:text-yellow-800"
                            onClick={() => void openEdit(Number(row.id))}
                            disabled={!mayEditTenantRow}
                            title={!mayEditTenantRow ? "Sem permissão para editar este titular" : "Editar"}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {mayDeleteTenant ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 hover:bg-red-50 hover:text-red-600"
                              title="Excluir contratante"
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
            const nif = row.nif != null ? String(row.nif) : ""
            const nifMasked = nif ? maskCpfCnpj(nif) : ""
            return (
              <Card key={String(row.id)} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <h3 className="truncate font-semibold text-foreground">{String(row.name ?? "")}</h3>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">ID {String(row.id)}</p>
                    </div>
                    <Badge variant={tenantStatusBadgeVariant(st)} className="shrink-0 text-[10px]">
                      {TENANT_STATUS_LABEL[st] ?? st}
                    </Badge>
                  </div>
                  <dl className="grid grid-cols-[minmax(0,auto)_1fr] gap-x-3 gap-y-2 border-t pt-3 text-sm">
                    <dt className="text-xs text-muted-foreground">CPF/CNPJ</dt>
                    <dd className="m-0 min-w-0 break-all">
                      {nif ? (
                        <button
                          type="button"
                          className="w-full cursor-pointer border-0 bg-transparent p-0 text-left font-inherit text-muted-foreground hover:text-foreground hover:underline"
                          onClick={() => void handleCopyCpfCnpj(nif)}
                        >
                          {nifMasked}
                        </button>
                      ) : (
                        "—"
                      )}
                    </dd>
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
                    <dt className="text-xs text-muted-foreground">Cidade</dt>
                    <dd className="m-0 text-muted-foreground">{String(row.city ?? "—")}</dd>
                  </dl>
                  <div className="flex gap-2 border-t pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 hover:bg-yellow-50 hover:text-yellow-800"
                      disabled={!mayEditTenantRow}
                      onClick={() => void openEdit(Number(row.id))}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    {mayDeleteTenant ? (
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
            <h1 className="text-3xl font-bold text-foreground">Contratantes</h1>
            <p className="mt-1 text-muted-foreground">Faça a gestão dos titulares (tenants) e dos dados contratuais</p>
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
                      ? "Nenhum contratante nesta listagem."
                      : `Mostrando ${showingFrom}-${showingTo} de ${listTotal.toLocaleString("pt-BR")} contratante(s)`}
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
          {can("tenants_create") || can("tenants_edit") ? (
            <Button onClick={() => openCreate()} className="gap-2 self-start sm:self-auto">
              <Plus className="h-4 w-4" />
              Novo contratante
            </Button>
          ) : null}
        </div>

        <Card className="p-4 sm:p-5">
          <div className="flex flex-wrap items-end gap-x-5 gap-y-4">
            <div className="min-w-0 w-full max-w-full sm:min-w-[220px] sm:max-w-md lg:max-w-xl">
              <Label htmlFor="search-tenants" className="mb-1.5 block text-xs text-muted-foreground">
                Busca
              </Label>
              {loading && paginator === null ? (
                <Skeleton className="h-9 w-full rounded-md" />
              ) : (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="search-tenants"
                    placeholder="Nome, razão social ou CPF/CNPJ…"
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
                <SheetTitle>{dialogMode === "create" ? "Novo contratante" : `Editar tenant #${tenantId}`}</SheetTitle>
                <SheetDescription>
                  {dialogMode === "create"
                    ? "Após criar, a senha inicial do utilizador é apenas os dígitos do CPF/CNPJ (como no painel Blade)."
                    : "Campos conforme validação da API admin."}
                </SheetDescription>
              </SheetHeader>
              <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto px-6 py-4">
                <div className="grid gap-2">
                  <Label>Nome</Label>
                  <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>Razão social</Label>
                  <Input value={form.formal_name} onChange={(e) => setForm((f) => ({ ...f, formal_name: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>CPF/CNPJ</Label>
                  <Input
                    inputMode="numeric"
                    autoComplete="off"
                    value={form.nif}
                    onChange={(e) => setForm((f) => ({ ...f, nif: maskCpfCnpj(e.target.value) }))}
                  />
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
                  idPrefix="tenant"
                />
                <div className="grid gap-2">
                  <Label>Situação</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Habilitado</SelectItem>
                      <SelectItem value="2">Inadimplente</SelectItem>
                      <SelectItem value="3">Suspenso</SelectItem>
                      <SelectItem value="4">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Data de adesão</Label>
                    <Input type="date" value={form.dt_accession} onChange={(e) => setForm((f) => ({ ...f, dt_accession: e.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Data de vencimento</Label>
                    <Input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Dia de vencimento</Label>
                    <Select value={form.due_day} onValueChange={(v) => setForm((f) => ({ ...f, due_day: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="15">15</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Valor</Label>
                    <Input type="number" step="any" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Assinatura</Label>
                  <Select value={form.signature} onValueChange={(v) => setForm((f) => ({ ...f, signature: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Trial</SelectItem>
                      <SelectItem value="2">Mensal</SelectItem>
                      <SelectItem value="3">Trimestral</SelectItem>
                      <SelectItem value="4">Semestral</SelectItem>
                      <SelectItem value="5">Anual</SelectItem>
                      <SelectItem value="6">Bianual</SelectItem>
                    </SelectContent>
                  </Select>
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
            if (!open) setTenantToDelete(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <AlertDialogTitle>Excluir contratante</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="pt-1">
                Tem a certeza de que deseja excluir o contratante{" "}
                <strong className="text-foreground">{tenantToDelete?.name ? `«${tenantToDelete.name}»` : ""}</strong>
                {tenantToDelete?.id != null ? ` (ID ${tenantToDelete.id})` : ""}? Esta acção não pode ser desfeita. Se existirem lojas ou outros
                registos vinculados, a API pode recusar a exclusão.
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
