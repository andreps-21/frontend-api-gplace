/**
 * Variáveis NEXT_PUBLIC_* embutidas no build — usar para validar config antes de chamar a API.
 */
export const PUBLIC_APP_TOKEN = (process.env.NEXT_PUBLIC_APP_TOKEN || '').trim();

export function isAppTokenConfigured(): boolean {
  return PUBLIC_APP_TOKEN.length > 0;
}
