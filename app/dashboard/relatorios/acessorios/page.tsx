"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Headphones } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const accessoryCategories = [
  { categoria: "Capas e Cases", quantidade: 128, valor: 5120, color: "#0026d9" },
  { categoria: "Películas", quantidade: 98, valor: 2940, color: "#E30613" },
  { categoria: "Carregadores", quantidade: 67, valor: 4690, color: "#00A651" },
  { categoria: "Fones de Ouvido", quantidade: 49, valor: 5920, color: "#FFA500" },
]

const monthlyTrend = [
  { mes: "Jan", vendas: 52 },
  { mes: "Fev", vendas: 58 },
  { mes: "Mar", vendas: 55 },
  { mes: "Abr", vendas: 62 },
  { mes: "Mai", vendas: 59 },
  { mes: "Jun", vendas: 56 },
]

export default function RelatorioAcessoriosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Headphones className="w-8 h-8" style={{ color: '#0026d9' }} />
            Relatório de Acessórios
          </h2>
          <p className="text-muted-foreground mt-2">Análise de vendas de acessórios e periféricos</p>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Acessórios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">342</div>
            <p className="text-xs text-muted-foreground mt-1">No mês atual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">R$ 18.670</div>
            <p className="text-xs text-muted-foreground mt-1">Ticket médio: R$ 54,60</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Categoria Líder</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">Capas</div>
            <p className="text-xs text-muted-foreground mt-1">128 unidades (37%)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Margem Média</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">45%</div>
            <p className="text-xs text-muted-foreground mt-1">Lucro bruto</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evolução Mensal de Acessórios</CardTitle>
          <CardDescription>Histórico de vendas de acessórios e periféricos</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="mes" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="vendas" fill="#0026d9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vendas por Categoria</CardTitle>
          <CardDescription>Distribuição de vendas por tipo de acessório</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {accessoryCategories.map((item) => (
              <div key={item.categoria}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-foreground">{item.categoria}</p>
                    <p className="text-sm text-muted-foreground">{item.quantidade} unidades</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">R$ {item.valor.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      {((item.quantidade / 342) * 100).toFixed(0)}% do total
                    </p>
                  </div>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{ 
                      backgroundColor: item.color,
                      width: `${(item.quantidade / 342) * 100}%` 
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
