"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Folder, Plus, Edit, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const categorias = [
  { id: 1, nome: "Aluguel", tipo: "Despesa", cor: "bg-red-500", transacoes: 7 },
  { id: 2, nome: "Salários", tipo: "Despesa", cor: "bg-orange-500", transacoes: 54 },
  { id: 3, nome: "Vendas", tipo: "Receita", cor: "bg-green-500", transacoes: 328 },
  { id: 4, nome: "Fornecedores", tipo: "Despesa", cor: "bg-yellow-500", transacoes: 23 },
  { id: 5, nome: "Comissões", tipo: "Despesa", cor: "bg-purple-500", transacoes: 54 },
  { id: 6, nome: "Serviços", tipo: "Receita", cor: "bg-blue-500", transacoes: 156 },
  { id: 7, nome: "Manutenção", tipo: "Despesa", cor: "bg-pink-500", transacoes: 12 },
  { id: 8, nome: "Marketing", tipo: "Despesa", cor: "bg-indigo-500", transacoes: 8 },
]

export default function CategoriasPage() {
  const [filter, setFilter] = useState<"Todas" | "Receita" | "Despesa">("Todas")

  const filteredCategorias = filter === "Todas" ? categorias : categorias.filter((cat) => cat.tipo === filter)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Folder className="w-8 h-8 text-blue-600" />
            Categorias
          </h2>
          <p className="text-muted-foreground mt-2">Organize receitas e despesas por categoria</p>
        </div>
        <Button 
          className="text-white"
          style={{ backgroundColor: '#0026d9' }}
          onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#001a99'}
          onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#0026d9'}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtrar por Tipo</CardTitle>
          <CardDescription>Visualize categorias de receita ou despesa</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button variant={filter === "Todas" ? "default" : "outline"} onClick={() => setFilter("Todas")}>
              Todas ({categorias.length})
            </Button>
            <Button
              variant={filter === "Receita" ? "default" : "outline"}
              onClick={() => setFilter("Receita")}
              className="bg-transparent"
            >
              Receitas ({categorias.filter((c) => c.tipo === "Receita").length})
            </Button>
            <Button
              variant={filter === "Despesa" ? "default" : "outline"}
              onClick={() => setFilter("Despesa")}
              className="bg-transparent"
            >
              Despesas ({categorias.filter((c) => c.tipo === "Despesa").length})
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCategorias.map((categoria) => (
          <Card key={categoria.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${categoria.cor} rounded-lg flex items-center justify-center`}>
                    <Folder className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{categoria.nome}</CardTitle>
                    <CardDescription>{categoria.transacoes} transações</CardDescription>
                  </div>
                </div>
                <Badge variant={categoria.tipo === "Receita" ? "default" : "secondary"}>{categoria.tipo}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                  <Edit className="w-3 h-3 mr-1" />
                  Editar
                </Button>
                <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                  <Trash2 className="w-3 h-3 mr-1" />
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
