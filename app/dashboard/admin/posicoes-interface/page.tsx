"use client"

import { useCallback, useEffect, useState } from "react"
import { apiService } from "@/lib/api"
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

type PositionRow = { id: number; id_position: string; position_name: string; is_enabled?: boolean | number }

const emptyForm = { id_position: "", position_name: "", is_enabled: "1" }

export default function AdminPosicoesInterfacePage() {
  const { can } = useGplacePermissions()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<PositionRow[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<PositionRow | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = laravelInnerData<PositionRow[]>(await apiService.getAdminInterfacePositions({ all: true }))
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar posições.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (!can("interface-positions_view")) return <AccessDenied />
  const mayCreate = can("interface-positions_create")
  const mayEdit = can("interface-positions_edit")
  const mayDelete = can("interface-positions_delete")

  const open = (row?: PositionRow) => {
    setEditing(row ?? null)
    setForm(row ? {
      id_position: row.id_position,
      position_name: row.position_name,
      is_enabled: String(Number(row.is_enabled ?? 1)),
    } : emptyForm)
    setDialogOpen(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      const payload = { ...form, is_enabled: form.is_enabled === "1" }
      if (editing) await apiService.updateAdminInterfacePosition(editing.id, payload)
      else await apiService.createAdminInterfacePosition(payload)
      toast.success(editing ? "Posição atualizada." : "Posição criada.")
      setDialogOpen(false)
      void load()
    } catch (e) {
      console.error(e)
      toast.error(laravelValidationErrorText(e) ?? "Erro ao salvar posição.")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row: PositionRow) => {
    if (!confirm(`Remover posição "${row.id_position} - ${row.position_name}"?`)) return
    try {
      await apiService.deleteAdminInterfacePosition(row.id)
      toast.success("Posição removida.")
      void load()
    } catch (e) {
      console.error(e)
      toast.error("Erro ao remover posição.")
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Posição na interface</h1>
          <p className="text-muted-foreground mt-1 text-sm">Posições usadas para encaixar banners na home do ecommerce.</p>
        </div>
        {mayCreate ? <Button onClick={() => open()}><Plus className="mr-2 h-4 w-4" />Nova posição</Button> : null}
      </div>
      <Card>
        <CardHeader><CardTitle>Listagem</CardTitle></CardHeader>
        <CardContent>{loading ? <PanelTableSkeleton rows={8} columns={4} /> : <Table><TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Nome</TableHead><TableHead>Ativa</TableHead>{mayEdit || mayDelete ? <TableHead className="text-right">Ações</TableHead> : null}</TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell>{row.id_position}</TableCell><TableCell className="font-medium">{row.position_name}</TableCell><TableCell>{Number(row.is_enabled ?? 0) ? "Sim" : "Não"}</TableCell>{mayEdit || mayDelete ? <TableCell className="text-right">{mayEdit ? <Button variant="ghost" size="icon" onClick={() => open(row)}><Pencil className="h-4 w-4" /></Button> : null}{mayDelete ? <Button variant="ghost" size="icon" onClick={() => void remove(row)}><Trash2 className="h-4 w-4 text-destructive" /></Button> : null}</TableCell> : null}</TableRow>)}</TableBody></Table>}</CardContent>
      </Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar posição" : "Nova posição"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1"><Label>Código</Label><Input placeholder="001" value={form.id_position} onChange={(e) => setForm((f) => ({ ...f, id_position: e.target.value }))} /></div>
            <div className="grid gap-1"><Label>Nome</Label><Input value={form.position_name} onChange={(e) => setForm((f) => ({ ...f, position_name: e.target.value }))} /></div>
            <div className="grid gap-1"><Label>Ativa</Label><Select value={form.is_enabled} onValueChange={(v) => setForm((f) => ({ ...f, is_enabled: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">Sim</SelectItem><SelectItem value="0">Não</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={() => void save()} disabled={saving || (editing ? !mayEdit : !mayCreate)}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
