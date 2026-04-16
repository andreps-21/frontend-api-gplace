'use client';

import { useAuth } from './auth';

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
    'gerenciar-mural'
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
    'financeiro-fornecedores'
  ]
};

export function usePermissions() {
  const { user } = useAuth();

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
    
    // Se não houver role, retornar null (não fazer fallback)
    // O sistema deve tratar isso como erro
    if (!user) {
      return null;
    }
    
    // Log de warning para debug
    console.warn('⚠️ Usuário sem role atribuída:', {
      id: user.id,
      email: user.email,
      hasRole: !!user.role,
      hasRoles: !!user.roles,
      rolesLength: user.roles?.length || 0
    });
    
    return null;
  };

  const userRole = getUserRole();
  
  // Se não houver role, usar null e tratar como erro
  if (!userRole) {
    console.error('❌ Usuário sem role detectada. Verifique se o backend está retornando a role corretamente.');
  }
  
  console.log('🎯 Role final detectado:', userRole || 'NENHUMA ROLE ENCONTRADA');

  const hasAnyRole = (roles: string[]): boolean => {
    if (!userRole) return false;
    return roles.includes(userRole) || user?.roles?.some(r => roles.includes(r.name)) || false;
  };

  const canAccessModule = (module: string): boolean => {
    if (!userRole) return false;
    const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
    return rolePermissions.includes(module);
  };

  const canAccessSpecificModule = (module: string): boolean => {
    if (!userRole) return false;
    const modulePermissions = MODULE_PERMISSIONS[userRole] || [];
    return modulePermissions.includes(module);
  };

  const getAvailableModules = (): string[] => {
    if (!userRole) return [];
    return ROLE_PERMISSIONS[userRole] || [];
  };

  const getAvailableSpecificModules = (): string[] => {
    if (!userRole) return [];
    return MODULE_PERMISSIONS[userRole] || [];
  };

  const isVendedor = (): boolean => {
    return userRole === 'vendedor';
  };

  const isGerente = (): boolean => {
    return userRole === 'gerente';
  };

  const isGestor = (): boolean => {
    // Gestor e master são tratados como super administradores
    return userRole === 'gestor' || userRole === 'master';
  };
  
  // Função auxiliar para verificar se usuário tem uma role específica
  const hasRole = (role: string): boolean => {
    if (!userRole) return false;
    return userRole === role || user?.roles?.some(r => r.name === role) || false;
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
