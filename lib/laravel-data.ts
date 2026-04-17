/** Extrai o campo `data` do envelope `{ message, data }` da API Laravel. */
export function laravelInnerData<T = unknown>(body: unknown): T {
  if (body !== null && typeof body === 'object' && 'data' in body && (body as { data: unknown }).data !== undefined) {
    return (body as { data: T }).data
  }
  return body as T
}

/**
 * Formata erros de validação Laravel (422): envelope com `data` ou `errors`, valores por campo em array de strings.
 */
export function laravelValidationErrorText(body: unknown): string | null {
  if (body === null || typeof body !== "object") return null
  const b = body as { data?: unknown; errors?: unknown }
  const raw = b.data ?? b.errors
  if (raw === null || typeof raw !== "object") return null
  const parts: string[] = []
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(val)) {
      const msgs = val.filter((x): x is string => typeof x === "string")
      if (msgs.length) parts.push(`${key}: ${msgs.join(" ")}`)
    } else if (typeof val === "string") {
      parts.push(`${key}: ${val}`)
    }
  }
  return parts.length ? parts.join(" · ") : null
}
