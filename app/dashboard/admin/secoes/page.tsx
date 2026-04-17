"use client"

import { useCallback, useEffect, useState } from "react"
import { apiService } from "@/lib/api"
import { laravelInnerData } from "@/lib/laravel-data"
import { useGplacePermissions } from "@/lib/use-gplace-permissions"
import { AccessDenied } from "@/components/ui/access-denied"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { PanelTallBlockSkeleton } from "@/components/dashboard/panel-content-skeleton"
import { toast } from "sonner"

export default function AdminSecoesPage() {
  const { can } = useGplacePermissions()
  const [loading, setLoading] = useState(true)
  const [tree, setTree] = useState<unknown>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await apiService.getAdminSections()
      setTree(laravelInnerData<unknown>(raw))
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar secções.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (!can("sections_view")) {
    return <AccessDenied />
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Seções</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Árvore devolvida por <code className="text-xs">GET /admin/sections</code> (mesma lógica que integração / Blade).
        </p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Árvore</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar"}
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <PanelTallBlockSkeleton />
          ) : (
            <pre className="max-h-[70vh] overflow-auto rounded-md border bg-muted/30 p-4 text-xs">{JSON.stringify(tree, null, 2)}</pre>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
