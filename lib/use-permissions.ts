'use client';

import { useAuth } from './auth';
import { isUiPreview } from './ui-preview';
import { roleKeyForModuleAccess } from './permissions-role';

export interface PermissionConfig {
  [key: string]: string[];
}

// Configuração de permissões por role
const ROLE_PERMISSIONS: PermissionConfig = {
  'vendedor': [
    'dashboard',
    'vendas',
    'relatorios'
  ],
  'gerente': [
    'dashboard',
    'vendas',
    'relatorios',
    'gerenciar'
  ],
  'gestor': [
    'dashboard',
    'vendas',
    'relatorios',
    'gerenciar',
    'financeiro'
  ]
};

// Configuração de módulos específicos por role
const MODULE_PERMISSIONS: PermissionConfig = {
  'vendedor': [
    'vendas-cadastrar',
    'vendas-gerenciar',
    'vendas-editar',
    'vendas-excluir',
    'relatorios-vendedor',
    'relatorios-controle',
    'relatorios-ranking-produtos'
  ],
  'gerente': [
    'vendas-cadastrar',
    'vendas-gerenciar',
    'vendas-editar',
    'vendas-excluir',
    'relatorios-loja',
    'relatorios-vendedor',
    'relatorios-pos-pago',
    'relatorios-controle',
    'relatorios-dacc',
    'relatorios-aparelhos',
    'relatorios-acessorios',
    'relatorios-ranking-produtos',
    'gerenciar-usuarios',
    'gerenciar-pessoas',
    'gerenciar-pdv',
    'gerenciar-estoque',
    'gerenciar-categorias',
    'gerenciar-metas',
    'gerenciar-comissoes',
    'gerenciar-mural',
    'gerenciar-admin-api',
  ],
  'gestor': [
    'vendas-cadastrar',
    'vendas-gerenciar',
    'vendas-editar',
    'vendas-excluir',
    'relatorios-loja',
    'relatorios-vendedor',
    'relatorios-pos-pago',
    'relatorios-controle',
    'relatorios-dacc',
    'relatorios-aparelhos',
    'relatorios-acessorios',
    'relatorios-ranking-produtos',
    'gerenciar-usuarios',
    'gerenciar-pessoas',
    'gerenciar-autorizacoes',
    'gerenciar-pdv',
    'gerenciar-estoque',
    'gerenciar-categorias',
    'gerenciar-metas',
    'gerenciar-comissoes',
    'gerenciar-mural',
    'financeiro-categorias',
    'financeiro-centros-custo',
    'financeiro-contas-pagar',
    'financeiro-contas-receber',
    'financeiro-contas-bancarias',
    'financeiro-clientes',
    'financeiro-fornecedores',
    'gerenciar-admin-api',
  ]
};

export function usePermissions() {
  const { user } = useAuth();

  if (isUiPreview()) {
    const previewRole = 'gestor' as const;
    return {
      hasRole: (role: string) => role === previewRole,
      hasAnyRole: (roles: string[]) => roles.includes(previewRole),
      canAccessModule: (module: string) =>
        (ROLE_PERMISSIONS[previewRole] || []).includes(module),
      canAccessSpecificModule: (module: string) =>
        (MODULE_PERMISSIONS[previewRole] || []).includes(module),
      getAvailableModules: () => [...(ROLE_PERMISSIONS[previewRole] || [])],
      getAvailableSpecificModules: () => [...(MODULE_PERMISSIONS[previewRole] || [])],
      isVendedor: () => false,
      isGerente: () => false,
      isGestor: () => true,
      userRole: previewRole,
    };
  }

  // Ler role da API corretamente (sem fallback para vendedor)
  const getUserRole = (): string | null => {
    // Prioridade 1: Role da API (campo role direto)
    if (user?.role) {
      return user.role;
    }
    
    // Prioridade 2: Array de roles (primeiro role do array)
    if (user?.roles && Array.isArray(user.roles) && user.roles.length > 0) {
      return user.roles[0].name;
    }
    
    if (!user) {
      return null;
    }

    return null;
  };

  const userRole = getUserRole();
  const permissionKey = roleKeyForModuleAccess(userRole);

  if (
    process.env.NODE_ENV === 'development' &&
    user &&
    !userRole
  ) {
    console.warn(
      '[usePermissions] Utilizador autenticado sem role no perfil (campos `role` / `roles[].name`). Verifique a resposta de /auth/profile.',
      { id: user.id, email: user.email }
    );
  }

  const hasAnyRole = (roles: string[]): boolean => {
    if (!userRole) return false;
    if (roles.includes(userRole)) return true;
    if (permissionKey && roles.some((r) => roleKeyForModuleAccess(r) === permissionKey)) return true;
    return user?.roles?.some((r) => {
      const k = roleKeyForModuleAccess(r.name);
      return roles.includes(r.name) || (!!permissionKey && !!k && k === permissionKey);
    }) || false;
  };

  const canAccessModule = (module: string): boolean => {
    if (!permissionKey) return false;
    const rolePermissions = ROLE_PERMISSIONS[permissionKey] || [];
    return rolePermissions.includes(module);
  };

  const canAccessSpecificModule = (module: string): boolean => {
    if (!permissionKey) return false;
    const modulePermissions = MODULE_PERMISSIONS[permissionKey] || [];
    return modulePermissions.includes(module);
  };

  const getAvailableModules = (): string[] => {
    if (!permissionKey) return [];
    return ROLE_PERMISSIONS[permissionKey] || [];
  };

  const getAvailableSpecificModules = (): string[] => {
    if (!permissionKey) return [];
    return MODULE_PERMISSIONS[permissionKey] || [];
  };

  const isVendedor = (): boolean => {
    return userRole === 'vendedor';
  };

  const isGerente = (): boolean => {
    return userRole === 'gerente';
  };

  const isGestor = (): boolean => {
    return (
      userRole === 'gestor' ||
      userRole === 'master' ||
      userRole === 'administrador'
    );
  };
  
  // Função auxiliar para verificar se usuário tem uma role específica
  const hasRole = (role: string): boolean => {
    if (!userRole) return false;
    if (userRole === role) return true;
    const want = roleKeyForModuleAccess(role);
    if (permissionKey && want && permissionKey === want) return true;
    return user?.roles?.some((r) => {
      if (r.name === role) return true;
      const k = roleKeyForModuleAccess(r.name);
      return !!want && !!k && k === want;
    }) || false;
  };

  return {
    hasRole,
    hasAnyRole,
    canAccessModule,
    canAccessSpecificModule,
    getAvailableModules,
    getAvailableSpecificModules,
    isVendedor,
    isGerente,
    isGestor,
    userRole
  };
}
