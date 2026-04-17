"use client"

import { useCallback, useEffect, useState } from "react"
import { apiService } from "@/lib/api"
import { laravelInnerData } from "@/lib/laravel-data"
import { useGplacePermissions } from "@/lib/use-gplace-permissions"
import { AccessDenied } from "@/components/ui/access-denied"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
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
  Building2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  UserPlus,
} from "lucide-react"
import { toast } from "sonner"
import { maskCpfCnpj, maskPhone, unmaskDocument, unmaskPhone } from "@/lib/masks"

type Paginator<T> = { data: T[]; current_page: number; last_page: number; total: number; per_page?: number }

function storeLabel(row: Record<string, unknown>): string {
  const store = row.store as Record<string, unknown> | undefined
  if (!store) return ""
  const people = store.people as Record<string, unknown> | undefined
  if (people?.name) return String(people.name)
  return String(store.id ?? "")
}

function phoneCell(row: Record<string, unknown>): string {
  const p = row.phone ?? row.cellphone
  return p != null ? String(p) : ""
}

function LeadsListSkeleton({ rowCount = 8 }: { rowCount?: number }) {
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
                <TableHead className="min-w-[200px]">E-mail</TableHead>
                <TableHead className="min-w-[140px]">Telefone</TableHead>
                <TableHead className="min-w-[160px]">Loja</TableHead>
                <TableHead className="min-w-[120px]">Estado</TableHead>
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

export default function AdminLeadsPage() {
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
  const [leadToDelete, setLeadToDelete] = useState<{ id: number; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nif: "", email: "", name: "", cellphone: "", status: "", observation: "" })

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
      const raw = await apiService.getAdminLeads({
        page,
        per_page: perPage,
        search: effectiveSearch || undefined,
      })
      const inner = laravelInnerData<Paginator<Record<string, unknown>>>(raw)
      setPaginator(inner)
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar leads.")
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
    setForm({ nif: "", email: "", name: "", cellphone: "", status: "", observation: "" })
    setDialogOpen(true)
  }

  const openEdit = async (id: number) => {
    setDialogMode("edit")
    setEditingId(id)
    try {
      const raw = await apiService.getAdminLead(id)
      const row = laravelInnerData<Record<string, unknown>>(raw)
      setForm({
        nif: maskCpfCnpj(String(row.nif ?? "")),
        email: String(row.email ?? ""),
        name: String(row.name ?? ""),
        cellphone: maskPhone(String(row.cellphone ?? row.phone ?? "")),
        status: row.status != null ? String(row.status) : "",
        observation: String(row.observation ?? ""),
      })
      setDialogOpen(true)
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar lead.")
    }
  }

  const save = async () => {
    const nifDigits = unmaskDocument(form.nif.trim())
    if (!nifDigits || !form.email.trim()) {
      toast.error("NIF e e-mail são obrigatórios.")
      return
    }
    if (dialogMode === "edit" && !editingId) {
      toast.error("ID inválido.")
      return
    }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        nif: nifDigits,
        email: form.email.trim(),
        name: form.name.trim() || undefined,
        cellphone: form.cellphone.trim() ? unmaskPhone(form.cellphone) : undefined,
        status: form.status.trim() ? form.status.trim() : undefined,
        observation: form.observation.trim() || undefined,
      }
      if (dialogMode === "create") {
        await apiService.createAdminLead(payload)
        toast.success("Lead criado.")
      } else {
        await apiService.updateAdminLead(editingId!, payload)
        toast.success("Lead actualizado.")
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

  const handleDeleteClick = (row: Record<string, unknown>) => {
    setLeadToDelete({ id: Number(row.id), name: String(row.name ?? "") })
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!leadToDelete) return
    setDeleting(true)
    try {
      await apiService.deleteAdminLead(leadToDelete.id)
      toast.success("Lead removido.")
      setDeleteDialogOpen(false)
      setLeadToDelete(null)
      void load()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      const msg = err.response?.data?.message
      toast.error(typeof msg === "string" ? msg : "Não foi possível eliminar.")
    } finally {
      setDeleting(false)
    }
  }

  if (!can("leads_view")) {
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
      return <LeadsListSkeleton rowCount={Math.min(perPage, 10)} />
    }
    if (rows.length === 0) {
      return (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            {hasFilters
              ? "Nenhum lead encontrado com os filtros aplicados."
              : 'Nenhum lead nesta listagem. Clique em "Novo lead" para começar.'}
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
                  <TableHead className="min-w-[200px]">E-mail</TableHead>
                  <TableHead className="min-w-[140px] whitespace-nowrap">Telefone</TableHead>
                  <TableHead className="min-w-[160px]">Loja</TableHead>
                  <TableHead className="min-w-[120px]">Estado</TableHead>
                  <TableHead className="min-w-[120px] text-right">Acções</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const email = row.email != null ? String(row.email) : ""
                  const tel = phoneCell(row)
                  const st = String(row.status ?? "").trim()
                  const loja = storeLabel(row)
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
                      <TableCell className="py-2 text-sm tabular-nums text-muted-foreground">
                        {tel ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Phone className="h-3 w-3 shrink-0" />
                            {tel}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="py-2 text-sm text-muted-foreground">
                        {loja ? (
                          <span className="inline-flex min-w-0 items-center gap-1.5">
                            <Building2 className="h-3 w-3 shrink-0" />
                            <span className="truncate">{loja}</span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="py-2">
                        {st ? (
                          <Badge variant="outline" className="text-[11px]">
                            {st}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 hover:bg-yellow-50 hover:text-yellow-800"
                            onClick={() => void openEdit(Number(row.id))}
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 hover:bg-red-50 hover:text-red-600"
                            title="Eliminar lead"
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
            const tel = phoneCell(row)
            const st = String(row.status ?? "").trim()
            const loja = storeLabel(row)
            return (
              <Card key={String(row.id)} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <h3 className="truncate font-semibold text-foreground">{String(row.name ?? "")}</h3>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">ID {String(row.id)}</p>
                    </div>
                    {st ? (
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {st}
                      </Badge>
                    ) : null}
                  </div>
                  <dl className="grid grid-cols-[minmax(0,auto)_1fr] gap-x-3 gap-y-2 border-t pt-3 text-sm">
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
                    <dt className="text-xs text-muted-foreground">Telefone</dt>
                    <dd className="m-0 text-muted-foreground">{tel || "—"}</dd>
                    <dt className="text-xs text-muted-foreground">Loja</dt>
                    <dd className="m-0 text-muted-foreground">{loja || "—"}</dd>
                  </dl>
                  <div className="flex gap-2 border-t pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 hover:bg-yellow-50 hover:text-yellow-800"
                      onClick={() => void openEdit(Number(row.id))}
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
            <h1 className="text-3xl font-bold text-foreground">Leads</h1>
            <p className="mt-1 text-muted-foreground">
              Cadastro de leads da loja actual (header <code className="text-xs">app</code>)
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
                      ? "Nenhum lead nesta listagem."
                      : `Mostrando ${showingFrom}-${showingTo} de ${listTotal.toLocaleString("pt-BR")} lead(s)`}
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
            Novo lead
          </Button>
        </div>

        <Card className="p-4 sm:p-5">
          <div className="flex flex-wrap items-end gap-x-5 gap-y-4">
            <div className="min-w-0 w-full max-w-full sm:min-w-[220px] sm:max-w-md lg:max-w-xl">
              <Label htmlFor="search-leads" className="mb-1.5 block text-xs text-muted-foreground">
                Busca
              </Label>
              {loading && paginator === null ? (
                <Skeleton className="h-9 w-full rounded-md" />
              ) : (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="search-leads"
                    placeholder="Nome, e-mail ou NIF…"
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
                <SheetTitle>{dialogMode === "create" ? "Novo lead" : `Editar lead #${editingId}`}</SheetTitle>
                <SheetDescription>
                  NIF e e-mail são obrigatórios. A API valida o formato de CPF/CNPJ. Em edição, NIF e e-mail não podem ser
                  alterados.
                </SheetDescription>
              </SheetHeader>
              <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto px-6 py-4">
                <div className="grid gap-2">
                  <Label>NIF</Label>
                  <Input
                    inputMode="numeric"
                    autoComplete="off"
                    value={form.nif}
                    onChange={(e) => setForm((f) => ({ ...f, nif: maskCpfCnpj(e.target.value) }))}
                    disabled={dialogMode === "edit"}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    disabled={dialogMode === "edit"}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Nome</Label>
                  <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>Telemóvel / celular</Label>
                  <Input
                    inputMode="tel"
                    autoComplete="tel"
                    value={form.cellphone}
                    onChange={(e) => setForm((f) => ({ ...f, cellphone: maskPhone(e.target.value) }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Estado</Label>
                  <Input value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>Observação</Label>
                  <Textarea
                    value={form.observation}
                    onChange={(e) => setForm((f) => ({ ...f, observation: e.target.value }))}
                    className="min-h-[88px] resize-y"
                    placeholder="Notas internas…"
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
                  disabled={saving || !unmaskDocument(form.nif.trim()) || !form.email.trim()}
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
            if (!open) setLeadToDelete(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <AlertDialogTitle>Eliminar lead</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="pt-1">
                Tem a certeza de que deseja eliminar o lead{" "}
                <strong className="text-foreground">{leadToDelete?.name ? `«${leadToDelete.name}»` : ""}</strong>
                {leadToDelete?.id != null ? ` (ID ${leadToDelete.id})` : ""}? Esta acção não pode ser desfeita.
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
