import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Shield, AlertCircle } from 'lucide-react'
import { PanelGridCardsSkeleton, PanelPageHeaderSkeleton } from '@/components/dashboard/panel-content-skeleton'
import { useAuthorization } from '@/lib/use-authorization'
import { RoleForm } from './role-form'
import { RoleList } from './role-list'
import { PermissionSelector } from './permission-selector'
import { RoleUsers } from './role-users'
import { Role } from '@/lib/api'
import { notifications } from '@/lib/notifications'

export const RoleManagement: React.FC = () => {
  const {
    roles,
    groupedPermissions,
    loading,
    error,
    createRole,
    updateRole,
    deleteRole,
    syncRolePermissions
  } = useAuthorization()

  const [showForm, setShowForm] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [managingUsers, setManagingUsers] = useState<Role | null>(null)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  const handleCreateRole = async (roleData: { name: string; description: string }) => {
    try {
      await createRole(roleData)
      setShowForm(false)
      notifications.custom.success('Role criado com sucesso!')
    } catch (error) {
      console.error('Erro ao criar role:', error)
      notifications.custom.error('Erro ao criar role')
    }
  }

  const handleUpdateRole = async (id: number, roleData: { name: string; description: string }) => {
    try {
      await updateRole(id, roleData)
      setEditingRole(null)
      notifications.custom.success('Role atualizado com sucesso!')
    } catch (error) {
      console.error('Erro ao atualizar role:', error)
      notifications.custom.error('Erro ao atualizar role')
    }
  }

  const handleDeleteRole = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este role? Esta ação não pode ser desfeita.')) {
      setIsDeleting(id)
      try {
        await deleteRole(id)
        notifications.custom.success('Role excluído com sucesso!')
      } catch (error) {
        console.error('Erro ao deletar role:', error)
        notifications.custom.error('Erro ao excluir role')
      } finally {
        setIsDeleting(null)
      }
    }
  }

  const handleSyncPermissions = async (roleId: number, permissions: string[]) => {
    try {
      await syncRolePermissions(roleId, permissions)
      setSelectedRole(null)
      notifications.custom.success('Permissões sincronizadas com sucesso!')
    } catch (error) {
      console.error('Erro ao sincronizar permissões:', error)
      notifications.custom.error('Erro ao sincronizar permissões')
    }
  }

  if (loading && (!roles || roles.length === 0)) {
    return (
      <div className="space-y-6 py-4" aria-busy="true" aria-label="A carregar funções">
        <PanelPageHeaderSkeleton />
        <PanelGridCardsSkeleton cards={3} />
      </div>
    )
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <strong>Erro ao carregar roles:</strong> {error}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Roles</h1>
          <p className="text-muted-foreground">
            Gerencie roles e permissões do sistema
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Role
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Roles</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roles?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Roles cadastrados no sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Permissões</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(groupedPermissions).flat().length}
            </div>
            <p className="text-xs text-muted-foreground">
              Permissões disponíveis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Módulos</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(groupedPermissions).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Módulos de permissões
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Roles */}
      <Card>
        <CardHeader>
          <CardTitle>Roles Cadastrados</CardTitle>
          <CardDescription>
            Gerencie os roles e suas permissões
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!roles || roles.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum role encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Comece criando seu primeiro role
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Role
              </Button>
            </div>
          ) : (
            <RoleList
              roles={roles}
              onEdit={setEditingRole}
              onDelete={handleDeleteRole}
              onManagePermissions={setSelectedRole}
              onManageUsers={setManagingUsers}
            />
          )}
        </CardContent>
      </Card>

      {/* Modais */}
      {showForm && (
        <RoleForm
          onSubmit={handleCreateRole}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editingRole && (
        <RoleForm
          role={editingRole}
          onSubmit={(data) => handleUpdateRole(editingRole.id, data)}
          onCancel={() => setEditingRole(null)}
        />
      )}

      {selectedRole && (
        <PermissionSelector
          role={selectedRole}
          groupedPermissions={groupedPermissions}
          onSave={(permissions) => handleSyncPermissions(selectedRole.id, permissions)}
          onCancel={() => setSelectedRole(null)}
        />
      )}

      {managingUsers && (
        <RoleUsers
          role={managingUsers}
          onClose={() => setManagingUsers(null)}
        />
      )}
    </div>
  )
}
