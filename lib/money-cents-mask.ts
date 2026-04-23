/**
 * Máscara de valor moeda pt-BR (mesmo padrão do modal de produto: entrada tipo «caixa»).
 * `numMoney` lê string formatada; `formatMoneyCentsMask` aplica a máscara ao digitar.
 */

/** Valor monetário pt-BR (ex.: «1.234,56») → número. */
export function numMoney(v: string): number {
  const t = String(v).trim()
  if (!t) return 0
  const normalized = t.replace(/\./g, "").replace(",", ".")
  const n = parseFloat(normalized)
  return Number.isFinite(n) ? n : 0
}

export function formatPtBrMoney(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

/** Máximo de dígitos interpretados como centavos (evita overflow em `Number`). */
export const MONEY_CENTS_DIGIT_CAP = 14

/**
 * Máscara «caixa»: só dígitos, cada novo dígito entra à direita como centavos.
 * Ex.: 1 → 0,01 · 11 → 0,11 · 111 → 1,11. Colar «1.234,56» → dígitos 123456 → 1.234,56.
 */
export function formatMoneyCentsMask(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, MONEY_CENTS_DIGIT_CAP)
  const cents = digits === "" ? 0 : Number.parseInt(digits, 10)
  if (!Number.isFinite(cents) || cents < 0) return formatPtBrMoney(0)
  return formatPtBrMoney(cents / 100)
}
