"use client"

import { useAuth } from "@/lib/auth"
import { usePermissions } from "@/lib/use-permissions"
import type { GplaceNavNode } from "@/lib/gplace-blade-nav"
import { isUiPreview } from "@/lib/ui-preview"

/**
 * Permissões Spatie (lista `permissions` no perfil) + ponte legada `gerenciar-admin-api` (TIM gestor).
 */
export function useGplacePermissions() {
  const { user } = useAuth()
  const { canAccessSpecificModule } = usePermissions()

  if (isUiPreview()) {
    return {
      bladeSidebarMode: true,
      can: () => true,
      canAny: () => true,
      filterNav: (nodes: GplaceNavNode[]) => nodes,
    }
  }

  const legacyFullGplace = canAccessSpecificModule("gerenciar-admin-api")
  const spatieNames = user?.permissions ?? []
  const set = new Set(spatieNames)

  const bladeSidebarMode = legacyFullGplace || spatieNames.length > 0

  /** Equivalente a `session()->has('store')`: header `app` (loja) configurado. */
  const hasStoreContext =
    legacyFullGplace ||
    (typeof process.env.NEXT_PUBLIC_APP_TOKEN === "string" && process.env.NEXT_PUBLIC_APP_TOKEN.trim().length > 0)

  /** Equivalente a `session()->exists('tenant')` no Blade (contexto de titular/loja). */
  const hasTenantContext =
    legacyFullGplace ||
    hasStoreContext ||
    Boolean(user?.establishment_id ?? user?.establishment?.id)

  const can = (permission: string): boolean => {
    if (!permission) return true
    if (legacyFullGplace) return true
    return set.has(permission)
  }

  const canAny = (perms?: string[]): boolean => {
    if (!perms?.length) return true
    return perms.some((p) => can(p))
  }

  const filterNav = (nodes: GplaceNavNode[]): GplaceNavNode[] => {
    const out: GplaceNavNode[] = []
    for (const n of nodes) {
      if (n.kind === "link") {
        if (!can(n.permission)) continue
        if (n.requiresStore && !hasStoreContext) continue
        if (n.requiresTenant && !hasTenantContext) continue
        out.push(n)
        continue
      }
      if (n.requiresStore && !hasStoreContext) continue
      if (!canAny(n.anyOf)) continue
      const children = filterNav(n.children)
      if (children.length === 0) continue
      out.push({ ...n, children })
    }
    return out
  }

  return { bladeSidebarMode, can, canAny, filterNav }
}
