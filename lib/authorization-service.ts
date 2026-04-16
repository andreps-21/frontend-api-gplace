import { apiService, Role, Permission } from './api'

export interface GroupedPermissions {
  [module: string]: Permission[]
}

export class AuthorizationService {
  // === ROLES ===
  async getRoles(): Promise<{ data: Role[] }> {
    try {
      const response = await apiService.getRoles()
      return response // response já é ApiResponse<Role[]>
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async getRole(id: number): Promise<{ data: Role }> {
    try {
      const response = await apiService.getRole(id)
      return response // response já é ApiResponse<Role>
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async createRole(roleData: { name: string; description: string; permissions?: string[] }): Promise<{ data: Role }> {
    try {
      const response = await apiService.createRole(roleData)
      return response // response já é ApiResponse<Role>
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async updateRole(id: number, roleData: { name: string; description: string; permissions?: string[] }): Promise<{ data: Role }> {
    try {
      const response = await apiService.updateRole(id, roleData)
      return response // response já é ApiResponse<Role>
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async deleteRole(id: number): Promise<{ data: any }> {
    try {
      const response = await apiService.deleteRole(id)
      return response // response já é ApiResponse<any>
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async getRoleUsers(roleId: number): Promise<{ data: any[] }> {
    try {
      const response = await apiService.getRoleUsers(roleId)
      return response // response já é ApiResponse<any[]>
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async assignRoleToUser(userId: number, roleId: number): Promise<{ data: any }> {
    try {
      const response = await apiService.assignRoleToUser(userId, roleId)
      return response // response já é ApiResponse<any>
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async removeRoleFromUser(userId: number, roleId: number): Promise<{ data: any }> {
    try {
      const response = await apiService.removeRoleFromUser(userId, roleId)
      return response // response já é ApiResponse<any>
    } catch (error) {
      throw this.handleError(error)
    }
  }

  // === PERMISSÕES ===
  async getPermissions(filters: { search?: string; module?: string } = {}): Promise<{ data: Permission[] }> {
    try {
      const response = await apiService.getPermissions(filters)
      return response // response já é ApiResponse<Permission[]>
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async getGroupedPermissions(): Promise<{ data: GroupedPermissions }> {
    try {
      console.log('🔄 Carregando permissões agrupadas...')
      const response = await apiService.getPermissions()
      console.log('📋 Resposta da API de permissões:', response)
      
      const permissions = response.data || [] // response.data já é Permission[]
      console.log('📋 Permissões extraídas:', permissions)
      console.log('📋 Tipo das permissões:', typeof permissions, Array.isArray(permissions))
      
      // Verificar se permissions é um array
      if (!Array.isArray(permissions)) {
        console.warn('⚠️ Permissões não é um array:', permissions)
        return { data: {} }
      }
      
      // Agrupar permissões por módulo baseado no nome
      const grouped: GroupedPermissions = {}
      permissions.forEach(permission => {
        const module = permission.name.split('_')[0] || 'other'
        if (!grouped[module]) {
          grouped[module] = []
        }
        grouped[module].push(permission)
      })
      
      console.log('✅ Permissões agrupadas:', grouped)
      return { data: grouped }
    } catch (error) {
      console.error('❌ Erro ao carregar permissões agrupadas:', error)
      throw this.handleError(error)
    }
  }

  async getPermission(id: number): Promise<{ data: Permission }> {
    try {
      const response = await apiService.getPermission(id)
      return response // response já é ApiResponse<Permission>
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async getRolePermissions(roleId: number): Promise<{ data: Permission[] }> {
    try {
      const response = await apiService.getRolePermissions(roleId)
      return response // response já é ApiResponse<Permission[]>
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async getUserPermissions(userId: number): Promise<{ data: Permission[] }> {
    try {
      const response = await apiService.getUserPermissions(userId)
      return response // response já é ApiResponse<Permission[]>
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async syncRolePermissions(roleId: number, permissions: string[]): Promise<{ data: any }> {
    try {
      const response = await apiService.assignPermissionsToRole(roleId, permissions)
      return response // response já é ApiResponse<any>
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async givePermissionToUser(userId: number, permissionId: number): Promise<{ data: any }> {
    try {
      // Este método não existe no apiService, vamos implementar uma versão mock por enquanto
      return { data: { success: true } }
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async revokePermissionFromUser(userId: number, permissionId: number): Promise<{ data: any }> {
    try {
      // Este método não existe no apiService, vamos implementar uma versão mock por enquanto
      return { data: { success: true } }
    } catch (error) {
      throw this.handleError(error)
    }
  }

  private handleError(error: any): Error {
    console.error('Authorization Service Error:', error)
    return new Error(error?.response?.data?.message || error?.message || 'Erro no serviço de autorização')
  }
}

export const authorizationService = new AuthorizationService()
