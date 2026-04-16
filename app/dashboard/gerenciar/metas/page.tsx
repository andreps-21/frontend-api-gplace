"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Target, Plus, TrendingUp } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const metas = [
  { loja: "Loja 1 - Centro", metaAtual: 375, realizado: 328, atingimento: 87 },
  { loja: "Loja 2 - Norte", metaAtual: 350, realizado: 298, atingimento: 85 },
  { loja: "Loja 3 - Shopping", metaAtual: 400, realizado: 412, atingimento: 103 },
  { loja: "Loja 4 - Sul", metaAtual: 325, realizado: 267, atingimento: 82 },
  { loja: "Loja 5 - Leste", metaAtual: 375, realizado: 345, atingimento: 92 },
  { loja: "Loja 6 - Oeste", metaAtual: 350, realizado: 289, atingimento: 83 },
  { loja: "Loja 7 - Centro II", metaAtual: 400, realizado: 378, atingimento: 95 },
]

export default function MetasPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Target className="w-8 h-8 text-blue-600" />
            Gerenciar Metas
          </h2>
          <p className="text-muted-foreground mt-2">Defina e acompanhe metas de vendas</p>
        </div>
        <Button 
          className="text-white"
          style={{ backgroundColor: '#0026d9' }}
          onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#001a99'}
          onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#0026d9'}
        >
          <Plus className="w-4 h-4 mr-2" />
          Definir Nova Meta
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Meta Total Rede</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">2.575</div>
            <p className="text-xs text-muted-foreground mt-1">Vendas/mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Realizado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">2.317</div>
            <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              +7.5% vs mês anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Atingimento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">89%</div>
            <p className="text-xs text-muted-foreground mt-1">Da meta total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lojas Acima da Meta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">1</div>
            <p className="text-xs text-muted-foreground mt-1">De 7 lojas</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Metas por Loja</CardTitle>
          <CardDescription>Acompanhamento e ajuste de metas mensais</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metas.map((meta) => (
              <div key={meta.loja} className="p-4 bg-secondary rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-foreground">{meta.loja}</p>
                    <p className="text-sm text-muted-foreground">
                      {meta.realizado} de {meta.metaAtual} vendas
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-lg font-bold ${meta.atingimento >= 100 ? "text-green-600" : meta.atingimento >= 85 ? "text-blue-600" : "text-orange-600"}`}
                    >
                      {meta.atingimento}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-background rounded-full h-2 mb-3">
                  <div
                    className={`h-2 rounded-full ${meta.atingimento >= 100 ? "bg-green-600" : meta.atingimento >= 85 ? "" : "bg-orange-600"}`}
                    style={{
                      backgroundColor: meta.atingimento >= 85 && meta.atingimento < 100 ? '#0026d9' : undefined,
                      width: `${Math.min(meta.atingimento, 100)}%`
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor={`meta-${meta.loja}`} className="text-xs">
                      Ajustar Meta
                    </Label>
                    <Input id={`meta-${meta.loja}`} type="number" defaultValue={meta.metaAtual} className="mt-1" />
                  </div>
                  <div className="flex items-end">
                    <Button 
                      size="sm"
                      className="text-white"
                      style={{ backgroundColor: '#0026d9' }}
                      onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#001a99'}
                      onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#0026d9'}
                    >Salvar</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
