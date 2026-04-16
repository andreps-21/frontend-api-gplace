"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Download, Calendar } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

const mockImportHistory = [
  { id: 1, arquivo: "BOV_Janeiro_2024.xlsx", data: "15/01/2024 14:30", registros: 245, status: "Sucesso" },
  { id: 2, arquivo: "BOV_Dezembro_2023.xlsx", data: "02/01/2024 09:15", registros: 198, status: "Sucesso" },
  { id: 3, arquivo: "BOV_Novembro_2023.xlsx", data: "01/12/2023 16:45", registros: 212, status: "Sucesso" },
]

export default function ImportarBOVPage() {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError("")
      setSuccess(false)
    }
  }

  const handleImport = () => {
    if (!file) {
      setError("Por favor, selecione um arquivo para importar")
      return
    }

    setImporting(true)
    setError("")

    // Simulate import
    setTimeout(() => {
      setImporting(false)
      setSuccess(true)
      setFile(null)

      setTimeout(() => setSuccess(false), 5000)
    }, 2000)
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <FileSpreadsheet className="w-8 h-8" style={{ color: '#0026d9' }} />
          Importar BOV
        </h2>
        <p className="text-muted-foreground mt-2">Importe arquivos BOV (Boletim de Objetivos e Vendas) da TIM</p>
      </div>

      {success && (
        <Alert className="mb-6 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Arquivo BOV importado com sucesso! 245 registros processados.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Upload de Arquivo</CardTitle>
            <CardDescription>Selecione o arquivo BOV em formato Excel (.xlsx ou .xls)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <div className="space-y-2">
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-sm font-medium text-primary hover:underline">Clique para selecionar</span>
                  <span className="text-sm text-muted-foreground"> ou arraste o arquivo aqui</span>
                </Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <p className="text-xs text-muted-foreground">Formatos aceitos: .xlsx, .xls (máx. 10MB)</p>
              </div>
            </div>

            {file && (
              <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                  Remover
                </Button>
              </div>
            )}

            <Button 
              onClick={handleImport} 
              disabled={!file || importing} 
              className="w-full text-white"
              style={{ backgroundColor: '#0026d9' }}
              onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#001a99'}
              onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#0026d9'}
            >
              {importing ? "Importando..." : "Importar BOV"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Instruções</CardTitle>
            <CardDescription>Como preparar o arquivo BOV para importação</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-blue-100 dark:bg-blue-950 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-blue-600">1</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Baixe o arquivo BOV</p>
                  <p className="text-sm text-muted-foreground">
                    Acesse o portal TIM e baixe o arquivo BOV mais recente
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 bg-blue-100 dark:bg-blue-950 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-blue-600">2</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Verifique o formato</p>
                  <p className="text-sm text-muted-foreground">
                    Certifique-se de que o arquivo está em formato .xlsx ou .xls
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 bg-blue-100 dark:bg-blue-950 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-blue-600">3</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Faça o upload</p>
                  <p className="text-sm text-muted-foreground">Selecione o arquivo e clique em "Importar BOV"</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button variant="outline" className="w-full bg-transparent">
                <Download className="w-4 h-4 mr-2" />
                Baixar Modelo de Exemplo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" style={{ color: '#0026d9' }} />
            Histórico de Importações
          </CardTitle>
          <CardDescription>Últimas importações realizadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockImportHistory.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5" style={{ color: '#0026d9' }} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.arquivo}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.data} • {item.registros} registros
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600">{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
