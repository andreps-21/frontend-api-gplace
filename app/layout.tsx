import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth'
import { UpdateProvider } from '@/components/providers/update-provider'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TIM - Gestão Comercial',
  description: 'Sistema de Gestão Comercial e Operacional para Lojas TIM',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <AuthProvider>
          <UpdateProvider>
            {children}
            <Toaster 
              position="top-right"
              expand={true}
              richColors={true}
              closeButton={true}
              duration={4000}
            />
          </UpdateProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
