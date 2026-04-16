import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { X, Search, UserPlus, UserMinus, Users } from 'lucide-react'
import { Role } from '@/lib/api'
import { useAuthorization } from '@/lib/use-authorization'
import { apiService } from '@/lib/api'
import { notifications } from '@/lib/notifications'

interface RoleUsersProps {
  role: Role
  onClose: () => void
}

interface User {
  id: number
  name: string
  email: string
  establishment?: {
    name: string
  }
}

export const RoleUsers: React.FC<RoleUsersProps> = ({ role, onClose }) => {
  const { assignRoleToUser, removeRoleFromUser } = useAuthorization()
  const [users, setUsers] = useState<User[]>([])
  const [roleUsers, setRoleUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string>('')

  useEffect(() => {
    loadUsers()
    loadRoleUsers()
  }, [role])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await apiService.getUsers()
      setUsers(response.data.data || [])
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
      notifications.custom.error('Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }

  const loadRoleUsers = async () => {
    try {
      const response = await apiService.getRoleUsers(role.id)
      setRoleUsers(response.data || [])
    } catch (error) {
      console.error('Erro ao carregar usuários do role:', error)
    }
  }

  const handleAssignRole = async () => {
    if (!selectedUserId) return

    try {
      await assignRoleToUser(parseInt(selectedUserId), role.id)
      await loadRoleUsers()
      setSelectedUserId('')
      notifications.custom.success('Role atribuído com sucesso!')
    } catch (error) {
      console.error('Erro ao atribuir role:', error)
      notifications.custom.error('Erro ao atribuir role')
    }
  }

  const handleRemoveRole = async (userId: number) => {
    try {
      await removeRoleFromUser(userId, role.id)
      await loadRoleUsers()
      notifications.custom.success('Role removido com sucesso!')
    } catch (error) {
      console.error('Erro ao remover role:', error)
      notifications.custom.error('Erro ao remover role')
    }
  }

  const filteredUsers = users.filter(user =>
    !roleUsers.some(roleUser => roleUser.id === user.id) &&
    (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-lg font-semibold">Usuários do Role</h3>
            <p className="text-sm text-muted-foreground">Role: {role.name}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Adicionar usuário ao role */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Adicionar Usuário</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Buscar usuário</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="search"
                      placeholder="Buscar por nome ou email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <Label htmlFor="user-select">Selecionar usuário</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          <div className="flex flex-col">
                            <span>{user.name}</span>
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleAssignRole}
                    disabled={!selectedUserId}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de usuários do role */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                Usuários com este Role ({roleUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {roleUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum usuário atribuído a este role
                </div>
              ) : (
                <div className="space-y-3">
                  {roleUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                        {user.establishment && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {user.establishment.name}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveRole(user.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <UserMinus className="w-4 h-4 mr-1" />
                        Remover
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
