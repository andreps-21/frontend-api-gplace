"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { apiService } from "@/lib/api"
import { gplaceBladeNavTree, type GplaceNavNode } from "@/lib/gplace-blade-nav"
import { laravelInnerData, laravelValidationErrorText } from "@/lib/laravel-data"
import { useGplacePermissions } from "@/lib/use-gplace-permissions"
import { AccessDenied } from "@/components/ui/access-denied"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown, ChevronRight, FolderTree, Loader2, Plus, Shield, Trash2 } from "lucide-react"
import { PanelCheckboxListSkeleton } from "@/components/dashboard/panel-content-skeleton"
import { toast } from "sonner"

type Paginator<T> = { data: T[]; current_page: number; last_page: number; total: number }
type RoleRow = { id: number; name: string; description?: string; guard_name?: string; tenant_id?: number | null }
type PermRow = { id: number; name?: string; description?: string; guard_name?: string }

type PermissionGroup = {
  area: string
  module: string
  permissions: PermRow[]
}

type PermissionAreaGroup = {
  area: string
  groups: PermissionGroup[]
}

type PermissionBranch = {
  label: string | null
  groups: PermissionGroup[]
}

const ACTION_LABELS: Record<string, string> = {
  view: "Ver",
  create: "Criar",
  edit: "Editar",
  delete: "Excluir",
}

const emptyRoleForm = { name: "", description: "" }

function permissionParts(permission?: string) {
  const name = permission ?? ""
  const index = name.lastIndexOf("_")
  if (index < 1) return { moduleKey: name, action: "" }
  return { moduleKey: name.slice(0, index), action: name.slice(index + 1) }
}

function permissionActionLabel(permission?: string, fallback?: string) {
  const { action } = permissionParts(permission)
  return ACTION_LABELS[action] ?? fallback ?? action
}

function uniqueIds(ids: number[]): number[] {
  return Array.from(new Set(ids))
}

function sortPermissions(perms: PermRow[]): PermRow[] {
  const order = ["view", "create", "edit", "delete"]
  return [...perms].sort((a, b) => {
    const actionA = permissionParts(a.name).action
    const actionB = permissionParts(b.name).action
    return order.indexOf(actionA) - order.indexOf(actionB)
  })
}

function permissionsForSidebarPermission(perms: PermRow[], permissionName: string): PermRow[] {
  const moduleKey = permissionParts(permissionName).moduleKey
  const modulePermissions = perms.filter((permission) => permissionParts(permission.name).moduleKey === moduleKey)
  const exactPermission = perms.find((permission) => permission.name === permissionName)

  return sortPermissions(modulePermissions.length > 0 ? modulePermissions : exactPermission ? [exactPermission] : [])
}

function groupPermissionsFromSidebar(perms: PermRow[]): PermissionGroup[] {
  const groups: PermissionGroup[] = []
  const assignedIds = new Set<number>()

  const visit = (nodes: GplaceNavNode[], area: string, path: string[] = []) => {
    nodes.forEach((node) => {
      if (node.kind === "group") {
        const nextArea = area || node.label
        const nextPath = area ? [...path, node.label] : []
        visit(node.children, nextArea, nextPath)
        return
      }

      if (!node.permission) return

      const permissions = permissionsForSidebarPermission(perms, node.permission)
      permissions.forEach((permission) => assignedIds.add(permission.id))

      groups.push({
        area: area || "Geral",
        module: [...path, node.label].join(" / "),
        permissions,
      })
    })
  }

  visit(gplaceBladeNavTree, "")

  perms.forEach((permission) => {
    if (assignedIds.has(permission.id)) return
    const { moduleKey } = permissionParts(permission.name)
    const current = groups.find((group) => group.area === "Outras permissões" && group.module === moduleKey)
    if (current) {
      current.permissions.push(permission)
    } else {
      groups.push({ area: "Outras permissões", module: moduleKey || "Sem módulo", permissions: [permission] })
    }
  })

  return groups.map((group) => ({ ...group, permissions: sortPermissions(group.permissions) }))
}

function groupPermissionsByArea(groups: PermissionGroup[]): PermissionAreaGroup[] {
  const map = new Map<string, PermissionGroup[]>()

  groups.forEach((group) => {
    map.set(group.area, [...(map.get(group.area) ?? []), group])
  })

  return Array.from(map.entries()).map(([area, areaGroups]) => ({ area, groups: areaGroups }))
}

function groupAreaBranches(groups: PermissionGroup[]): PermissionBranch[] {
  const map = new Map<string, PermissionBranch>()

  groups.forEach((group) => {
    const parts = group.module.split(" / ")
    const branchLabel = parts.length > 1 ? parts[0] : null
    const moduleLabel = parts.length > 1 ? parts.slice(1).join(" / ") : group.module
    const key = branchLabel ?? "__root__"
    const current = map.get(key) ?? { label: branchLabel, groups: [] }

    current.groups.push({ ...group, module: moduleLabel })
    map.set(key, current)
  })

  return Array.from(map.values())
}

export default function AtribuicoesGplacePage() {
  const { can } = useGplacePermissions()
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [paginator, setPaginator] = useState<Paginator<RoleRow> | null>(null)
  const [allPerms, setAllPerms] = useState<PermRow[]>([])
  const [permSel, setPermSel] = useState<number[]>([])
  const [selectedRole, setSelectedRole] = useState<RoleRow | null>(null)
  const [roleForm, setRoleForm] = useState(emptyRoleForm)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createForm, setCreateForm] = useState(emptyRoleForm)
  const [loadingEditor, setLoadingEditor] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expandedAreas, setExpandedAreas] = useState<string[]>([])
  const [expandedBranches, setExpandedBranches] = useState<string[]>([])
  const [expandedModules, setExpandedModules] = useState<string[]>([])

  const permissionGroups = useMemo(() => groupPermissionsFromSidebar(allPerms), [allPerms])
  const permissionTree = useMemo(() => groupPermissionsByArea(permissionGroups), [permissionGroups])
  const editorVisible = Boolean(selectedRole)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await apiService.getAdminStoreRoles({ page, per_page: 100 })
      setPaginator(laravelInnerData<Paginator<RoleRow>>(raw))
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar atribuições.")
    } finally {
      setLoading(false)
    }
  }, [page])

  const loadAllPermissions = useCallback(async () => {
    const raw = await apiService.getAdminPermissions({ page: 1, per_page: 500 })
    const p = laravelInnerData<Paginator<PermRow>>(raw)
    setAllPerms(p.data ?? [])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void loadAllPermissions()
  }, [loadAllPermissions])

  if (!can("roles_view")) return <AccessDenied />

  const mayCreateRole = can("roles_create")
  const mayEditRole = can("roles_edit")
  const mayDeleteRole = can("roles_delete")

  const selectRole = async (row: RoleRow) => {
    setSelectedRole(row)
    setRoleForm({ name: row.name, description: row.description ?? "" })
    setLoadingEditor(true)
    try {
      if (allPerms.length === 0) await loadAllPermissions()
      const raw = await apiService.getAdminStoreRole(row.id)
      const body = laravelInnerData<{ permission_ids: number[] }>(raw)
      setPermSel(body.permission_ids ?? [])
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar permissões da atribuição.")
    } finally {
      setLoadingEditor(false)
    }
  }

  const openCreateDialog = () => {
    setCreateForm(emptyRoleForm)
    setCreateDialogOpen(true)
  }

  const togglePerm = (id: number, checked: boolean) => {
    setPermSel((prev) => (checked ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id)))
  }

  const setGroup = (ids: number[], checked: boolean) => {
    setPermSel((prev) => checked ? Array.from(new Set([...prev, ...ids])) : prev.filter((id) => !ids.includes(id)))
  }

  const toggleArea = (area: string) => {
    setExpandedAreas((prev) => prev.includes(area) ? prev.filter((item) => item !== area) : [...prev, area])
  }

  const toggleBranch = (key: string) => {
    setExpandedBranches((prev) => prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key])
  }

  const toggleModule = (key: string) => {
    setExpandedModules((prev) => prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key])
  }

  const saveRole = async () => {
    if (!selectedRole) return
    setSaving(true)
    try {
      const payload = { ...roleForm, permission_ids: permSel }
      await apiService.updateAdminStoreRole(selectedRole.id, payload)
      toast.success("Atribuição atualizada.")
      await load()
    } catch (e) {
      console.error(e)
      toast.error(laravelValidationErrorText(e) ?? "Erro ao salvar atribuição.")
    } finally {
      setSaving(false)
    }
  }

  const createRole = async () => {
    setSaving(true)
    try {
      const raw = await apiService.createAdminStoreRole({ ...createForm, permission_ids: [] })
      const created = laravelInnerData<RoleRow>(raw)
      toast.success("Atribuição criada.")
      setCreateDialogOpen(false)
      setCreateForm(emptyRoleForm)
      await load()
      if (created?.id) {
        await selectRole(created)
      }
    } catch (e) {
      console.error(e)
      toast.error(laravelValidationErrorText(e) ?? "Erro ao criar atribuição.")
    } finally {
      setSaving(false)
    }
  }

  const deleteRole = async (row: RoleRow) => {
    if (!confirm(`Remover atribuição "${row.name}"?`)) return
    try {
      await apiService.deleteAdminStoreRole(row.id)
      toast.success("Atribuição removida.")
      if (selectedRole?.id === row.id) {
        setSelectedRole(null)
        setRoleForm(emptyRoleForm)
        setPermSel([])
      }
      void load()
    } catch (e) {
      console.error(e)
      toast.error("Erro ao remover atribuição.")
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Atribuições</h1>
        <p className="text-muted-foreground mt-1 text-xs">
          Crie perfis de acesso e escolha, por módulo, o que cada usuário pode ver ou executar no painel.
        </p>
      </div>

      <Card>
          <CardHeader className="space-y-3 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4 text-[#2f3a8f]" />
                  {selectedRole ? `Editar ${selectedRole.name}` : "Atribuições"}
                </CardTitle>
                <CardDescription className="text-xs">
                  Selecione permissões por módulo. Para mostrar um item no sidebar, marque ao menos a permissão <strong>Ver</strong> do módulo.
                </CardDescription>
              </div>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Perfis de acesso</p>
                  <p className="text-xs text-muted-foreground">Selecione um perfil existente ou crie uma nova atribuição.</p>
                </div>
                {mayCreateRole ? (
                  <Button className="h-8 px-2 text-xs" type="button" onClick={openCreateDialog}>
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Nova Atribuições
                  </Button>
                ) : null}
              </div>
              <div className="grid gap-2 lg:grid-cols-[1fr_auto]">
                {loading && !paginator ? (
                  <div className="flex h-8 items-center gap-2 rounded-md border bg-background px-3 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Carregando...
                  </div>
                ) : (
                  <Select
                    value={selectedRole ? String(selectedRole.id) : undefined}
                    onValueChange={(value) => {
                      const row = (paginator?.data ?? []).find((item) => String(item.id) === value)
                      if (row) void selectRole(row)
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Escolha um perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      {(paginator?.data ?? []).map((row) => (
                        <SelectItem className="text-xs" key={row.id} value={String(row.id)}>
                          {row.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedRole && mayDeleteRole ? (
                  <Button className="h-8 text-xs" type="button" variant="outline" onClick={() => void deleteRole(selectedRole)}>
                    <Trash2 className="mr-1.5 h-3.5 w-3.5 text-destructive" />
                    Remover
                  </Button>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  {selectedRole ? selectedRole.description || "Sem descrição" : "Selecione um perfil para editar permissões."}
                </span>
                {paginator && paginator.last_page > 1 ? (
                  <span className="flex items-center gap-2">
                    Página {paginator.current_page}/{paginator.last_page}
                    <Button className="h-6 px-2 text-xs" type="button" variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
                    <Button className="h-6 px-2 text-xs" type="button" variant="outline" size="sm" disabled={page >= paginator.last_page || loading} onClick={() => setPage((p) => p + 1)}>Seguinte</Button>
                  </span>
                ) : null}
              </div>
            </div>
            {editorVisible ? (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="grid gap-1">
                  <Label className="text-xs">Nome técnico</Label>
                  <Input className="h-8 text-xs" value={roleForm.name} onChange={(e) => setRoleForm((f) => ({ ...f, name: e.target.value }))} placeholder="ex.: operador-loja" />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Descrição visível</Label>
                  <Input className="h-8 text-xs" value={roleForm.description} onChange={(e) => setRoleForm((f) => ({ ...f, description: e.target.value }))} placeholder="ex.: Operador da loja" />
                </div>
              </div>
            ) : null}
          </CardHeader>
          {editorVisible ? (
          <CardContent className="space-y-3 p-4 pt-0">
            {loadingEditor || allPerms.length === 0 ? (
              <PanelCheckboxListSkeleton rows={14} />
            ) : (
              <div className="space-y-2">
                {permissionTree.map((area) => {
                  const areaIds = uniqueIds(area.groups.flatMap((group) => group.permissions.map((permission) => permission.id)))
                  const areaAllChecked = areaIds.every((id) => permSel.includes(id))
                  const areaCollapsed = !expandedAreas.includes(area.area)
                  return (
                    <div className="rounded-lg border bg-card" key={area.area}>
                      <div className="flex flex-col gap-2 p-3 md:flex-row md:items-center md:justify-between">
                        <button className="flex items-start gap-2 text-left" onClick={() => toggleArea(area.area)} type="button">
                          <span className="mt-0.5 rounded bg-[#2f3a8f]/10 p-1 text-[#2f3a8f]">
                            {areaCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </span>
                          <span>
                            <span className="flex items-center gap-2 text-sm font-semibold">
                              <FolderTree className="h-3.5 w-3.5 text-muted-foreground" />
                              {area.area}
                            </span>
                          </span>
                        </button>
                        <Button className="h-7 px-2 text-xs" type="button" variant="outline" size="sm" onClick={() => setGroup(areaIds, !areaAllChecked)}>
                          {areaAllChecked ? "Desmarcar área" : "Marcar área"}
                        </Button>
                      </div>
                      {!areaCollapsed ? (
                        <div className="border-t">
                          {groupAreaBranches(area.groups).map((branch) => {
                            const branchIds = uniqueIds(branch.groups.flatMap((group) => group.permissions.map((permission) => permission.id)))
                            const branchAllChecked = branchIds.every((id) => permSel.includes(id))
                            const branchKey = `${area.area}:${branch.label ?? "root"}`
                            const branchCollapsed = branch.label ? !expandedBranches.includes(branchKey) : false
                            return (
                              <div className="border-b last:border-b-0" key={branchKey}>
                                {branch.label ? (
                                  <div className="flex flex-col gap-2 px-3 py-2 md:flex-row md:items-center md:justify-between">
                                    <button className="flex items-start gap-2 text-left" onClick={() => toggleBranch(branchKey)} type="button">
                                      <span className="mt-0.5 text-muted-foreground">
                                        {branchCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                      </span>
                                      <span className="text-sm font-medium">{branch.label}</span>
                                    </button>
                                    <Button className="h-7 px-2 text-xs" type="button" variant="outline" size="sm" onClick={() => setGroup(branchIds, !branchAllChecked)}>
                                      {branchAllChecked ? "Desmarcar grupo" : "Marcar grupo"}
                                    </Button>
                                  </div>
                                ) : null}
                                {!branchCollapsed ? (
                                  <div className={branch.label ? "border-t" : undefined}>
                                    {branch.groups.map((group) => {
                                      const ids = group.permissions.map((p) => p.id)
                                      const allChecked = ids.every((id) => permSel.includes(id))
                                      const moduleKey = `${group.area}:${branch.label ?? "root"}:${group.module}`
                                      const moduleCollapsed = !expandedModules.includes(moduleKey)
                                      return (
                                        <div className="border-b last:border-b-0" key={moduleKey}>
                                          <div className="flex flex-col gap-2 px-3 py-2 pl-8 md:flex-row md:items-center md:justify-between">
                                            <button className="flex items-start gap-2 text-left" onClick={() => toggleModule(moduleKey)} type="button">
                                              <span className="mt-0.5 text-muted-foreground">
                                                {moduleCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                              </span>
                                              <span className="text-sm font-medium">{group.module}</span>
                                            </button>
                                            <Button className="h-7 px-2 text-xs" type="button" variant="outline" size="sm" onClick={() => setGroup(ids, !allChecked)}>
                                              {allChecked ? "Desmarcar módulo" : "Marcar módulo"}
                                            </Button>
                                          </div>
                                          {!moduleCollapsed ? (
                                            <div className="space-y-1 pb-2 pl-14 pr-3">
                                              {group.permissions.map((permission) => (
                                                <label className="relative flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-muted/50" key={permission.id}>
                                                  <span className="absolute -left-3 top-1/2 w-3 border-t" aria-hidden="true" />
                                                  <Checkbox
                                                    className="h-3.5 w-3.5"
                                                    checked={permSel.includes(permission.id)}
                                                    onCheckedChange={(checked) => togglePerm(permission.id, checked === true)}
                                                  />
                                                  <span className="font-medium">{permissionActionLabel(permission.name, permission.description)}</span>
                                                </label>
                                              ))}
                                            </div>
                                          ) : null}
                                        </div>
                                      )
                                    })}
                                  </div>
                                ) : null}
                              </div>
                            )
                          })}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
            <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-background/95 py-3 backdrop-blur">
              <Button
                className="h-8 text-xs"
                type="button"
                variant="outline"
                onClick={() => {
                  if (selectedRole) void selectRole(selectedRole)
                }}
                disabled={saving || loadingEditor || !selectedRole}
              >
                Recarregar
              </Button>
              <Button className="h-8 text-xs" type="button" onClick={() => void saveRole()} disabled={saving || loadingEditor || !mayEditRole}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar atribuição"}
              </Button>
            </div>
          </CardContent>
          ) : null}
        </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova atribuição</DialogTitle>
            <DialogDescription>
              Crie o perfil de acesso. Depois de salvar, selecione as permissões na árvore.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1">
              <Label className="text-xs">Nome técnico</Label>
              <Input
                className="h-8 text-xs"
                value={createForm.name}
                onChange={(e) => setCreateForm((form) => ({ ...form, name: e.target.value }))}
                placeholder="ex.: operador-loja"
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-xs">Descrição visível</Label>
              <Input
                className="h-8 text-xs"
                value={createForm.description}
                onChange={(e) => setCreateForm((form) => ({ ...form, description: e.target.value }))}
                placeholder="ex.: Operador da loja"
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="h-8 text-xs" type="button" variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button className="h-8 text-xs" type="button" onClick={() => void createRole()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
