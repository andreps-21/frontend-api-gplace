/** Extrai o campo `data` do envelope `{ message, data }` da API Laravel. */
export function laravelInnerData<T = unknown>(body: unknown): T {
  if (body !== null && typeof body === 'object' && 'data' in body && (body as { data: unknown }).data !== undefined) {
    return (body as { data: T }).data
  }
  return body as T
}
