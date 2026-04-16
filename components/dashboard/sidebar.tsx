"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  ShoppingCart,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useEffect, useState } from "react"
import { usePermissions } from "@/lib/use-permissions"
import { useUserPermissions } from "@/lib/user-permissions"
import { GplaceBladeSidebar } from "@/components/dashboard/gplace-blade-sidebar"
import { useGplacePermissions } from "@/lib/use-gplace-permissions"

const navigation = [
  { 
    name: "Home", 
    href: "/dashboard", 
    icon: LayoutDashboard,
    permission: "dashboard"
  },
  {
    name: "Vendas",
    icon: ShoppingCart,
    permission: "vendas",
    children: [
      { 
        name: "Cadastrar Venda", 
        href: "/dashboard/vendas/cadastrar",
        permission: "vendas-cadastrar"
      },
      { 
        name: "Gerenciar Vendas", 
        href: "/dashboard/vendas/gerenciar",
        permission: "vendas-gerenciar"
      },
      // Desabilitado temporariamente
      // { name: "Buscar Pré-Venda", href: "/dashboard/vendas/pre-venda" },
      // { name: "Importar BOV", href: "/dashboard/vendas/importar-bov" },
    ],
  },
  {
    name: "Relatórios",
    icon: BarChart3,
    permission: "relatorios",
    children: [
      { 
        name: "Por Loja", 
        href: "/dashboard/relatorios/loja",
        permission: "relatorios-loja"
      },
      { 
        name: "Por Vendedor", 
        href: "/dashboard/relatorios/vendedor",
        permission: "relatorios-vendedor"
      },
      { 
        name: "Relatório de Produtos", 
        href: "/dashboard/relatorios/ranking-produtos",
        permission: "relatorios-ranking-produtos"
      },
      { 
        name: "Pós-Pago", 
        href: "/dashboard/relatorios/pos-pago",
        permission: "relatorios-pos-pago"
      },
      { 
        name: "Controle", 
        href: "/dashboard/relatorios/controle",
        permission: "relatorios-controle"
      },
      { 
        name: "DACC", 
        href: "/dashboard/relatorios/dacc",
        permission: "relatorios-dacc"
      },
      { 
        name: "Aparelhos", 
        href: "/dashboard/relatorios/aparelhos",
        permission: "relatorios-aparelhos"
      },
      { 
        name: "Acessórios", 
        href: "/dashboard/relatorios/acessorios",
        permission: "relatorios-acessorios"
      },
    ],
  },
  {
    name: "Gerenciar",
    icon: Settings,
    permission: "gerenciar",
    children: [
      { 
        name: "Usuários", 
        href: "/dashboard/gerenciar/usuarios",
        permission: "gerenciar-usuarios",
        showForRoles: ["gestor", "gerente", "vendedor"] // Todos podem acessar, mas com permissões diferentes
      },
      { 
        name: "Estabelecimentos", 
        href: "/dashboard/gerenciar/estabelecimentos",
        permission: "gerenciar-estabelecimentos",
        showForRoles: ["gestor"] // Apenas gestores podem gerenciar estabelecimentos
      },
      { 
        name: "Clientes", 
        href: "/dashboard/gerenciar/pessoas",
        permission: "gerenciar-pessoas"
      },
      { 
        name: "Autorizações", 
        href: "/dashboard/gerenciar/autorizacoes",
        permission: "gerenciar-autorizacoes"
      },
      { 
        name: "Categorias", 
        href: "/dashboard/gerenciar/categorias",
        permission: "gerenciar-categorias"
      },
      { 
        name: "Pontos de Venda", 
        href: "/dashboard/gerenciar/pdv",
        permission: "gerenciar-pdv"
      },
      { 
        name: "Estoque", 
        href: "/dashboard/gerenciar/estoque",
        permission: "gerenciar-estoque"
      },
      { 
        name: "Metas", 
        href: "/dashboard/gerenciar/metas",
        permission: "gerenciar-metas"
      },
      { 
        name: "Comissões", 
        href: "/dashboard/gerenciar/comissoes",
        permission: "gerenciar-comissoes"
      },
      { 
        name: "Mural", 
        href: "/dashboard/gerenciar/mural",
        permission: "gerenciar-mural"
      },
    ],
  },
  // Temporariamente oculto - Módulo Financeiro
  // {
  //   name: "Financeiro",
  //   icon: Wallet,
  //   permission: "financeiro",
  //   children: [
  //     { name: "Categorias", href: "/dashboard/financeiro/categorias" },
  //     { name: "Centros de Custo", href: "/dashboard/financeiro/centros-custo" },
  //     { name: "Contas a Pagar", href: "/dashboard/financeiro/contas-pagar" },
  //     { name: "Contas a Receber", href: "/dashboard/financeiro/contas-receber" },
  //     { name: "Contas Bancárias", href: "/dashboard/financeiro/contas-bancarias" },
  //     { name: "Clientes", href: "/dashboard/financeiro/clientes" },
  //     { name: "Fornecedores", href: "/dashboard/financeiro/fornecedores" },
  //   ],
  // },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>(["Vendas"])
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { canAccessModule, canAccessSpecificModule, userRole } = usePermissions()
  const userPermissions = useUserPermissions()
  const { bladeSidebarMode } = useGplacePermissions()

  useEffect(() => {
    if (pathname.startsWith("/dashboard/gerenciar")) {
      setExpandedItems((prev) => (prev.includes("Gerenciar") ? prev : [...prev, "Gerenciar"]))
    }
  }, [pathname])

  // Sistema funcionando - logs removidos

  const toggleExpanded = (name: string) => {
    setExpandedItems((prev) => (prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]))
  }

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
    // Fechar todos os submenus quando colapsar
    if (!isCollapsed) {
      setExpandedItems([])
    }
  }

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-[#262f73] bg-[#2f3a8f] transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className={cn("border-b border-white/20", isCollapsed ? "p-2" : "p-6")}>
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1">
              <span className="text-center text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Gplace
              </span>
            </div>
          )}
          {isCollapsed && (
            <div className="flex flex-1 justify-center">
              <span className="text-xl font-bold leading-none text-white" title="Gplace">
                G
              </span>
            </div>
          )}
          <button
            onClick={toggleCollapse}
            className="p-1 rounded-md hover:bg-white/10 transition-colors"
            title={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-white" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-white" />
            )}
          </button>
        </div>
      </div>

      <nav className={cn("flex-1 overflow-y-auto", isCollapsed ? "p-2" : "p-4")}>
        <ul className="space-y-1">
          {/* Fallback temporário - sempre mostrar Home, Vendas e Relatórios para vendedor */}
          {String(userRole ?? "").toLowerCase() === "vendedor" ? (
            <>
              <li>
                <Link
                  href="/dashboard"
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    pathname === "/dashboard"
                      ? "text-white font-semibold"
                      : "text-white/90 hover:bg-white/10 hover:text-white",
                    isCollapsed ? "justify-center" : ""
                  )}
                  style={pathname === "/dashboard" ? { backgroundColor: 'rgba(255, 255, 255, 0.15)' } : {}}
                  title={isCollapsed ? "Home" : undefined}
                >
                  <LayoutDashboard className="w-5 h-5" />
                  {!isCollapsed && "Home"}
                </Link>
              </li>
              <li>
                <button
                  onClick={() => toggleExpanded("Vendas")}
                  className={cn(
                    "flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 hover:text-white transition-colors",
                    isCollapsed ? "justify-center" : ""
                  )}
                  title={isCollapsed ? "Vendas" : undefined}
                  disabled={isCollapsed}
                >
                  <div className={cn("flex items-center gap-3", isCollapsed ? "gap-0" : "")}>
                    <ShoppingCart className="w-5 h-5" />
                    {!isCollapsed && "Vendas"}
                  </div>
                  {!isCollapsed && (
                    <ChevronDown className={cn("w-4 h-4 transition-transform", expandedItems.includes("Vendas") && "rotate-180")} />
                  )}
                </button>
                {!isCollapsed && expandedItems.includes("Vendas") && (
                  <ul className="mt-1 ml-8 space-y-1">
                    <li>
                      <Link
                        href="/dashboard/vendas/cadastrar"
                        className={cn(
                          "block px-3 py-2 rounded-lg text-sm transition-colors",
                          pathname === "/dashboard/vendas/cadastrar"
                            ? "font-medium text-white"
                            : "text-white/70 hover:bg-white/10 hover:text-white",
                        )}
                        style={pathname === "/dashboard/vendas/cadastrar" ? { 
                          backgroundColor: 'rgba(255, 255, 255, 0.12)', 
                        } : {}}
                      >
                        Cadastrar Venda
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/dashboard/vendas/gerenciar"
                        className={cn(
                          "block px-3 py-2 rounded-lg text-sm transition-colors",
                          pathname === "/dashboard/vendas/gerenciar"
                            ? "font-medium text-white"
                            : "text-white/70 hover:bg-white/10 hover:text-white",
                        )}
                        style={pathname === "/dashboard/vendas/gerenciar" ? { 
                          backgroundColor: 'rgba(255, 255, 255, 0.12)', 
                        } : {}}
                      >
                        Gerenciar Vendas
                      </Link>
                    </li>
                  </ul>
                )}
              </li>
              <li>
                <button
                  onClick={() => toggleExpanded("Relatórios")}
                  className={cn(
                    "flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 hover:text-white transition-colors",
                    isCollapsed ? "justify-center" : ""
                  )}
                  title={isCollapsed ? "Relatórios" : undefined}
                  disabled={isCollapsed}
                >
                  <div className={cn("flex items-center gap-3", isCollapsed ? "gap-0" : "")}>
                    <BarChart3 className="w-5 h-5" />
                    {!isCollapsed && "Relatórios"}
                  </div>
                  {!isCollapsed && (
                    <ChevronDown className={cn("w-4 h-4 transition-transform", expandedItems.includes("Relatórios") && "rotate-180")} />
                  )}
                </button>
                {!isCollapsed && expandedItems.includes("Relatórios") && (
                  <ul className="mt-1 ml-8 space-y-1">
                    <li>
                      <Link
                        href="/dashboard/relatorios/vendedor"
                        className={cn(
                          "block px-3 py-2 rounded-lg text-sm transition-colors",
                          pathname === "/dashboard/relatorios/vendedor"
                            ? "font-medium text-white"
                            : "text-white/70 hover:bg-white/10 hover:text-white",
                        )}
                        style={pathname === "/dashboard/relatorios/vendedor" ? { 
                          backgroundColor: 'rgba(255, 255, 255, 0.12)', 
                        } : {}}
                      >
                        Por Vendedor
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/dashboard/relatorios/controle"
                        className={cn(
                          "block px-3 py-2 rounded-lg text-sm transition-colors",
                          pathname === "/dashboard/relatorios/controle"
                            ? "font-medium text-white"
                            : "text-white/70 hover:bg-white/10 hover:text-white",
                        )}
                        style={pathname === "/dashboard/relatorios/controle" ? { 
                          backgroundColor: 'rgba(255, 255, 255, 0.12)', 
                        } : {}}
                      >
                        Controle
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/dashboard/relatorios/ranking-produtos"
                        className={cn(
                          "block px-3 py-2 rounded-lg text-sm transition-colors",
                          pathname === "/dashboard/relatorios/ranking-produtos"
                            ? "font-medium text-white"
                            : "text-white/70 hover:bg-white/10 hover:text-white",
                        )}
                        style={pathname === "/dashboard/relatorios/ranking-produtos" ? { 
                          backgroundColor: 'rgba(255, 255, 255, 0.12)', 
                        } : {}}
                      >
                        Relatório de Produtos
                      </Link>
                    </li>
                  </ul>
                )}
              </li>
            </>
          ) : (
            <>
              {bladeSidebarMode ? (
                <>
                  {!isCollapsed ? (
                    <li className="list-none px-1 pb-2 pt-0">
                      <div className="rounded-md bg-white/5 px-2 py-1.5 ring-1 ring-white/10">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">Gplace</p>
                        <p className="text-[10px] text-white/45">Menu alinhado ao Blade + API v1</p>
                      </div>
                    </li>
                  ) : null}
                  <GplaceBladeSidebar isCollapsed={isCollapsed} />
                  {canAccessModule("gerenciar") ? (
                    <>
                      <li className="list-none py-3" aria-hidden="true">
                        <div className="mx-1 border-t border-white/25" />
                      </li>
                      {!isCollapsed ? (
                        <li className="list-none px-1 pb-2 pt-0">
                          <div className="rounded-md bg-white/5 px-2 py-1.5 ring-1 ring-white/10">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Legado TIM</p>
                            <p className="text-[10px] text-white/40">Outro backend (vendas, relatórios…)</p>
                          </div>
                        </li>
                      ) : null}
                    </>
                  ) : null}
                </>
              ) : null}
              {navigation
              .filter((item) => {
                if (bladeSidebarMode && item.name === "Home") return false
                return canAccessModule(item.permission);
              })
              .map((item) => {
              const isExpanded = expandedItems.includes(item.name)
              const hasChildren = "children" in item

              if (!hasChildren) {
                const isActive = pathname === item.href
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href!}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "text-white font-semibold"
                          : "text-white/90 hover:bg-white/10 hover:text-white",
                        isCollapsed ? "justify-center" : ""
                      )}
                      style={isActive ? { backgroundColor: 'rgba(255, 255, 255, 0.15)' } : {}}
                      title={isCollapsed ? item.name : undefined}
                    >
                      <item.icon className="w-5 h-5" />
                      {!isCollapsed && item.name}
                    </Link>
                  </li>
                )
              }

              // Filtrar children baseado nas permissões específicas
              const filteredChildren = item.children?.filter((child) => {
                // Lógica especial para usuários baseada nas permissões
                if (child.name === "Usuários") {
                  return userPermissions.canViewAllUsers || userPermissions.canViewEstablishmentUsers || userPermissions.canViewOwnUser
                }
                // Lógica especial para estabelecimentos baseada nas permissões
                if (child.name === "Estabelecimentos") {
                  return userPermissions.canViewAllEstablishments
                }
                return canAccessSpecificModule(child.permission)
              }) || []

              // Se não há children visíveis, não mostrar o item pai
              if (filteredChildren.length === 0) {
                return null
              }

              return (
                <li key={item.name}>
                  {isCollapsed ? (
                    <Link
                      href={filteredChildren[0]?.href ?? "/dashboard"}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white",
                        "justify-center"
                      )}
                      title={item.name}
                    >
                      <div className="flex items-center justify-center">
                        <item.icon className="h-5 w-5" />
                      </div>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(item.name)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5" />
                        {item.name}
                      </div>
                      <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
                    </button>
                  )}
                  {!isCollapsed && isExpanded && filteredChildren.length > 0 && (
                    <ul className="mt-1 ml-8 space-y-1">
                      {filteredChildren.map((child) => {
                        const isActive = pathname === child.href
                        // Personalizar o nome baseado nas permissões para usuários
                        const displayName = child.name === "Usuários" ? 
                          (userPermissions.canViewAllUsers ? "Usuários" :
                           userPermissions.canViewEstablishmentUsers ? "Usuários da Loja" : "Meu Perfil") : 
                          child.name
                        return (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              className={cn(
                                "block px-3 py-2 rounded-lg text-sm transition-colors",
                                isActive
                                  ? "font-medium text-white"
                                  : "text-white/70 hover:bg-white/10 hover:text-white",
                              )}
                              style={isActive ? { 
                                backgroundColor: 'rgba(255, 255, 255, 0.12)', 
                              } : {}}
                            >
                              {displayName}
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              )
            })}
            </>
          )}
        </ul>
      </nav>
      
      {/* Footer com link da Gooding Solutions */}
      <div className={cn("border-t border-white/20 p-4", isCollapsed ? "p-2" : "")}>
        <div className="text-center">
          {!isCollapsed ? (
            <div className="text-xs text-white/60">
              Desenvolvido por{' '}
              <a
                href="https://gooding.solutions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/90 hover:text-white font-semibold underline decoration-white/40 hover:decoration-white/60 transition-all duration-200"
              >
                Gooding Solutions
              </a>
            </div>
          ) : (
            <a
              href="https://gooding.solutions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-white/60 hover:text-white/80 transition-colors font-semibold"
              title="Desenvolvido por Gooding Solutions"
            >
              GS
            </a>
          )}
        </div>
      </div>
      
    </aside>
  )
}
