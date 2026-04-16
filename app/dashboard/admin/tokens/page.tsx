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
import { Checkbox } from "@/components/ui/checkbox"
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

type TokenRow = { id: number; description?: string; store_id?: number; access_token_preview?: string | null }

export default function TokensGplacePage() {
  const { can } = useGplacePermissions()
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [paginator, setPaginator] = useState<Paginator<TokenRow> | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TokenRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ description: "", store_id: "", regenerate: false })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await apiService.getAdminTokens({ page, per_page: 10 })
      const inner = laravelInnerData<Paginator<TokenRow>>(raw)
      setPaginator(inner)
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar tokens.")
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm({ description: "", store_id: "", regenerate: false })
    setDialogOpen(true)
  }

  const openEdit = (row: TokenRow) => {
    setEditing(row)
    setForm({
      description: row.description ?? "",
      store_id: row.store_id != null ? String(row.store_id) : "",
      regenerate: false,
    })
    setDialogOpen(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      if (editing) {
        const payload: Record<string, unknown> = {
          description: form.description.trim(),
          store_id: form.store_id.trim() ? Number(form.store_id) : undefined,
          regenerate_token: form.regenerate,
        }
        const raw = await apiService.updateAdminToken(editing.id, payload)
        const inner = laravelInnerData<Record<string, unknown>>(raw)
        if (inner?.access_token_plain) {
          toast.success(`Token regenerado. Guarde: ${String(inner.access_token_plain)}`)
        } else {
          toast.success("Token actualizado.")
        }
      } else {
        const payload: Record<string, unknown> = {
          description: form.description.trim(),
          store_id: form.store_id.trim() ? Number(form.store_id) : undefined,
        }
        const raw = await apiService.createAdminToken(payload)
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
    if (!confirm(`Eliminar token «${row.description}»?`)) return
    try {
      await apiService.deleteAdminToken(row.id)
      toast.success("Eliminado.")
      void load()
    } catch (e) {
      console.error(e)
      toast.error("Não foi possível eliminar.")
    }
  }

  if (!can("tokens_view")) {
    return <AccessDenied />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tokens de integração</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          CRUD global. Na criação a API devolve <code className="text-xs">access_token_plain</code> uma vez — guarde em local seguro.
        </p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Tokens</CardTitle>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar"}
            </Button>
            <Button type="button" size="sm" onClick={openCreate}>
              <Plus className="mr-1 h-4 w-4" />
              Novo
            </Button>
          </div>
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
                    <TableHead>Descrição</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead className="w-[100px]">Acções</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(paginator?.data ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.id}</TableCell>
                      <TableCell className="font-medium">{row.description}</TableCell>
                      <TableCell>{row.store_id ?? "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate font-mono text-xs text-muted-foreground">
                        {row.access_token_preview ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(row)}>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar token" : "Novo token"}</DialogTitle>
            <DialogDescription>
              {editing ? "Marque regenerar para novo token (mostrado uma vez)." : "Deixe loja vazio para usar a loja do header app."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1">
              <Label>Descrição</Label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} maxLength={50} />
            </div>
            <div className="grid gap-1">
              <Label>ID da loja (opcional)</Label>
              <Input value={form.store_id} onChange={(e) => setForm((f) => ({ ...f, store_id: e.target.value }))} />
            </div>
            {editing ? (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.regenerate} onCheckedChange={(v) => setForm((f) => ({ ...f, regenerate: v === true }))} />
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
    </div>
  )
}
