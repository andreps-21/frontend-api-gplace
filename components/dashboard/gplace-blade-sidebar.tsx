"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { gplaceBladeNavTree, type GplaceNavNode } from "@/lib/gplace-blade-nav"
import { useGplacePermissions } from "@/lib/use-gplace-permissions"
import { ChevronDown, Circle, LayoutDashboard, ScanLine, ShoppingCart } from "lucide-react"

function flattenLinks(nodes: GplaceNavNode[]): Array<{ href: string; label: string }> {
  const acc: Array<{ href: string; label: string }> = []
  for (const n of nodes) {
    if (n.kind === "link") acc.push({ href: n.href, label: n.label })
    else acc.push(...flattenLinks(n.children))
  }
  return acc
}

function NavLink(props: {
  href: string
  label: string
  pathname: string
  isCollapsed: boolean
  depth: number
}) {
  const { href, label, pathname, isCollapsed, depth } = props
  const isActive =
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === href || pathname.startsWith(href + "/")
  return (
    <li>
      <Link
        href={href}
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
          depth > 0 && "pl-2",
          isActive ? "font-semibold text-white" : "text-white/85 hover:bg-white/10 hover:text-white",
          isCollapsed && depth === 0 && "justify-center px-2"
        )}
        style={isActive ? { backgroundColor: "rgba(255,255,255,0.14)" } : undefined}
        title={isCollapsed ? label : undefined}
      >
        {depth === 0 && href === "/dashboard" ? (
          <LayoutDashboard className="h-4 w-4 shrink-0" />
        ) : null}
        {depth === 0 && href === "/dashboard/vendas/cadastrar" ? (
          <ShoppingCart className="h-4 w-4 shrink-0" />
        ) : null}
        {!isCollapsed && label}
      </Link>
    </li>
  )
}

function NavGroup(props: {
  node: GplaceNavNode & { kind: "group" }
  pathname: string
  isCollapsed: boolean
  depth: number
  defaultOpen: boolean
}) {
  const { node, pathname, isCollapsed, depth, defaultOpen } = props
  const [open, setOpen] = useState(defaultOpen)

  if (isCollapsed) {
    return (
      <li className="text-white/50">
        <span className="sr-only">{node.label}</span>
      </li>
    )
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium text-white/90 hover:bg-white/10",
          depth > 0 && "text-white/80"
        )}
      >
        <span>{node.label}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <ul className={cn("mt-1 space-y-0.5 border-l border-white/15", depth === 0 ? "ml-2 pl-2" : "ml-1 pl-2")}>
          {node.children.map((ch, i) => (
            <NavBranch key={i} node={ch} pathname={pathname} isCollapsed={isCollapsed} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

function NavBranch(props: { node: GplaceNavNode; pathname: string; isCollapsed: boolean; depth: number }) {
  const { node, pathname, isCollapsed, depth } = props
  if (node.kind === "link") {
    return <NavLink href={node.href} label={node.label} pathname={pathname} isCollapsed={isCollapsed} depth={depth} />
  }
  const childActive = node.children.some(
    (c) => c.kind === "link" && (pathname === c.href || pathname.startsWith(c.href + "/"))
  )
  return <NavGroup node={node} pathname={pathname} isCollapsed={isCollapsed} depth={depth} defaultOpen={childActive} />
}

export function GplaceBladeSidebar(props: { isCollapsed: boolean }) {
  const pathname = usePathname()
  const { filterNav } = useGplacePermissions()
  const visible = filterNav(gplaceBladeNavTree)

  if (props.isCollapsed) {
    const flat = flattenLinks(visible)
    return (
      <ul className="flex flex-col items-center gap-1 py-1">
        {flat.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                title={item.label}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                  isActive ? "bg-white/20 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
                )}
              >
                {item.href === "/dashboard" ? (
                  <LayoutDashboard className="h-4 w-4" />
                ) : item.href === "/dashboard/vendas/cadastrar" ? (
                  <ShoppingCart className="h-4 w-4" />
                ) : item.href === "/dashboard/venda-rapida" ? (
                  <ScanLine className="h-4 w-4" />
                ) : (
                  <Circle className="h-2.5 w-2.5 fill-current" />
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <ul className="space-y-1">
      {visible.map((node, i) => (
        <NavBranch key={i} node={node} pathname={pathname} isCollapsed={false} depth={0} />
      ))}
    </ul>
  )
}
