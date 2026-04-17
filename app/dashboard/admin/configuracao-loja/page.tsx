"use client"

import { useCallback, useEffect, useState } from "react"
import { apiService } from "@/lib/api"
import { laravelInnerData } from "@/lib/laravel-data"
import { useGplacePermissions } from "@/lib/use-gplace-permissions"
import { AccessDenied } from "@/components/ui/access-denied"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { PanelFormPageSkeleton } from "@/components/dashboard/panel-content-skeleton"
import { toast } from "sonner"

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
  meta_tags: "",
  pixels: "",
  ads: "",
  cookies: "",
})

export default function ConfiguracaoLojaGplacePage() {
  const { can } = useGplacePermissions()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await apiService.getAdminStoreSettings()
      const bundle = laravelInnerData<SettingsBundle>(raw)
      const s = bundle.settings
      if (!s) {
        setForm(emptyForm())
        return
      }
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
        zip_code: String(s.zip_code ?? ""),
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
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const update = (key: keyof ReturnType<typeof emptyForm>, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        ...form,
        city_id: form.city_id === "" ? 0 : Number(form.city_id),
        status: Number(form.status),
      }
      await apiService.updateAdminStoreSettings(payload)
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

  if (!can("settings_edit")) {
    return <AccessDenied />
  }

  if (loading) {
    return <PanelFormPageSkeleton />
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuração da loja</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Primeira fase da migração do Blade <code className="text-xs">settings/edit</code>: campos principais (sem upload de logos no JSON; pode acrescentar depois com multipart).
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Perfil corporativo</CardTitle>
            <CardDescription>Dados da loja no escopo do header <code>app</code>.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
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
              <Input id="zip_code" value={form.zip_code} onChange={(e) => update("zip_code", e.target.value)} required />
            </div>
            <div className="space-y-2 sm:col-span-2">
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
            <div className="space-y-2">
              <Label htmlFor="city_id">ID da cidade</Label>
              <Input
                id="city_id"
                type="number"
                value={form.city_id === "" ? "" : form.city_id}
                onChange={(e) => update("city_id", e.target.value)}
                required
              />
              <p className="text-muted-foreground text-xs">Use o ID da tabela de cidades (próximo passo: pesquisa como no Blade).</p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="portal_url">URL do portal</Label>
              <Input id="portal_url" type="url" value={form.portal_url} onChange={(e) => update("portal_url", e.target.value)} required />
            </div>
            <div className="space-y-2 sm:col-span-2">
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
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="note">Observação</Label>
              <Input id="note" value={form.note} onChange={(e) => update("note", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Textos legais e SEO</CardTitle>
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

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => void load()} disabled={saving}>
            Recarregar
          </Button>
          <Button type="submit" disabled={saving} className="bg-[#2f3a8f] hover:bg-[#262f73]">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
          </Button>
        </div>
      </form>
    </div>
  )
}
