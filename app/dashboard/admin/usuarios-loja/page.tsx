"use client"

import { useCallback, useEffect, useState } from "react"
import { apiService } from "@/lib/api"
import { laravelInnerData } from "@/lib/laravel-data"
import { useGplacePermissions } from "@/lib/use-gplace-permissions"
import { AccessDenied } from "@/components/ui/access-denied"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Loader2, UserMinus, UserPlus } from "lucide-react"
import { PanelTableSkeleton } from "@/components/dashboard/panel-content-skeleton"
import { toast } from "sonner"

type Paginator<T> = { data: T[]; current_page: number; last_page: number; total: number }

export default function UsuariosLojaGplacePage() {
  const { can } = useGplacePermissions()
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [paginator, setPaginator] = useState<Paginator<Record<string, unknown>> | null>(null)
  const [attachUserId, setAttachUserId] = useState("")
  const [attaching, setAttaching] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await apiService.getAdminStoreUsers({ page, per_page: 15, search: search || undefined })
      const inner = laravelInnerData<Paginator<Record<string, unknown>>>(raw)
      setPaginator(inner)
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar utilizadores.")
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    void load()
  }, [load])

  const attach = async () => {
    const id = Number.parseInt(attachUserId.trim(), 10)
    if (!Number.isFinite(id) || id < 1) {
      toast.error("Indique um ID de utilizador válido.")
      return
    }
    setAttaching(true)
    try {
      await apiService.attachAdminStoreUser(id)
      toast.success("Utilizador associado à loja.")
      setAttachUserId("")
      void load()
    } catch (e) {
      console.error(e)
      toast.error("Erro ao associar.")
    } finally {
      setAttaching(false)
    }
  }

  const detach = async (userId: number) => {
    if (!confirm(`Remover utilizador ${userId} desta loja?`)) return
    try {
      await apiService.detachAdminStoreUser(userId)
      toast.success("Removido da loja.")
      void load()
    } catch (e) {
      console.error(e)
      toast.error("Erro ao remover.")
    }
  }

  if (!can("users_view")) {
    return <AccessDenied />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Usuários da loja</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Lista filtrada pelo header <code className="text-xs">app</code>. Associe utilizadores existentes por ID (pivot{" "}
          <code className="text-xs">store_user</code>).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Associar utilizador</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grid flex-1 gap-1">
            <Label htmlFor="attach-uid">ID do utilizador</Label>
            <Input id="attach-uid" placeholder="ex.: 12" value={attachUserId} onChange={(e) => setAttachUserId(e.target.value)} />
          </div>
          <Button type="button" onClick={() => void attach()} disabled={attaching}>
            {attaching ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="mr-1 h-4 w-4" />}
            Associar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <CardTitle>Listagem</CardTitle>
          <form
            className="flex w-full max-w-md gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              setPage(1)
              setSearch(searchInput.trim())
            }}
          >
            <Input placeholder="Nome, e-mail ou NIF…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
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
                    <TableHead>E-mail</TableHead>
                    <TableHead>NIF</TableHead>
                    <TableHead className="w-[80px]">Loja</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(paginator?.data ?? []).map((row) => (
                    <TableRow key={String(row.id)}>
                      <TableCell>{String(row.id)}</TableCell>
                      <TableCell className="font-medium">{String(row.name ?? "")}</TableCell>
                      <TableCell>{String(row.email ?? "")}</TableCell>
                      <TableCell>{String(row.nif ?? "")}</TableCell>
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon" title="Remover desta loja" onClick={() => void detach(Number(row.id))}>
                          <UserMinus className="h-4 w-4 text-destructive" />
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
    </div>
  )
}
