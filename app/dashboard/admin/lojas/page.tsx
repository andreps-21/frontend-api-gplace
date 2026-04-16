"use client"

import { useCallback, useEffect, useState } from "react"
import { apiService } from "@/lib/api"
import { laravelInnerData } from "@/lib/laravel-data"
import { useGplacePermissions } from "@/lib/use-gplace-permissions"
import { AccessDenied } from "@/components/ui/access-denied"
import { StateCitySelects } from "@/components/admin/state-city-selects"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

type Paginator<T> = { data: T[]; current_page: number; last_page: number; total: number }

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

export default function AdminLojasPage() {
  const { can } = useGplacePermissions()
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [paginator, setPaginator] = useState<Paginator<Record<string, unknown>> | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [stateId, setStateId] = useState("")
  const [cityId, setCityId] = useState("")
  const [paymentMethods, setPaymentMethods] = useState<Array<{ id: number; name?: string }>>([])
  const [paymentSel, setPaymentSel] = useState<number[]>([])
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

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await apiService.getAdminStores({ page, per_page: 15, search: search || undefined })
      const inner = laravelInnerData<Paginator<Record<string, unknown>>>(raw)
      setPaginator(inner)
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar lojas.")
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setEditingId(null)
    setForm({ name: "", formal_name: "", nif: "", email: "", phone: "", street: "", status: "1" })
    setStateId("")
    setCityId("")
    setPaymentSel([])
    setDialogOpen(true)
  }

  const openEdit = async (row: Record<string, unknown>) => {
    const id = Number(row.id)
    setEditingId(id)
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
        nif: String(d.nif ?? ""),
        email: String(d.email ?? ""),
        phone: String(d.phone ?? ""),
        street: String(d.street ?? ""),
        status: String(d.status ?? "1"),
      })
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
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        ...form,
        city_id: cityId,
        status: Number(form.status),
        paymentMethods: paymentSel,
      }
      if (editingId) {
        await apiService.updateAdminStore(editingId, payload)
        toast.success("Loja actualizada.")
      } else {
        await apiService.createAdminStore(payload)
        toast.success("Loja criada.")
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
    if (!confirm(`Eliminar loja #${row.id}?`)) return
    try {
      await apiService.deleteAdminStore(Number(row.id))
      toast.success("Eliminada.")
      void load()
    } catch (e) {
      console.error(e)
      toast.error("Não foi possível eliminar.")
    }
  }

  if (!can("stores_view")) {
    return <AccessDenied />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lojas</h1>
        <p className="text-muted-foreground mt-1 text-sm">CRUD por tenant (header <code className="text-xs">app</code>).</p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Listagem</CardTitle>
            <Button type="button" size="sm" onClick={openCreate}>
              <Plus className="mr-1 h-4 w-4" />
              Nova
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
            <Input placeholder="Nome ou NIF…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
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
                    <TableHead>Loja</TableHead>
                    <TableHead>NIF</TableHead>
                    <TableHead>Titular</TableHead>
                    <TableHead>Estado loja</TableHead>
                    <TableHead className="w-[100px]">Acções</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(paginator?.data ?? []).map((row) => (
                    <TableRow key={String(row.id)}>
                      <TableCell>{String(row.id)}</TableCell>
                      <TableCell className="font-medium">{String(row.name ?? "")}</TableCell>
                      <TableCell>{String(row.nif ?? "")}</TableCell>
                      <TableCell>{tenantPersonName(row)}</TableCell>
                      <TableCell>{String(row.status ?? "")}</TableCell>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? `Editar loja #${editingId}` : "Nova loja"}</DialogTitle>
            <DialogDescription>Dados da pessoa jurídica e métodos de pagamento aceites nesta loja.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label>NIF</Label>
              <Input value={form.nif} onChange={(e) => setForm((f) => ({ ...f, nif: e.target.value }))} disabled={editingId != null} />
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
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
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
                      <Checkbox
                        checked={paymentSel.includes(pm.id)}
                        onCheckedChange={(c) => togglePm(pm.id, c === true)}
                      />
                      <span>{pm.name ?? `ID ${pm.id}`}</span>
                    </label>
                  ))
                )}
              </div>
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
