// lib/notifications.ts
import { toast } from 'sonner'

// Função para reproduzir som de sucesso
const playSuccessSound = () => {
  try {
    // Criar um som de sucesso usando Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime) // C5
    oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1) // E5
    oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2) // G5
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.3)
  } catch (error) {
    // Silenciosamente falha se o navegador não suportar
    console.log('Som de sucesso não disponível')
  }
}

export const notifications = {
  // Sucessos
  productCreated: () => toast.success('Produto cadastrado com sucesso!'),
  productUpdated: () => toast.success('Produto atualizado com sucesso!'),
  productDeleted: () => toast.success('Produto excluído com sucesso!'),
  saleCompleted: () => {
    playSuccessSound()
    toast.success('🎉 Venda cadastrada com sucesso!', {
      description: 'A venda foi registrada no sistema e está disponível para consulta.',
      duration: 6000,
      style: {
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: 'white',
        border: '2px solid #047857',
        fontSize: '16px',
        fontWeight: '600',
        boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
        borderRadius: '12px'
      },
      className: 'animate-bounce'
    })
  },
  
  // Erros
  skuExists: (sku: string) => toast.error(`SKU "${sku}" já está cadastrado`),
  validationError: (message: string) => toast.error(`Erro de validação: ${message}`),
  networkError: () => toast.error('Erro de conexão. Tente novamente.'),
  unauthorized: () => toast.error('Sessão expirada. Faça login novamente.'),
  profileNotLoaded: () => toast.error('❌ Perfil não carregado', {
    description: 'Erro: Perfil do usuário não carregado. Recarregue a página.',
    duration: 6000,
    style: {
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      color: 'white',
      border: '2px solid #b91c1c',
      fontSize: '16px',
      fontWeight: '600',
      boxShadow: '0 10px 25px rgba(239, 68, 68, 0.3)',
      borderRadius: '12px'
    },
    action: {
      label: 'Recarregar',
      onClick: () => window.location.reload()
    }
  }),
  noEstablishment: () => toast.warning('⚠️ Estabelecimento não definido', {
    description: 'Seu usuário não possui um estabelecimento associado. Entre em contato com o administrador.',
    duration: 8000,
    style: {
      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      color: 'white',
      border: '2px solid #b45309',
      fontSize: '16px',
      fontWeight: '600',
      boxShadow: '0 10px 25px rgba(245, 158, 11, 0.3)',
      borderRadius: '12px'
    }
  }),
  confirmDelete: (itemName: string, onConfirm: () => void) => toast.error('🗑️ Confirmar Exclusão', {
    description: `Tem certeza que deseja excluir "${itemName}"? Esta ação não pode ser desfeita.`,
    duration: 10000,
    style: {
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      color: 'white',
      border: '2px solid #b91c1c',
      fontSize: '16px',
      fontWeight: '600',
      boxShadow: '0 10px 25px rgba(239, 68, 68, 0.3)',
      borderRadius: '12px'
    },
    action: {
      label: 'Excluir',
      onClick: onConfirm
    },
    cancel: {
      label: 'Cancelar',
      onClick: () => {}
    }
  }),
  invalidCPF: (cpf: string) => toast.error('❌ CPF inválido', {
    description: `O CPF "${cpf}" não é válido. Verifique os dígitos e tente novamente.`,
    duration: 5000,
    style: {
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      color: 'white',
      border: '2px solid #b91c1c',
      fontSize: '16px',
      fontWeight: '600',
      boxShadow: '0 10px 25px rgba(239, 68, 68, 0.3)',
      borderRadius: '12px'
    }
  }),
  
  // Avisos
  lowStock: (product: string) => toast.warning(`Estoque baixo: ${product}`),
  sessionExpiring: () => toast.warning('Sua sessão expira em 5 minutos'),
  noProductsInCategory: (category: string, establishment: string) => 
    toast.warning(`Nenhum produto encontrado para a categoria "${category}" no estabelecimento "${establishment}".`, {
      description: 'Tente selecionar outra categoria ou cadastrar produtos nesta categoria.',
      duration: 6000
    }),
  
  // Informações
  syncing: () => toast.info('Sincronizando dados...'),
  loading: () => toast.loading('Carregando...'),
  
  // Usuários
  userActivated: () => {
    toast.success('✅ Usuário ativado', {
      description: 'O usuário foi ativado com sucesso e pode acessar o sistema.',
      style: {
        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
        border: '1px solid #86efac',
        color: '#166534',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
      duration: 3000,
    })
  },

  userDeactivated: () => {
    toast.warning('⏸️ Usuário desativado', {
      description: 'O usuário foi desativado e não pode mais acessar o sistema.',
      style: {
        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
        border: '1px solid #fbbf24',
        color: '#92400e',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
      duration: 3000,
    })
  },

  userDeleted: () => {
    toast.success('🗑️ Usuário excluído', {
      description: 'O usuário foi removido do sistema com sucesso.',
      style: {
        background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
        border: '1px solid #fca5a5',
        color: '#991b1b',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
      duration: 3000,
    })
  },

  userUpdated: () => {
    toast.success('✏️ Usuário atualizado', {
      description: 'As informações do usuário foram atualizadas com sucesso.',
      style: {
        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
        border: '1px solid #93c5fd',
        color: '#1e40af',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
      duration: 3000,
    })
  },

  userCreated: () => {
    toast.success('👤 Usuário criado', {
      description: 'O novo usuário foi cadastrado no sistema com sucesso.',
      style: {
        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
        border: '1px solid #86efac',
        color: '#166534',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
      duration: 3000,
    })
  },

  // Customizadas
  custom: {
    success: (message: string) => toast.success(message),
    error: (message: string) => toast.error(message),
    warning: (message: string) => toast.warning(message),
    info: (message: string) => toast.info(message),
  }
}
