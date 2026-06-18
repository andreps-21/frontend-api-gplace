"use client"

import { apiService } from "@/lib/api"
import { SimpleResourcePage } from "../_components/simple-resource-page"

const fields = [
  { key: "description", label: "Descrição", required: true },
  { key: "code", label: "Código", required: true },
  { key: "icon", label: "Ícone/path" },
  { key: "is_enabled", label: "Ativo", type: "boolean" as const },
]

export default function RedesSociaisPage() {
  return (
    <SimpleResourcePage
      title="Redes sociais"
      description="CRUD admin equivalente ao Blade social-medias."
      permission="social-medias_view"
      fields={fields}
      columns={fields}
      load={(params) => apiService.getAdminSocialMedias(params)}
      create={(payload) => apiService.createAdminSocialMedia(payload)}
      update={(id, payload) => apiService.updateAdminSocialMedia(id, payload)}
      remove={(id) => apiService.deleteAdminSocialMedia(id)}
    />
  )
}
