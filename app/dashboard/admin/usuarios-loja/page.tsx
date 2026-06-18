"use client"

import { useCallback, useEffect, useState } from "react"
import { apiService } from "@/lib/api"
import { laravelInnerData, laravelValidationErrorText } from "@/lib/laravel-data"
import { useGplacePermissions } from "@/lib/use-gplace-permissions"
import { AccessDenied } from "@/components/ui/access-denied"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import CitySearch from "@/components/ui/city-search"
import { Loader2, Pencil, Plus, Trash2, UserMinus, UserPlus } from "lucide-react"
import { PanelTableSkeleton } from "@/components/dashboard/panel-content-skeleton"
import { toast } from "sonner"

type Paginator<T> = { data: T[]; current_page: number; last_page: number; total: number }
type RoleRow = { id: number; name: string; description?: string }
type StoreRow = { id: number; name?: string; formal_name?: string }

export default function UsuariosLojaGplacePage() {
  const { can } = useGplacePermissions()
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [paginator, setPaginator] = useState<Paginator<Record<string, unknown>> | null>(null)
  const [attachUserId, setAttachUserId] = useState("")
  const [attaching, setAttaching] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [roles, setRoles] = useState<RoleRow[]>([])
  const [stores, setStores] = useState<StoreRow[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    name: "",
    formal_name: "",
    email: "",
    phone: "",
    nif: "",
    city_id: "",
    role_id: "",
    store_ids: [] as number[],
    password: "",
    password_confirmation: "",
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await apiService.getAdminStoreUsers({ page, per_page: 15, search: search || undefined })
      const inner = laravelInnerData<Paginator<Record<string, unknown>>>(raw)
      setPaginator(inner)
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar utilizadores.")
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    apiService.getAdminStoreRoles({ page: 1, per_page: 100 })
      .then((raw) => {
        const p = laravelInnerData<Paginator<RoleRow>>(raw)
        setRoles(p.data ?? [])
      })
      .catch(() => setRoles([]))
    apiService.getAdminStores({ page: 1, per_page: 100 })
      .then((raw) => {
        const p = laravelInnerData<Paginator<StoreRow>>(raw)
        setStores(p.data ?? [])
      })
      .catch(() => setStores([]))
  }, [])

  const attach = async () => {
    const id = Number.parseInt(attachUserId.trim(), 10)
    if (!Number.isFinite(id) || id < 1) {
      toast.error("Indique um ID de utilizador válido.")
      return
    }
    setAttaching(true)
    try {
      await apiService.attachAdminStoreUser(id)
      toast.success("Utilizador associado à loja.")
      setAttachUserId("")
      void load()
    } catch (e) {
      console.error(e)
      toast.error("Erro ao associar.")
    } finally {
      setAttaching(false)
    }
  }

  const detach = async (userId: number) => {
    if (!confirm(`Remover utilizador ${userId} desta loja?`)) return
    try {
      await apiService.detachAdminStoreUser(userId)
      toast.success("Removido da loja.")
      void load()
    } catch (e) {
      console.error(e)
      toast.error("Erro ao remover.")
    }
  }

  const openCreate = () => {
    setForm({
      name: "",
      formal_name: "",
      email: "",
      phone: "",
      nif: "",
      city_id: "",
      role_id: "",
      store_ids: [],
      password: "",
      password_confirmation: "",
    })
    setEditingId(null)
    setDialogOpen(true)
  }

  const openEdit = async (id: number) => {
    setSaving(true)
    try {
      const raw = await apiService.getAdminStoreUser(id)
      const user = laravelInnerData<Record<string, any>>(raw)
      setEditingId(id)
      setForm({
        name: String(user.name ?? ""),
        formal_name: String(user.formal_name ?? ""),
        email: String(user.email ?? ""),
        phone: String(user.phone ?? ""),
        nif: String(user.nif ?? ""),
        city_id: user.city_id != null ? String(user.city_id) : "",
        role_id: user.roles?.[0]?.id != null ? String(user.roles[0].id) : "",
        store_ids: Array.isArray(user.stores) ? user.stores.map((s: StoreRow) => Number(s.id)) : [],
        password: "",
        password_confirmation: "",
      })
      setDialogOpen(true)
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar utilizador.")
    } finally {
      setSaving(false)
    }
  }

  const saveUser = async () => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        city_id: Number(form.city_id),
        role_id: Number(form.role_id),
        store_ids: form.store_ids,
      }
      if (editingId) {
        await apiService.updateAdminStoreUser(editingId, payload)
      } else {
        await apiService.createAdminStoreUser(payload)
      }
      toast.success(editingId ? "Utilizador atualizado." : "Utilizador criado e associado à loja.")
      setDialogOpen(false)
      void load()
    } catch (e) {
      console.error(e)
      toast.error(laravelValidationErrorText(e) ?? "Erro ao criar utilizador.")
    } finally {
      setSaving(false)
    }
  }

  const deleteUser = async (id: number) => {
    if (!confirm(`Remover utilizador ${id}? Se ele só estiver nestas lojas, será apagado.`)) return
    try {
      await apiService.deleteAdminStoreUser(id)
      toast.success("Utilizador removido.")
      void load()
    } catch (e) {
      console.error(e)
      toast.error("Erro ao remover utilizador.")
    }
  }

  const toggleStore = (id: number, checked: boolean) => {
    setForm((f) => ({
      ...f,
      store_ids: checked ? Array.from(new Set([...f.store_ids, id])) : f.store_ids.filter((x) => x !== id),
    }))
  }

  if (!can("users_view")) {
    return <AccessDenied />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Usuários da loja</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Lista filtrada pelo header <code className="text-xs">app</code>. Associe utilizadores existentes por ID (pivot{" "}
          <code className="text-xs">store_user</code>).
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Associar utilizador</CardTitle>
          <Button type="button" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Criar utilizador
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grid flex-1 gap-1">
            <Label htmlFor="attach-uid">ID do utilizador</Label>
            <Input id="attach-uid" placeholder="ex.: 12" value={attachUserId} onChange={(e) => setAttachUserId(e.target.value)} />
          </div>
          <Button type="button" onClick={() => void attach()} disabled={attaching}>
            {attaching ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="mr-1 h-4 w-4" />}
            Associar
          </Button>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingId ? "Editar utilizador" : "Novo utilizador da loja"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid gap-1"><Label>Nome formal</Label><Input value={form.formal_name} onChange={(e) => setForm((f) => ({ ...f, formal_name: e.target.value }))} /></div>
            <div className="grid gap-1"><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
            <div className="grid gap-1"><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
            <div className="grid gap-1"><Label>NIF/CPF/CNPJ</Label><Input value={form.nif} onChange={(e) => setForm((f) => ({ ...f, nif: e.target.value }))} /></div>
            <div className="grid gap-1">
              <CitySearch
                value={form.city_id ? `Cidade #${form.city_id}` : ""}
                onCitySelect={(city) => setForm((f) => ({ ...f, city_id: String(city.id) }))}
                onStateChange={() => undefined}
                label="Cidade"
                required
              />
            </div>
            <div className="grid gap-1 sm:col-span-2">
              <Label>Role</Label>
              <Select value={form.role_id || undefined} onValueChange={(v) => setForm((f) => ({ ...f, role_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione uma role" /></SelectTrigger>
                <SelectContent>
                  {roles.map((role) => <SelectItem key={role.id} value={String(role.id)}>{role.description || role.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1"><Label>Senha</Label><Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} /></div>
            <div className="grid gap-1"><Label>Confirmar senha</Label><Input type="password" value={form.password_confirmation} onChange={(e) => setForm((f) => ({ ...f, password_confirmation: e.target.value }))} /></div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>Lojas vinculadas</Label>
              <div className="grid max-h-40 gap-2 overflow-auto rounded-md border p-3 sm:grid-cols-2">
                {stores.map((store) => (
                  <label key={store.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.store_ids.includes(store.id)} onCheckedChange={(v) => toggleStore(store.id, Boolean(v))} />
                    {store.name || store.formal_name || `Loja #${store.id}`}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => void saveUser()} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <CardTitle>Listagem</CardTitle>
          <form
            className="flex w-full max-w-md gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              setPage(1)
              setSearch(searchInput.trim())
            }}
          >
            <Input placeholder="Nome, e-mail ou NIF…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
            <Button type="submit" variant="secondary">
              Pesquisar
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          {loading && !paginator ? (
            <PanelTableSkeleton rows={10} columns={5} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>NIF</TableHead>
                    <TableHead className="w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(paginator?.data ?? []).map((row) => (
                    <TableRow key={String(row.id)}>
                      <TableCell>{String(row.id)}</TableCell>
                      <TableCell className="font-medium">{String(row.name ?? "")}</TableCell>
                      <TableCell>{String(row.email ?? "")}</TableCell>
                      <TableCell>{String(row.nif ?? "")}</TableCell>
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon" title="Editar" onClick={() => void openEdit(Number(row.id))}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" title="Remover desta loja" onClick={() => void detach(Number(row.id))}>
                          <UserMinus className="h-4 w-4 text-destructive" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" title="Apagar utilizador" onClick={() => void deleteUser(Number(row.id))}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
    </div>
  )
}
