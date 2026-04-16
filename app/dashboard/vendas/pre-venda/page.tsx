"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Search, FileText, Calendar, User, Phone, DollarSign } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const mockPreVendas = [
  {
    id: "PV-2024-001",
    cliente: "João Silva",
    cpf: "123.456.789-00",
    telefone: "(11) 98765-4321",
    servico: "Pós-Pago",
    plano: "TIM Black 50GB",
    valor: "R$ 89,90",
    vendedor: "Maria Santos",
    loja: "Loja 1 - Centro",
    data: "15/01/2024",
    status: "Pendente",
  },
  {
    id: "PV-2024-002",
    cliente: "Ana Costa",
    cpf: "987.654.321-00",
    telefone: "(11) 91234-5678",
    servico: "Controle",
    plano: "TIM Controle 25GB",
    valor: "R$ 54,90",
    vendedor: "Pedro Lima",
    loja: "Loja 3 - Shopping",
    data: "14/01/2024",
    status: "Aprovada",
  },
]

export default function PreVendaPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [results, setResults] = useState<typeof mockPreVendas>([])

  const handleSearch = () => {
    // Simulate search
    if (searchTerm) {
      setResults(
        mockPreVendas.filter(
          (pv) =>
            pv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            pv.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
            pv.cpf.includes(searchTerm),
        ),
      )
    } else {
      setResults([])
    }
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Search className="w-8 h-8 text-blue-600" />
          Buscar Pré-Venda
        </h2>
        <p className="text-muted-foreground mt-2">Consulte pré-vendas cadastradas no sistema</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Pesquisar</CardTitle>
          <CardDescription>Busque por código, nome do cliente ou CPF</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="search" className="sr-only">
                Buscar
              </Label>
              <Input
                id="search"
                placeholder="Digite o código da pré-venda, nome ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button 
              onClick={handleSearch}
              className="text-white"
              style={{ backgroundColor: '#0026d9' }}
              onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#001a99'}
              onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#0026d9'}
            >
              <Search className="w-4 h-4 mr-2" />
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">
            {results.length} resultado{results.length > 1 ? "s" : ""} encontrado{results.length > 1 ? "s" : ""}
          </h3>
          {results.map((preVenda) => (
            <Card key={preVenda.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      {preVenda.id}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {preVenda.servico} - {preVenda.plano}
                    </CardDescription>
                  </div>
                  <Badge variant={preVenda.status === "Aprovada" ? "default" : "secondary"}>{preVenda.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{preVenda.cliente}</p>
                      <p className="text-sm text-muted-foreground">{preVenda.cpf}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{preVenda.telefone}</p>
                      <p className="text-sm text-muted-foreground">Contato</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{preVenda.valor}</p>
                      <p className="text-sm text-muted-foreground">Valor</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{preVenda.vendedor}</p>
                      <p className="text-sm text-muted-foreground">{preVenda.loja}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{preVenda.data}</p>
                      <p className="text-sm text-muted-foreground">Data da pré-venda</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button 
                    size="sm"
                    className="text-white"
                    style={{ backgroundColor: '#0026d9' }}
                    onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#001a99'}
                    onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#0026d9'}
                  >Ver Detalhes</Button>
                  <Button size="sm" variant="outline">
                    Editar
                  </Button>
                  {preVenda.status === "Pendente" && (
                    <Button size="sm" variant="outline">
                      Aprovar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {searchTerm && results.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma pré-venda encontrada para "{searchTerm}"</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
