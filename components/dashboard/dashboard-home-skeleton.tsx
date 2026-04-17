"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { PanelGridCardsSkeleton } from "@/components/dashboard/panel-content-skeleton"

/** Layout aproximado do painel inicial (substitui Loader2 + «Carregando dashboard…»). */
export function DashboardHomeSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="A carregar painel">
      <div className="space-y-2">
        <Skeleton className="h-9 w-40 max-w-full" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>

      <PanelGridCardsSkeleton cards={8} />

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64 max-w-full" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-56 max-w-full" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-[75%] max-w-[200px]" />
                  <Skeleton className="h-3 w-full max-w-xs" />
                </div>
                <Skeleton className="h-4 w-20 shrink-0" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48 max-w-full" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
