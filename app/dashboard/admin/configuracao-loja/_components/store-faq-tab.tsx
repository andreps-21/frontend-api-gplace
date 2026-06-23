"use client"

import { useCallback, useEffect, useState } from "react"
import { apiService } from "@/lib/api"
import { laravelInnerData } from "@/lib/laravel-data"
import { useGplacePermissions } from "@/lib/use-gplace-permissions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { PanelTableSkeleton } from "@/components/dashboard/panel-content-skeleton"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

type Paginator<T> = { data: T[]; current_page: number; last_page: number; total: number }
type FaqRow = { id: number; question?: string; answer?: string; url?: string | null; is_enabled?: number | boolean; position?: number | null }

export function StoreFaqTab() {
  const { can } = useGplacePermissions()
  const mayView = can("faq_view")
  const mayCreate = can("faq_create")
  const mayEdit = can("faq_edit")
  const mayDelete = can("faq_delete")
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [paginator, setPaginator] = useState<Paginator<FaqRow> | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<FaqRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ question: "", answer: "", url: "", is_enabled: "1", position: "" })

  const load = useCallback(async () => {
    if (!mayView) return
    setLoading(true)
    try {
      const raw = await apiService.getAdminStoreFaqs({ page, per_page: 10 })
      setPaginator(laravelInnerData<Paginator<FaqRow>>(raw))
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar FAQ.")
    } finally {
      setLoading(false)
    }
  }, [mayView, page])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm({ question: "", answer: "", url: "", is_enabled: "1", position: "" })
    setDialogOpen(true)
  }

  const openEdit = (row: FaqRow) => {
    setEditing(row)
    setForm({
      question: row.question ?? "",
      answer: row.answer ?? "",
      url: row.url ?? "",
      is_enabled: row.is_enabled === true || row.is_enabled === 1 ? "1" : "0",
      position: row.position != null ? String(row.position) : "",
    })
    setDialogOpen(true)
  }

  const save = async () => {
    if (editing ? !mayEdit : !mayCreate) return
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        question: form.question.trim(),
        answer: form.answer.trim(),
        url: form.url.trim() || null,
        is_enabled: form.is_enabled === "1",
      }
      if (form.position.trim()) payload.position = Number(form.position)
      if (editing) {
        await apiService.updateAdminStoreFaq(editing.id, payload)
        toast.success("FAQ atualizada.")
      } else {
        await apiService.createAdminStoreFaq(payload)
        toast.success("FAQ criada.")
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

  const remove = async (row: FaqRow) => {
    if (!mayDelete) return
    if (!confirm(`Eliminar FAQ "${row.question}"?`)) return
    try {
      await apiService.deleteAdminStoreFaq(row.id)
      toast.success("FAQ eliminada.")
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
          <CardTitle>FAQ</CardTitle>
          <CardDescription>Você não tem permissão para visualizar o FAQ da loja.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>FAQ da loja</CardTitle>
            <CardDescription>Perguntas frequentes exibidas no ecommerce desta loja.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar"}
            </Button>
            {mayCreate ? (
              <Button type="button" size="sm" onClick={openCreate}>
                <Plus className="mr-1 h-4 w-4" />
                Nova FAQ
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {loading && !paginator ? (
            <PanelTableSkeleton rows={10} columns={5} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pergunta</TableHead>
                    <TableHead className="max-w-md">Resposta</TableHead>
                    <TableHead className="w-[100px]">Ativa</TableHead>
                    {(mayEdit || mayDelete) ? <TableHead className="w-[100px]">Ações</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(paginator?.data ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.question}</TableCell>
                      <TableCell className="max-w-md truncate text-muted-foreground">{row.answer}</TableCell>
                      <TableCell>{row.is_enabled === true || row.is_enabled === 1 ? "Sim" : "Não"}</TableCell>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar FAQ" : "Nova FAQ"}</DialogTitle>
            <DialogDescription>Pergunta, resposta e URL opcional.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1">
              <Label>Pergunta</Label>
              <Input value={form.question} onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))} maxLength={40} />
            </div>
            <div className="grid gap-1">
              <Label>Resposta</Label>
              <Textarea value={form.answer} onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))} rows={5} />
            </div>
            <div className="grid gap-1">
              <Label>URL (opcional)</Label>
              <Input value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} />
            </div>
            <div className="grid gap-1">
              <Label>Ativa</Label>
              <Select value={form.is_enabled} onValueChange={(value) => setForm((f) => ({ ...f, is_enabled: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Sim</SelectItem>
                  <SelectItem value="0">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label>Posição (opcional)</Label>
              <Input value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving || !form.question.trim() || !form.answer.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
