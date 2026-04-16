"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Smartphone } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const deviceBrands = [
  { marca: "Samsung", quantidade: 78, valor: 76890, color: "#0026d9" },
  { marca: "Motorola", quantidade: 54, valor: 48600, color: "#E30613" },
  { marca: "Apple", quantidade: 32, valor: 44800, color: "#00A651" },
  { marca: "Xiaomi", quantidade: 25, valor: 17160, color: "#FFA500" },
]

const monthlyTrend = [
  { mes: "Jan", vendas: 28 },
  { mes: "Fev", vendas: 32 },
  { mes: "Mar", vendas: 29 },
  { mes: "Abr", vendas: 35 },
  { mes: "Mai", vendas: 33 },
  { mes: "Jun", vendas: 32 },
]

export default function RelatorioAparelhosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Smartphone className="w-8 h-8" style={{ color: '#0026d9' }} />
            Relatório de Aparelhos
          </h2>
          <p className="text-muted-foreground mt-2">Análise de vendas de smartphones e dispositivos</p>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Aparelhos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">189</div>
            <p className="text-xs text-muted-foreground mt-1">No mês atual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">R$ 187.450</div>
            <p className="text-xs text-muted-foreground mt-1">Ticket médio: R$ 992</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Marca Mais Vendida</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">Samsung</div>
            <p className="text-xs text-muted-foreground mt-1">78 aparelhos (41%)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Faixa de Preço</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">R$ 800-1.500</div>
            <p className="text-xs text-muted-foreground mt-1">Mais vendida</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendas por Marca</CardTitle>
          <CardDescription>Distribuição de vendas por fabricante</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {deviceBrands.map((item) => (
              <div key={item.marca}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-foreground">{item.marca}</p>
                    <p className="text-sm text-muted-foreground">{item.quantidade} aparelhos</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">R$ {item.valor.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      {((item.quantidade / 189) * 100).toFixed(0)}% do total
                    </p>
                  </div>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{ 
                      backgroundColor: item.color,
                      width: `${(item.quantidade / 189) * 100}%` 
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
          <CardTitle>Top 10 Aparelhos</CardTitle>
          <CardDescription>Modelos mais vendidos no período</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { modelo: "Samsung Galaxy A54", quantidade: 28, valor: "R$ 1.299" },
              { modelo: "Motorola Edge 40", quantidade: 24, valor: "R$ 1.499" },
              { modelo: "iPhone 13", quantidade: 18, valor: "R$ 3.499" },
              { modelo: "Samsung Galaxy A34", quantidade: 16, valor: "R$ 999" },
              { modelo: "Motorola G84", quantidade: 15, valor: "R$ 899" },
            ].map((item, index) => (
              <div key={item.modelo} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{item.modelo}</p>
                    <p className="text-sm text-muted-foreground">{item.quantidade} unidades</p>
                  </div>
                </div>
                <div className="font-semibold text-foreground">{item.valor}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
