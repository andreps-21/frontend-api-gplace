// lib/use-documents.ts
import { useState, useEffect, useCallback } from 'react'
import { documentService } from './document-service'

export const useDocuments = (saleId: number | null) => {
  const [documents, setDocuments] = useState<any[]>([])
  const [documentTypes, setDocumentTypes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // === CARREGAR DOCUMENTOS ===
  const loadDocuments = useCallback(async () => {
    if (!saleId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await documentService.getDocuments(saleId)
      setDocuments(response.data || [])
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar documentos')
    } finally {
      setLoading(false)
    }
  }, [saleId])

  // === CARREGAR TIPOS DE DOCUMENTO ===
  const loadDocumentTypes = useCallback(async () => {
    try {
      console.log('📋 Carregando tipos de documento via API...')
      const response = await documentService.getDocumentTypes()
      console.log('📋 Resposta da API de tipos de documento:', response)
      
      // Garantir que seja um array
      let types = Array.isArray(response.data) ? response.data : []
      
      // Se não há tipos da API, usar tipos mock
      if (types.length === 0) {
        console.log('📋 API retornou array vazio, usando tipos mock')
        types = [
          { value: 'cpf', label: 'CPF' },
          { value: 'rg', label: 'RG' },
          { value: 'comprovante_endereco', label: 'Comprovante de Endereço' },
          { value: 'comprovante_renda', label: 'Comprovante de Renda' },
          { value: 'contrato', label: 'Contrato' },
          { value: 'termo_aceite', label: 'Termo de Aceite' },
          { value: 'autorizacao', label: 'Autorização' },
          { value: 'outros', label: 'Outros' }
        ]
      } else {
        console.log('✅ Tipos de documento carregados da API:', types.length, 'tipos')
      }
      
      console.log('📋 Tipos de documento processados:', types)
      setDocumentTypes(types)
    } catch (err: any) {
      console.error('❌ Erro ao carregar tipos de documento:', err)
      console.error('❌ Status do erro:', err?.response?.status)
      console.error('❌ Dados do erro:', err?.response?.data)
      setError(err.message || 'Erro ao carregar tipos de documento')
      
      // Em caso de erro, usar tipos mock
      console.log('📋 Usando tipos de documento mock (fallback)')
      const mockTypes = [
        { value: 'cpf', label: 'CPF' },
        { value: 'rg', label: 'RG' },
        { value: 'comprovante_endereco', label: 'Comprovante de Endereço' },
        { value: 'comprovante_renda', label: 'Comprovante de Renda' },
        { value: 'contrato', label: 'Contrato' },
        { value: 'termo_aceite', label: 'Termo de Aceite' },
        { value: 'autorizacao', label: 'Autorização' },
        { value: 'outros', label: 'Outros' }
      ]
      setDocumentTypes(mockTypes)
    }
  }, [])

  // === UPLOAD DE DOCUMENTO ===
  const uploadDocument = useCallback(async (file: File, documentType: string, description: string = '') => {
    if (!saleId) throw new Error('ID da venda não encontrado')
    
    console.log('📤 useDocuments.uploadDocument iniciado:', {
      saleId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      documentType,
      description
    })
    
    setUploading(true)
    setError(null)
    
    try {
      const response = await documentService.uploadDocument(saleId, file, documentType, description)
      console.log('✅ useDocuments.uploadDocument sucesso:', response)
      await loadDocuments() // Recarregar lista
      return response
    } catch (err: any) {
      console.error('❌ useDocuments.uploadDocument erro:', err)
      setError(err.message || 'Erro ao enviar documento')
      throw err
    } finally {
      setUploading(false)
    }
  }, [saleId, loadDocuments])

  // === UPLOAD MÚLTIPLO ===
  const uploadMultipleDocuments = useCallback(async (documents: Array<{file: File, type: string, description: string}>) => {
    if (!saleId) throw new Error('ID da venda não encontrado')
    
    console.log('📤 useDocuments.uploadMultipleDocuments iniciado:', {
      saleId,
      documentsCount: documents.length,
      documents: documents.map(doc => ({
        fileName: doc.file.name,
        fileSize: doc.file.size,
        fileType: doc.file.type,
        type: doc.type,
        description: doc.description
      }))
    })
    
    setUploading(true)
    setError(null)
    
    try {
      const response = await documentService.uploadMultipleDocuments(saleId, documents)
      console.log('✅ useDocuments.uploadMultipleDocuments sucesso:', response)
      await loadDocuments() // Recarregar lista
      return response
    } catch (err: any) {
      console.error('❌ useDocuments.uploadMultipleDocuments erro:', err)
      setError(err.message || 'Erro ao enviar documentos')
      throw err
    } finally {
      setUploading(false)
    }
  }, [saleId, loadDocuments])

  // === DOWNLOAD DE DOCUMENTO ===
  const downloadDocument = useCallback(async (documentId: number, fileName: string) => {
    if (!saleId) throw new Error('ID da venda não encontrado')
    
    console.log('📥 useDocuments.downloadDocument iniciado:', {
      saleId,
      documentId,
      fileName
    })
    
    try {
      const response = await documentService.downloadDocument(saleId, documentId)
      console.log('✅ useDocuments.downloadDocument sucesso:', response)
      
      // Criar blob e fazer download
      const blob = new Blob([response.data])
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error('❌ useDocuments.downloadDocument erro:', err)
      setError(err.message || 'Erro ao baixar documento')
      throw err
    }
  }, [saleId])

  // === EXCLUIR DOCUMENTO ===
  const deleteDocument = useCallback(async (documentId: number) => {
    if (!saleId) throw new Error('ID da venda não encontrado')
    
    try {
      await documentService.deleteDocument(saleId, documentId)
      await loadDocuments() // Recarregar lista
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir documento')
      throw err
    }
  }, [saleId, loadDocuments])

  // === CARREGAR DADOS INICIAIS ===
  useEffect(() => {
    loadDocumentTypes()
    if (saleId) {
      loadDocuments()
    }
  }, [loadDocumentTypes, loadDocuments, saleId])

  return {
    // Estados
    documents,
    documentTypes,
    loading,
    uploading,
    error,
    
    // Ações
    loadDocuments,
    uploadDocument,
    uploadMultipleDocuments,
    downloadDocument,
    deleteDocument
  }
}
