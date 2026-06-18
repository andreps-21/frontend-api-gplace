"use client"

import { apiService } from "@/lib/api"
import { SimpleResourcePage } from "../_components/simple-resource-page"

const fields = [
  { key: "description", label: "Descrição", required: true },
  { key: "code", label: "Código", required: true },
  { key: "icon", label: "Ícone/path" },
  { key: "is_enabled", label: "Ativo", type: "boolean" as const },
]

export default function FormasPagamentoPage() {
  return (
    <SimpleResourcePage
      title="Formas de pagamento"
      description="CRUD admin equivalente ao Blade payment-methods."
      permission="payment-methods_view"
      fields={fields}
      columns={fields}
      load={(params) => apiService.getAdminPaymentMethodsCrud(params)}
      create={(payload) => apiService.createAdminPaymentMethod(payload)}
      update={(id, payload) => apiService.updateAdminPaymentMethod(id, payload)}
      remove={(id) => apiService.deleteAdminPaymentMethod(id)}
    />
  )
}
