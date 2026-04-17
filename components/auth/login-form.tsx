"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Eye, EyeOff, Loader2, Mail, Lock } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { isAppTokenConfigured } from "@/lib/public-env"

export function LoginForm() {
  const router = useRouter()
  const { login, isLoading, error, clearError } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /** Contratantes usam só dígitos do CPF (11) ou CNPJ (14) — não exigir mínimo genérico de 6 caracteres. */
  const validatePassword = (password: string) => {
    return password.trim().length >= 1
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    
    // Limpar erro geral quando usuário começar a digitar
    if (error) {
      clearError()
    }
    
    if (value && !validateEmail(value)) {
      setEmailError("Digite um email válido")
    } else {
      setEmailError("")
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPassword(value)
    
    // Limpar erro geral quando usuário começar a digitar
    if (error) {
      clearError()
    }
    
    if (value && !validatePassword(value)) {
      setPasswordError("Digite a senha")
    } else {
      setPasswordError("")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    
    // Validação de campos vazios
    if (!email.trim() || !password.trim()) {
      return
    }
    
    // Validação de formato
    if (!validateEmail(email)) {
      setEmailError("Digite um email válido")
      return
    }
    
    if (!validatePassword(password)) {
      setPasswordError("Digite a senha")
      return
    }

    try {
      await login({ email: email.trim(), password: password.trim() })
      
      // Salvar preferência de "lembrar-me"
      if (rememberMe) {
        localStorage.setItem("rememberEmail", email)
      } else {
        localStorage.removeItem("rememberEmail")
      }

      // Navegação completa (novo documento) evita misturar HTML/RSC de um deploy com chunks
      // `/_next/static/...` de outro — causa típica de 404 em scripts e redirect ao login.
      if (typeof window !== "undefined") {
        window.location.assign("/dashboard")
        return
      }
      router.replace("/dashboard")
    } catch (error) {
      // Erro já é tratado pelo hook useAuth
    }
  }

  // Carregar email salvo ao montar o componente
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberEmail")
    if (savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
    }
  }, [])

  return (
    <Card className="border-0 bg-white/90 shadow-md backdrop-blur-sm">
      <CardHeader className="space-y-0.5 p-4 pb-2">
        <CardTitle className="text-center text-lg font-bold sm:text-xl">
          Bem-vindo de volta
        </CardTitle>
        <CardDescription className="text-center text-xs text-gray-600 sm:text-sm">
          Acesse com seu email e senha
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {process.env.NODE_ENV === "production" && !isAppTokenConfigured() && (
            <Alert variant="destructive" className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-800" />
              <AlertDescription className="text-amber-900 text-sm">
                O frontend em produção não tem <strong>NEXT_PUBLIC_APP_TOKEN</strong> (Vercel → Environment
                Variables). Sem o header <code className="text-xs">app</code>, a API responde <strong>403</strong>.
                Usa o valor de <code className="text-xs">stores.app_token</code> na API e faz{" "}
                <strong>redeploy</strong>.
              </AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={handleEmailChange}
                className={`h-10 border-gray-200 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:h-11 ${
                  emailError ? "border-red-300 focus:border-red-500 focus:ring-red-500" : ""
                }`}
                required
              />
            </div>
            {emailError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {emailError}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">
              Senha
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={handlePasswordChange}
                className={`h-10 border-gray-200 pl-10 pr-10 focus:border-blue-500 focus:ring-blue-500 sm:h-11 ${
                  passwordError ? "border-red-300 focus:border-red-500 focus:ring-red-500" : ""
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transform text-gray-400 transition-colors hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {passwordError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {passwordError}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <Label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">
                Lembrar-me
              </Label>
            </div>
            <button
              type="button"
              className="text-sm font-medium text-[#2f3a8f] transition-colors hover:text-[#262f73]"
            >
              Esqueceu a senha?
            </button>
          </div>

          <Button
            type="submit"
            className="h-10 w-full border-0 font-medium text-white shadow-md transition-all duration-200 hover:shadow-lg sm:h-11 !bg-[#2f3a8f] hover:!bg-[#262f73] active:!bg-[#1e265c]"
            disabled={isLoading || !!emailError || !!passwordError}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </Button>

          <div className="text-center pt-0.5">
            <p className="text-xs text-gray-500 sm:text-sm">
              Não tem conta?{" "}
              <button
                type="button"
                className="font-medium text-[#2f3a8f] transition-colors hover:text-[#262f73]"
              >
                Entre em contato
              </button>
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
