"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Zap } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const daccPackages = [
  { pacote: "DACC 5GB", quantidade: 67, valor: 2345, color: "#0026d9" },
  { pacote: "DACC 3GB", quantidade: 54, valor: 1620, color: "#E30613" },
  { pacote: "DACC 2GB", quantidade: 35, valor: 875, color: "#00A651" },
]

const monthlyTrend = [
  { mes: "Jan", vendas: 45 },
  { mes: "Fev", vendas: 52 },
  { mes: "Mar", vendas: 48 },
  { mes: "Abr", vendas: 61 },
  { mes: "Mai", vendas: 58 },
  { mes: "Jun", vendas: 67 },
]

export default function RelatorioDACCPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Zap className="w-8 h-8" style={{ color: '#0026d9' }} />
            Relatório DACC
          </h2>
          <p className="text-muted-foreground mt-2">Análise de vendas DACC (Dados Adicionais Controle Cartão)</p>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Total DACC</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">156</div>
            <p className="text-xs text-muted-foreground mt-1">No mês atual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">R$ 5.460</div>
            <p className="text-xs text-muted-foreground mt-1">Ticket médio: R$ 35</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pacote Mais Vendido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">5GB</div>
            <p className="text-xs text-muted-foreground mt-1">67 vendas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa Adesão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">42%</div>
            <p className="text-xs text-muted-foreground mt-1">Dos clientes controle</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evolução Mensal DACC</CardTitle>
          <CardDescription>Histórico de vendas de pacotes DACC</CardDescription>
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
          <CardTitle>Pacotes DACC</CardTitle>
          <CardDescription>Distribuição de vendas por pacote</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {daccPackages.map((item) => (
              <div key={item.pacote}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-foreground">{item.pacote}</p>
                    <p className="text-sm text-muted-foreground">{item.quantidade} vendas</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">R$ {item.valor.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      {((item.quantidade / 156) * 100).toFixed(0)}% do total
                    </p>
                  </div>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{ 
                      backgroundColor: item.color,
                      width: `${(item.quantidade / 156) * 100}%` 
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
