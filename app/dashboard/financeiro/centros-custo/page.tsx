"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, Plus, Edit, Trash2 } from "lucide-react"

const centrosCusto = [
  { id: 1, nome: "Loja 1 - Centro", descricao: "Custos operacionais da loja centro", orcamento: 45000, gasto: 38450 },
  { id: 2, nome: "Loja 2 - Norte", descricao: "Custos operacionais da loja norte", orcamento: 42000, gasto: 35200 },
  { id: 3, nome: "Loja 3 - Shopping", descricao: "Custos operacionais do shopping", orcamento: 52000, gasto: 48900 },
  { id: 4, nome: "Administrativo", descricao: "Custos administrativos gerais", orcamento: 35000, gasto: 28700 },
  { id: 5, nome: "Marketing", descricao: "Campanhas e publicidade", orcamento: 25000, gasto: 18500 },
  { id: 6, nome: "TI", descricao: "Tecnologia e sistemas", orcamento: 15000, gasto: 12300 },
]

export default function CentrosCustoPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-600" />
            Centros de Custo
          </h2>
          <p className="text-muted-foreground mt-2">Gerencie e acompanhe centros de custo</p>
        </div>
        <Button 
          className="text-white"
          style={{ backgroundColor: '#0026d9' }}
          onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#001a99'}
          onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#0026d9'}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Centro de Custo
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Orçamento Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">R$ 214.000</div>
            <p className="text-xs text-muted-foreground mt-1">Mensal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gasto Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">R$ 182.050</div>
            <p className="text-xs text-muted-foreground mt-1">85% do orçamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Disponível</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">R$ 31.950</div>
            <p className="text-xs text-muted-foreground mt-1">15% restante</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {centrosCusto.map((centro) => {
          const percentual = Math.round((centro.gasto / centro.orcamento) * 100)
          return (
            <Card key={centro.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{centro.nome}</CardTitle>
                    <CardDescription>{centro.descricao}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Orçamento</p>
                    <p className="text-lg font-semibold text-foreground">R$ {centro.orcamento.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gasto</p>
                    <p className="text-lg font-semibold text-foreground">R$ {centro.gasto.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Disponível</p>
                    <p className="text-lg font-semibold text-green-600">
                      R$ {(centro.orcamento - centro.gasto).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Utilização</span>
                    <span
                      className={`text-sm font-semibold ${percentual >= 90 ? "text-red-600" : percentual >= 75 ? "text-orange-600" : "text-green-600"}`}
                    >
                      {percentual}%
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${percentual >= 90 ? "bg-red-600" : percentual >= 75 ? "bg-orange-600" : "bg-green-600"}`}
                      style={{ width: `${percentual}%` }}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="bg-transparent">
                    <Edit className="w-3 h-3 mr-1" />
                    Editar
                  </Button>
                  <Button size="sm" variant="outline" className="bg-transparent">
                    Ver Detalhes
                  </Button>
                  <Button size="sm" variant="outline" className="bg-transparent">
                    <Trash2 className="w-3 h-3 mr-1" />
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
