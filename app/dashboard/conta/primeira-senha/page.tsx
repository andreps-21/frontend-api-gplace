"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { apiService } from "@/lib/api"
import { laravelValidationErrorText } from "@/lib/laravel-data"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function PrimeiraSenhaPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setSaving(true)
    try {
      await apiService.changeFirstPassword({
        password,
        password_confirmation: confirmation,
      })
      toast.success("Senha alterada.")
      router.replace("/dashboard")
      window.location.reload()
    } catch (e) {
      console.error(e)
      toast.error(laravelValidationErrorText(e) ?? "Erro ao alterar senha.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-xl items-center">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Definir primeira senha</CardTitle>
          <CardDescription>Por segurança, altere a senha inicial antes de continuar no painel.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-1">
            <Label>Nova senha</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="grid gap-1">
            <Label>Confirmar senha</Label>
            <Input type="password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
          </div>
          <Button className="w-full" onClick={() => void submit()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar nova senha"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
