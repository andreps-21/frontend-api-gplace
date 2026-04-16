"use client"

import { useCallback, useEffect, useState } from "react"
import { apiService } from "@/lib/api"
import { laravelInnerData } from "@/lib/laravel-data"
import { useGplacePermissions } from "@/lib/use-gplace-permissions"
import { AccessDenied } from "@/components/ui/access-denied"
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

function storeLabel(row: Record<string, unknown>): string {
  const store = row.store as Record<string, unknown> | undefined
  if (!store) return ""
  const people = store.people as Record<string, unknown> | undefined
  if (people?.name) return String(people.name)
  return String(store.id ?? "")
}

export default function AdminLeadsPage() {
  const { can } = useGplacePermissions()
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [paginator, setPaginator] = useState<Paginator<Record<string, unknown>> | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nif: "", email: "", name: "", cellphone: "", status: "", observation: "" })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await apiService.getAdminLeads({ page, per_page: 15, search: search || undefined })
      const inner = laravelInnerData<Paginator<Record<string, unknown>>>(raw)
      setPaginator(inner)
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar leads.")
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setEditingId(null)
    setForm({ nif: "", email: "", name: "", cellphone: "", status: "", observation: "" })
    setDialogOpen(true)
  }

  const openEdit = async (id: number) => {
    setEditingId(id)
    try {
      const raw = await apiService.getAdminLead(id)
      const row = laravelInnerData<Record<string, unknown>>(raw)
      setForm({
        nif: String(row.nif ?? ""),
        email: String(row.email ?? ""),
        name: String(row.name ?? ""),
        cellphone: String(row.cellphone ?? row.phone ?? ""),
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
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        nif: form.nif.trim(),
        email: form.email.trim(),
        name: form.name.trim() || undefined,
        cellphone: form.cellphone.trim() || undefined,
        status: form.status.trim() ? form.status.trim() : undefined,
        observation: form.observation.trim() || undefined,
      }
      if (editingId) {
        await apiService.updateAdminLead(editingId, payload)
        toast.success("Lead actualizado.")
      } else {
        await apiService.createAdminLead(payload)
        toast.success("Lead criado.")
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

  const remove = async (id: number) => {
    if (!confirm("Eliminar este lead?")) return
    try {
      await apiService.deleteAdminLead(id)
      toast.success("Eliminado.")
      void load()
    } catch (e) {
      console.error(e)
      toast.error("Não foi possível eliminar.")
    }
  }

  if (!can("leads_view")) {
    return <AccessDenied />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
        <p className="text-muted-foreground mt-1 text-sm">CRUD da loja actual (header <code className="text-xs">app</code>).</p>
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
            <Input placeholder="Nome, e-mail ou NIF…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
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
                    <TableHead>E-mail</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[100px]">Acções</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(paginator?.data ?? []).map((row) => (
                    <TableRow key={String(row.id)}>
                      <TableCell>{String(row.id)}</TableCell>
                      <TableCell className="font-medium">{String(row.name ?? "")}</TableCell>
                      <TableCell>{String(row.email ?? "")}</TableCell>
                      <TableCell>{String(row.phone ?? row.cellphone ?? "")}</TableCell>
                      <TableCell>{storeLabel(row)}</TableCell>
                      <TableCell>{String(row.status ?? "")}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button type="button" variant="ghost" size="icon" onClick={() => void openEdit(Number(row.id))}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" onClick={() => void remove(Number(row.id))}>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar lead" : "Novo lead"}</DialogTitle>
            <DialogDescription>NIF e e-mail são obrigatórios (validação CPF/CNPJ na API).</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1">
              <Label>NIF</Label>
              <Input value={form.nif} onChange={(e) => setForm((f) => ({ ...f, nif: e.target.value }))} disabled={editingId != null} />
            </div>
            <div className="grid gap-1">
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} disabled={editingId != null} />
            </div>
            <div className="grid gap-1">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid gap-1">
              <Label>Telemóvel / celular</Label>
              <Input value={form.cellphone} onChange={(e) => setForm((f) => ({ ...f, cellphone: e.target.value }))} />
            </div>
            <div className="grid gap-1">
              <Label>Estado</Label>
              <Input value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} />
            </div>
            <div className="grid gap-1">
              <Label>Observação</Label>
              <Input value={form.observation} onChange={(e) => setForm((f) => ({ ...f, observation: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving || !form.nif.trim() || !form.email.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
