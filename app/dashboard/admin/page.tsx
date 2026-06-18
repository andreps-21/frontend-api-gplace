"use client"

import Link from "next/link"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useGplacePermissions } from "@/lib/use-gplace-permissions"
import { AccessDenied } from "@/components/ui/access-denied"
import {
  Settings,
  Sliders,
  Users,
  Shield,
  Lock,
  HelpCircle,
  Images,
  KeyRound,
  Landmark,
  UserCircle,
  UserPlus,
  Store,
  Package,
  Warehouse,
  Briefcase,
  ShoppingCart,
  Tags,
  Award,
  Ruler,
  Map,
  MapPin,
  CreditCard,
  Gift,
  Building2,
  Share2,
  ServerCog,
  Truck,
  Grid3X3,
} from "lucide-react"

const links = [
  { href: "/dashboard/admin/configuracao-loja", title: "Configuração da loja", desc: "Equivalente ao Blade settings (dados da loja no escopo do header app).", icon: Settings },
  { href: "/dashboard/admin/parametros", title: "Parâmetros", desc: "Lista global de parâmetros (Blade parameters).", icon: Sliders },
  { href: "/dashboard/admin/usuarios-loja", title: "Usuários da loja", desc: "Utilizadores associados à loja atual.", icon: Users },
  { href: "/dashboard/admin/atribuicoes", title: "Atribuições (roles)", desc: "Roles Spatie filtradas pelo tenant da loja.", icon: Shield },
  { href: "/dashboard/admin/permissoes", title: "Permissões", desc: "Lista de permissões Spatie.", icon: Lock },
  { href: "/dashboard/admin/faq", title: "FAQ", desc: "Perguntas frequentes da loja (Etapa 2).", icon: HelpCircle },
  { href: "/dashboard/admin/catalogos", title: "Catálogos", desc: "Catálogos de mídia da loja (Etapa 2).", icon: Images },
  { href: "/dashboard/admin/tokens", title: "Tokens integração", desc: "Tokens de integração (Etapa 2).", icon: KeyRound },
  { href: "/dashboard/admin/tenant", title: "Titular (tenant)", desc: "Dados do tenant da loja atual (E3).", icon: Landmark },
  { href: "/dashboard/admin/clientes", title: "Clientes", desc: "Clientes do tenant (Blade customers).", icon: UserCircle },
  { href: "/dashboard/admin/leads", title: "Leads", desc: "Leads da loja (Blade leads).", icon: UserPlus },
  { href: "/dashboard/admin/lojas", title: "Lojas", desc: "Lojas do mesmo titular (Blade stores).", icon: Store },
  { href: "/dashboard/admin/produtos", title: "Produtos", desc: "Produtos da loja (Blade products).", icon: Package },
  { href: "/dashboard/admin/estoque", title: "Estoque", desc: "Armazéns, lotes e movimentos de stock.", icon: Warehouse },
  { href: "/dashboard/admin/vendedores", title: "Vendedores", desc: "Vendedores ligados à loja (Blade salesman).", icon: Briefcase },
  { href: "/dashboard/admin/pedidos", title: "Pedidos de venda", desc: "Listagem admin `GET /admin/orders`.", icon: ShoppingCart },
  { href: "/dashboard/admin/categorias", title: "Categorias", desc: "Categorias usadas nos produtos e no menu do ecommerce.", icon: Tags },
  { href: "/dashboard/admin/secoes", title: "Seções da home", desc: "Seções visuais da home com categorias, produtos ou marcas.", icon: Images },
  { href: "/dashboard/admin/grades-produto", title: "Grade de produto", desc: "Grades e variações usadas nos produtos.", icon: Grid3X3 },
  { href: "/dashboard/admin/marcas", title: "Marcas", desc: "`GET /admin/brands`.", icon: Award },
  { href: "/dashboard/admin/unidades-medida", title: "Unidades de medida", desc: "`GET /admin/measurement-units`.", icon: Ruler },
  { href: "/dashboard/admin/regras-frete", title: "Regras de frete", desc: "Faixas de CEP/cidade para cálculo de frete.", icon: Truck },
  { href: "/dashboard/admin/banners", title: "Mídias/Anúncios", desc: "Banners da home por posição da interface.", icon: Images },
  { href: "/dashboard/admin/tamanhos-midia", title: "Tamanho mídia", desc: "Dimensões aceitas para banners e mídias.", icon: Ruler },
  { href: "/dashboard/admin/posicoes-interface", title: "Posição na interface", desc: "Pontos de exibição usados pelo ecommerce.", icon: Images },
  { href: "/dashboard/admin/cupons", title: "Cupons", desc: "Cupons da loja.", icon: Gift },
  { href: "/dashboard/admin/unidades-negocio", title: "Unidades de negócio", desc: "Unidades por cidade e faixa de CEP.", icon: Building2 },
  { href: "/dashboard/admin/formas-pagamento", title: "Formas de pagamento", desc: "CRUD admin de meios de pagamento.", icon: CreditCard },
  { href: "/dashboard/admin/erp", title: "ERP", desc: "Cadastros de ERP.", icon: ServerCog },
  { href: "/dashboard/admin/redes-sociais", title: "Redes sociais", desc: "Cadastros de redes sociais.", icon: Share2 },
  { href: "/dashboard/admin/cidades", title: "Cidades", desc: "CRUD admin de cidades.", icon: MapPin },
  { href: "/dashboard/admin/estados", title: "Estados", desc: "CRUD admin de estados.", icon: Map },
]

export default function AdminGplaceHubPage() {
  const { bladeSidebarMode } = useGplacePermissions()

  if (!bladeSidebarMode) {
    return <AccessDenied />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Administração Gplace</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Migração das telas de configuração e gerenciamento do Blade da api-gplace, consumindo a API com o token e o header <code className="text-xs">app</code> da loja.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map(({ href, title, desc, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="h-full transition-colors hover:bg-muted/40">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-[#2f3a8f]" />
                  <CardTitle className="text-base">{title}</CardTitle>
                </div>
                <CardDescription className="text-xs leading-relaxed">{desc}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
