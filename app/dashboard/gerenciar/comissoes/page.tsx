"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DollarSign, Download } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

const comissoes = [
  { vendedor: "João Silva", vendas: 67, faturamento: 8450, comissao: 1268, loja: "Loja 1" },
  { vendedor: "Maria Santos", vendas: 54, faturamento: 7120, comissao: 1068, loja: "Loja 3" },
  { vendedor: "Pedro Costa", vendas: 48, faturamento: 6890, comissao: 1034, loja: "Loja 2" },
  { vendedor: "Ana Oliveira", vendas: 45, faturamento: 6340, comissao: 951, loja: "Loja 5" },
  { vendedor: "Carlos Lima", vendas: 42, faturamento: 5980, comissao: 897, loja: "Loja 1" },
]

export default function ComissoesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-blue-600" />
            Gerenciar Comissões
          </h2>
          <p className="text-muted-foreground mt-2">Cálculo e gestão de comissões de vendedores</p>
        </div>
        <Button 
          className="text-white"
          style={{ backgroundColor: '#0026d9' }}
          onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#001a99'}
          onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#0026d9'}
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar Relatório
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Selecione o período e loja</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="periodo-comissao">Período</Label>
              <Select defaultValue="mes-atual">
                <SelectTrigger id="periodo-comissao">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mes-atual">Mês Atual</SelectItem>
                  <SelectItem value="mes-anterior">Mês Anterior</SelectItem>
                  <SelectItem value="trimestre">Último Trimestre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="loja-comissao">Loja</Label>
              <Select defaultValue="todas">
                <SelectTrigger id="loja-comissao">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Lojas</SelectItem>
                  <SelectItem value="loja1">Loja 1 - Centro</SelectItem>
                  <SelectItem value="loja2">Loja 2 - Norte</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                className="w-full text-white"
                style={{ backgroundColor: '#0026d9' }}
                onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#001a99'}
                onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#0026d9'}
              >Aplicar Filtros</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Comissões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">R$ 47.760</div>
            <p className="text-xs text-muted-foreground mt-1">No período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Média por Vendedor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">R$ 885</div>
            <p className="text-xs text-muted-foreground mt-1">54 vendedores</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa Média</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">15%</div>
            <p className="text-xs text-muted-foreground mt-1">Sobre vendas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Maior Comissão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">R$ 1.268</div>
            <p className="text-xs text-muted-foreground mt-1">João Silva</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comissões por Vendedor</CardTitle>
          <CardDescription>Detalhamento de comissões calculadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {comissoes.map((item, index) => (
              <div key={item.vendedor} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{item.vendedor}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.loja} • {item.vendas} vendas
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Faturamento</p>
                    <p className="font-medium text-foreground">R$ {item.faturamento.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Comissão</p>
                    <p className="text-lg font-bold text-green-600">R$ {item.comissao.toLocaleString()}</p>
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
