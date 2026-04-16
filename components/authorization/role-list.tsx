import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Edit, Trash2, Settings, Users } from 'lucide-react'
import { Role } from '@/lib/api'

interface RoleListProps {
  roles: Role[]
  onEdit: (role: Role) => void
  onDelete: (roleId: number) => void
  onManagePermissions: (role: Role) => void
  onManageUsers: (role: Role) => void
}

export const RoleList: React.FC<RoleListProps> = ({ 
  roles, 
  onEdit, 
  onDelete, 
  onManagePermissions,
  onManageUsers
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {roles.map((role) => (
        <Card key={role.id} className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{role.name}</CardTitle>
              <Badge variant="outline" className="text-xs">
                {role.permissions?.length || 0} permissões
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {role.description || 'Sem descrição'}
            </p>
            
            {role.permissions && role.permissions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Permissões:</h4>
                <div className="flex flex-wrap gap-1">
                  {role.permissions.slice(0, 3).map((permission, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {permission}
                    </Badge>
                  ))}
                  {role.permissions.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{role.permissions.length - 3} mais
                    </Badge>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onManagePermissions(role)}
                className="flex-1"
              >
                <Settings className="w-4 h-4 mr-1" />
                Permissões
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => onManageUsers(role)}
                className="flex-1"
              >
                <Users className="w-4 h-4 mr-1" />
                Usuários
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(role)}
              >
                <Edit className="w-4 h-4" />
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDelete(role.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
