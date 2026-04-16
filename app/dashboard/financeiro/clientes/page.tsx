"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Users, Plus, Mail, Phone, X, Edit, Save, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { useState } from "react"
import DocumentUpload, { DocumentFile } from "@/components/ui/document-upload"
import { apiService, Customer } from "@/lib/api"

const clientes = [
  {
    id: 1,
    nome: "Operadora TIM",
    email: "contato@tim.com.br",
    telefone: "(11) 4000-4141",
    totalCompras: 318450,
    ultimaCompra: "15/06/2024",
  },
  {
    id: 2,
    nome: "Distribuidora Tech",
    email: "vendas@distribuidoratech.com",
    telefone: "(11) 3456-7890",
    totalCompras: 89000,
    ultimaCompra: "12/06/2024",
  },
  {
    id: 3,
    nome: "Empresa Corporativa A",
    email: "compras@empresaa.com",
    telefone: "(11) 2345-6789",
    totalCompras: 45600,
    ultimaCompra: "08/06/2024",
  },
]

export default function ClientesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingCliente, setEditingCliente] = useState<any>(null)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [documents, setDocuments] = useState<DocumentFile[]>([])
  const [formData, setFormData] = useState({
    name: "",
    cpf: "",
    email: "",
    phone: "",
    whatsapp: "",
    birth_date: "",
    zip_code: "",
    address: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: ""
  })

  const filteredClientes = clientes.filter(
    (cliente) =>
      cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError("")
      
      await apiService.createCustomer({
        name: formData.name,
        nif: formData.cpf,
        email: formData.email,
        phone: formData.phone,
        whatsapp: formData.whatsapp,
        birth_date: formData.birth_date,
        zip_code: formData.zip_code,
        address: formData.address,
        number: formData.number,
        complement: formData.complement,
        neighborhood: formData.neighborhood,
        city: formData.city,
        state: formData.state
      })

      setSuccess(true)
      setShowModal(false)
      setFormData({
        name: "",
        cpf: "",
        email: "",
        phone: "",
        whatsapp: "",
        birth_date: "",
        zip_code: "",
        address: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: ""
      })
      setDocuments([])
      
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      console.error("Erro ao criar cliente:", err)
      setError(err.message || "Erro ao criar cliente.")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (cliente: any) => {
    setEditingCliente(cliente)
    setFormData({
      name: cliente.nome || "",
      cpf: cliente.cpf || "",
      email: cliente.email || "",
      phone: cliente.telefone || "",
      whatsapp: cliente.whatsapp || "",
      birth_date: cliente.birth_date || "",
      zip_code: cliente.zip_code || "",
      address: cliente.address || "",
      number: cliente.number || "",
      complement: cliente.complement || "",
      neighborhood: cliente.neighborhood || "",
      city: cliente.city || "",
      state: cliente.state || ""
    })
    setShowEditModal(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError("")
      
      await apiService.updateCustomer(editingCliente.id, {
        name: formData.name,
        nif: formData.cpf,
        email: formData.email,
        phone: formData.phone,
        whatsapp: formData.whatsapp,
        birth_date: formData.birth_date,
        zip_code: formData.zip_code,
        address: formData.address,
        number: formData.number,
        complement: formData.complement,
        neighborhood: formData.neighborhood,
        city: formData.city,
        state: formData.state
      })

      setSuccess(true)
      setShowEditModal(false)
      setEditingCliente(null)
      
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      console.error("Erro ao atualizar cliente:", err)
      setError(err.message || "Erro ao atualizar cliente.")
    } finally {
      setLoading(false)
    }
  }

  const handleDocumentsChange = (docs: DocumentFile[]) => {
    setDocuments(docs)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            Clientes
          </h2>
          <p className="text-muted-foreground mt-2">Gerencie cadastro de clientes</p>
        </div>
        <Button 
          onClick={() => setShowModal(true)}
          className="text-white"
          style={{ backgroundColor: '#0026d9' }}
          onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#001a99'}
          onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#0026d9'}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar Clientes</CardTitle>
          <CardDescription>Pesquise por nome ou email</CardDescription>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{clientes.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              R$ {clientes.reduce((acc, c) => acc + c.totalCompras, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Acumulado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ticket Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              R$ {Math.round(clientes.reduce((acc, c) => acc + c.totalCompras, 0) / clientes.length).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Por cliente</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {filteredClientes.map((cliente) => (
          <Card key={cliente.id}>
            <CardHeader>
              <CardTitle>{cliente.nome}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  {cliente.email}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  {cliente.telefone}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total em Compras</p>
                  <p className="text-lg font-semibold text-foreground">R$ {cliente.totalCompras.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Última Compra</p>
                  <p className="text-lg font-semibold text-foreground">{cliente.ultimaCompra}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="bg-transparent">
                  Ver Histórico
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="bg-transparent"
                  onClick={() => handleEdit(cliente)}
                >
                  <Edit className="w-4 h-4 mr-1" />
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
