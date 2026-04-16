"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CreditCard, Plus, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const contasPagar = [
  {
    id: 1,
    descricao: "Aluguel Loja 1",
    fornecedor: "Imobiliária Centro",
    valor: 8500,
    vencimento: "05/07/2024",
    status: "Pendente",
    categoria: "Aluguel",
  },
  {
    id: 2,
    descricao: "Fornecedor Aparelhos",
    fornecedor: "Distribuidora Tech",
    valor: 45000,
    vencimento: "10/07/2024",
    status: "Pendente",
    categoria: "Fornecedores",
  },
  {
    id: 3,
    descricao: "Energia Elétrica",
    fornecedor: "Companhia de Energia",
    valor: 3200,
    vencimento: "15/07/2024",
    status: "Pendente",
    categoria: "Utilidades",
  },
  {
    id: 4,
    descricao: "Internet e Telefonia",
    fornecedor: "Telecom Provider",
    valor: 1800,
    vencimento: "20/07/2024",
    status: "Pendente",
    categoria: "Comunicação",
  },
  {
    id: 5,
    descricao: "Manutenção Sistemas",
    fornecedor: "TI Solutions",
    valor: 2500,
    vencimento: "02/07/2024",
    status: "Vencida",
    categoria: "TI",
  },
]

export default function ContasPagarPage() {
  const totalPendente = contasPagar.filter((c) => c.status === "Pendente").reduce((acc, c) => acc + c.valor, 0)
  const totalVencido = contasPagar.filter((c) => c.status === "Vencida").reduce((acc, c) => acc + c.valor, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-blue-600" />
            Contas a Pagar
          </h2>
          <p className="text-muted-foreground mt-2">Gerencie pagamentos e fornecedores</p>
        </div>
        <Button 
          className="text-white"
          style={{ backgroundColor: '#0026d9' }}
          onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#001a99'}
          onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#0026d9'}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Conta
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total a Pagar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">R$ {totalPendente.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {contasPagar.filter((c) => c.status === "Pendente").length} contas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vencidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">R$ {totalVencido.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {contasPagar.filter((c) => c.status === "Vencida").length} contas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Próximo Vencimento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">05/07</div>
            <p className="text-xs text-muted-foreground mt-1">Aluguel Loja 1</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">R$ 61.000</div>
            <p className="text-xs text-muted-foreground mt-1">Julho 2024</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        {contasPagar.map((conta) => (
          <Card key={conta.id} className={conta.status === "Vencida" ? "border-red-600" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{conta.descricao}</h3>
                    <Badge variant={conta.status === "Vencida" ? "destructive" : "secondary"}>{conta.status}</Badge>
                    {conta.status === "Vencida" && <AlertCircle className="w-4 h-4 text-red-600" />}
                  </div>
                  <p className="text-sm text-muted-foreground">{conta.fornecedor}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs text-muted-foreground">Categoria: {conta.categoria}</span>
                    <span className="text-xs text-muted-foreground">Vencimento: {conta.vencimento}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-foreground">R$ {conta.valor.toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm">Pagar</Button>
                    <Button size="sm" variant="outline">
                      Editar
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
