"use client"

import { useCallback, useEffect, useState } from "react"
import { laravelInnerData, laravelValidationErrorText } from "@/lib/laravel-data"
import { useGplacePermissions } from "@/lib/use-gplace-permissions"
import { AccessDenied } from "@/components/ui/access-denied"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { PanelTableSkeleton } from "@/components/dashboard/panel-content-skeleton"
import { toast } from "sonner"

type Paginator<T> = { data: T[]; current_page: number; last_page: number; total: number }
type Row = Record<string, unknown> & { id: number }
type Field = { key: string; label: string; type?: "text" | "boolean"; required?: boolean }

export function SimpleResourcePage(props: {
  title: string
  description: string
  permission: string
  fields: Field[]
  columns: Field[]
  load: (params?: { page?: number; per_page?: number; search?: string }) => Promise<unknown>
  create: (payload: Record<string, unknown>) => Promise<unknown>
  update: (id: number, payload: Record<string, unknown>) => Promise<unknown>
  remove: (id: number) => Promise<unknown>
}) {
  const { title, description, permission, fields, columns, load, create, update, remove: removeRecord } = props
  const { can } = useGplacePermissions()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [rows, setRows] = useState<Paginator<Row> | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})

  const loadRows = useCallback(async () => {
    setLoading(true)
    try {
      setRows(laravelInnerData<Paginator<Row>>(await load({ page: 1, per_page: 100 })))
    } catch (e) {
      console.error(e)
      toast.error(`Erro ao carregar ${title.toLowerCase()}.`)
    } finally {
      setLoading(false)
    }
  }, [load, title])

  useEffect(() => { void loadRows() }, [loadRows])

  if (!can(permission)) return <AccessDenied />

  const permissionBase = permission.replace(/_view$/, "")
  const mayCreate = can(`${permissionBase}_create`)
  const mayEdit = can(`${permissionBase}_edit`)
  const mayDelete = can(`${permissionBase}_delete`)

  const open = (row?: Row) => {
    if (row && !mayEdit) {
      toast.error("Sem permissão para editar este registro.")
      return
    }
    if (!row && !mayCreate) {
      toast.error("Sem permissão para criar registros.")
      return
    }
    setEditing(row ?? null)
    const next: Record<string, string> = {}
    for (const field of fields) {
      const value = row?.[field.key]
      next[field.key] = field.type === "boolean" ? (value ? "1" : "0") : String(value ?? "")
    }
    setForm(next)
    setDialogOpen(true)
  }

  const payload = () => Object.fromEntries(fields.map((field) => {
    const value = form[field.key] ?? ""
    return [field.key, field.type === "boolean" ? value === "1" : value]
  }))

  const save = async () => {
    setSaving(true)
    try {
      if (editing) await update(editing.id, payload())
      else await create(payload())
      toast.success(editing ? "Registro atualizado." : "Registro criado.")
      setDialogOpen(false)
      void loadRows()
    } catch (e) {
      console.error(e)
      const status = typeof e === "object" && e !== null && "status" in e ? Number((e as { status?: unknown }).status) : null
      toast.error(status === 403 ? "Sem permissão para salvar este registro." : laravelValidationErrorText(e) ?? "Erro ao salvar.")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row: Row) => {
    if (!mayDelete) {
      toast.error("Sem permissão para excluir este registro.")
      return
    }
    if (!confirm(`Remover registro ${row.id}?`)) return
    try {
      await removeRecord(row.id)
      toast.success("Registro removido.")
      void loadRows()
    } catch (e) {
      console.error(e)
      const status = typeof e === "object" && e !== null && "status" in e ? Number((e as { status?: unknown }).status) : null
      toast.error(status === 403 ? "Sem permissão para excluir este registro." : "Erro ao remover.")
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        </div>
        {mayCreate ? <Button onClick={() => open()}><Plus className="mr-2 h-4 w-4" />Novo</Button> : null}
      </div>
      <Card>
        <CardHeader><CardTitle>Listagem</CardTitle></CardHeader>
        <CardContent>
          {loading ? <PanelTableSkeleton rows={8} columns={columns.length + 1} /> : (
            <Table>
              <TableHeader><TableRow>{columns.map((field) => <TableHead key={field.key}>{field.label}</TableHead>)}{mayEdit || mayDelete ? <TableHead className="text-right">Ações</TableHead> : null}</TableRow></TableHeader>
              <TableBody>{(rows?.data ?? []).map((row) => <TableRow key={row.id}>{columns.map((field) => <TableCell key={field.key}>{field.type === "boolean" ? (row[field.key] ? "Sim" : "Não") : String(row[field.key] ?? "")}</TableCell>)}{mayEdit || mayDelete ? <TableCell className="text-right">{mayEdit ? <Button variant="ghost" size="icon" onClick={() => open(row)}><Pencil className="h-4 w-4" /></Button> : null}{mayDelete ? <Button variant="ghost" size="icon" onClick={() => void remove(row)}><Trash2 className="h-4 w-4 text-destructive" /></Button> : null}</TableCell> : null}</TableRow>)}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? `Editar ${title}` : `Novo ${title}`}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            {fields.map((field) => (
              <div key={field.key} className="grid gap-1">
                <Label>{field.label}</Label>
                {field.type === "boolean" ? (
                  <Select value={form[field.key] ?? "1"} onValueChange={(v) => setForm((f) => ({ ...f, [field.key]: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="1">Sim</SelectItem><SelectItem value="0">Não</SelectItem></SelectContent>
                  </Select>
                ) : (
                  <Input value={form[field.key] ?? ""} onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))} required={field.required} />
                )}
              </div>
            ))}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={() => void save()} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
