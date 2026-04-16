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

  const validatePassword = (password: string) => {
    return password.length >= 6
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
      setPasswordError("A senha deve ter pelo menos 6 caracteres")
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
      setPasswordError("A senha deve ter pelo menos 6 caracteres")
      return
    }

    try {
      await login({ email, password })
      
      // Salvar preferência de "lembrar-me"
      if (rememberMe) {
        localStorage.setItem("rememberEmail", email)
      } else {
        localStorage.removeItem("rememberEmail")
      }
      
      router.push("/dashboard")
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
    <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="space-y-1 pb-6">
        <CardTitle className="text-2xl font-bold text-center">Bem-vindo de volta</CardTitle>
        <CardDescription className="text-center text-gray-600">
          Entre com suas credenciais para acessar o sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={handleEmailChange}
                className={`pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 ${
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

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">
              Senha
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={handlePasswordChange}
                className={`pl-10 pr-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 ${
                  passwordError ? "border-red-300 focus:border-red-500 focus:ring-red-500" : ""
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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
              className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Esqueceu a senha?
            </button>
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
            style={{ 
              background: 'linear-gradient(to right, #0026d9, #001a99)',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.background = 'linear-gradient(to right, #001a99, #001166)'
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = 'linear-gradient(to right, #0026d9, #001a99)'
            }} 
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

          <div className="text-center">
            <p className="text-sm text-gray-500">
              Não tem uma conta?{" "}
              <button
                type="button"
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
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
