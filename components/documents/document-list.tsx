// components/documents/document-list.tsx
'use client'

import React from 'react'
import { useDocuments } from '@/lib/use-documents'
import { Button } from '@/components/ui/button'
import { Download, Trash2, FileText, Image, File, AlertCircle } from 'lucide-react'
import { PanelTableSkeleton } from '@/components/dashboard/panel-content-skeleton'

interface DocumentListProps {
  saleId: number | null
  canDelete?: boolean
}

export default function DocumentList({ saleId, canDelete = false }: DocumentListProps) {
  const { documents, downloadDocument, deleteDocument, loading, error } = useDocuments(saleId)

  const handleDownload = async (document: any) => {
    try {
      await downloadDocument(document.id, document.original_name)
    } catch (err: any) {
      alert('Erro ao baixar documento: ' + err.message)
    }
  }

  const handleDelete = async (document: any) => {
    if (window.confirm(`Tem certeza que deseja excluir o documento "${document.original_name}"?`)) {
      try {
        await deleteDocument(document.id)
      } catch (err: any) {
        alert('Erro ao excluir documento: ' + err.message)
      }
    }
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />
    if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className="w-8 h-8 text-blue-500" />
    if (mimeType.includes('image')) return <Image className="w-8 h-8 text-green-500" />
    return <File className="w-8 h-8 text-gray-500" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getDocumentTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'cpf': 'CPF',
      'rg': 'RG',
      'comprovante_endereco': 'Comprovante de Endereço',
      'comprovante_renda': 'Comprovante de Renda',
      'contrato': 'Contrato',
      'termo_aceite': 'Termo de Aceite',
      'autorizacao': 'Autorização',
      'outros': 'Outros'
    }
    return typeMap[type] || type
  }

  if (loading) {
    return (
      <div className="document-list-loading py-8">
        <PanelTableSkeleton rows={6} columns={4} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="document-list-error text-center py-12">
        <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-500" />
        <p className="text-red-600">Erro: {error}</p>
      </div>
    )
  }

  return (
    <div className="document-list bg-white rounded-lg p-6 shadow-sm border">
      <div className="document-list-header flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">Documentos Anexados</h3>
        <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
          {documents.length} documento(s)
        </span>
      </div>

      {documents.length === 0 ? (
        <div className="no-documents text-center py-12">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Nenhum documento anexado ainda.</p>
        </div>
      ) : (
        <div className="documents-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map(document => (
            <div key={document.id} className="document-card border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
              <div className="document-header flex items-start gap-3 mb-3">
                <div className="document-icon flex-shrink-0">
                  {getFileIcon(document.mime_type)}
                </div>
                <div className="document-info flex-1 min-w-0">
                  <h4 className="document-name font-medium text-gray-800 text-sm mb-1 truncate" title={document.original_name}>
                    {document.original_name}
                  </h4>
                  <p className="document-type text-xs text-gray-500 font-medium uppercase">
                    {getDocumentTypeLabel(document.document_type)}
                  </p>
                </div>
              </div>

              <div className="document-details mb-4">
                <div className="document-meta flex justify-between text-xs text-gray-500 mb-2">
                  <span className="file-size">{formatFileSize(document.file_size)}</span>
                  <span className="upload-date">{formatDate(document.created_at)}</span>
                </div>
                
                {document.description && (
                  <p className="document-description text-xs text-gray-600 italic bg-gray-50 p-2 rounded">
                    {document.description}
                  </p>
                )}
              </div>

              <div className="document-actions flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(document)}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Baixar
                </Button>
                
                {canDelete && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(document)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Excluir
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
