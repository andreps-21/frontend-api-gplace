"use client"

import { useCallback, useEffect, useState } from "react"
import { apiService } from "@/lib/api"
import { laravelInnerData } from "@/lib/laravel-data"
import { useGplacePermissions } from "@/lib/use-gplace-permissions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PanelTableSkeleton } from "@/components/dashboard/panel-content-skeleton"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

type Paginator<T> = { data: T[]; current_page: number; last_page: number; total: number }
type TokenRow = { id: number; description?: string; store_id?: number; access_token_preview?: string | null }

export function StoreTokensTab() {
  const { can } = useGplacePermissions()
  const mayView = can("tokens_view")
  const mayCreate = can("tokens_create")
  const mayEdit = can("tokens_edit")
  const mayDelete = can("tokens_delete")
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [paginator, setPaginator] = useState<Paginator<TokenRow> | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TokenRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ description: "", regenerate: false })

  const load = useCallback(async () => {
    if (!mayView) return
    setLoading(true)
    try {
      const raw = await apiService.getAdminTokens({ page, per_page: 10 })
      setPaginator(laravelInnerData<Paginator<TokenRow>>(raw))
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar tokens.")
    } finally {
      setLoading(false)
    }
  }, [mayView, page])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm({ description: "", regenerate: false })
    setDialogOpen(true)
  }

  const openEdit = (row: TokenRow) => {
    setEditing(row)
    setForm({ description: row.description ?? "", regenerate: false })
    setDialogOpen(true)
  }

  const save = async () => {
    if (editing ? !mayEdit : !mayCreate) return
    setSaving(true)
    try {
      if (editing) {
        const raw = await apiService.updateAdminToken(editing.id, {
          description: form.description.trim(),
          regenerate_token: form.regenerate,
        })
        const inner = laravelInnerData<Record<string, unknown>>(raw)
        if (inner?.access_token_plain) {
          toast.success(`Token regenerado. Guarde: ${String(inner.access_token_plain)}`)
        } else {
          toast.success("Token atualizado.")
        }
      } else {
        const raw = await apiService.createAdminToken({ description: form.description.trim() })
        const inner = laravelInnerData<Record<string, unknown>>(raw)
        if (inner?.access_token_plain) {
          toast.success(`Criado. Guarde o token: ${String(inner.access_token_plain)}`)
        } else {
          toast.success("Token criado.")
        }
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

  const remove = async (row: TokenRow) => {
    if (!mayDelete) return
    if (!confirm(`Eliminar token "${row.description}"?`)) return
    try {
      await apiService.deleteAdminToken(row.id)
      toast.success("Token eliminado.")
      void load()
    } catch (e) {
      console.error(e)
      toast.error("Não foi possível eliminar.")
    }
  }

  if (!mayView) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tokens de integração</CardTitle>
          <CardDescription>Você não tem permissão para visualizar os tokens desta loja.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Tokens de integração da loja</CardTitle>
            <CardDescription>
              Tokens para APIs externas desta loja. O token completo é exibido apenas no momento da criação ou regeneração.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar"}
            </Button>
            {mayCreate ? (
              <Button type="button" size="sm" onClick={openCreate}>
                <Plus className="mr-1 h-4 w-4" />
                Novo token
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {loading && !paginator ? (
            <PanelTableSkeleton rows={10} columns={4} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead>Token</TableHead>
                    {(mayEdit || mayDelete) ? <TableHead className="w-[100px]">Ações</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(paginator?.data ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.description}</TableCell>
                      <TableCell>{row.store_id ?? "—"}</TableCell>
                      <TableCell className="max-w-[220px] truncate font-mono text-xs text-muted-foreground">
                        {row.access_token_preview ?? "—"}
                      </TableCell>
                      {(mayEdit || mayDelete) ? (
                        <TableCell>
                          <div className="flex gap-1">
                            {mayEdit ? (
                              <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(row)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            ) : null}
                            {mayDelete ? (
                              <Button type="button" variant="ghost" size="icon" onClick={() => void remove(row)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      ) : null}
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
                    <Button type="button" variant="outline" size="sm" disabled={page >= paginator.last_page || loading} onClick={() => setPage((p) => p + 1)}>
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
            <DialogTitle>{editing ? "Editar token" : "Novo token"}</DialogTitle>
            <DialogDescription>
              {editing ? "Marque regenerar para emitir um novo token." : "O token será vinculado automaticamente à loja atual."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1">
              <Label>Descrição</Label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} maxLength={50} />
            </div>
            {editing ? (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.regenerate} onCheckedChange={(value) => setForm((f) => ({ ...f, regenerate: value === true }))} />
                Regenerar token
              </label>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving || !form.description.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
