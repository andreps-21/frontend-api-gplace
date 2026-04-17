"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/** Grelha de cartões tipo KPI (dashboard, relatórios). */
export function PanelGridCardsSkeleton({ cards = 8 }: { cards?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: cards }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-5 rounded" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3 w-full max-w-[180px]" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/** Título + subtítulo + grelha (páginas admin genéricas). */
export function PanelPageHeaderSkeleton() {
  return (
    <div className="mb-6 space-y-2">
      <Skeleton className="h-9 w-48 max-w-full sm:w-56" />
      <Skeleton className="h-4 w-full max-w-xl" />
    </div>
  )
}

/** Bloco centrado antigo (spinner) — substituído por skeleton compacto. */
export function PanelCenteredBlockSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className="flex w-full max-w-md flex-col gap-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className={`h-4 w-full ${i === lines - 1 ? "max-w-[70%]" : ""}`} />
        ))}
      </div>
    </div>
  )
}

/** Tabela: cabeçalho + linhas (número de colunas configurável). */
export function PanelTableSkeleton({ rows = 8, columns = 4 }: { rows?: number; columns?: number }) {
  const safeCols = Math.max(1, Math.min(columns, 8))
  const gridStyle = { gridTemplateColumns: `repeat(${safeCols}, minmax(0, 1fr))` } as const
  return (
    <div className="space-y-3 rounded-md border p-4" aria-busy="true" aria-label="A carregar dados">
      <div className="grid gap-3 border-b pb-3" style={gridStyle}>
        {Array.from({ length: safeCols }).map((_, j) => (
          <Skeleton key={`h-${j}`} className="h-4 w-full" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid gap-3 py-2" style={gridStyle}>
          {Array.from({ length: safeCols }).map((_, j) => (
            <Skeleton key={`${i}-${j}`} className="h-4 w-full" />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Lista com checkboxes (ex.: diálogo de permissões). */
export function PanelCheckboxListSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-1" aria-busy="true" aria-label="A carregar lista">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="mt-0.5 h-4 w-4 shrink-0 rounded-sm" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-3 w-full max-w-xs" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Página de formulário (cartão + grelha de campos). */
export function PanelFormPageSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6" aria-busy="true" aria-label="A carregar formulário">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>
      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-6 w-48 max-w-full" />
          <Skeleton className="h-4 w-full max-w-lg" />
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-24 rounded-md sm:col-span-2" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-md" />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

/** Bloco alto tipo JSON / pré-formatado (ex.: árvore de secções). */
export function PanelTallBlockSkeleton() {
  const lineWidths = [
    "w-full",
    "w-[92%]",
    "w-[85%]",
    "w-full",
    "w-[78%]",
    "w-[90%]",
    "w-full",
    "w-[95%]",
    "w-[70%]",
    "w-[88%]",
    "w-full",
    "w-[82%]",
    "w-[76%]",
    "w-full",
  ]
  return (
    <div className="min-h-[60vh] rounded-md border bg-muted/30 p-4" aria-busy="true" aria-label="A carregar conteúdo">
      <div className="space-y-2">
        {lineWidths.map((w, i) => (
          <Skeleton key={i} className={`h-3 ${w}`} />
        ))}
      </div>
    </div>
  )
}

/** Campos de formulário empilhados (ex.: formulário dinâmico). */
export function PanelStackedFormFieldsSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="space-y-6 py-4" aria-busy="true" aria-label="A carregar campos">
      <Skeleton className="h-7 w-48 max-w-full" />
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-32 max-w-full" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}
    </div>
  )
}
