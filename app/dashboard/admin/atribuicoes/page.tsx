"use client"

import { useCallback, useEffect, useState } from "react"
import { apiService } from "@/lib/api"
import { laravelInnerData } from "@/lib/laravel-data"
import { useGplacePermissions } from "@/lib/use-gplace-permissions"
import { AccessDenied } from "@/components/ui/access-denied"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, Shield } from "lucide-react"
import { PanelCheckboxListSkeleton, PanelTableSkeleton } from "@/components/dashboard/panel-content-skeleton"
import { toast } from "sonner"

type Paginator<T> = { data: T[]; current_page: number; last_page: number; total: number }

type RoleRow = { id: number; name: string; description?: string; guard_name?: string }

type PermRow = { id: number; name?: string; description?: string }

export default function AtribuicoesGplacePage() {
  const { can } = useGplacePermissions()
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [paginator, setPaginator] = useState<Paginator<RoleRow> | null>(null)

  const [permDialog, setPermDialog] = useState(false)
  const [roleEditing, setRoleEditing] = useState<RoleRow | null>(null)
  const [allPerms, setAllPerms] = useState<PermRow[]>([])
  const [permSel, setPermSel] = useState<number[]>([])
  const [loadingPerms, setLoadingPerms] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await apiService.getAdminStoreRoles({ page, per_page: 15, search: search || undefined })
      const inner = laravelInnerData<Paginator<RoleRow>>(raw)
      setPaginator(inner)
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar roles.")
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    void load()
  }, [load])

  const loadAllPermissions = async () => {
    const raw = await apiService.getAdminPermissions({ page: 1, per_page: 500 })
    const p = laravelInnerData<Paginator<PermRow>>(raw)
    setAllPerms(p.data ?? [])
  }

  const openPermissions = async (row: RoleRow) => {
    setRoleEditing(row)
    setLoadingPerms(true)
    setPermDialog(true)
    try {
      await loadAllPermissions()
      const raw = await apiService.getAdminStoreRole(row.id)
      const body = laravelInnerData<{ permission_ids: number[] }>(raw)
      setPermSel(body.permission_ids ?? [])
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar permissões.")
      setPermDialog(false)
    } finally {
      setLoadingPerms(false)
    }
  }

  const togglePerm = (id: number, checked: boolean) => {
    setPermSel((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)))
  }

  const savePermissions = async () => {
    if (!roleEditing) return
    setSaving(true)
    try {
      await apiService.syncAdminStoreRolePermissions(roleEditing.id, permSel)
      toast.success("Permissões actualizadas.")
      setPermDialog(false)
    } catch (e) {
      console.error(e)
      toast.error("Erro ao guardar.")
    } finally {
      setSaving(false)
    }
  }

  if (!can("roles_view")) {
    return <AccessDenied />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Atribuições (roles)</h1>
        <p className="text-muted-foreground mt-1 text-sm">Roles do tenant da loja; permissões via Spatie.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <CardTitle>Roles</CardTitle>
          <form
            className="flex w-full max-w-md gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              setPage(1)
              setSearch(searchInput.trim())
            }}
          >
            <Input placeholder="Nome ou descrição…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
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
                    <TableHead>Descrição</TableHead>
                    <TableHead>Guard</TableHead>
                    <TableHead className="w-[120px]">Acções</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(paginator?.data ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.id}</TableCell>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="max-w-md truncate">{row.description}</TableCell>
                      <TableCell>{row.guard_name}</TableCell>
                      <TableCell>
                        <Button type="button" variant="outline" size="sm" onClick={() => void openPermissions(row)}>
                          <Shield className="mr-1 h-4 w-4" />
                          Permissões
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

      <Dialog open={permDialog} onOpenChange={setPermDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Permissões — {roleEditing?.name}</DialogTitle>
            <DialogDescription>Marque as permissões e guarde (sincronização total).</DialogDescription>
          </DialogHeader>
          {loadingPerms ? (
            <PanelCheckboxListSkeleton rows={12} />
          ) : (
            <div className="max-h-[55vh] space-y-2 overflow-y-auto rounded-md border p-3">
              {allPerms.map((p) => (
                <label key={p.id} className="flex cursor-pointer items-start gap-2 text-sm">
                  <Checkbox
                    className="mt-0.5"
                    checked={permSel.includes(p.id)}
                    onCheckedChange={(c) => togglePerm(p.id, c === true)}
                  />
                  <span>
                    <span className="font-medium">{p.description ?? p.name ?? `#${p.id}`}</span>
                    {p.name ? <span className="block text-xs text-muted-foreground">{p.name}</span> : null}
                  </span>
                </label>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPermDialog(false)}>
              Fechar
            </Button>
            <Button type="button" onClick={() => void savePermissions()} disabled={saving || loadingPerms}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
