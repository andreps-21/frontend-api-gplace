"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useGplacePermissions } from "@/lib/use-gplace-permissions"
import { AccessDenied } from "@/components/ui/access-denied"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const META: Record<
  string,
  { title: string; permission: string; note: string }
> = {
  grid: {
    title: "Grade de produto",
    permission: "grid_view",
    note: "CRUD de grelha/variações ainda não exposto em `/admin/*`. Use o Blade ou abra tarefa para `ProductAdmin` + variações.",
  },
  freights: {
    title: "Regras de frete",
    permission: "freights_view",
    note: "Sem endpoints admin REST neste repositório; equivalente ao Blade `freights.index`.",
  },
  banners: {
    title: "Mídias / anúncios",
    permission: "banners_view",
    note: "Listagem pública `GET /banners`; CRUD admin ainda não migrado para a API v1.",
  },
  "size-image": {
    title: "Tamanho mídia",
    permission: "size-image_view",
    note: "Sem API admin; apenas Blade `size-image.index`.",
  },
  "interface-positions": {
    title: "Posição na interface",
    permission: "interface-positions_view",
    note: "Sem API admin; apenas Blade.",
  },
  coupons: {
    title: "Cupons",
    permission: "coupons_view",
    note: "Listagem pública `GET /coupons`; CRUD admin não está em `/admin/*`.",
  },
  "business-units": {
    title: "Unidades (negócio)",
    permission: "businessunits_view",
    note: "Sem API admin neste projecto.",
  },
  "payment-methods": {
    title: "Formas de pagamento",
    permission: "payment-methods_view",
    note: "Leitura: `GET /payment-methods` (público com header `app`). CRUD admin ainda no Blade.",
  },
  erp: {
    title: "ERP",
    permission: "erp_view",
    note: "Sem API admin; apenas Blade `erp.index`.",
  },
  "social-medias": {
    title: "Redes sociais",
    permission: "social-medias_view",
    note: "Sem API admin; apenas Blade.",
  },
  cities: {
    title: "Cidades",
    permission: "cities_view",
    note: "Leitura: `GET /cities` (filtros `state`, `search`). Sem CRUD na API v1.",
  },
  states: {
    title: "Estados",
    permission: "states_view",
    note: "Leitura: `GET /states`. Sem CRUD na API v1.",
  },
  "relatorio-produtos": {
    title: "Relatório de produtos",
    permission: "product_report_view",
    note: "Relatório Blade `products.report`; export/query ainda não expostos em `/admin/*`.",
  },
  "relatorio-pedidos": {
    title: "Relatório de pedidos",
    permission: "order_report_view",
    note: "Relatório Blade `orders.report`; export/query ainda não expostos em `/admin/*`.",
  },
}

export default function PendenteBladeModuloPage() {
  const params = useParams()
  const chave = String(params.chave || "")
  const { can } = useGplacePermissions()
  const meta = META[chave]

  if (!meta) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Módulo desconhecido: {chave}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/dashboard">Voltar</Link>
        </Button>
      </div>
    )
  }

  if (!can(meta.permission)) {
    return <AccessDenied />
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{meta.title}</h1>
        <p className="text-muted-foreground mt-1 text-sm">Paridade com o Blade — módulo pendente na API Next.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Estado da integração</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>{meta.note}</p>
          <p>
            Documentação parcial: <code className="text-xs">docs/API.md</code> na raiz do repositório <code className="text-xs">api-gplace</code>.
          </p>
          <Button asChild variant="secondary">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
