"use client"

import { useCallback, useEffect, useState } from "react"
import { apiService } from "@/lib/api"
import { laravelInnerData } from "@/lib/laravel-data"
import { useGplacePermissions } from "@/lib/use-gplace-permissions"
import { AccessDenied } from "@/components/ui/access-denied"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2 } from "lucide-react"
import { PanelTableSkeleton } from "@/components/dashboard/panel-content-skeleton"
import { toast } from "sonner"

type BrandRow = { id: number; name?: string; image_url?: string }

export default function AdminMarcasPage() {
  const { can } = useGplacePermissions()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<BrandRow[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await apiService.getAdminBrands()
      const data = laravelInnerData<BrandRow[]>(raw)
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar marcas.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (!can("brands_view")) {
    return <AccessDenied />
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Marca</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Listagem <code className="text-xs">GET /admin/brands</code>. CRUD completo pode seguir o padrão dos produtos.
        </p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Marcas</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar"}
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <PanelTableSkeleton rows={10} columns={2} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nome</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.id}</TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
