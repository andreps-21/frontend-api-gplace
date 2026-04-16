import { useAuth } from './auth'

export const useUserRole = () => {
  const { user } = useAuth()
  
  // Detectar se é administrador baseado no email ou nome
  const isAdmin = user?.email === 'admin@tim.com.br' || user?.name?.includes('Administrador')
  
  // Determinar o role do usuário (sem fallback para vendedor)
  // Prioridade: campo role > array roles > null
  const userRole = user?.role || user?.roles?.[0]?.name || (isAdmin ? 'gestor' : null)
  
  // Verificar permissões específicas
  const isGestor = userRole === 'gestor' || isAdmin
  const isGerente = userRole === 'gerente' || isGestor
  const isVendedor = userRole === 'vendedor' && !isGestor && !isGerente
  
  // Permissões de acesso
  const canAccessAuthorizations = isGestor
  const canManageUsers = isGestor
  const canEditClients = isGerente
  const canDeleteClients = isGerente
  const canViewClientSales = isGerente
  const canCreateSales = true // Todos podem criar vendas
  
  return {
    user,
    userRole,
    isAdmin,
    isGestor,
    isGerente,
    isVendedor,
    canAccessAuthorizations,
    canManageUsers,
    canEditClients,
    canDeleteClients,
    canViewClientSales,
    canCreateSales
  }
}
