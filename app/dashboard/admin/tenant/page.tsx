"use client"

import { useCallback, useEffect, useState } from "react"
import { apiService } from "@/lib/api"
import { laravelInnerData } from "@/lib/laravel-data"
import { useGplacePermissions } from "@/lib/use-gplace-permissions"
import { AccessDenied } from "@/components/ui/access-denied"
import { StateCitySelects } from "@/components/admin/state-city-selects"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Loader2, Pencil } from "lucide-react"
import { toast } from "sonner"

type Paginator<T> = { data: T[]; current_page: number; last_page: number; total: number }

function readCityId(d: Record<string, unknown>): number | null {
  const v = d.city_id
  if (typeof v === "number" && !Number.isNaN(v)) return v
  if (typeof v === "string" && v.trim()) return Number(v)
  return null
}

export default function AdminTenantPage() {
  const { can } = useGplacePermissions()
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [paginator, setPaginator] = useState<Paginator<Record<string, unknown>> | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [tenantId, setTenantId] = useState<number | null>(null)
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
    contact: "",
    contact_phone: "",
    status: "1",
    dt_accession: "",
    due_date: "",
    due_day: "5",
    value: "",
    signature: "1",
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await apiService.getAdminTenants({ page, per_page: 15, search: search || undefined })
      const inner = laravelInnerData<Paginator<Record<string, unknown>>>(raw)
      setPaginator(inner)
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar titular.")
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    void load()
  }, [load])

  const openEdit = async () => {
    const first = paginator?.data?.[0]
    if (!first?.id) {
      toast.error("Sem titular na listagem.")
      return
    }
    const id = Number(first.id)
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
        nif: String(d.nif ?? ""),
        email: String(d.email ?? ""),
        phone: String(d.phone ?? ""),
        street: String(d.street ?? ""),
        contact: String(d.contact ?? ""),
        contact_phone: String(d.contact_phone ?? ""),
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
    if (!tenantId || !cityId) {
      toast.error("Seleccione cidade ou dados incompletos.")
      return
    }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        formal_name: form.formal_name.trim(),
        nif: form.nif.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        street: form.street.trim(),
        city_id: cityId,
        contact: form.contact.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        status: form.status,
        dt_accession: form.dt_accession,
        due_date: form.due_date,
        due_day: Number(form.due_day),
        value: parseFloat(String(form.value).replace(",", ".")) || 0,
        signature: Number(form.signature),
      }
      await apiService.updateAdminTenant(tenantId, payload)
      toast.success("Titular actualizado.")
      setDialogOpen(false)
      void load()
    } catch (e) {
      console.error(e)
      toast.error("Erro ao guardar.")
    } finally {
      setSaving(false)
    }
  }

  if (!can("tenants_view")) {
    return <AccessDenied />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Titular (tenant)</h1>
        <p className="text-muted-foreground mt-1 text-sm">Edição do tenant da loja actual (header <code className="text-xs">app</code>).</p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Listagem</CardTitle>
            <Button type="button" variant="secondary" size="sm" onClick={() => void openEdit()} disabled={!paginator?.data?.length}>
              <Pencil className="mr-1 h-4 w-4" />
              Editar titular
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
            <Input placeholder="Nome, razão social ou NIF…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
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
                    <TableHead>NIF</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(paginator?.data ?? []).map((row) => (
                    <TableRow key={String(row.id)}>
                      <TableCell>{String(row.id)}</TableCell>
                      <TableCell className="font-medium">{String(row.name ?? "")}</TableCell>
                      <TableCell>{String(row.nif ?? "")}</TableCell>
                      <TableCell>{String(row.city ?? "")}</TableCell>
                      <TableCell>{String(row.status ?? "")}</TableCell>
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
            <DialogTitle>Editar tenant #{tenantId}</DialogTitle>
            <DialogDescription>Campos conforme validação da API admin.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Razão social</Label>
              <Input value={form.formal_name} onChange={(e) => setForm((f) => ({ ...f, formal_name: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>NIF</Label>
              <Input value={form.nif} onChange={(e) => setForm((f) => ({ ...f, nif: e.target.value }))} />
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
              idPrefix="tenant"
            />
            <div className="grid gap-2">
              <Label>Contacto</Label>
              <Input value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Telefone do contacto</Label>
              <Input value={form.contact_phone} onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))} />
            </div>
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
