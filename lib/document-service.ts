// lib/document-service.ts
import { apiService } from './api'

export class DocumentService {
  private api: any

  constructor() {
    this.api = apiService
  }

  // === TIPOS DE DOCUMENTO ===
  async getDocumentTypes() {
    return await this.api.api.get('/document-types')
  }

  // === DOCUMENTOS ===
  async getDocuments(saleId: number) {
    return await this.api.api.get(`/sales/${saleId}/documents`)
  }

  async uploadDocument(saleId: number, file: File, documentType: string, description: string = '') {
    console.log('📤 DocumentService.uploadDocument iniciado:', {
      saleId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      documentType,
      description
    })

    const formData = new FormData()
    formData.append('document_type', documentType)
    formData.append('file', file)
    formData.append('description', description)

    console.log('📤 FormData preparado:', {
      documentType: formData.get('document_type'),
      file: formData.get('file'),
      description: formData.get('description')
    })

    try {
      const response = await this.api.api.post(`/sales/${saleId}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      console.log('✅ DocumentService.uploadDocument sucesso:', response)
      return response
    } catch (error) {
      console.error('❌ DocumentService.uploadDocument erro:', error)
      throw error
    }
  }

  async uploadMultipleDocuments(saleId: number, documents: Array<{file: File, type: string, description: string}>) {
    const formData = new FormData()
    
    documents.forEach((doc, index) => {
      formData.append(`documents[${index}][document_type]`, doc.type)
      formData.append(`documents[${index}][file]`, doc.file)
      formData.append(`documents[${index}][description]`, doc.description || '')
    })

    return await this.api.api.post(`/sales/${saleId}/documents/multiple`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  }

  async downloadDocument(saleId: number, documentId: number) {
    console.log('📥 DocumentService.downloadDocument iniciado:', {
      saleId,
      documentId,
      url: `/sales/${saleId}/documents/${documentId}/download`
    })

    try {
      const response = await this.api.api.get(`/sales/${saleId}/documents/${documentId}/download`, {
        responseType: 'blob'
      })
      console.log('✅ DocumentService.downloadDocument sucesso:', response)
      return response
    } catch (error) {
      console.error('❌ DocumentService.downloadDocument erro:', error)
      throw error
    }
  }

  async deleteDocument(saleId: number, documentId: number) {
    return await this.api.api.delete(`/sales/${saleId}/documents/${documentId}`)
  }
}

export const documentService = new DocumentService()
