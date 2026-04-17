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
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCircle,
} from "lucide-react"
import { toast } from "sonner"
import { maskCEP, maskCpfCnpj, maskPhone, unmaskCEP, unmaskDocument, unmaskPhone } from "@/lib/masks"

type Paginator<T> = { data: T[]; current_page: number; last_page: number; total: number; per_page?: number }

function readCityId(d: Record<string, unknown>): number | null {
  const v = d.city_id
  if (typeof v === "number" && !Number.isNaN(v)) return v
  if (typeof v === "string" && v.trim()) return Number(v)
  const p = d.person as Record<string, unknown> | undefined
  if (p && p.city_id != null) return Number(p.city_id)
  return null
}

const emptyForm = () => ({
  state_registration: "",
  origin: "1",
  formal_name: "",
  birth_date: "",
  nif: "",
  name: "",
  zip_code: "",
  number: "",
  street: "",
  district: "",
  phone: "",
  email: "",
  contact: "",
  contact_phone: "",
  contact_email: "",
})

function ClientesListSkeleton({ rowCount = 8 }: { rowCount?: number }) {
  const rows = Array.from({ length: rowCount })
  return (
    <Card className="w-full overflow-hidden p-0" aria-busy="true" aria-label="A carregar listagem">
      <div className="hidden w-full overflow-x-auto md:block">
        <div className="min-w-max">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[72px]">ID</TableHead>
                <TableHead className="min-w-[200px]">Nome</TableHead>
                <TableHead className="min-w-[140px] whitespace-nowrap">CPF/CNPJ</TableHead>
                <TableHead className="min-w-[200px]">E-mail</TableHead>
                <TableHead className="min-w-[160px]">Cidade</TableHead>
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
                    <Skeleton className="h-4 w-[180px] max-w-full" />
                  </TableCell>
                  <TableCell className="py-3">
                    <Skeleton className="h-4 w-[100px]" />
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

export default function AdminClientesPage() {
  const { can } = useGplacePermissions()
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [searchInput, setSearchInput] = useState("")
  const [effectiveSearch, setEffectiveSearch] = useState("")
  const [paginator, setPaginator] = useState<Paginator<Record<string, unknown>> | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState<{ id: number; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [stateId, setStateId] = useState("")
  const [cityId, setCityId] = useState("")
  const [form, setForm] = useState(emptyForm)

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
      const raw = await apiService.getAdminCustomers({
        page,
        per_page: perPage,
        search: effectiveSearch || undefined,
      })
      const inner = laravelInnerData<Paginator<Record<string, unknown>>>(raw)
      setPaginator(inner)
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar clientes.")
    } finally {
      setLoading(false)
    }
  }, [page, perPage, effectiveSearch])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setDialogMode("create")
    setEditingId(null)
    setForm(emptyForm())
    setStateId("")
    setCityId("")
    setDialogOpen(true)
  }

  const openEdit = async (row: Record<string, unknown>) => {
    const id = Number(row.id)
    setDialogMode("edit")
    setEditingId(id)
    try {
      const raw = await apiService.getAdminCustomer(id)
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
        state_registration: String(d.state_registration ?? ""),
        origin: String(d.origin ?? "1"),
        formal_name: String(d.formal_name ?? ""),
        birth_date: d.birth_date ? String(d.birth_date).slice(0, 10) : "",
        nif: maskCpfCnpj(String(d.nif ?? "")),
        name: String(d.name ?? ""),
        zip_code: d.zip_code != null ? maskCEP(String(d.zip_code)) : "",
        number: String(d.number ?? ""),
        street: String(d.street ?? ""),
        district: String(d.district ?? ""),
        phone: maskPhone(String(d.phone ?? "")),
        email: String(d.email ?? ""),
        contact: String(d.contact ?? ""),
        contact_phone: maskPhone(String(d.contact_phone ?? "")),
        contact_email: String(d.contact_email ?? ""),
      })
      setDialogOpen(true)
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar cliente.")
    }
  }

  const save = async () => {
    if (!cityId) {
      toast.error("Seleccione estado e cidade.")
      return
    }
    const nifDigits = unmaskDocument(form.nif.trim())
    if (!nifDigits) {
      toast.error("Informe um CPF/CNPJ válido.")
      return
    }
    if (dialogMode === "edit" && !editingId) {
      toast.error("ID inválido.")
      return
    }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        state_registration: form.state_registration.trim(),
        origin: Number(form.origin),
        formal_name: form.formal_name.trim(),
        nif: nifDigits,
        name: form.name.trim(),
        zip_code: form.zip_code.trim() ? unmaskCEP(form.zip_code) : "",
        number: form.number.trim(),
        street: form.street.trim(),
        district: form.district.trim(),
        phone: form.phone.trim() ? unmaskPhone(form.phone) : "",
        email: form.email.trim(),
        contact: form.contact.trim(),
        contact_phone: form.contact_phone.trim() ? unmaskPhone(form.contact_phone) : "",
        contact_email: form.contact_email.trim(),
        city_id: Number(cityId),
      }
      if (form.birth_date.trim()) payload.birth_date = form.birth_date.trim()
      else payload.birth_date = null

      if (dialogMode === "create") {
        await apiService.createAdminCustomer(payload)
        toast.success("Cliente criado.")
      } else {
        await apiService.updateAdminCustomer(editingId!, payload)
        toast.success("Cliente actualizado.")
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
            ? "Sem permissão ou cabeçalho «app» inválido. Confirme NEXT_PUBLIC_APP_TOKEN e permissões."
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
    setCustomerToDelete({ id: Number(row.id), name: String(row.name ?? "") })
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return
    setDeleting(true)
    try {
      await apiService.deleteAdminCustomer(customerToDelete.id)
      toast.success("Cliente removido.")
      setDeleteDialogOpen(false)
      setCustomerToDelete(null)
      void load()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      const msg = err.response?.data?.message
      toast.error(typeof msg === "string" ? msg : "Não foi possível eliminar.")
    } finally {
      setDeleting(false)
    }
  }

  if (!can("customers_view")) {
    return <AccessDenied />
  }

  const rows = paginator?.data ?? []
  const listTotal = paginator?.total ?? 0
  const totalPages = Math.max(1, paginator?.last_page ?? 1)
  const showingFrom = rows.length > 0 ? (page - 1) * perPage + 1 : 0
  const showingTo = rows.length > 0 ? Math.min(page * perPage, listTotal) : 0
  const hasFilters = effectiveSearch.length > 0

  const listSection = (() => {
    if (loading) {
      return <ClientesListSkeleton rowCount={Math.min(perPage, 10)} />
    }
    if (rows.length === 0) {
      return (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            {hasFilters
              ? "Nenhum cliente encontrado com os filtros aplicados."
              : 'Nenhum cliente nesta listagem. Clique em "Novo cliente" para começar.'}
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
                  <TableHead className="min-w-[200px]">Nome</TableHead>
                  <TableHead className="min-w-[140px] whitespace-nowrap">CPF/CNPJ</TableHead>
                  <TableHead className="min-w-[200px]">E-mail</TableHead>
                  <TableHead className="min-w-[160px]">Cidade</TableHead>
                  <TableHead className="min-w-[120px] text-right">Acções</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const email = row.email != null ? String(row.email) : ""
                  const nif = row.nif != null ? String(row.nif) : ""
                  const city = row.city != null ? String(row.city) : ""
                  return (
                    <TableRow key={String(row.id)}>
                      <TableCell className="py-2 tabular-nums text-muted-foreground">{String(row.id)}</TableCell>
                      <TableCell className="py-2">
                        <span className="text-sm font-semibold text-foreground">{String(row.name ?? "")}</span>
                      </TableCell>
                      <TableCell className="py-2 text-sm tabular-nums">
                        {nif ? (
                          <button
                            type="button"
                            title="Clique para copiar"
                            className="cursor-pointer border-0 bg-transparent p-0 text-left font-inherit text-muted-foreground hover:text-foreground hover:underline"
                            onClick={() => void handleCopyCpfCnpj(nif)}
                          >
                            {nif}
                          </button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
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
                      <TableCell className="py-2 text-sm text-muted-foreground">
                        {city ? (
                          <span className="inline-flex min-w-0 items-center gap-1.5">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{city}</span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
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
                            title="Eliminar cliente"
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
            const email = row.email != null ? String(row.email) : ""
            const nif = row.nif != null ? String(row.nif) : ""
            const city = row.city != null ? String(row.city) : ""
            return (
              <Card key={String(row.id)} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <UserCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <h3 className="truncate font-semibold text-foreground">{String(row.name ?? "")}</h3>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">ID {String(row.id)}</p>
                    </div>
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
                          {nif}
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
                    <dd className="m-0 text-muted-foreground">{city || "—"}</dd>
                  </dl>
                  <div className="flex gap-2 border-t pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 hover:bg-yellow-50 hover:text-yellow-800"
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
            <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
            <p className="mt-1 text-muted-foreground">
              Cadastro de clientes da loja actual (header <code className="text-xs">app</code>)
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
                      ? "Nenhum cliente nesta listagem."
                      : `Mostrando ${showingFrom}-${showingTo} de ${listTotal.toLocaleString("pt-BR")} cliente(s)`}
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
          <Button onClick={() => openCreate()} className="gap-2 self-start sm:self-auto">
            <Plus className="h-4 w-4" />
            Novo cliente
          </Button>
        </div>

        <Card className="p-4 sm:p-5">
          <div className="flex flex-wrap items-end gap-x-5 gap-y-4">
            <div className="min-w-0 w-full max-w-full sm:min-w-[220px] sm:max-w-md lg:max-w-xl">
              <Label htmlFor="search-customers" className="mb-1.5 block text-xs text-muted-foreground">
                Busca
              </Label>
              {loading && paginator === null ? (
                <Skeleton className="h-9 w-full rounded-md" />
              ) : (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="search-customers"
                    placeholder="Nome ou NIF…"
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
          <SheetContent className="p-0 sm:max-w-lg">
            <div className="flex h-full min-h-0 flex-col">
              <SheetHeader>
                <SheetTitle>{dialogMode === "create" ? "Novo cliente" : `Editar cliente #${editingId}`}</SheetTitle>
                <SheetDescription>Campos alinhados à validação da API admin. O CPF/CNPJ não pode ser alterado após a criação.</SheetDescription>
              </SheetHeader>
              <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto px-6 py-4">
                <div className="grid gap-2">
                  <Label>CPF/CNPJ</Label>
                  <Input
                    inputMode="numeric"
                    autoComplete="off"
                    value={form.nif}
                    onChange={(e) => setForm((f) => ({ ...f, nif: maskCpfCnpj(e.target.value) }))}
                    disabled={dialogMode === "edit"}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Nome</Label>
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
                  <Label>Origem</Label>
                  <Select value={form.origin} onValueChange={(v) => setForm((f) => ({ ...f, origin: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">E-commerce</SelectItem>
                      <SelectItem value="2">ERP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Inscrição estadual</Label>
                  <Input
                    value={form.state_registration}
                    onChange={(e) => setForm((f) => ({ ...f, state_registration: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Data de nascimento</Label>
                  <Input type="date" value={form.birth_date} onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))} />
                </div>
                <StateCitySelects
                  stateId={stateId}
                  cityId={cityId}
                  onStateChange={(s) => {
                    setStateId(s)
                    setCityId("")
                  }}
                  onCityChange={setCityId}
                  idPrefix="cli"
                />
                <div className="grid gap-2">
                  <Label>CEP</Label>
                  <Input
                    inputMode="numeric"
                    autoComplete="postal-code"
                    value={form.zip_code}
                    onChange={(e) => setForm((f) => ({ ...f, zip_code: maskCEP(e.target.value) }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Rua</Label>
                  <Input value={form.street} onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>Número</Label>
                  <Input value={form.number} onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>Bairro</Label>
                  <Input value={form.district} onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))} />
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
                  <Label>Contacto</Label>
                  <Input value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>Telefone do contacto</Label>
                  <Input
                    inputMode="tel"
                    value={form.contact_phone}
                    onChange={(e) => setForm((f) => ({ ...f, contact_phone: maskPhone(e.target.value) }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>E-mail do contacto</Label>
                  <Input
                    type="email"
                    value={form.contact_email}
                    onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
                  />
                </div>
              </div>
              <SheetFooter className="sm:space-x-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving || !unmaskDocument(form.nif.trim())}
                >
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
            if (!open) setCustomerToDelete(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <AlertDialogTitle>Eliminar cliente</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="pt-1">
                Tem a certeza de que deseja eliminar o cliente{" "}
                <strong className="text-foreground">{customerToDelete?.name ? `«${customerToDelete.name}»` : ""}</strong>
                {customerToDelete?.id != null ? ` (ID ${customerToDelete.id})` : ""}? Esta acção não pode ser desfeita.
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
