"use client"

import { useCallback, useEffect, useState } from "react"
import { apiService } from "@/lib/api"
import { laravelInnerData, laravelValidationErrorText } from "@/lib/laravel-data"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import CitySearch from "@/components/ui/city-search"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

const emptyForm = () => ({
  name: "",
  formal_name: "",
  email: "",
  phone: "",
  nif: "",
  zip_code: "",
  street: "",
  district: "",
  city_id: "",
})

export default function PerfilContaPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await apiService.getProfile()
      const user = laravelInnerData<Record<string, unknown>>(raw)
      setForm({
        name: String(user.name ?? ""),
        formal_name: String(user.formal_name ?? ""),
        email: String(user.email ?? ""),
        phone: String(user.phone ?? ""),
        nif: String(user.nif ?? ""),
        zip_code: String(user.zip_code ?? ""),
        street: String(user.street ?? ""),
        district: String(user.district ?? ""),
        city_id: user.city_id != null ? String(user.city_id) : "",
      })
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar perfil.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const save = async () => {
    setSaving(true)
    try {
      await apiService.updateProfile({
        ...form,
        city_id: form.city_id ? Number(form.city_id) : undefined,
      } as any)
      toast.success("Perfil atualizado.")
      void load()
    } catch (e) {
      console.error(e)
      toast.error(laravelValidationErrorText(e) ?? "Erro ao atualizar perfil.")
    } finally {
      setSaving(false)
    }
  }

  const update = (key: keyof ReturnType<typeof emptyForm>, value: string) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Perfil</h1>
        <p className="text-muted-foreground mt-1 text-sm">Dados pessoais do utilizador autenticado.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Dados da conta</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">A carregar…</p>
          ) : (
            <>
              <div className="grid gap-1"><Label>Nome</Label><Input value={form.name} onChange={(e) => update("name", e.target.value)} /></div>
              <div className="grid gap-1"><Label>Nome formal</Label><Input value={form.formal_name} onChange={(e) => update("formal_name", e.target.value)} /></div>
              <div className="grid gap-1"><Label>E-mail</Label><Input type="email" value={form.email} disabled /></div>
              <div className="grid gap-1"><Label>Telefone</Label><Input value={form.phone} onChange={(e) => update("phone", e.target.value)} /></div>
              <div className="grid gap-1"><Label>NIF</Label><Input value={form.nif} onChange={(e) => update("nif", e.target.value)} /></div>
              <div className="grid gap-1"><Label>CEP</Label><Input value={form.zip_code} onChange={(e) => update("zip_code", e.target.value)} /></div>
              <div className="grid gap-1"><Label>Rua</Label><Input value={form.street} onChange={(e) => update("street", e.target.value)} /></div>
              <div className="grid gap-1"><Label>Bairro</Label><Input value={form.district} onChange={(e) => update("district", e.target.value)} /></div>
              <div className="grid gap-1">
                <CitySearch
                  value={form.city_id ? `Cidade #${form.city_id}` : ""}
                  onCitySelect={(city) => update("city_id", String(city.id))}
                  onStateChange={() => undefined}
                  label="Cidade"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <Button onClick={() => void save()} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar perfil"}</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
