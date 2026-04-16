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
import { toast } from "sonner"

type Paginator<T> = { data: T[]; current_page: number; last_page: number; total: number }
type UmRow = { id: number; name?: string; initials?: string; is_enabled?: boolean | number }

export default function AdminUnidadesMedidaPage() {
  const { can } = useGplacePermissions()
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [paginator, setPaginator] = useState<Paginator<UmRow> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await apiService.getAdminMeasurementUnits({ page, per_page: 25 })
      const inner = laravelInnerData<Paginator<UmRow>>(raw)
      setPaginator(inner)
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar unidades de medida.")
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    void load()
  }, [load])

  if (!can("measurement-units_view")) {
    return <AccessDenied />
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Unidade de medida</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Paginação <code className="text-xs">GET /admin/measurement-units</code>.
        </p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Registos</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar"}
          </Button>
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
                    <TableHead>Sigla</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Activo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(paginator?.data ?? []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.id}</TableCell>
                      <TableCell>{r.initials}</TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.is_enabled === true || r.is_enabled === 1 ? "Sim" : "Não"}</TableCell>
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
