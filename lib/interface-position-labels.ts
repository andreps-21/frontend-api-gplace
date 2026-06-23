type InterfacePositionLike = {
  id_position?: string | number | null
  position_name?: string | null
}

export type InterfacePositionMeta = {
  code: string
  title: string
  description: string
  layout: string
}

const HOME_POSITION_META: Record<string, Omit<InterfacePositionMeta, "code">> = {
  "001": {
    title: "Topo da home",
    description: "Banner principal em largura total, exibido antes dos blocos de produtos.",
    layout: "Largura total",
  },
  "002": {
    title: "Bloco superior - Esquerda",
    description: "Banner de 50% exibido logo abaixo do banner principal, no lado esquerdo.",
    layout: "50% esquerda",
  },
  "003": {
    title: "Bloco superior - Direita",
    description: "Banner de 50% exibido logo abaixo do banner principal, no lado direito.",
    layout: "50% direita",
  },
  "004": {
    title: "Bloco inferior - Esquerda",
    description: "Banner de 50% exibido mais abaixo na home, no lado esquerdo.",
    layout: "50% esquerda",
  },
  "005": {
    title: "Bloco inferior - Direita",
    description: "Banner de 50% exibido mais abaixo na home, no lado direito.",
    layout: "50% direita",
  },
}

export function normalizeInterfacePositionCode(code: string | number | null | undefined): string {
  const value = String(code ?? "").trim()
  if (!value) return ""
  return /^\d+$/.test(value) ? value.padStart(3, "0") : value
}

export function getInterfacePositionMeta(position: InterfacePositionLike): InterfacePositionMeta {
  const code = normalizeInterfacePositionCode(position.id_position)
  const known = HOME_POSITION_META[code]

  if (known) {
    return { code, ...known }
  }

  return {
    code,
    title: position.position_name?.trim() || "Posição personalizada",
    description: "Posição personalizada. Confirme no frontend público onde este código é renderizado.",
    layout: "Personalizada",
  }
}

export function formatInterfacePositionLabel(position: InterfacePositionLike): string {
  const meta = getInterfacePositionMeta(position)
  return meta.code ? `${meta.code} - ${meta.title}` : meta.title
}
