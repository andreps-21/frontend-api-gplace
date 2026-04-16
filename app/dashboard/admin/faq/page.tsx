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
import { Textarea } from "@/components/ui/textarea"
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

type FaqRow = { id: number; question?: string; answer?: string; url?: string | null; is_enabled?: number | boolean; position?: number | null }

export default function FaqGplacePage() {
  const { can } = useGplacePermissions()
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [paginator, setPaginator] = useState<Paginator<FaqRow> | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<FaqRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ question: "", answer: "", url: "", is_enabled: "1", position: "" })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await apiService.getAdminStoreFaqs({ page, per_page: 10 })
      const inner = laravelInnerData<Paginator<FaqRow>>(raw)
      setPaginator(inner)
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar FAQ.")
    } finally {
      setLoading(false)
    }
  }, [page])

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
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        question: form.question.trim(),
        answer: form.answer.trim(),
        url: form.url.trim() || null,
        is_enabled: form.is_enabled === "1" || form.is_enabled === "true",
      }
      if (form.position.trim()) payload.position = Number(form.position)
      if (editing) {
        await apiService.updateAdminStoreFaq(editing.id, payload)
        toast.success("FAQ actualizada.")
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
    if (!confirm(`Eliminar FAQ «${row.question}»?`)) return
    try {
      await apiService.deleteAdminStoreFaq(row.id)
      toast.success("Eliminada.")
      void load()
    } catch (e) {
      console.error(e)
      toast.error("Não foi possível eliminar.")
    }
  }

  if (!can("faq_view")) {
    return <AccessDenied />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">FAQ</h1>
        <p className="text-muted-foreground mt-1 text-sm">CRUD por loja (header <code className="text-xs">app</code>).</p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Perguntas</CardTitle>
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
                    <TableHead>Pergunta</TableHead>
                    <TableHead className="max-w-md">Resposta</TableHead>
                    <TableHead className="w-[100px]">Activa</TableHead>
                    <TableHead className="w-[100px]">Acções</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(paginator?.data ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.id}</TableCell>
                      <TableCell className="font-medium">{row.question}</TableCell>
                      <TableCell className="max-w-md truncate text-muted-foreground">{row.answer}</TableCell>
                      <TableCell>{row.is_enabled === true || row.is_enabled === 1 ? "Sim" : "Não"}</TableCell>
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
              <Label>Activa (1/0)</Label>
              <Input value={form.is_enabled} onChange={(e) => setForm((f) => ({ ...f, is_enabled: e.target.value }))} />
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
    </div>
  )
}
