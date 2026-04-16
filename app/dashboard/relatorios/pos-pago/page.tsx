"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Smartphone, TrendingUp } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Pie, PieChart, Cell, Legend, Tooltip } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const plansData = [
  { plano: "TIM Black", quantidade: 145, valor: 12905, color: "#0026d9" },
  { plano: "TIM Black Família", quantidade: 98, valor: 11270, color: "#E30613" },
  { plano: "TIM Pós 50GB", quantidade: 67, valor: 5360, color: "#00A651" },
  { plano: "TIM Pós 30GB", quantidade: 54, valor: 3780, color: "#FFA500" },
]

const storeComparison = [
  { loja: "Loja 1", vendas: 67 },
  { loja: "Loja 2", vendas: 54 },
  { loja: "Loja 3", vendas: 89 },
  { loja: "Loja 4", vendas: 43 },
  { loja: "Loja 5", vendas: 71 },
  { loja: "Loja 6", vendas: 48 },
  { loja: "Loja 7", vendas: 62 },
]

const distributionData = [
  { name: "TIM Black", value: 145, color: "#0026d9" },
  { name: "TIM Black Família", value: 98, color: "#E30613" },
  { name: "TIM Pós 50GB", value: 67, color: "#00A651" },
  { name: "TIM Pós 30GB", value: 54, color: "#FFA500" },
]

export default function RelatorioPosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Smartphone className="w-8 h-8" style={{ color: '#0026d9' }} />
            Relatório Pós-Pago
          </h2>
          <p className="text-muted-foreground mt-2">Análise detalhada de vendas de planos pós-pagos</p>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pós-Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">364</div>
            <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              +15% vs mês anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">R$ 33.315</div>
            <p className="text-xs text-muted-foreground mt-1">Ticket médio: R$ 91,50</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Plano Mais Vendido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">TIM Black</div>
            <p className="text-xs text-muted-foreground mt-1">145 vendas (40%)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Conversão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">68%</div>
            <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              +3% vs mês anterior
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vendas por Plano</CardTitle>
            <CardDescription>Quantidade e faturamento por tipo de plano</CardDescription>
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
                        {((plano.quantidade / 364) * 100).toFixed(0)}% do total
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{ 
                        backgroundColor: plano.color,
                        width: `${(plano.quantidade / 364) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Planos</CardTitle>
            <CardDescription>Proporção de vendas por tipo de plano</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distributionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendas por Loja</CardTitle>
          <CardDescription>Comparativo de vendas de pós-pago entre lojas</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={storeComparison}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="loja" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="vendas" fill="#0026d9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
