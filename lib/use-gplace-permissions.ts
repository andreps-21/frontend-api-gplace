"use client"

import { useAuth } from "@/lib/auth"
import type { User } from "@/lib/api"
import { usePermissions } from "@/lib/use-permissions"
import type { GplaceNavNode } from "@/lib/gplace-blade-nav"
import { isUiPreview } from "@/lib/ui-preview"
import { getResolvedAppToken } from "@/lib/public-env"
import { isContratanteTitularRole } from "@/lib/permissions-role"

function userHasContratanteTitularRole(user: User | null | undefined): boolean {
  if (!user) return false
  if (isContratanteTitularRole(user.role)) return true
  return (user.roles ?? []).some((r) => isContratanteTitularRole(r.name))
}

/**
 * Permissões dos grupos Operacionais, Vendas e Relatórios no menu Gplace.
 * Titular contratante: mostrar estes itens mesmo que o pivot Spatie ainda não as inclua (alinhado ao pedido de UX).
 */
const TITULAR_CONTRATANTE_MENU_PERMS = new Set<string>([
  "products_view",
  "sections_view",
  "measurement-units_view",
  "grid_view",
  "brands_view",
  "freights_view",
  "banners_view",
  "size-image_view",
  "interface-positions_view",
  "orders_view",
  "product_report_view",
  "order_report_view",
])

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
  const isTitularContratante = userHasContratanteTitularRole(user)

  // Titular: menu Gplace como no Blade, mesmo que o papel modelo ainda não tenha permissões Spatie na BD.
  const bladeSidebarMode = legacyFullGplace || spatieNames.length > 0 || isTitularContratante

  /** Equivalente a `session()->has('store')`: header `app` (loja) configurado. Titular: ver Operacionais/Vendas/Relatórios sem depender só do env. */
  const hasStoreContext =
    legacyFullGplace || getResolvedAppToken().length > 0 || isTitularContratante

  /** Equivalente a `session()->exists('tenant')` no Blade (contexto de titular/loja). */
  const hasTenantContext =
    legacyFullGplace ||
    hasStoreContext ||
    Boolean(user?.establishment_id ?? user?.establishment?.id) ||
    isTitularContratante

  const can = (permission: string): boolean => {
    if (!permission) return true
    if (legacyFullGplace) return true
    if (isTitularContratante && TITULAR_CONTRATANTE_MENU_PERMS.has(permission)) {
      return true
    }
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
