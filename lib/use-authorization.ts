import { useState, useEffect, useCallback } from 'react'
import { authorizationService, GroupedPermissions } from './authorization-service'
import { Role, Permission } from './api'

export const useAuthorization = () => {
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [groupedPermissions, setGroupedPermissions] = useState<GroupedPermissions>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // === ROLES ===
  const loadRoles = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('🔄 Carregando roles...')
      const response = await authorizationService.getRoles()
      console.log('✅ Roles carregados:', response.data)
      setRoles(response.data || [])
    } catch (err: any) {
      console.error('❌ Erro ao carregar roles:', err)
      setError(err.message || 'Erro ao carregar roles')
      setRoles([]) // Garantir que roles seja um array vazio em caso de erro
    } finally {
      setLoading(false)
    }
  }, [])

  const createRole = useCallback(async (roleData: { name: string; description: string; permissions?: string[] }) => {
    try {
      const response = await authorizationService.createRole(roleData)
      await loadRoles() // Recarregar lista
      return response
    } catch (err: any) {
      setError(err.message || 'Erro ao criar role')
      throw err
    }
  }, [loadRoles])

  const updateRole = useCallback(async (id: number, roleData: { name: string; description: string; permissions?: string[] }) => {
    try {
      const response = await authorizationService.updateRole(id, roleData)
      await loadRoles() // Recarregar lista
      return response
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar role')
      throw err
    }
  }, [loadRoles])

  const deleteRole = useCallback(async (id: number) => {
    try {
      await authorizationService.deleteRole(id)
      await loadRoles() // Recarregar lista
    } catch (err: any) {
      setError(err.message || 'Erro ao deletar role')
      throw err
    }
  }, [loadRoles])

  // === PERMISSÕES ===
  const loadPermissions = useCallback(async (filters: { search?: string; module?: string } = {}) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await authorizationService.getPermissions(filters)
      setPermissions(response.data)
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar permissões')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadGroupedPermissions = useCallback(async () => {
    try {
      console.log('🔄 Carregando permissões agrupadas...')
      const response = await authorizationService.getGroupedPermissions()
      console.log('✅ Permissões agrupadas carregadas:', response.data)
      setGroupedPermissions(response.data || {})
    } catch (err: any) {
      console.error('❌ Erro ao carregar permissões agrupadas:', err)
      setError(err.message || 'Erro ao carregar permissões agrupadas')
      setGroupedPermissions({}) // Garantir que seja um objeto vazio em caso de erro
    }
  }, [])

  const syncRolePermissions = useCallback(async (roleId: number, permissions: string[]) => {
    try {
      const response = await authorizationService.syncRolePermissions(roleId, permissions)
      await loadRoles() // Recarregar roles
      return response
    } catch (err: any) {
      setError(err.message || 'Erro ao sincronizar permissões')
      throw err
    }
  }, [loadRoles])

  // === USUÁRIOS ===
  const assignRoleToUser = useCallback(async (userId: number, roleId: number) => {
    try {
      const response = await authorizationService.assignRoleToUser(userId, roleId)
      return response
    } catch (err: any) {
      setError(err.message || 'Erro ao atribuir role')
      throw err
    }
  }, [])

  const removeRoleFromUser = useCallback(async (userId: number, roleId: number) => {
    try {
      const response = await authorizationService.removeRoleFromUser(userId, roleId)
      return response
    } catch (err: any) {
      setError(err.message || 'Erro ao remover role')
      throw err
    }
  }, [])

  const getUserPermissions = useCallback(async (userId: number) => {
    try {
      const response = await authorizationService.getUserPermissions(userId)
      return response.data
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar permissões do usuário')
      throw err
    }
  }, [])

  const givePermissionToUser = useCallback(async (userId: number, permissionId: number) => {
    try {
      const response = await authorizationService.givePermissionToUser(userId, permissionId)
      return response
    } catch (err: any) {
      setError(err.message || 'Erro ao conceder permissão')
      throw err
    }
  }, [])

  const revokePermissionFromUser = useCallback(async (userId: number, permissionId: number) => {
    try {
      const response = await authorizationService.revokePermissionFromUser(userId, permissionId)
      return response
    } catch (err: any) {
      setError(err.message || 'Erro ao revogar permissão')
      throw err
    }
  }, [])

  useEffect(() => {
    loadRoles()
    loadGroupedPermissions()
  }, [loadRoles, loadGroupedPermissions])

  return {
    // Estados
    roles: roles || [],
    permissions: permissions || [],
    groupedPermissions: groupedPermissions || {},
    loading,
    error,
    
    // Ações
    loadRoles,
    createRole,
    updateRole,
    deleteRole,
    loadPermissions,
    loadGroupedPermissions,
    syncRolePermissions,
    assignRoleToUser,
    removeRoleFromUser,
    getUserPermissions,
    givePermissionToUser,
    revokePermissionFromUser
  }
}
