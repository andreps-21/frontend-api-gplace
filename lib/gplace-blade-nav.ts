/**
 * Estrutura inspirada no sidebar Blade (`resources/views/layouts/navbars/sidebar.blade.php`).
 * «Vendas» no topo fica acima de «Operacionais»; «Operacionais» não está dentro de «Cadastros» — alinhado ao Next.
 */

export type GplaceNavNode =
  | {
      kind: "link"
      label: string
      href: string
      /** Permissão Spatie; vazio = sempre visível (ex.: Dashboard). */
      permission: string
      /** Blade: `@if(session()->has('store'))` à volta do item. */
      requiresStore?: boolean
      /** Blade: `@if(session()->exists('tenant'))` (ex.: Marca). */
      requiresTenant?: boolean
    }
  | {
      kind: "group"
      label: string
      /** Visível se qualquer permissão listada existir (equivalente a @canany). */
      anyOf?: string[]
      /** Blade: `@if(session()->has('store'))` à volta do bloco do menu. */
      requiresStore?: boolean
      children: GplaceNavNode[]
    }

/** Blade L38: Pessoas (sem `salesman_view` no @canany do grupo). */
const CANANY_PESSOAS = ["customers_view", "leads_view", "tenants_view", "stores_view"]

/** Blade L186–187: Gerais (sem `social-medias_view` no @canany do grupo). */
const CANANY_GERAIS = [
  "cities_view",
  "states_view",
  "payment-methods_view",
  "erp_view",
  "coupons_view",
  "businessunits_view",
]

/** «Cadastros» no SPA: só Pessoas + Gerais (Vendas e Operacionais são grupos de topo). */
const CANANY_CADASTROS = [...CANANY_PESSOAS, ...CANANY_GERAIS]

/** Blade L93–94: núcleo Operacionais. */
const CANANY_OPERACIONAIS = ["products_view", "sections_view", "measurement-units_view", "grid_view", "brands_view"]

/** Grupo «Operacionais» no topo: inclui itens com @can próprio no Blade (frete, mídias, etc.). */
const CANANY_OPERACIONAIS_TOP = [
  ...CANANY_OPERACIONAIS,
  "freights_view",
  "banners_view",
  "size-image_view",
  "interface-positions_view",
]

/** Blade L265 + loja na sessão. */
const CANANY_VENDAS = ["orders_view"]

const CANANY_RELATORIOS = ["product_report_view", "order_report_view"]

const CANANY_GERENCIAMENTO = ["users_view", "roles_view", "permissions_view"]

/** Blade L360: Configurações (exterior; `tokens_view` e `faq_view` não abrem o grupo sozinhos). */
const CANANY_CONFIG = ["parameters_view", "banners_view", "catalogs_view", "settings_edit"]

export const gplaceBladeNavTree: GplaceNavNode[] = [
  { kind: "link", label: "Dashboard", href: "/dashboard", permission: "" },
  {
    kind: "group",
    label: "Cadastros",
    anyOf: CANANY_CADASTROS,
    children: [
      {
        kind: "group",
        label: "Pessoas",
        anyOf: CANANY_PESSOAS,
        children: [
          { kind: "link", label: "Leads", href: "/dashboard/admin/leads", permission: "leads_view" },
          { kind: "link", label: "Clientes", href: "/dashboard/admin/clientes", permission: "customers_view" },
          { kind: "link", label: "Contratantes", href: "/dashboard/admin/tenant", permission: "tenants_view" },
          { kind: "link", label: "Lojas", href: "/dashboard/admin/lojas", permission: "stores_view" },
          { kind: "link", label: "Vendedores", href: "/dashboard/admin/vendedores", permission: "salesman_view" },
        ],
      },
      {
        kind: "group",
        label: "Gerais",
        anyOf: CANANY_GERAIS,
        children: [
          { kind: "link", label: "Cupons", href: "/dashboard/admin/pendente/coupons", permission: "coupons_view", requiresStore: true },
          { kind: "link", label: "Unidades", href: "/dashboard/admin/pendente/business-units", permission: "businessunits_view", requiresStore: true },
          {
            kind: "link",
            label: "Formas de pagamento",
            href: "/dashboard/admin/pendente/payment-methods",
            permission: "payment-methods_view",
          },
          { kind: "link", label: "ERP", href: "/dashboard/admin/pendente/erp", permission: "erp_view" },
          { kind: "link", label: "Redes Sociais", href: "/dashboard/admin/pendente/social-medias", permission: "social-medias_view" },
          { kind: "link", label: "Cidades", href: "/dashboard/admin/pendente/cities", permission: "cities_view" },
          { kind: "link", label: "Estados", href: "/dashboard/admin/pendente/states", permission: "states_view" },
        ],
      },
    ],
  },
  {
    kind: "group",
    label: "Vendas",
    requiresStore: true,
    anyOf: CANANY_VENDAS,
    children: [
      { kind: "link", label: "Venda Rápida", href: "/dashboard/venda-rapida", permission: "orders_view", requiresStore: true },
      { kind: "link", label: "Pedido de Venda", href: "/dashboard/admin/pedidos", permission: "orders_view", requiresStore: true },
    ],
  },
  {
    kind: "group",
    label: "Operacionais",
    anyOf: CANANY_OPERACIONAIS_TOP,
    children: [
      { kind: "link", label: "Produtos", href: "/dashboard/admin/produtos", permission: "products_view", requiresStore: true },
      { kind: "link", label: "Seções", href: "/dashboard/admin/secoes", permission: "sections_view", requiresStore: true },
      { kind: "link", label: "Grade de produto", href: "/dashboard/admin/pendente/grid", permission: "grid_view", requiresStore: true },
      { kind: "link", label: "Marca", href: "/dashboard/admin/marcas", permission: "brands_view", requiresTenant: true },
      {
        kind: "link",
        label: "Unidade de medida",
        href: "/dashboard/admin/unidades-medida",
        permission: "measurement-units_view",
      },
      { kind: "link", label: "Regras de frete", href: "/dashboard/admin/pendente/freights", permission: "freights_view" },
      { kind: "link", label: "Mídias/Anúncios", href: "/dashboard/admin/pendente/banners", permission: "banners_view", requiresStore: true },
      { kind: "link", label: "Tamanho mídia", href: "/dashboard/admin/pendente/size-image", permission: "size-image_view" },
      {
        kind: "link",
        label: "Posição na interface",
        href: "/dashboard/admin/pendente/interface-positions",
        permission: "interface-positions_view",
      },
    ],
  },
  {
    kind: "group",
    label: "Relatórios",
    requiresStore: true,
    anyOf: CANANY_RELATORIOS,
    children: [
      {
        kind: "link",
        label: "Produtos",
        href: "/dashboard/admin/pendente/relatorio-produtos",
        permission: "product_report_view",
        requiresStore: true,
      },
      {
        kind: "link",
        label: "Pedidos",
        href: "/dashboard/admin/pendente/relatorio-pedidos",
        permission: "order_report_view",
        requiresStore: true,
      },
    ],
  },
  {
    kind: "group",
    label: "Gerenciamento",
    anyOf: CANANY_GERENCIAMENTO,
    children: [
      { kind: "link", label: "Usuários", href: "/dashboard/admin/usuarios-loja", permission: "users_view" },
      { kind: "link", label: "Atribuições", href: "/dashboard/admin/atribuicoes", permission: "roles_view" },
      { kind: "link", label: "Permissões", href: "/dashboard/admin/permissoes", permission: "permissions_view" },
    ],
  },
  {
    kind: "group",
    label: "Configurações",
    anyOf: CANANY_CONFIG,
    children: [
      { kind: "link", label: "FAQ", href: "/dashboard/admin/faq", permission: "faq_view", requiresStore: true },
      { kind: "link", label: "Catálogo", href: "/dashboard/admin/catalogos", permission: "catalogs_view", requiresStore: true },
      { kind: "link", label: "Parâmetros", href: "/dashboard/admin/parametros", permission: "parameters_view" },
      { kind: "link", label: "Configuração", href: "/dashboard/admin/configuracao-loja", permission: "settings_edit", requiresStore: true },
      { kind: "link", label: "Tokens Integração", href: "/dashboard/admin/tokens", permission: "tokens_view" },
    ],
  },
]
