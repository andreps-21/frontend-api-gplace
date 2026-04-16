/**
 * Converte a role vinda da API (Spatie) para a chave usada em ROLE_PERMISSIONS / MODULE_PERMISSIONS.
 * Ex.: seed `UserSeeder` atribui `administrador` — sem este mapeamento o sidebar fica vazio.
 */
export function roleKeyForModuleAccess(apiRole: string | null | undefined): string | null {
  if (apiRole == null || apiRole === '') return null
  const r = String(apiRole).toLowerCase()
  if (r === 'administrador' || r === 'master') return 'gestor'
  return r
}

/** Role com visão ampla (lojas / stats), como no dashboard legado TIM. */
export function isGestorLevelRole(apiRole: string | null | undefined): boolean {
  const r = (apiRole || '').toLowerCase()
  return r === 'gestor' || r === 'master' || r === 'administrador'
}
