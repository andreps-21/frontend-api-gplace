import { LoginForm } from "@/components/auth/login-form"
import { Zap, Users, BarChart3 } from "lucide-react"
import Image from "next/image"

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-[#ffffff] lg:h-dvh lg:max-h-dvh lg:flex-row lg:overflow-hidden">
      {/* Left Side - Login Form (alinhado ao Blade: resources/views/auth/login.blade.php) */}
      <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-5 sm:px-6 sm:py-6 lg:overflow-hidden lg:py-5">
        <div className="flex w-full max-w-md shrink-0 flex-col gap-4">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-[#2f3a8f] sm:text-4xl">
              Gplace
            </h1>
            <p className="mt-1 text-sm text-gray-600 sm:text-base">
              Gestão comercial e ecommerce
            </p>
          </div>

          <LoginForm />

          <div className="space-y-3 text-center">
            <p className="text-xs text-gray-500 sm:text-sm">
              Desenvolvido por{" "}
              <a
                href="https://gooding.solutions/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Gooding Solutions
              </a>
            </p>

            <div className="grid grid-cols-3 gap-1 text-[9px] leading-tight text-[#2f3a8f] sm:gap-2 sm:text-[10px]">
              <div className="flex min-w-0 flex-col items-center gap-0.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#2f3a8f]/12 sm:h-7 sm:w-7">
                  <BarChart3 className="h-3 w-3 text-[#2f3a8f] sm:h-3.5 sm:w-3.5" />
                </div>
                <span className="line-clamp-2 font-medium tracking-wide">
                  Relatórios avançados
                </span>
              </div>
              <div className="flex min-w-0 flex-col items-center gap-0.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#2f3a8f]/12 sm:h-7 sm:w-7">
                  <Zap className="h-3 w-3 text-[#2f3a8f] sm:h-3.5 sm:w-3.5" />
                </div>
                <span className="line-clamp-2 font-medium tracking-wide">
                  Gestão de vendas
                </span>
              </div>
              <div className="flex min-w-0 flex-col items-center gap-0.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#2f3a8f]/12 sm:h-7 sm:w-7">
                  <Users className="h-3 w-3 text-[#2f3a8f] sm:h-3.5 sm:w-3.5" />
                </div>
                <span className="line-clamp-2 font-medium tracking-wide">
                  Controle operacional
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side — mesma imagem de fundo do login Blade (public/images/backgound.png) */}
      <div className="hidden min-h-0 lg:flex lg:flex-1 relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/images/backgound.png"
            alt="Fundo"
            fill
            sizes="(min-width: 1024px) 50vw, 0vw"
            className="object-cover object-center"
            priority
          />
        </div>
      </div>
    </div>
  )
}
