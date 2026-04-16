import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Award, TrendingUp, Users, DollarSign } from 'lucide-react'
import { useTopLojasMes } from '@/hooks/useTopLojasMes'
import { Skeleton } from '@/components/ui/skeleton'

export const TopLojasCard = () => {
  const { topLojas, loading, error, totalLojas, faturamentoTotal } = useTopLojasMes()

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-orange-600" />
            Top Lojas do Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500 py-4">
            Erro ao carregar ranking: {error}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5 text-blue-600" />
          Top Lojas do Mês
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loading ? (
            // Skeleton loader
            <>
              {[1, 2, 3].map((index) => (
                <div key={index} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="w-full h-2 rounded-full" />
                </div>
              ))}
            </>
          ) : topLojas.length > 0 ? (
            <>
              {topLojas.map((loja, index) => (
                <div key={loja.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">
                          {loja.posicao}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{loja.nome}</p>
                        <p className="text-sm text-muted-foreground">
                          {loja.vendas} vendas • {loja.vendedoresAtivos} vendedores
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        R$ {loja.faturamento.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Ticket: R$ {loja.ticketMedio.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </p>
                    </div>
                  </div>
                  
                  {/* Barra de progresso baseada no faturamento */}
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${(loja.faturamento / topLojas[0].faturamento) * 100}%`
                      }}
                    />
                  </div>
                </div>
              ))}
              
              {/* Resumo estatístico */}
              <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total de Lojas:</p>
                    <p className="font-semibold">{totalLojas}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Faturamento Total:</p>
                    <p className="font-semibold">
                      R$ {faturamentoTotal.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Melhor Loja:</p>
                    <p className="font-semibold">{topLojas[0]?.nome || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Faturamento Médio:</p>
                    <p className="font-semibold">
                      R$ {totalLojas > 0 ? (faturamentoTotal / totalLojas).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      }) : '0,00'}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-muted-foreground py-4">
              Nenhuma loja encontrada para o período
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
