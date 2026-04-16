"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Upload, 
  FileText, 
  Image, 
  File, 
  X, 
  Eye, 
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2
} from "lucide-react"

export interface DocumentFile {
  id: string
  file: File
  name: string
  type: string
  size: number
  preview?: string
  uploaded?: boolean
  error?: string
}

interface DocumentUploadProps {
  onDocumentsChange: (documents: DocumentFile[]) => void
  maxFiles?: number
  maxSize?: number // em MB
  acceptedTypes?: string[]
  className?: string
}

const DEFAULT_ACCEPTED_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
]

const DEFAULT_MAX_SIZE = 10 // 10MB

export default function DocumentUpload({
  onDocumentsChange,
  maxFiles = 5,
  maxSize = DEFAULT_MAX_SIZE,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  className = ""
}: DocumentUploadProps) {
  const [documents, setDocuments] = useState<DocumentFile[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-4 h-4" />
    if (type === 'application/pdf') return <FileText className="w-4 h-4" />
    return <File className="w-4 h-4" />
  }

  const validateFile = (file: File): string | null => {
    // Verificar tipo de arquivo
    if (!acceptedTypes.includes(file.type)) {
      return `Tipo de arquivo não permitido. Tipos aceitos: ${acceptedTypes.join(', ')}`
    }

    // Verificar tamanho
    if (file.size > maxSize * 1024 * 1024) {
      return `Arquivo muito grande. Tamanho máximo: ${maxSize}MB`
    }

    return null
  }

  const createFilePreview = (file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.readAsDataURL(file)
      } else {
        resolve(undefined)
      }
    })
  }

  const handleFiles = async (files: FileList) => {
    const newDocuments: DocumentFile[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const error = validateFile(file)
      
      if (error) {
        const errorDoc: DocumentFile = {
          id: Math.random().toString(36).substr(2, 9),
          file,
          name: file.name,
          type: file.type,
          size: file.size,
          error
        }
        newDocuments.push(errorDoc)
        continue
      }

      const preview = await createFilePreview(file)
      const doc: DocumentFile = {
        id: Math.random().toString(36).substr(2, 9),
        file,
        name: file.name,
        type: file.type,
        size: file.size,
        preview
      }
      newDocuments.push(doc)
    }

    const updatedDocuments = [...documents, ...newDocuments]
    
    // Limitar número de arquivos
    if (updatedDocuments.length > maxFiles) {
      const limitedDocs = updatedDocuments.slice(0, maxFiles)
      setDocuments(limitedDocs)
      onDocumentsChange(limitedDocs)
    } else {
      setDocuments(updatedDocuments)
      onDocumentsChange(updatedDocuments)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files)
    }
  }

  const removeDocument = (id: string) => {
    const updatedDocuments = documents.filter(doc => doc.id !== id)
    setDocuments(updatedDocuments)
    onDocumentsChange(updatedDocuments)
  }

  const simulateUpload = async (doc: DocumentFile) => {
    setUploading(true)
    
    // Simular upload (substituir por chamada real da API)
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const updatedDocs = documents.map(d => 
          d.id === doc.id ? { ...d, uploaded: true } : d
        )
        setDocuments(updatedDocs)
        onDocumentsChange(updatedDocs)
        setUploading(false)
        resolve()
      }, 2000)
    })
  }

  const handleUpload = async () => {
    const unuploadedDocs = documents.filter(doc => !doc.uploaded && !doc.error)
    
    for (const doc of unuploadedDocs) {
      await simulateUpload(doc)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <Label className="text-sm font-medium">Documentos Anexados</Label>
        <p className="text-xs text-muted-foreground mt-1">
          Arraste arquivos aqui ou clique para selecionar. Máximo {maxFiles} arquivos, {maxSize}MB cada.
        </p>
      </div>

      {/* Área de Upload */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-600 mb-2">
          Arraste arquivos aqui ou{' '}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-blue-600 hover:text-blue-700 underline"
          >
            clique para selecionar
          </button>
        </p>
        <p className="text-xs text-gray-500">
          PDF, DOC, DOCX, JPG, PNG, TXT (máx. {maxSize}MB)
        </p>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {/* Lista de Documentos */}
      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Documentos Selecionados ({documents.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  doc.error 
                    ? 'border-red-200 bg-red-50 dark:bg-red-950' 
                    : doc.uploaded 
                    ? 'border-green-200 bg-green-50 dark:bg-green-950'
                    : 'border-gray-200 bg-gray-50 dark:bg-gray-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  {getFileIcon(doc.type)}
                  <div>
                    <p className="text-sm font-medium">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(doc.size)} • {doc.type}
                    </p>
                    {doc.error && (
                      <p className="text-xs text-red-600 mt-1">{doc.error}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {doc.preview && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(doc.preview, '_blank')}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                  
                  {doc.uploaded ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : doc.error ? (
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeDocument(doc.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {/* Botão de Upload */}
            {documents.some(doc => !doc.uploaded && !doc.error) && (
              <div className="pt-3 border-t">
                <Button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full"
                  style={{ backgroundColor: '#0026d9' }}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Enviar Documentos
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Alertas */}
      {documents.length >= maxFiles && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Número máximo de arquivos atingido ({maxFiles}). Remova alguns arquivos para adicionar novos.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

