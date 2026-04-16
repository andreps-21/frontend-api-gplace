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
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

type Paginator<T> = { data: T[]; current_page: number; last_page: number; total: number }

function readCityId(d: Record<string, unknown>): number | null {
  const v = d.city_id
  if (typeof v === "number" && !Number.isNaN(v)) return v
  if (typeof v === "string" && v.trim()) return Number(v)
  return null
}

export default function AdminVendedoresPage() {
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
  const [form, setForm] = useState({
    state_registration: "",
    municipal_registration: "",
    birth_date: "",
    nif: "",
    name: "",
    zip_code: "",
    street: "",
    phone: "",
    email: "",
    status: "1",
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await apiService.getAdminSalesmen({ page, per_page: 15, search: search || undefined })
      const inner = laravelInnerData<Paginator<Record<string, unknown>>>(raw)
      setPaginator(inner)
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar vendedores.")
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setEditingId(null)
    setForm({
      state_registration: "",
      municipal_registration: "",
      birth_date: "",
      nif: "",
      name: "",
      zip_code: "",
      street: "",
      phone: "",
      email: "",
      status: "1",
    })
    setStateId("")
    setCityId("")
    setDialogOpen(true)
  }

  const openEdit = async (row: Record<string, unknown>) => {
    const id = Number(row.id)
    setEditingId(id)
    try {
      const raw = await apiService.getAdminSalesman(id)
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
        municipal_registration: String(d.municipal_registration ?? ""),
        birth_date: d.birth_date ? String(d.birth_date).slice(0, 10) : "",
        nif: String(d.nif ?? ""),
        name: String(d.name ?? ""),
        zip_code: String(d.zip_code ?? ""),
        street: String(d.street ?? ""),
        phone: String(d.phone ?? ""),
        email: String(d.email ?? ""),
        status: String(d.status ?? "1"),
      })
      setDialogOpen(true)
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar vendedor.")
    }
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
        status: form.status === "" ? null : Number(form.status),
      }
      if (form.birth_date.trim()) payload.birth_date = form.birth_date.trim()
      else payload.birth_date = null
      if (editingId) {
        await apiService.updateAdminSalesman(editingId, payload)
        toast.success("Vendedor actualizado.")
      } else {
        await apiService.createAdminSalesman(payload)
        toast.success("Vendedor criado.")
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
    if (!confirm(`Eliminar vendedor #${row.id}?`)) return
    try {
      await apiService.deleteAdminSalesman(Number(row.id))
      toast.success("Eliminado.")
      void load()
    } catch (e) {
      console.error(e)
      toast.error("Não foi possível eliminar.")
    }
  }

  if (!can("salesman_view")) {
    return <AccessDenied />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Vendedores</h1>
        <p className="text-muted-foreground mt-1 text-sm">CRUD por loja (header <code className="text-xs">app</code>).</p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Listagem</CardTitle>
            <Button type="button" size="sm" onClick={openCreate}>
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
                    <TableHead>Nome</TableHead>
                    <TableHead>NIF</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="w-[100px]">Acções</TableHead>
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
            <DialogTitle>{editingId ? `Editar vendedor #${editingId}` : "Novo vendedor"}</DialogTitle>
            <DialogDescription>Validação alinhada a <code className="text-xs">SalesmanAdminController</code>.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label>NIF</Label>
              <Input value={form.nif} onChange={(e) => setForm((f) => ({ ...f, nif: e.target.value }))} disabled={editingId != null} />
            </div>
            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Inscrição estadual</Label>
              <Input value={form.state_registration} onChange={(e) => setForm((f) => ({ ...f, state_registration: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Inscrição municipal</Label>
              <Input value={form.municipal_registration} onChange={(e) => setForm((f) => ({ ...f, municipal_registration: e.target.value }))} />
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
              idPrefix="vend"
            />
            <div className="grid gap-2">
              <Label>CEP</Label>
              <Input value={form.zip_code} onChange={(e) => setForm((f) => ({ ...f, zip_code: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Rua</Label>
              <Input value={form.street} onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Estado (registo)</Label>
              <Input
                placeholder="1 = activo (omissão)"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              />
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
