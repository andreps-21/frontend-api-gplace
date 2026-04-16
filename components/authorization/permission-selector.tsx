import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { X, Search, Check, Square } from 'lucide-react'
import { Role, Permission } from '@/lib/api'
import { GroupedPermissions } from '@/lib/authorization-service'

interface PermissionSelectorProps {
  role: Role
  groupedPermissions: GroupedPermissions
  onSave: (permissions: string[]) => void
  onCancel: () => void
}

export const PermissionSelector: React.FC<PermissionSelectorProps> = ({ 
  role, 
  groupedPermissions, 
  onSave, 
  onCancel 
}) => {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredModules, setFilteredModules] = useState<GroupedPermissions>({})

  useEffect(() => {
    // Inicializar com permissões atuais do role
    if (role.permissions) {
      setSelectedPermissions(role.permissions)
    }
  }, [role])

  useEffect(() => {
    // Filtrar módulos baseado na busca
    if (!searchTerm) {
      setFilteredModules(groupedPermissions)
    } else {
      const filtered: GroupedPermissions = {}
      Object.entries(groupedPermissions).forEach(([module, permissions]) => {
        const filteredPermissions = permissions.filter(permission =>
          permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (permission.description && permission.description.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        if (filteredPermissions.length > 0) {
          filtered[module] = filteredPermissions
        }
      })
      setFilteredModules(filtered)
    }
  }, [searchTerm, groupedPermissions])

  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    )
  }

  const handleModuleToggle = (modulePermissions: Permission[]) => {
    const moduleIds = modulePermissions.map(p => p.name)
    const allSelected = moduleIds.every(id => selectedPermissions.includes(id))
    
    if (allSelected) {
      // Desmarcar todas do módulo
      setSelectedPermissions(prev => 
        prev.filter(id => !moduleIds.includes(id))
      )
    } else {
      // Marcar todas do módulo
      setSelectedPermissions(prev => 
        Array.from(new Set([...prev, ...moduleIds]))
      )
    }
  }

  const handleSelectAll = () => {
    const allPermissionIds = Object.values(groupedPermissions)
      .flat()
      .map(p => p.name)
    setSelectedPermissions(allPermissionIds)
  }

  const handleDeselectAll = () => {
    setSelectedPermissions([])
  }

  const handleSave = () => {
    onSave(selectedPermissions)
  }

  const getModuleStats = (modulePermissions: Permission[]) => {
    const selected = modulePermissions.filter(p => selectedPermissions.includes(p.name)).length
    return { selected, total: modulePermissions.length }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-lg font-semibold">Gerenciar Permissões</h3>
            <p className="text-sm text-muted-foreground">Role: {role.name}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 border-b">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar permissões..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                <Check className="w-4 h-4 mr-1" />
                Selecionar Todas
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeselectAll}
              >
                <Square className="w-4 h-4 mr-1" />
                Desmarcar Todas
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Badge variant="outline">
              {selectedPermissions.length} permissões selecionadas
            </Badge>
            <span>
              {Object.keys(filteredModules).length} módulos
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {Object.entries(filteredModules).map(([module, permissions]) => {
              const stats = getModuleStats(permissions)
              const allSelected = stats.selected === stats.total
              const someSelected = stats.selected > 0 && stats.selected < stats.total
              
              return (
                <Card key={module}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base capitalize">
                        {module.replace('_', ' ')}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {stats.selected}/{stats.total}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleModuleToggle(permissions)}
                        >
                          {allSelected ? 'Desmarcar' : 'Marcar'} Todas
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {permissions.map((permission) => (
                        <Label
                          key={permission.name}
                          className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPermissions.includes(permission.name)}
                            onChange={() => handlePermissionToggle(permission.name)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">
                              {permission.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {permission.description}
                            </div>
                          </div>
                        </Label>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar Permissões ({selectedPermissions.length})
          </Button>
        </div>
      </div>
    </div>
  )
}
