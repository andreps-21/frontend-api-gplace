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
 * Fallback visual para titular contratante quando o perfil local ainda não trouxe `permissions`.
 * Quando a API retorna permissões Spatie, a lista real do papel prevalece.
 */
const TITULAR_CONTRATANTE_MENU_PERMS = new Set<string>([
  "customers_view",
  "customers_create",
  "customers_edit",
  "customers_delete",
  "leads_view",
  "leads_create",
  "leads_edit",
  "leads_delete",
  "tenants_view",
  "tenants_create",
  "tenants_edit",
  "tenants_delete",
  "stores_view",
  "stores_create",
  "stores_edit",
  "stores_delete",
  "salesman_view",
  "salesman_create",
  "salesman_edit",
  "salesman_delete",
  "coupons_view",
  "coupons_create",
  "coupons_edit",
  "coupons_delete",
  "businessunits_view",
  "businessunits_create",
  "businessunits_edit",
  "businessunits_delete",
  "payment-methods_view",
  "payment-methods_create",
  "payment-methods_edit",
  "payment-methods_delete",
  "erp_view",
  "erp_create",
  "erp_edit",
  "erp_delete",
  "social-medias_view",
  "social-medias_create",
  "social-medias_edit",
  "social-medias_delete",
  "cities_view",
  "cities_create",
  "cities_edit",
  "cities_delete",
  "states_view",
  "states_create",
  "states_edit",
  "states_delete",
  "products_view",
  "products_create",
  "products_edit",
  "products_delete",
  "sections_view",
  "sections_create",
  "sections_edit",
  "sections_delete",
  "measurement-units_view",
  "measurement-units_create",
  "measurement-units_edit",
  "measurement-units_delete",
  "grid_view",
  "grid_create",
  "grid_edit",
  "grid_delete",
  "brands_view",
  "brands_create",
  "brands_edit",
  "brands_delete",
  "freights_view",
  "freights_create",
  "freights_edit",
  "freights_delete",
  "banners_view",
  "banners_create",
  "banners_edit",
  "banners_delete",
  "size-image_view",
  "size-image_create",
  "size-image_edit",
  "size-image_delete",
  "interface-positions_view",
  "interface-positions_create",
  "interface-positions_edit",
  "interface-positions_delete",
  "orders_view",
  "orders_create",
  "orders_edit",
  "orders_delete",
  "product_report_view",
  "order_report_view",
  "users_view",
  "users_create",
  "users_edit",
  "users_delete",
  "roles_view",
  "roles_create",
  "roles_edit",
  "roles_delete",
  "permissions_view",
  "permissions_create",
  "permissions_edit",
  "permissions_delete",
  "parameters_view",
  "parameters_create",
  "parameters_edit",
  "parameters_delete",
  "faq_view",
  "faq_create",
  "faq_edit",
  "faq_delete",
  "catalogs_view",
  "catalogs_create",
  "catalogs_edit",
  "catalogs_delete",
  "settings_view",
  "settings_create",
  "settings_edit",
  "settings_delete",
  "tokens_view",
  "tokens_create",
  "tokens_edit",
  "tokens_delete",
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
    if (set.has(permission)) return true
    if (isTitularContratante && spatieNames.length === 0 && TITULAR_CONTRATANTE_MENU_PERMS.has(permission)) {
      return true
    }
    return false
  }

  const canAny = (perms?: string[]): boolean => {
    if (!perms?.length) return true
    return perms.some((p) => can(p))
  }

  const filterNav = (nodes: GplaceNavNode[]): GplaceNavNode[] => {
    const out: GplaceNavNode[] = []
    for (const n of nodes) {
      if (n.kind === "link") {
        if (n.anyOf && !canAny(n.anyOf)) continue
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
