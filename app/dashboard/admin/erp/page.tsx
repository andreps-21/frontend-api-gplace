"use client"

import { apiService } from "@/lib/api"
import { SimpleResourcePage } from "../_components/simple-resource-page"

const fields = [
  { key: "description", label: "Descrição", required: true },
  { key: "status", label: "Ativo", type: "boolean" as const },
]

export default function ErpPage() {
  return (
    <SimpleResourcePage
      title="ERP"
      description="CRUD admin equivalente ao Blade erp."
      permission="erp_view"
      fields={fields}
      columns={fields}
      load={(params) => apiService.getAdminErps(params)}
      create={(payload) => apiService.createAdminErp(payload)}
      update={(id, payload) => apiService.updateAdminErp(id, payload)}
      remove={(id) => apiService.deleteAdminErp(id)}
    />
  )
}
