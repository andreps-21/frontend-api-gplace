"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Truck, Plus, Mail, Phone } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useState } from "react"

const fornecedores = [
  {
    id: 1,
    nome: "Distribuidora Tech",
    email: "vendas@distribuidoratech.com",
    telefone: "(11) 3456-7890",
    categoria: "Aparelhos",
    totalCompras: 245000,
    ultimaCompra: "10/06/2024",
  },
  {
    id: 2,
    nome: "Imobiliária Centro",
    email: "contato@imobiliariacentro.com",
    telefone: "(11) 2345-6789",
    categoria: "Aluguel",
    totalCompras: 59500,
    ultimaCompra: "05/06/2024",
  },
  {
    id: 3,
    nome: "Companhia de Energia",
    email: "atendimento@energia.com",
    telefone: "0800-123-4567",
    categoria: "Utilidades",
    totalCompras: 22400,
    ultimaCompra: "15/06/2024",
  },
  {
    id: 4,
    nome: "TI Solutions",
    email: "suporte@tisolutions.com",
    telefone: "(11) 4567-8901",
    categoria: "TI",
    totalCompras: 17500,
    ultimaCompra: "02/06/2024",
  },
]

export default function FornecedoresPage() {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredFornecedores = fornecedores.filter(
    (fornecedor) =>
      fornecedor.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fornecedor.categoria.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Truck className="w-8 h-8 text-blue-600" />
            Fornecedores
          </h2>
          <p className="text-muted-foreground mt-2">Gerencie cadastro de fornecedores</p>
        </div>
        <Button 
          className="text-white"
          style={{ backgroundColor: '#0026d9' }}
          onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#001a99'}
          onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#0026d9'}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Fornecedor
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar Fornecedores</CardTitle>
          <CardDescription>Pesquise por nome ou categoria</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Digite para buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Fornecedores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{fornecedores.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              R$ {fornecedores.reduce((acc, f) => acc + f.totalCompras, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Acumulado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Maior Fornecedor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">Distribuidora</div>
            <p className="text-xs text-muted-foreground mt-1">R$ 245.000</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {filteredFornecedores.map((fornecedor) => (
          <Card key={fornecedor.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle>{fornecedor.nome}</CardTitle>
                <span className="text-sm font-medium text-muted-foreground">{fornecedor.categoria}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  {fornecedor.email}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  {fornecedor.telefone}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Pago</p>
                  <p className="text-lg font-semibold text-foreground">R$ {fornecedor.totalCompras.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Última Compra</p>
                  <p className="text-lg font-semibold text-foreground">{fornecedor.ultimaCompra}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="bg-transparent">
                  Ver Histórico
                </Button>
                <Button size="sm" variant="outline" className="bg-transparent">
                  Editar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
