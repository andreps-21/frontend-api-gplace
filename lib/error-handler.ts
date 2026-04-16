export interface ApiErrorInfo {
  type: 'establishment_access_denied' | 'users_access_denied' | 'generic_error'
  message: string
  action: 'redirect_to_own_establishment' | 'show_own_users_only' | 'show_error_message'
}

export const handleApiError = (error: any): ApiErrorInfo => {
  if (error.response?.status === 403) {
    const message = error.response.data.message || ''
    
    if (message.includes('estabelecimento')) {
      return {
        type: 'establishment_access_denied',
        message: 'Você não tem permissão para acessar este estabelecimento.',
        action: 'redirect_to_own_establishment'
      }
    }
    
    if (message.includes('usuários')) {
      return {
        type: 'users_access_denied',
        message: 'Você só pode ver usuários do seu estabelecimento.',
        action: 'show_own_users_only'
      }
    }
    
    return {
      type: 'generic_error',
      message: 'Acesso negado. Você não tem permissão para realizar esta ação.',
      action: 'show_error_message'
    }
  }
  
  return {
    type: 'generic_error',
    message: 'Ocorreu um erro inesperado.',
    action: 'show_error_message'
  }
}

export const showErrorNotification = (errorInfo: ApiErrorInfo) => {
  // Implementar notificação baseada no tipo de erro
  switch (errorInfo.type) {
    case 'establishment_access_denied':
      console.warn('🚫 Acesso negado ao estabelecimento:', errorInfo.message)
      // Aqui você pode implementar uma notificação visual
      break
    case 'users_access_denied':
      console.warn('🚫 Acesso negado aos usuários:', errorInfo.message)
      break
    default:
      console.error('❌ Erro:', errorInfo.message)
  }
}
