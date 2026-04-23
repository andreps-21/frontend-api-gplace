"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/** Layout aproximado do painel inicial (substitui Loader2 + «Carregando dashboard…»). */
export function DashboardHomeSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="A carregar o dashboard">
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="flex h-full min-h-0 min-w-0 flex-col">
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

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
            <Skeleton className="h-7 w-56 max-w-full" />
            <Skeleton className="h-4 w-40 max-w-full sm:shrink-0" />
          </div>
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
            <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
              <Skeleton className="h-7 w-48 max-w-full" />
              <Skeleton className="h-4 w-40 max-w-full sm:shrink-0" />
            </div>
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
            <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
              <Skeleton className="h-7 w-56 max-w-full" />
              <Skeleton className="h-4 w-36 max-w-full sm:shrink-0" />
            </div>
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
