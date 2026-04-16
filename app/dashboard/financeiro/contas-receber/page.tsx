"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Wallet, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const contasReceber = [
  {
    id: 1,
    descricao: "Vendas Loja 1 - Junho",
    cliente: "Operadora TIM",
    valor: 45280,
    vencimento: "10/07/2024",
    status: "Pendente",
    categoria: "Vendas",
  },
  {
    id: 2,
    descricao: "Vendas Loja 3 - Junho",
    cliente: "Operadora TIM",
    valor: 52100,
    vencimento: "10/07/2024",
    status: "Pendente",
    categoria: "Vendas",
  },
  {
    id: 3,
    descricao: "Comissão Aparelhos",
    cliente: "Distribuidora Tech",
    valor: 8900,
    vencimento: "15/07/2024",
    status: "Pendente",
    categoria: "Comissões",
  },
  {
    id: 4,
    descricao: "Vendas Loja 2 - Junho",
    cliente: "Operadora TIM",
    valor: 38450,
    vencimento: "10/07/2024",
    status: "Recebida",
    categoria: "Vendas",
  },
]

export default function ContasReceberPage() {
  const totalPendente = contasReceber.filter((c) => c.status === "Pendente").reduce((acc, c) => acc + c.valor, 0)
  const totalRecebido = contasReceber.filter((c) => c.status === "Recebida").reduce((acc, c) => acc + c.valor, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Wallet className="w-8 h-8 text-blue-600" />
            Contas a Receber
          </h2>
          <p className="text-muted-foreground mt-2">Gerencie recebimentos e clientes</p>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Total a Receber</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">R$ {totalPendente.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {contasReceber.filter((c) => c.status === "Pendente").length} contas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recebido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">R$ {totalRecebido.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {contasReceber.filter((c) => c.status === "Recebida").length} contas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Próximo Recebimento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">10/07</div>
            <p className="text-xs text-muted-foreground mt-1">Vendas Junho</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">R$ 144.730</div>
            <p className="text-xs text-muted-foreground mt-1">Julho 2024</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        {contasReceber.map((conta) => (
          <Card key={conta.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{conta.descricao}</h3>
                    <Badge variant={conta.status === "Recebida" ? "default" : "secondary"}>{conta.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{conta.cliente}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs text-muted-foreground">Categoria: {conta.categoria}</span>
                    <span className="text-xs text-muted-foreground">Vencimento: {conta.vencimento}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">R$ {conta.valor.toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    {conta.status === "Pendente" && <Button size="sm">Confirmar Recebimento</Button>}
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
