// components/documents/sale-documents.tsx
'use client'

import React, { useState } from 'react'
import './documents.css'
import DocumentUpload from './document-upload'
import { SaleDocumentsList } from '@/components/sales/sale-documents-list'
import { useAuth } from '@/lib/auth'

interface SaleDocumentsProps {
  saleId: number | null
  sale?: {
    id: number
    seller_id: number | null
    establishment_id: number | null
  }
  userRole?: string
  /** Arquivos selecionados no upload (quando saleId é null) para enviar na criação da venda */
  onPendingFilesForCreation?: (files: File[]) => void
  /** Tipo de documento selecionado (ex. comprovante_endereco) para enviar na criação */
  onPendingDocumentType?: (value: string) => void
  /** Ref para ler arquivos no momento do submit (evita race) */
  pendingFilesRef?: React.MutableRefObject<File[]>
  /** Ref para o tipo de documento no submit */
  pendingDocumentTypeRef?: React.MutableRefObject<string>
}

export default function SaleDocuments({ saleId, sale, userRole, onPendingFilesForCreation, onPendingDocumentType, pendingFilesRef, pendingDocumentTypeRef }: SaleDocumentsProps) {
  const { user } = useAuth()
  const [showUpload, setShowUpload] = useState(false)
  const currentUserRole = userRole || user?.role || user?.roles?.[0]?.name || 'vendedor'

  const handleUploadSuccess = () => {
    setShowUpload(false)
    // Recarregar a página para atualizar a lista de documentos
    if (saleId) {
      window.location.reload()
    }
  }

  return (
    <div className="sale-documents max-w-6xl mx-auto space-y-6">
      {/* Lista de Documentos */}
      {saleId && (
        <div className="documents-list">
          <SaleDocumentsList 
            saleId={saleId}
            sale={sale}
            userRole={currentUserRole}
            onDocumentDeleted={() => {
              // Recarregar pode ser feito automaticamente pelo componente
            }}
            onUpload={() => setShowUpload(true)}
          />
        </div>
      )}

      {/* Área de Upload */}
      <div className="documents-content">
        {/* Sempre mostrar o componente de upload quando há saleId para permitir upload automático */}
        {saleId ? (
          <DocumentUpload 
            saleId={saleId} 
            onUploadSuccess={handleUploadSuccess}
            onPendingFilesForCreation={onPendingFilesForCreation}
            onPendingDocumentType={onPendingDocumentType}
            pendingFilesRef={pendingFilesRef}
            pendingDocumentTypeRef={pendingDocumentTypeRef}
          />
        ) : (
          <DocumentUpload 
            saleId={null} 
            onUploadSuccess={handleUploadSuccess}
            onPendingFilesForCreation={onPendingFilesForCreation}
            onPendingDocumentType={onPendingDocumentType}
            pendingFilesRef={pendingFilesRef}
            pendingDocumentTypeRef={pendingDocumentTypeRef}
          />
        )}
      </div>
    </div>
  )
}
