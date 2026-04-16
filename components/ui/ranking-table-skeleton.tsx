import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { User } from "lucide-react"

export function RankingTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600" />
          Comparação Detalhada de Vendedores
        </CardTitle>
        <CardDescription>
          Carregando dados dos vendedores...
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-secondary">
                <th className="text-left p-3 font-medium text-muted-foreground">Posição</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Vendedor</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Faturamento</th>
                <th className="text-right p-3 font-medium text-muted-foreground">% do Total</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className="border-b border-secondary/50 hover:bg-muted/50">
                  <td className="p-3">
                    <Skeleton className="h-4 w-8" />
                  </td>
                  <td className="p-3">
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="p-3 text-right">
                    <Skeleton className="h-4 w-20 ml-auto" />
                  </td>
                  <td className="p-3 text-right">
                    <Skeleton className="h-4 w-12 ml-auto" />
                  </td>
                  <td className="p-3 text-center">
                    <Skeleton className="h-6 w-16 mx-auto rounded-full" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Skeleton para as estatísticas */}
        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-5 w-8" />
            </div>
            <div>
              <Skeleton className="h-4 w-28 mb-1" />
              <Skeleton className="h-5 w-20" />
            </div>
            <div>
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-5 w-16" />
            </div>
            <div>
              <Skeleton className="h-4 w-20 mb-1" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
