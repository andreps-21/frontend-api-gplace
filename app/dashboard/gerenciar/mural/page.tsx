"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MessageSquare, Plus, Pin, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

const avisos = [
  {
    id: 1,
    titulo: "Nova Meta de Vendas - Junho",
    conteudo: "A meta para o mês de junho foi ajustada. Confira os novos objetivos no painel de metas.",
    autor: "Administração",
    data: "15/06/2024",
    fixado: true,
  },
  {
    id: 2,
    titulo: "Treinamento de Produtos",
    conteudo: "Treinamento sobre os novos aparelhos Samsung será realizado na próxima terça-feira às 14h.",
    autor: "RH",
    data: "14/06/2024",
    fixado: false,
  },
  {
    id: 3,
    titulo: "Campanha de Pós-Pago",
    conteudo: "Nova campanha promocional de planos pós-pagos com bônus especial para vendedores.",
    autor: "Marketing",
    data: "12/06/2024",
    fixado: true,
  },
  {
    id: 4,
    titulo: "Manutenção Sistema",
    conteudo: "O sistema ficará em manutenção no domingo das 2h às 6h da manhã.",
    autor: "TI",
    data: "10/06/2024",
    fixado: false,
  },
]

export default function MuralPage() {
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <MessageSquare className="w-8 h-8" style={{ color: '#0026d9' }} />
            Mural de Avisos
          </h2>
          <p className="text-muted-foreground mt-2">Comunicados e informações importantes</p>
        </div>
        <Button 
          onClick={() => setShowForm(!showForm)}
          className="text-white"
          style={{ backgroundColor: '#0026d9' }}
          onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#001a99'}
          onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#0026d9'}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Aviso
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Criar Novo Aviso</CardTitle>
            <CardDescription>Publique um comunicado para toda a equipe</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título</Label>
              <Input id="titulo" placeholder="Digite o título do aviso" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="conteudo">Conteúdo</Label>
              <Textarea id="conteudo" placeholder="Digite o conteúdo do aviso..." rows={4} />
            </div>
            <div className="flex gap-2">
              <Button 
                className="text-white"
                style={{ backgroundColor: '#0026d9' }}
                onMouseEnter={(e) => {
                  const target = e.target as HTMLButtonElement
                  target.style.backgroundColor = '#001a99'
                }}
                onMouseLeave={(e) => {
                  const target = e.target as HTMLButtonElement
                  target.style.backgroundColor = '#0026d9'
                }}
              >
                Publicar Aviso
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {avisos.map((aviso) => (
          <Card 
            key={aviso.id} 
            className={aviso.fixado ? "" : ""}
            style={aviso.fixado ? { borderColor: '#0026d9', borderWidth: '2px' } : {}}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{aviso.titulo}</CardTitle>
                    {aviso.fixado && (
                      <Badge 
                        variant="default" 
                        className="flex items-center gap-1"
                        style={{ backgroundColor: '#0026d9', color: 'white' }}
                      >
                        <Pin className="w-3 h-3" />
                        Fixado
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <span>{aviso.autor}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {aviso.data}
                    </span>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-foreground mb-4">{aviso.conteudo}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  Editar
                </Button>
                <Button size="sm" variant="outline">
                  {aviso.fixado ? "Desafixar" : "Fixar"}
                </Button>
                <Button size="sm" variant="outline">
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
