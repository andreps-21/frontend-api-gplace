// lib/utils/document-error-handler.ts

export interface DocumentErrorInfo {
  message: string;
  type: 'permission' | 'not_found' | 'generic';
}

export function handleDocumentError(error: any): DocumentErrorInfo {
  if (error.response?.status === 403) {
    return {
      message: 'Você não tem permissão para realizar esta ação.',
      type: 'permission',
    };
  }
  
  if (error.response?.status === 404) {
    return {
      message: 'Documento não encontrado.',
      type: 'not_found',
    };
  }
  
  return {
    message: error.response?.data?.message || 'Erro ao processar solicitação.',
    type: 'generic',
  };
}

