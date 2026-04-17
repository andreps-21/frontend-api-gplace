/**
 * Token usado pelo LocalDevStoreSeeder na API (tabela `stores.app_token`) — mesmo valor em .env.example.
 * Só aplicado em localhost quando NEXT_PUBLIC_APP_TOKEN não está definido, para evitar 403 sem cópia manual do .env.
 */
export const DEV_LOCAL_APP_TOKEN = 'gplace-local-frontend'

/**
 * Valor literal de NEXT_PUBLIC_APP_TOKEN no build (pode estar vazio).
 */
export const PUBLIC_APP_TOKEN = (process.env.NEXT_PUBLIC_APP_TOKEN || '').trim()

/** URL da API no build — se apontar para loopback, podemos usar o token de dev sem NEXT_PUBLIC_APP_TOKEN. */
function envPointsToLocalApi(): boolean {
  const raw =
    (typeof process !== 'undefined' &&
      (process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_APP_URL || '')) ||
    ''
  return /localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|host\.docker\.internal/i.test(raw)
}

/**
 * Token efectivo do header `app`: variável de ambiente, ou token de dev quando a API é local
 * (hostname do browser OU URL da API em .env a apontar para localhost).
 */
export function getResolvedAppToken(): string {
  if (PUBLIC_APP_TOKEN.length > 0) {
    return PUBLIC_APP_TOKEN
  }
  if (envPointsToLocalApi()) {
    return DEV_LOCAL_APP_TOKEN
  }
  if (typeof window !== 'undefined') {
    const h = window.location.hostname
    if (
      h === 'localhost' ||
      h === '127.0.0.1' ||
      h === '[::1]' ||
      h === '::1' ||
      /^192\.168\.\d+\.\d+$/.test(h)
    ) {
      return DEV_LOCAL_APP_TOKEN
    }
  }
  return ''
}

export function isAppTokenConfigured(): boolean {
  return getResolvedAppToken().length > 0
}
