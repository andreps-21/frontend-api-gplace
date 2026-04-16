import { LoginForm } from "@/components/auth/login-form"
import { Building2, Shield, Zap, Users, BarChart3 } from "lucide-react"
import Image from "next/image"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-50 p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            {/* Logo TIM */}
            <div className="mb-6 flex justify-center">
              <img
                src="/images/logo-tim.png"
                alt="TIM"
                width={120}
                height={60}
                className="mx-auto block"
                style={{ maxWidth: '120px', height: 'auto' }}
              />
            </div>
            
            
            <p className="text-gray-600 text-lg">Gestão Comercial e Operacional</p>
            
          </div>
          <LoginForm />
          
          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Desenvolvido por <a href="https://gooding.solutions/" target="_blank" rel="noopener noreferrer" className="font-medium text-gray-700 hover:text-gray-900 transition-colors">Gooding Solutions</a>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - TIM Blue Man Group Image */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/images/tim-blue-man-group.jpg"
            alt="TIM - Você, sem fronteiras"
            fill
            className="object-cover"
            priority
          />
          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-black/30"></div>
        </div>
        
        {/* Content overlay */}
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <div className="mb-12">
          </div>

          <div className="space-y-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Relatórios Avançados</h3>
                <p className="text-blue-100">Análise completa de vendas, performance e metas por loja, rede e vendedor.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Gestão de Vendas</h3>
                <p className="text-blue-100">Cadastro de vendas, pré-vendas e importação de metas BOV da TIM.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Controle Operacional</h3>
                <p className="text-blue-100">Gerenciamento de pessoas, PDVs, estoque e controle financeiro completo.</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
