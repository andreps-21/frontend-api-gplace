// components/documents/document-upload.tsx
'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useDocuments } from '@/lib/use-documents'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, X, FileText, AlertCircle, Loader2 } from 'lucide-react'

interface DocumentUploadProps {
  saleId: number | null
  onUploadSuccess?: () => void
  /** Quando saleId é null, notifica os arquivos selecionados para uso na criação da venda (multipart) */
  onPendingFilesForCreation?: (files: File[]) => void
  /** Tipo de documento selecionado (ex. comprovante_endereco) para enviar com a criação da venda */
  onPendingDocumentType?: (value: string) => void
  /** Ref do parent para ler arquivos no momento do submit (evita race com useEffect) */
  pendingFilesRef?: React.MutableRefObject<File[]>
  /** Ref do parent para o tipo de documento no submit */
  pendingDocumentTypeRef?: React.MutableRefObject<string>
}

export default function DocumentUpload({ saleId, onUploadSuccess, onPendingFilesForCreation, onPendingDocumentType, pendingFilesRef, pendingDocumentTypeRef }: DocumentUploadProps) {
  const { documentTypes, uploadDocument, uploadMultipleDocuments, uploading, error } = useDocuments(saleId)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [documentType, setDocumentType] = useState('')
  const [description, setDescription] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadAttemptedRef = useRef<Set<string>>(new Set()) // Rastrear uploads já tentados
  const filesRef = useRef<File[]>([]) // Preservar arquivos mesmo após re-render
  const onPendingFilesRef = useRef(onPendingFilesForCreation)
  const onPendingTypeRef = useRef(onPendingDocumentType)
  onPendingFilesRef.current = onPendingFilesForCreation
  onPendingTypeRef.current = onPendingDocumentType

  // Sincronizar no render para o parent ter arquivos atualizados no momento do submit (useEffect pode rodar depois)
  if (saleId == null) {
    if (pendingFilesRef) pendingFilesRef.current = selectedFiles
    if (pendingDocumentTypeRef) pendingDocumentTypeRef.current = documentType
  }

  // Sincronizar ref com state
  useEffect(() => {
    filesRef.current = selectedFiles
  }, [selectedFiles])

  // Quando não há venda ainda, informar ao parent os arquivos e o tipo para enviar na criação (multipart).
  // Dependências fixas (saleId, selectedFiles, documentType) para evitar "useEffect changed size between renders".
  useEffect(() => {
    if (saleId == null) {
      if (onPendingFilesRef.current) onPendingFilesRef.current(selectedFiles)
      if (onPendingTypeRef.current) onPendingTypeRef.current(documentType)
    }
  }, [saleId, selectedFiles, documentType])

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    console.log('📁 Arquivos selecionados:', files.length, 'arquivo(s)')
    setSelectedFiles(files)
    
    // Upload automático quando arquivos são selecionados E tipo de documento já está selecionado
    if (files.length > 0 && documentType && saleId) {
      console.log('📤 Iniciando upload imediato (arquivo selecionado após tipo)')
      await handleAutoUpload(files)
    } else if (files.length > 0 && !documentType) {
      console.log('⏳ Arquivos selecionados, aguardando seleção do tipo de documento...')
    } else if (files.length > 0 && !saleId) {
      console.log('⏳ Arquivos selecionados, aguardando criação da venda...')
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(event.dataTransfer.files)
    console.log('📁 Arquivos soltos (drag & drop):', files.length, 'arquivo(s)')
    setSelectedFiles(files)
    
    // Upload automático quando arquivos são soltos E tipo de documento já está selecionado
    if (files.length > 0 && documentType && saleId) {
      console.log('📤 Iniciando upload imediato (arquivo solto após tipo)')
      await handleAutoUpload(files)
    } else if (files.length > 0 && !documentType) {
      console.log('⏳ Arquivos soltos, aguardando seleção do tipo de documento...')
    } else if (files.length > 0 && !saleId) {
      console.log('⏳ Arquivos soltos, aguardando criação da venda...')
    }
  }

  const validateFiles = (files: File[]) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png',
      'image/jpeg',
      'image/jpg'
    ]
    const maxSize = 10 * 1024 * 1024 // 10MB

    for (let file of files) {
      if (!allowedTypes.includes(file.type)) {
        throw new Error(`Arquivo ${file.name} não é um formato válido. Use PDF, DOC, DOCX, PNG, JPG ou JPEG.`)
      }
      
      if (file.size > maxSize) {
        throw new Error(`Arquivo ${file.name} é muito grande. Tamanho máximo: 10MB.`)
      }
    }
  }

  const handleAutoUpload = async (files: File[]) => {
    if (!documentType) {
      console.log('📋 Aguardando seleção do tipo de documento...')
      return // Aguarda o usuário selecionar o tipo de documento
    }

    if (!saleId) {
      console.log('📋 Venda ainda não criada, arquivos serão anexados após cadastro da venda')
      return // Aguarda a venda ser criada
    }

    // Criar chave única para este upload (nome do arquivo + tipo + saleId)
    const uploadKey = `${saleId}-${documentType}-${files.map(f => f.name).join(',')}`
    
    // Evitar uploads duplicados
    if (uploadAttemptedRef.current.has(uploadKey)) {
      console.log('⏭️ Upload já foi tentado para este arquivo, ignorando...', uploadKey)
      return
    }

    try {
      console.log('📤 Iniciando upload de documentos...', {
        saleId,
        documentType,
        filesCount: files.length,
        files: files.map(f => ({ name: f.name, size: f.size, type: f.type })),
        uploadKey
      })

      // Marcar como tentado antes de iniciar
      uploadAttemptedRef.current.add(uploadKey)

      validateFiles(files)
      
      if (files.length === 1) {
        console.log('📤 Upload de documento único:', files[0].name)
        console.log('📤 Chamando uploadDocument do hook...')
        await uploadDocument(files[0], documentType, description)
        console.log('✅ uploadDocument retornou com sucesso')
      } else {
        console.log('📤 Upload de múltiplos documentos:', files.length)
        const documents = files.map(file => ({
          file,
          type: documentType,
          description: description
        }))
        await uploadMultipleDocuments(documents)
      }
      
      console.log('✅ Upload concluído com sucesso!')
      
      // Limpar formulário após upload
      setSelectedFiles([])
      setDescription('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      onUploadSuccess?.()
    } catch (err: any) {
      console.error('❌ Erro no upload:', err)
      console.error('❌ Detalhes do erro:', {
        message: err.message,
        response: err.response,
        stack: err.stack
      })
      // Remover da lista de tentados para permitir nova tentativa
      uploadAttemptedRef.current.delete(uploadKey)
      alert(`Erro ao enviar documento: ${err.message}`)
    }
  }


  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index)
    setSelectedFiles(newFiles)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (file: File) => {
    if (file.type.includes('pdf')) return '📄'
    if (file.type.includes('word') || file.type.includes('document')) return '📝'
    if (file.type.includes('image')) return '🖼️'
    return '📎'
  }

  // Upload automático quando tipo de documento é selecionado e há arquivos
  useEffect(() => {
    // Usar ref para garantir que temos os arquivos mais recentes
    const currentFiles = filesRef.current.length > 0 ? filesRef.current : selectedFiles
    
    console.log('🔄 useEffect executado:', {
      documentType: !!documentType,
      documentTypeValue: documentType,
      filesCount: selectedFiles.length,
      filesRefCount: filesRef.current.length,
      currentFilesCount: currentFiles.length,
      fileNames: currentFiles.map(f => f.name),
      saleId: saleId,
      hasAllConditions: documentType && currentFiles.length > 0 && saleId
    })
    
    if (documentType && currentFiles.length > 0 && saleId) {
      console.log('✅ useEffect: Todas as condições atendidas, iniciando upload automático', {
        documentType,
        filesCount: currentFiles.length,
        saleId,
        fileNames: currentFiles.map(f => f.name)
      })
      // Usar setTimeout para evitar múltiplas execuções e dar tempo para o componente atualizar
      const timeoutId = setTimeout(() => {
        console.log('⏰ Timeout disparado, chamando handleAutoUpload com', currentFiles.length, 'arquivo(s)...')
        handleAutoUpload(currentFiles).catch(err => {
          console.error('❌ Erro ao executar handleAutoUpload:', err)
        })
      }, 500)
      return () => {
        console.log('🧹 Limpando timeout do useEffect')
        clearTimeout(timeoutId)
      }
    } else {
      if (!saleId) {
        console.log('⏳ Aguardando saleId para fazer upload', { documentType, filesCount: currentFiles.length })
      } else if (!documentType) {
        console.log('⏳ Aguardando seleção do tipo de documento', { saleId, filesCount: currentFiles.length })
      } else if (currentFiles.length === 0) {
        console.log('⏳ Aguardando seleção de arquivos', { saleId, documentType })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentType, saleId, selectedFiles.length])

  return (
    <div className="document-upload bg-white rounded-lg p-6 shadow-sm border">
      <div className="upload-header text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Anexar Documentos</h3>
        <p className="text-gray-600 text-sm">Envie documentos do cliente (CPF, RG, comprovantes, etc.)</p>
        {!saleId && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-blue-700 text-sm">
              📋 Anexe aqui pelo menos um documento e selecione o tipo. Ao clicar em <strong>Cadastrar Venda</strong>, a venda será criada já com estes anexos.
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="error-message bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Área de Upload */}
      <div 
        className={`upload-area border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
          className="hidden"
        />
        
        <div className="upload-content">
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 font-medium mb-2">Arraste arquivos aqui ou clique para selecionar</p>
          <p className="text-gray-500 text-sm">
            Formatos aceitos: PDF, DOC, DOCX, PNG, JPG, JPEG (máx. 10MB)
          </p>
        </div>
      </div>

      {/* Arquivos Selecionados */}
      {selectedFiles.length > 0 && (
        <div className="selected-files mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-700 mb-3">
            Arquivos Selecionados ({selectedFiles.length})
          </h4>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="file-item flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getFileIcon(file)}</span>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{file.name}</p>
                    <p className="text-gray-500 text-xs">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Configurações */}
      <div className="upload-config mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="documentType" className="text-sm font-medium text-gray-700">
            Tipo de Documento *
          </Label>
          <Select value={documentType} onValueChange={setDocumentType}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              {Array.isArray(documentTypes) && documentTypes.length > 0 ? (
                documentTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="loading" disabled>
                  Carregando tipos de documento...
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium text-gray-700">
            Descrição
          </Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição opcional do documento..."
            rows={2}
            className="resize-none"
          />
        </div>

        {/* Botão de Upload Manual */}
        {selectedFiles.length > 0 && documentType && saleId && (
          <div className="pt-4">
            <Button
              type="button"
              onClick={() => handleAutoUpload(selectedFiles)}
              disabled={uploading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Enviar {selectedFiles.length} Documento(s)
                </>
              )}
            </Button>
          </div>
        )}
      </div>

    </div>
  )
}
