import { useAuth } from './auth'

export interface UserPermissions {
  canViewAllUsers: boolean
  canViewEstablishmentUsers: boolean
  canViewOwnUser: boolean
  canEditAllUsers: boolean
  canEditEstablishmentUsers: boolean
  canEditOwnUser: boolean
  canActivateUsers: boolean
  canCreateUsers: boolean
  canEditEstablishment: boolean
  canEditStatus: boolean
  canEditRole: boolean
  canViewAllEstablishments: boolean
  canViewEstablishment: (establishmentId: number) => boolean
  canManageEstablishment: (establishmentId: number) => boolean
  role: string
}

export const getUserPermissions = (user: any): UserPermissions => {
  // Ler role corretamente: campo role ou array roles
  const role = user?.role || user?.roles?.[0]?.name || 'vendedor' // Fallback apenas para compatibilidade com interface
  
  // Se não houver role, logar warning
  if (!user?.role && !user?.roles?.[0]?.name) {
    console.warn('⚠️ Usuário sem role detectado em getUserPermissions, usando fallback "vendedor"')
  }
  
  return {
    canViewAllUsers: ['gestor', 'master'].includes(role),
    canViewEstablishmentUsers: ['gestor', 'gerente', 'master'].includes(role),
    canViewOwnUser: true, // Todos podem ver seu próprio usuário
    canEditAllUsers: ['gestor'].includes(role),
    canEditEstablishmentUsers: ['gestor', 'gerente'].includes(role),
    canEditOwnUser: true, // Todos podem editar seu próprio usuário
    canActivateUsers: ['gestor', 'gerente'].includes(role),
    canCreateUsers: ['gestor', 'gerente'].includes(role),
    canEditEstablishment: ['gestor', 'gerente'].includes(role),
    canEditStatus: ['gestor', 'gerente'].includes(role),
    canEditRole: ['gestor'].includes(role),
    canViewAllEstablishments: ['gestor', 'master'].includes(role),
    canViewEstablishment: (establishmentId: number) => {
      if (['gestor', 'master'].includes(role)) return true
      return user?.establishment_id === establishmentId
    },
    canManageEstablishment: (establishmentId: number) => {
      if (['gestor', 'master'].includes(role)) return true
      return user?.establishment_id === establishmentId
    },
    role: role
  }
}

// Verificar se usuário pode acessar outro usuário
export const canAccessUser = (currentUser: any, targetUser: any): boolean => {
  const permissions = getUserPermissions(currentUser)
  
  if (permissions.canViewAllUsers) return true
  if (permissions.canViewEstablishmentUsers) {
    // Verificar se o usuário alvo está no mesmo estabelecimento
    return currentUser.establishment_id === targetUser.establishment_id
  }
  if (permissions.canViewOwnUser) {
    return currentUser.id === targetUser.id
  }
  
  return false
}

// Hook para usar permissões no componente
export const useUserPermissions = () => {
  const { user } = useAuth()
  return getUserPermissions(user)
}
