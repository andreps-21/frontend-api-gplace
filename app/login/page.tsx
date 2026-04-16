import { LoginForm } from "@/components/auth/login-form"
import { Zap, Users, BarChart3 } from "lucide-react"
import Image from "next/image"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Login Form (alinhado ao Blade: resources/views/auth/login.blade.php) */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-50 p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="mb-3 text-4xl font-bold tracking-tight text-[#2f3a8f] sm:text-5xl">
              Gplace
            </h1>
            <p className="text-gray-600 text-lg">Gestão Comercial e Ecommerce</p>
            
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

      {/* Right Side — mesma imagem de fundo do login Blade (public/images/backgound.png) */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/images/backgound.png"
            alt="Fundo"
            fill
            sizes="(min-width: 1024px) 50vw, 0vw"
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-black/25" aria-hidden />
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
                <p className="text-blue-100">Cadastro de vendas, pré-vendas e importação de metas e relatórios.</p>
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
