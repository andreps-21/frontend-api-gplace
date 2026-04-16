/**
 * Quando `NEXT_PUBLIC_UI_PREVIEW=true`, o layout do dashboard (sidebar, rotas protegidas)
 * pode ser visto sem login nem API — apenas para desenvolvimento/UI.
 * Não usar em produção.
 */
export function isUiPreview(): boolean {
  return process.env.NEXT_PUBLIC_UI_PREVIEW === 'true'
}
