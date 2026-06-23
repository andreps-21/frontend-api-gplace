"use client"

import { useCallback, useEffect, useState } from "react"
import { apiService, type City, type ProductFieldSetting, type ProductFieldType, type ProductFormTemplate, type StoreProductParametersPayload } from "@/lib/api"
import { laravelInnerData } from "@/lib/laravel-data"
import { useGplacePermissions } from "@/lib/use-gplace-permissions"
import { AccessDenied } from "@/components/ui/access-denied"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import CitySearch from "@/components/ui/city-search"
import { Loader2 } from "lucide-react"
import { PanelFormPageSkeleton } from "@/components/dashboard/panel-content-skeleton"
import { maskCEP, unmaskCEP } from "@/lib/masks"
import { toast } from "sonner"
import { StoreCatalogTab } from "./_components/store-catalog-tab"
import { StoreFaqTab } from "./_components/store-faq-tab"
import { StoreTokensTab } from "./_components/store-tokens-tab"

type SettingsBundle = {
  settings: Record<string, unknown> | null
  social_media_options: unknown[]
  erp_options: unknown[]
}

const emptyForm = () => ({
  name: "",
  full_name: "",
  nif: "",
  city_id: "" as string | number,
  address: "",
  number: "",
  district: "",
  maps: "",
  contact: "",
  zip_code: "",
  email: "",
  phone: "",
  status: "1",
  note: "",
  portal_url: "https://",
  email_notification: "",
  whatsapp_phone: "",
  terms: "",
  privacy_policy: "",
  footer: "",
  footer_background_color: "#1e293b",
  footer_text_color: "#ffffff",
  brand_color: "#0284c7",
  meta_tags: "",
  pixels: "",
  ads: "",
  cookies: "",
})

type SettingsForm = ReturnType<typeof emptyForm>
type SettingsTab = "profile" | "product-parameters" | "faq" | "catalog" | "tokens"

const imageUrl = (value: unknown) => (typeof value === "string" && value.trim() ? value : null)
const colorPickerValue = (value: string, fallback: string) => (/^#[0-9A-Fa-f]{6}$/.test(value) ? value : fallback)
const dynamicFieldTypes: Array<{ value: ProductFieldType; label: string }> = [
  { value: "text", label: "Texto" },
  { value: "number", label: "Número" },
  { value: "money", label: "Dinheiro" },
  { value: "date", label: "Data" },
  { value: "boolean", label: "Sim/Não" },
  { value: "select", label: "Seleção" },
  { value: "multiselect", label: "Múltipla seleção" },
  { value: "color", label: "Cor" },
  { value: "url", label: "URL" },
]

const normalizedOptionText = (options?: string[] | null) => (Array.isArray(options) ? options.join(", ") : "")
const optionsFromText = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)

function cityFromSettings(settings: Record<string, unknown>): City | null {
  const city = settings.city
  if (city === null || typeof city !== "object") return null

  const raw = city as Record<string, unknown>
  const state = raw.state as Record<string, unknown> | undefined
  const id = Number(raw.id ?? settings.city_id)
  const stateId = Number(raw.state_id ?? state?.id ?? 0)
  const title = String(raw.title ?? raw.name ?? "").trim()

  if (!id || !title) return null

  return {
    id,
    title,
    state_id: stateId,
    letter: String(raw.letter ?? state?.letter ?? state?.uf ?? ""),
    lat: String(raw.lat ?? ""),
    long: String(raw.long ?? ""),
    created_at: String(raw.created_at ?? ""),
    updated_at: String(raw.updated_at ?? ""),
  }
}

export default function ConfiguracaoLojaGplacePage() {
  const { can } = useGplacePermissions()
  const mayManageSettings = can("settings_edit")
  const mayViewFaq = can("faq_view")
  const mayViewCatalogs = can("catalogs_view")
  const mayViewTokens = can("tokens_view")
  const firstAllowedTab: SettingsTab = mayManageSettings
    ? "profile"
    : mayViewFaq
      ? "faq"
      : mayViewCatalogs
        ? "catalog"
        : "tokens"
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoFooterFile, setLogoFooterFile] = useState<File | null>(null)
  const [faviconFile, setFaviconFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFooterPreview, setLogoFooterPreview] = useState<string | null>(null)
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null)
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [activeTab, setActiveTab] = useState<SettingsTab>(firstAllowedTab)
  const [productTemplates, setProductTemplates] = useState<ProductFormTemplate[]>([])
  const [currentTemplateId, setCurrentTemplateId] = useState<number | null>(null)
  const [productFields, setProductFields] = useState<ProductFieldSetting[]>([])
  const [fieldTypes, setFieldTypes] = useState<ProductFieldType[]>([])
  const [savingProductParameters, setSavingProductParameters] = useState(false)

  const load = useCallback(async () => {
    if (!mayManageSettings) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const raw = await apiService.getAdminStoreSettings()
      const paramsRaw = await apiService.getAdminStoreProductParameters()
      const bundle = laravelInnerData<SettingsBundle>(raw)
      const params = laravelInnerData<StoreProductParametersPayload>(paramsRaw)
      setProductTemplates(params.templates ?? [])
      setCurrentTemplateId(params.current_template_id ?? null)
      setProductFields(params.fields ?? [])
      setFieldTypes(params.field_types ?? [])
      const s = bundle.settings
      if (!s) {
        setForm(emptyForm())
        setLogoFile(null)
        setLogoFooterFile(null)
        setFaviconFile(null)
        setLogoPreview(null)
        setLogoFooterPreview(null)
        setFaviconPreview(null)
        setSelectedCity(null)
        return
      }
      setLogoFile(null)
      setLogoFooterFile(null)
      setFaviconFile(null)
      setLogoPreview(imageUrl(s.logo_url) ?? imageUrl(s.logo))
      setLogoFooterPreview(imageUrl(s.logo_footer_url) ?? imageUrl(s.logo_footer))
      setFaviconPreview(imageUrl(s.favicon_url) ?? imageUrl(s.favicon))
      setSelectedCity(cityFromSettings(s))
      setForm({
        name: String(s.name ?? ""),
        full_name: String(s.full_name ?? ""),
        nif: String(s.nif ?? ""),
        city_id: s.city_id != null ? Number(s.city_id) : "",
        address: String(s.address ?? ""),
        number: String(s.number ?? ""),
        district: String(s.district ?? ""),
        maps: String(s.maps ?? ""),
        contact: String(s.contact ?? ""),
        zip_code: maskCEP(String(s.zip_code ?? "")),
        email: String(s.email ?? ""),
        phone: String(s.phone ?? ""),
        status: String(s.status ?? "1"),
        note: String(s.note ?? ""),
        portal_url: String(s.portal_url ?? "https://"),
        email_notification: String(s.email_notification ?? ""),
        whatsapp_phone: String(s.whatsapp_phone ?? ""),
        terms: String(s.terms ?? ""),
        privacy_policy: String(s.privacy_policy ?? ""),
        footer: String(s.footer ?? ""),
        footer_background_color: String(s.footer_background_color ?? "#1e293b"),
        footer_text_color: String(s.footer_text_color ?? "#ffffff"),
        brand_color: String(s.brand_color ?? "#0284c7"),
        meta_tags: String(s.meta_tags ?? ""),
        pixels: String(s.pixels ?? ""),
        ads: String(s.ads ?? ""),
        cookies: String(s.cookies ?? ""),
      })
    } catch (e: unknown) {
      console.error(e)
      toast.error("Não foi possível carregar as configurações da loja.")
    } finally {
      setLoading(false)
    }
  }, [mayManageSettings])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const allowed =
      (activeTab === "profile" && mayManageSettings) ||
      (activeTab === "product-parameters" && mayManageSettings) ||
      (activeTab === "faq" && mayViewFaq) ||
      (activeTab === "catalog" && mayViewCatalogs) ||
      (activeTab === "tokens" && mayViewTokens)

    if (!allowed) {
      setActiveTab(firstAllowedTab)
    }
  }, [activeTab, firstAllowedTab, mayManageSettings, mayViewCatalogs, mayViewFaq, mayViewTokens])

  const update = (key: keyof ReturnType<typeof emptyForm>, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const missingRequiredFields = (data: SettingsForm) => {
    const required: Array<{ key: keyof SettingsForm; label: string }> = [
      { key: "full_name", label: "Razão social" },
      { key: "name", label: "Nome fantasia" },
      { key: "nif", label: "CPF / CNPJ" },
      { key: "email", label: "E-mail" },
      { key: "phone", label: "Telefone" },
      { key: "whatsapp_phone", label: "WhatsApp" },
      { key: "status", label: "Estado" },
      { key: "zip_code", label: "CEP" },
      { key: "address", label: "Endereço" },
      { key: "number", label: "Número" },
      { key: "city_id", label: "Cidade" },
      { key: "portal_url", label: "URL do portal" },
      { key: "email_notification", label: "E-mail de notificação" },
    ]

    return required
      .filter(({ key }) => String(data[key] ?? "").trim() === "")
      .map(({ label }) => label)
  }

  const handleLogoChange = (type: "logo" | "logo_footer" | "favicon", file?: File | null) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.")
      return
    }
    if (type === "favicon" && !["image/png", "image/jpeg"].includes(file.type)) {
      toast.error("O favicon deve ser uma imagem PNG ou JPEG.")
      return
    }

    const preview = URL.createObjectURL(file)
    if (type === "logo") {
      setLogoFile(file)
      setLogoPreview(preview)
    } else if (type === "logo_footer") {
      setLogoFooterFile(file)
      setLogoFooterPreview(preview)
    } else {
      setFaviconFile(file)
      setFaviconPreview(preview)
    }
  }

  const buildPayload = () => {
    const payload = new FormData()
    Object.entries(form).forEach(([key, value]) => {
      if (key === "city_id") {
        payload.append(key, form.city_id === "" ? "0" : String(Number(form.city_id)))
      } else if (key === "status") {
        payload.append(key, String(Number(form.status)))
      } else {
        payload.append(key, key === "zip_code" ? unmaskCEP(String(value ?? "")) : String(value ?? ""))
      }
    })
    if (logoFile) payload.append("logo", logoFile)
    if (logoFooterFile) payload.append("logo_footer", logoFooterFile)
    if (faviconFile) payload.append("favicon", faviconFile)
    return payload
  }

  const selectedTemplate = productTemplates.find((template) => template.id === currentTemplateId) ?? null

  const applyTemplate = (templateId: string) => {
    const id = Number(templateId)
    const template = productTemplates.find((item) => item.id === id)
    if (!template) return
    setCurrentTemplateId(id)
    setProductFields(template.fields.map((field) => ({ ...field, product_form_template_id: id })))
  }

  const updateProductField = (index: number, patch: Partial<ProductFieldSetting>) => {
    setProductFields((prev) => prev.map((field, i) => (i === index ? { ...field, ...patch } : field)))
  }

  const addDynamicProductField = () => {
    const order = productFields.length ? Math.max(...productFields.map((field) => Number(field.sort_order) || 0)) + 10 : 10
    setProductFields((prev) => [
      ...prev,
      {
        field_key: `atributo_${Date.now()}`,
        label: "Novo atributo",
        type: "text",
        is_fixed: false,
        is_visible: true,
        is_required: false,
        show_on_ecommerce: true,
        show_as_filter: false,
        options: null,
        sort_order: order,
        product_form_template_id: currentTemplateId,
      },
    ])
  }

  const removeDynamicProductField = (index: number) => {
    setProductFields((prev) => prev.filter((field, i) => field.is_fixed || i !== index))
  }

  const saveProductParameters = async () => {
    setSavingProductParameters(true)
    try {
      await apiService.updateAdminStoreProductParameters({
        template_id: currentTemplateId,
        fields: productFields.map((field, index) => ({
          ...field,
          field_key: field.field_key.trim(),
          label: field.label.trim(),
          sort_order: Number(field.sort_order) || (index + 1) * 10,
          options: field.type === "select" || field.type === "multiselect" ? field.options ?? [] : null,
        })),
      })
      toast.success("Parâmetros de produtos guardados.")
      await load()
      setActiveTab("product-parameters")
    } catch (err: unknown) {
      console.error(err)
      toast.error(err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "Erro ao guardar parâmetros.")
    } finally {
      setSavingProductParameters(false)
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const missing = missingRequiredFields(form)
    if (missing.length > 0) {
      toast.error(`Preencha os campos obrigatórios: ${missing.join(", ")}.`)
      return
    }
    setSaving(true)
    try {
      await apiService.updateAdminStoreSettings(buildPayload())
      toast.success("Configurações guardadas.")
      await load()
    } catch (err: unknown) {
      console.error(err)
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Erro ao guardar."
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  if (!mayManageSettings && !mayViewFaq && !mayViewCatalogs && !mayViewTokens) {
    return <AccessDenied />
  }

  if (mayManageSettings && loading) {
    return <PanelFormPageSkeleton />
  }

  return (
    <div className="w-full space-y-6">
      <div className="max-w-5xl">
        <h1 className="text-2xl font-semibold tracking-tight">Configuração da loja</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Primeira fase da migração do Blade <code className="text-xs">settings/edit</code>: campos principais (sem upload de logos no JSON; pode acrescentar depois com multipart).
        </p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-lg border bg-muted/30 p-1">
        {mayManageSettings ? (
        <Button type="button" variant={activeTab === "profile" ? "default" : "ghost"} onClick={() => setActiveTab("profile")}>
          Perfil corporativo e SEO
        </Button>
        ) : null}
        {mayManageSettings ? (
        <Button
          type="button"
          variant={activeTab === "product-parameters" ? "default" : "ghost"}
          onClick={() => setActiveTab("product-parameters")}
        >
          Parâmetros de produtos
        </Button>
        ) : null}
        {mayViewFaq ? (
          <Button type="button" variant={activeTab === "faq" ? "default" : "ghost"} onClick={() => setActiveTab("faq")}>
            FAQ
          </Button>
        ) : null}
        {mayViewCatalogs ? (
          <Button type="button" variant={activeTab === "catalog" ? "default" : "ghost"} onClick={() => setActiveTab("catalog")}>
            Catálogo
          </Button>
        ) : null}
        {mayViewTokens ? (
          <Button type="button" variant={activeTab === "tokens" ? "default" : "ghost"} onClick={() => setActiveTab("tokens")}>
            Tokens de integração
          </Button>
        ) : null}
      </div>

      {activeTab === "profile" ? (
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(420px,0.65fr)]">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Perfil corporativo</CardTitle>
            <CardDescription>Dados da loja no escopo do header <code>app</code>.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            <div className="grid gap-4 md:col-span-2 md:grid-cols-3 2xl:col-span-3">
              <div className="space-y-2">
                <Label>Logo do topo</Label>
                <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                  <div
                    className="flex h-28 items-center justify-center rounded-lg border bg-muted bg-contain bg-center bg-no-repeat text-center text-xs text-muted-foreground"
                    style={logoPreview ? { backgroundImage: `url(${logoPreview})` } : undefined}
                  >
                    {!logoPreview ? "Sem logo" : null}
                  </div>
                  <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground transition hover:bg-muted/50">
                    <span className="font-medium text-foreground">Enviar logo do topo</span>
                    <span className="mt-1">PNG, JPG, WEBP, GIF ou SVG até 5MB.</span>
                    <Input accept="image/*" className="hidden" type="file" onChange={(e) => handleLogoChange("logo", e.target.files?.[0])} />
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Logo do rodapé</Label>
                <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                  <div
                    className="flex h-28 items-center justify-center rounded-lg border bg-muted bg-contain bg-center bg-no-repeat text-center text-xs text-muted-foreground"
                    style={logoFooterPreview ? { backgroundImage: `url(${logoFooterPreview})` } : undefined}
                  >
                    {!logoFooterPreview ? "Sem logo" : null}
                  </div>
                  <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground transition hover:bg-muted/50">
                    <span className="font-medium text-foreground">Enviar logo do rodapé</span>
                    <span className="mt-1">PNG, JPG, WEBP, GIF ou SVG até 5MB.</span>
                    <Input accept="image/*" className="hidden" type="file" onChange={(e) => handleLogoChange("logo_footer", e.target.files?.[0])} />
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Favicon da loja</Label>
                <div className="grid gap-3 sm:grid-cols-[96px_1fr]">
                  <div
                    className="flex h-24 items-center justify-center rounded-lg border bg-muted bg-contain bg-center bg-no-repeat text-center text-xs text-muted-foreground"
                    style={faviconPreview ? { backgroundImage: `url(${faviconPreview})` } : undefined}
                  >
                    {!faviconPreview ? "Sem favicon" : null}
                  </div>
                  <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground transition hover:bg-muted/50">
                    <span className="font-medium text-foreground">Enviar favicon</span>
                    <span className="mt-1">PNG ou JPEG até 1MB. A API converte para .ico.</span>
                    <Input accept="image/png,image/jpeg" className="hidden" type="file" onChange={(e) => handleLogoChange("favicon", e.target.files?.[0])} />
                  </label>
                </div>
              </div>
            </div>
            <div className="space-y-2 md:col-span-2 2xl:col-span-3">
              <Label htmlFor="full_name">Razão social</Label>
              <Input id="full_name" value={form.full_name} onChange={(e) => update("full_name", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nome fantasia</Label>
              <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nif">CPF / CNPJ</Label>
              <Input id="nif" value={form.nif} onChange={(e) => update("nif", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp_phone">WhatsApp</Label>
              <Input id="whatsapp_phone" value={form.whatsapp_phone} onChange={(e) => update("whatsapp_phone", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select value={form.status} onValueChange={(v) => update("status", v)}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Habilitado</SelectItem>
                  <SelectItem value="2">Bloqueado</SelectItem>
                  <SelectItem value="3">Suspenso</SelectItem>
                  <SelectItem value="4">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip_code">CEP</Label>
              <Input id="zip_code" inputMode="numeric" value={form.zip_code} onChange={(e) => update("zip_code", maskCEP(e.target.value))} required />
            </div>
            <div className="space-y-2 md:col-span-2 2xl:col-span-3">
              <Label htmlFor="address">Endereço</Label>
              <Input id="address" value={form.address} onChange={(e) => update("address", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="number">Número</Label>
              <Input id="number" value={form.number} onChange={(e) => update("number", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="district">Bairro</Label>
              <Input id="district" value={form.district} onChange={(e) => update("district", e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2 2xl:col-span-1">
              <CitySearch
                value={selectedCity?.title ?? ""}
                selectedCity={selectedCity}
                onCitySelect={(city) => {
                  setSelectedCity(city.id > 0 ? city : null)
                  update("city_id", city.id > 0 ? String(city.id) : "")
                }}
                onStateChange={() => undefined}
                label="Cidade"
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="portal_url">URL do portal</Label>
              <Input id="portal_url" type="url" value={form.portal_url} onChange={(e) => update("portal_url", e.target.value)} required />
            </div>
            <div className="space-y-2 2xl:col-span-1">
              <Label htmlFor="email_notification">E-mail de notificação</Label>
              <Input
                id="email_notification"
                type="email"
                value={form.email_notification}
                onChange={(e) => update("email_notification", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maps">Google Maps (opcional)</Label>
              <Input id="maps" value={form.maps} onChange={(e) => update("maps", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact">Contato (opcional)</Label>
              <Input id="contact" value={form.contact} onChange={(e) => update("contact", e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2 2xl:col-span-3">
              <Label htmlFor="note">Observação</Label>
              <Input id="note" value={form.note} onChange={(e) => update("note", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle>Textos legais e SEO</CardTitle>
            <CardDescription>Conteúdos exibidos no ecommerce e tags de rastreamento.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="terms">Termos de uso</Label>
              <Textarea id="terms" rows={5} value={form.terms} onChange={(e) => update("terms", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="privacy_policy">Política de privacidade</Label>
              <Textarea id="privacy_policy" rows={5} value={form.privacy_policy} onChange={(e) => update("privacy_policy", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="footer">Rodapé</Label>
              <Textarea id="footer" rows={3} value={form.footer} onChange={(e) => update("footer", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="footer_background_color">Cor do cabeçalho e rodapé</Label>
              <div className="grid gap-3 sm:grid-cols-[56px_1fr]">
                <Input
                  id="footer_background_color_picker"
                  aria-label="Selecionar cor do cabeçalho e rodapé"
                  className="h-10 w-14 cursor-pointer p-1"
                  type="color"
                  value={colorPickerValue(form.footer_background_color, "#1e293b")}
                  onChange={(e) => update("footer_background_color", e.target.value)}
                />
                <Input
                  id="footer_background_color"
                  value={form.footer_background_color}
                  onChange={(e) => update("footer_background_color", e.target.value)}
                  placeholder="#1e293b"
                  maxLength={7}
                />
              </div>
              <p className="text-xs text-muted-foreground">Define a cor de fundo do cabeçalho e do rodapé no ecommerce.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="footer_text_color">Cor da fonte do cabeçalho e rodapé</Label>
              <div className="grid gap-3 sm:grid-cols-[56px_1fr]">
                <Input
                  id="footer_text_color_picker"
                  aria-label="Selecionar cor da fonte do cabeçalho e rodapé"
                  className="h-10 w-14 cursor-pointer p-1"
                  type="color"
                  value={colorPickerValue(form.footer_text_color, "#ffffff")}
                  onChange={(e) => update("footer_text_color", e.target.value)}
                />
                <Input
                  id="footer_text_color"
                  value={form.footer_text_color}
                  onChange={(e) => update("footer_text_color", e.target.value)}
                  placeholder="#ffffff"
                  maxLength={7}
                />
              </div>
              <p className="text-xs text-muted-foreground">Define a cor dos textos e links do cabeçalho e do rodapé no ecommerce.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand_color">Cor principal da loja</Label>
              <div className="grid gap-3 sm:grid-cols-[56px_1fr]">
                <Input
                  id="brand_color_picker"
                  aria-label="Selecionar cor principal da loja"
                  className="h-10 w-14 cursor-pointer p-1"
                  type="color"
                  value={colorPickerValue(form.brand_color, "#0284c7")}
                  onChange={(e) => update("brand_color", e.target.value)}
                />
                <Input
                  id="brand_color"
                  value={form.brand_color}
                  onChange={(e) => update("brand_color", e.target.value)}
                  placeholder="#0284c7"
                  maxLength={7}
                />
              </div>
              <p className="text-xs text-muted-foreground">Controla links, botões, preços e destaques azuis no ecommerce.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="meta_tags">Meta tags</Label>
              <Textarea id="meta_tags" rows={2} value={form.meta_tags} onChange={(e) => update("meta_tags", e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pixels">Pixels / analytics</Label>
                <Input id="pixels" value={form.pixels} onChange={(e) => update("pixels", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ads">Ads</Label>
                <Input id="ads" value={form.ads} onChange={(e) => update("ads", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cookies">Cookies</Label>
              <Textarea id="cookies" rows={2} value={form.cookies} onChange={(e) => update("cookies", e.target.value)} />
            </div>
          </CardContent>
        </Card>
        </div>

        <div className="sticky bottom-[-0.75rem] z-30 -mx-3 -mb-3 flex justify-end gap-2 border-t bg-background/95 px-3 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur supports-[backdrop-filter]:bg-background/75 sm:bottom-[-1.25rem] sm:-mx-5 sm:-mb-5 sm:px-5 md:bottom-[-1.5rem] md:-mx-6 md:-mb-6 md:px-6">
          <Button type="button" variant="outline" onClick={() => void load()} disabled={saving}>
            Recarregar
          </Button>
          <Button type="submit" disabled={saving} className="bg-[#2f3a8f] hover:bg-[#262f73]">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
          </Button>
        </div>
      </form>
      ) : activeTab === "product-parameters" ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Parâmetros de produtos</CardTitle>
              <CardDescription>
                Escolha um modelo de nicho e ajuste quais campos aparecem no cadastro do produto. Campos dinâmicos podem aparecer na ficha técnica do ecommerce.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-[minmax(240px,360px)_1fr]">
                <div className="space-y-2">
                  <Label>Modelo de nicho</Label>
                  <Select value={currentTemplateId ? String(currentTemplateId) : ""} onValueChange={applyTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      {productTemplates.map((template) => (
                        <SelectItem key={template.id} value={String(template.id)}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{selectedTemplate?.name ?? "Modelo personalizado"}</p>
                  <p>{selectedTemplate?.description ?? "Ajustes próprios da loja para o cadastro de produtos."}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">Campos fixos do formulário</h3>
                    <p className="text-xs text-muted-foreground">Controle exibição, rótulo, obrigatoriedade e ordem dos campos que já existem no produto.</p>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">Exibir</th>
                        <th className="px-3 py-2">Obrigatório</th>
                        <th className="px-3 py-2">Rótulo</th>
                        <th className="px-3 py-2">Ordem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productFields.filter((field) => field.is_fixed).map((field) => {
                        const index = productFields.findIndex((item) => item.field_key === field.field_key)
                        return (
                          <tr key={field.field_key} className="border-t">
                            <td className="px-3 py-2">
                              <Input type="checkbox" checked={field.is_visible} onChange={(e) => updateProductField(index, { is_visible: e.target.checked })} />
                            </td>
                            <td className="px-3 py-2">
                              <Input type="checkbox" checked={field.is_required} onChange={(e) => updateProductField(index, { is_required: e.target.checked })} />
                            </td>
                            <td className="px-3 py-2">
                              <Input value={field.label} onChange={(e) => updateProductField(index, { label: e.target.value })} />
                            </td>
                            <td className="px-3 py-2">
                              <Input type="number" value={field.sort_order} onChange={(e) => updateProductField(index, { sort_order: Number(e.target.value) })} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">Atributos dinâmicos</h3>
                    <p className="text-xs text-muted-foreground">Use para informações específicas do nicho, como tamanho, ano, voltagem ou material.</p>
                  </div>
                  <Button type="button" variant="outline" onClick={addDynamicProductField}>
                    Adicionar atributo
                  </Button>
                </div>
                <div className="space-y-3">
                  {productFields.filter((field) => !field.is_fixed).map((field) => {
                    const index = productFields.findIndex((item) => item.field_key === field.field_key)
                    return (
                      <div key={field.field_key} className="rounded-lg border p-4">
                        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_160px_100px]">
                          <div className="space-y-2">
                            <Label>Nome técnico</Label>
                            <Input value={field.field_key} onChange={(e) => updateProductField(index, { field_key: e.target.value })} />
                          </div>
                          <div className="space-y-2">
                            <Label>Rótulo</Label>
                            <Input value={field.label} onChange={(e) => updateProductField(index, { label: e.target.value })} />
                          </div>
                          <div className="space-y-2">
                            <Label>Tipo</Label>
                            <Select value={field.type} onValueChange={(value) => updateProductField(index, { type: value as ProductFieldType })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(fieldTypes.length ? fieldTypes : dynamicFieldTypes.map((item) => item.value))
                                  .filter((type) => type !== "fixed")
                                  .map((type) => (
                                    <SelectItem key={type} value={type}>
                                      {dynamicFieldTypes.find((item) => item.value === type)?.label ?? type}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Ordem</Label>
                            <Input type="number" value={field.sort_order} onChange={(e) => updateProductField(index, { sort_order: Number(e.target.value) })} />
                          </div>
                        </div>
                        {(field.type === "select" || field.type === "multiselect") ? (
                          <div className="mt-3 space-y-2">
                            <Label>Opções</Label>
                            <Input
                              value={normalizedOptionText(field.options)}
                              onChange={(e) => updateProductField(index, { options: optionsFromText(e.target.value) })}
                              placeholder="Separe as opções por vírgula"
                            />
                          </div>
                        ) : null}
                        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                          <label className="flex items-center gap-2">
                            <Input className="h-4 w-4" type="checkbox" checked={field.is_visible} onChange={(e) => updateProductField(index, { is_visible: e.target.checked })} />
                            Exibir
                          </label>
                          <label className="flex items-center gap-2">
                            <Input className="h-4 w-4" type="checkbox" checked={field.is_required} onChange={(e) => updateProductField(index, { is_required: e.target.checked })} />
                            Obrigatório
                          </label>
                          <label className="flex items-center gap-2">
                            <Input className="h-4 w-4" type="checkbox" checked={field.show_on_ecommerce} onChange={(e) => updateProductField(index, { show_on_ecommerce: e.target.checked })} />
                            Aparece no ecommerce
                          </label>
                          <label className="flex items-center gap-2">
                            <Input className="h-4 w-4" type="checkbox" checked={field.show_as_filter} onChange={(e) => updateProductField(index, { show_as_filter: e.target.checked })} />
                            Aparece em filtro
                          </label>
                          <Button type="button" variant="ghost" className="ml-auto text-red-600 hover:text-red-700" onClick={() => removeDynamicProductField(index)}>
                            Remover
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                  {productFields.every((field) => field.is_fixed) ? (
                    <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Nenhum atributo dinâmico configurado para este modelo.</p>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="sticky bottom-[-0.75rem] z-30 -mx-3 -mb-3 flex justify-end gap-2 border-t bg-background/95 px-3 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur supports-[backdrop-filter]:bg-background/75 sm:bottom-[-1.25rem] sm:-mx-5 sm:-mb-5 sm:px-5 md:bottom-[-1.5rem] md:-mx-6 md:-mb-6 md:px-6">
            <Button type="button" variant="outline" onClick={() => void load()} disabled={savingProductParameters}>
              Recarregar
            </Button>
            <Button type="button" onClick={() => void saveProductParameters()} disabled={savingProductParameters} className="bg-[#2f3a8f] hover:bg-[#262f73]">
              {savingProductParameters ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar parâmetros"}
            </Button>
          </div>
        </div>
      ) : activeTab === "faq" ? (
        <StoreFaqTab />
      ) : activeTab === "catalog" ? (
        <StoreCatalogTab />
      ) : (
        <StoreTokensTab />
      )}
    </div>
  )
}
