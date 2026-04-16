"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Landmark, Plus, TrendingUp, TrendingDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const contas = [
  { id: 1, banco: "Banco do Brasil", agencia: "1234-5", conta: "12345-6", tipo: "Corrente", saldo: 125450 },
  { id: 2, banco: "Itaú", agencia: "5678-9", conta: "67890-1", tipo: "Corrente", saldo: 87320 },
  { id: 3, banco: "Santander", agencia: "9012-3", conta: "34567-8", tipo: "Poupança", saldo: 45600 },
  { id: 4, banco: "Bradesco", agencia: "4567-8", conta: "90123-4", tipo: "Corrente", saldo: 62180 },
]

const transacoes = [
  {
    id: 1,
    descricao: "Recebimento Vendas",
    valor: 45280,
    tipo: "Entrada",
    data: "15/06/2024",
    conta: "Banco do Brasil",
  },
  { id: 2, descricao: "Pagamento Aluguel", valor: -8500, tipo: "Saída", data: "05/06/2024", conta: "Itaú" },
  {
    id: 3,
    descricao: "Pagamento Fornecedor",
    valor: -45000,
    tipo: "Saída",
    data: "10/06/2024",
    conta: "Banco do Brasil",
  },
  { id: 4, descricao: "Recebimento Comissões", valor: 8900, tipo: "Entrada", data: "12/06/2024", conta: "Santander" },
]

export default function ContasBancariasPage() {
  const saldoTotal = contas.reduce((acc, conta) => acc + conta.saldo, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Landmark className="w-8 h-8 text-blue-600" />
            Contas Bancárias
          </h2>
          <p className="text-muted-foreground mt-2">Gerencie contas e movimentações bancárias</p>
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

      <Card>
        <CardHeader>
          <CardTitle>Saldo Total</CardTitle>
          <CardDescription>Soma de todas as contas bancárias</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-foreground">R$ {saldoTotal.toLocaleString()}</div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {contas.map((conta) => (
          <Card key={conta.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{conta.banco}</CardTitle>
                  <CardDescription>
                    Ag: {conta.agencia} • Conta: {conta.conta}
                  </CardDescription>
                </div>
                <Badge>{conta.tipo}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Saldo Disponível</p>
                <p className="text-3xl font-bold text-foreground">R$ {conta.saldo.toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                  Ver Extrato
                </Button>
                <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                  Editar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimas Transações</CardTitle>
          <CardDescription>Movimentações recentes nas contas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {transacoes.map((transacao) => (
              <div key={transacao.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${transacao.tipo === "Entrada" ? "bg-green-100 dark:bg-green-950" : "bg-red-100 dark:bg-red-950"}`}
                  >
                    {transacao.tipo === "Entrada" ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{transacao.descricao}</p>
                    <p className="text-sm text-muted-foreground">
                      {transacao.conta} • {transacao.data}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`text-lg font-bold ${transacao.tipo === "Entrada" ? "text-green-600" : "text-red-600"}`}
                  >
                    {transacao.tipo === "Entrada" ? "+" : ""}R$ {Math.abs(transacao.valor).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
