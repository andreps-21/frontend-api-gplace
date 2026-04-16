"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Radio, TrendingUp } from "lucide-react"
import { CartesianGrid, XAxis, YAxis, ResponsiveContainer, Line, LineChart, Tooltip } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const plansData = [
  { plano: "Controle 25GB", quantidade: 98, valor: 5382, color: "#0026d9" },
  { plano: "Controle 20GB", quantidade: 76, valor: 3724, color: "#E30613" },
  { plano: "Controle 15GB", quantidade: 54, valor: 2430, color: "#00A651" },
]

const monthlyTrend = [
  { mes: "Jan", vendas: 178 },
  { mes: "Fev", vendas: 195 },
  { mes: "Mar", vendas: 187 },
  { mes: "Abr", vendas: 212 },
  { mes: "Mai", vendas: 203 },
  { mes: "Jun", vendas: 228 },
]

export default function RelatorioControlePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Radio className="w-8 h-8" style={{ color: '#0026d9' }} />
            Relatório Controle
          </h2>
          <p className="text-muted-foreground mt-2">Análise de vendas de planos controle</p>
        </div>
        <Button 
          className="text-white"
          style={{ backgroundColor: '#0026d9' }}
          onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#001a99'}
          onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#0026d9'}
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Controle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">228</div>
            <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              +12% vs mês anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">R$ 11.536</div>
            <p className="text-xs text-muted-foreground mt-1">Ticket médio: R$ 50,60</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Plano Mais Vendido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">25GB</div>
            <p className="text-xs text-muted-foreground mt-1">98 vendas (43%)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Crescimento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">+28%</div>
            <p className="text-xs text-muted-foreground mt-1">Últimos 6 meses</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evolução Mensal</CardTitle>
          <CardDescription>Histórico de vendas de planos controle</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="mes" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Line type="monotone" dataKey="vendas" stroke="#0026d9" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vendas por Plano</CardTitle>
          <CardDescription>Desempenho de cada plano controle</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {plansData.map((plano) => (
              <div key={plano.plano}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-foreground">{plano.plano}</p>
                    <p className="text-sm text-muted-foreground">{plano.quantidade} vendas</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">R$ {plano.valor.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      {((plano.quantidade / 228) * 100).toFixed(0)}% do total
                    </p>
                  </div>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{ 
                      backgroundColor: plano.color,
                      width: `${(plano.quantidade / 228) * 100}%` 
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
