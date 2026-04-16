"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bell, LogOut, Server, Cloud, Wifi, WifiOff, KeyRound, Check, Trash2, ExternalLink, Cake } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { useCallback, useEffect, useState } from "react"
import { PasswordChangeModal } from "@/components/auth/password-change-modal"
import { usePermissions } from "@/lib/use-permissions"
import { apiService, type HeaderNotificationItem } from "@/lib/api"
import { isUiPreview } from "@/lib/ui-preview"

export function DashboardHeader() {
  const router = useRouter()
  const { user, logout, isLoading: authLoading } = useAuth()
  const { userRole } = usePermissions()
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [apiStatus, setApiStatus] = useState<{
    type: 'local' | 'cloud' | 'unknown'
    url: string
    isOnline: boolean
  }>({
    type: 'unknown',
    url: '',
    isOnline: false
  })

  const [headerNotifications, setHeaderNotifications] = useState<HeaderNotificationItem[]>([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)

  const loadHeaderNotifications = useCallback(async () => {
    if (!apiService.getToken()) {
      setHeaderNotifications([])
      return
    }
    try {
      setNotificationsLoading(true)
      const inbox = await apiService.getNotificationsInbox()
      setHeaderNotifications(Array.isArray(inbox.items) ? inbox.items : [])
    } catch {
      setHeaderNotifications([])
    } finally {
      setNotificationsLoading(false)
    }
  }, [])

  const handleDismissOne = async (key: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await apiService.dismissNotification(key)
      await loadHeaderNotifications()
    } catch {
      /* silencioso */
    }
  }

  const handleDismissAll = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await apiService.dismissAllNotifications()
      await loadHeaderNotifications()
    } catch {
      /* silencioso */
    }
  }

  // Detectar qual API está sendo usada
  useEffect(() => {
    const detectApi = () => {
      const isDevelopment = process.env.NODE_ENV === 'development'
      const isLocalhost = typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1' ||
         window.location.hostname.includes('192.168.'))
      
      if (isDevelopment || isLocalhost) {
        setApiStatus({
          type: 'local',
          url: 'http://127.0.0.1:8000',
          isOnline: true // Assumimos que está online se detectou localhost
        })
      } else {
        setApiStatus({
          type: 'cloud',
          url: 'https://api.alpharstelecom.com.br',
          isOnline: true
        })
      }
    }

    detectApi()
  }, [])

  useEffect(() => {
    if (authLoading) return
    void loadHeaderNotifications()
  }, [authLoading, loadHeaderNotifications])

  useEffect(() => {
    const t = window.setInterval(() => {
      if (!authLoading) void loadHeaderNotifications()
    }, 5 * 60 * 1000)
    return () => window.clearInterval(t)
  }, [authLoading, loadHeaderNotifications])

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  const getUserInitials = () => {
    if (!user?.name) return 'U'
    const words = user.name.split(' ')
    if (words.length >= 2) {
      return (words[0][0] + words[words.length - 1][0]).toUpperCase()
    }
    return user.name.substring(0, 2).toUpperCase()
  }

  const getRoleLabel = () => {
    if (!userRole) return ''
    const roleLabels: Record<string, string> = {
      'gestor': 'Gestor',
      'gerente': 'Gerente',
      'vendedor': 'Vendedor',
      'master': 'Master',
      'administrador': 'Administrador'
    }
    return roleLabels[userRole] || userRole.charAt(0).toUpperCase() + userRole.slice(1)
  }

  const getRoleColor = () => {
    if (!userRole) return 'bg-gray-500'
    const roleColors: Record<string, string> = {
      'gestor': 'bg-purple-500',
      'gerente': 'bg-blue-500',
      'vendedor': 'bg-green-500',
      'master': 'bg-red-500',
      'administrador': 'bg-orange-500'
    }
    return roleColors[userRole] || 'bg-gray-500'
  }

  return (
    <header className="h-16 bg-background px-6 flex items-center justify-between">
      {/* Indicador de API */}
      <div className="flex items-center gap-2 text-sm flex-wrap">
        {isUiPreview() && (
          <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-900 rounded-md text-xs font-medium">
            Pré-visualização UI (sem sessão)
          </div>
        )}
        {apiStatus.type === 'local' ? (
          <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-md">
            <Server className="w-4 h-4" />
            <span>API Local</span>
            <Wifi className="w-3 h-3" />
          </div>
        ) : apiStatus.type === 'cloud' ? (
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md">
            <Cloud className="w-4 h-4" />
            <span>API Nuvem</span>
            <Wifi className="w-3 h-3" />
          </div>
        ) : (
          <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-md">
            <WifiOff className="w-4 h-4" />
            <span>API Desconhecida</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <DropdownMenu onOpenChange={(open) => open && loadHeaderNotifications()}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
              <Bell className="w-5 h-5" />
              {headerNotifications.length > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 min-w-[1.125rem] h-[1.125rem] px-1 flex items-center justify-center rounded-full bg-blue-600 text-[10px] font-semibold text-white">
                  {headerNotifications.length > 9 ? "9+" : headerNotifications.length}
                </span>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0" onCloseAutoFocus={(e) => e.preventDefault()}>
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-b">
              <span className="text-sm font-semibold">Notificações</span>
              {headerNotifications.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={handleDismissAll}
                  title="Limpar todas — marca cada notificação como lida e esvazia a lista."
                  aria-label="Limpar todas as notificações"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              ) : null}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {notificationsLoading && headerNotifications.length === 0 ? (
                <p className="text-sm text-muted-foreground px-3 py-6 text-center">A carregar…</p>
              ) : headerNotifications.length === 0 ? (
                <p className="text-sm text-muted-foreground px-3 py-6 text-center">Sem notificações novas.</p>
              ) : (
                <ul className="divide-y">
                  {headerNotifications.map((n) => {
                    const isBirthdayNotice = n.type === "birthday_self" || n.type === "birthday_peer"
                    return (
                    <li key={n.key} className="px-3 py-2.5 hover:bg-muted/50">
                      <div className="flex gap-2 justify-between items-start">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-tight">{n.title}</p>
                          {isBirthdayNotice && n.celebrant_name ? (
                            <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                              <span className="inline-flex shrink-0" title="Aniversário" aria-label="Aniversário">
                                <Cake className="w-4 h-4 text-pink-500" aria-hidden />
                              </span>
                              <span className="font-semibold text-foreground">{n.celebrant_name}</span>
                              <span>{n.message}</span>
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                          )}
                          {n.action_url ? (
                            <Link
                              href={n.action_url}
                              className="inline-flex items-center gap-1 text-xs text-primary mt-1.5 font-medium"
                            >
                              Abrir
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          ) : null}
                        </div>
                        {(n.dismissible ?? true) ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                            title="Marcar como lida — esta notificação deixa de aparecer até haver novo aviso."
                            aria-label="Marcar esta notificação como lida"
                            onClick={(e) => handleDismissOne(n.key, e)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        ) : null}
                      </div>
                    </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback>{getUserInitials()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">{user?.name || 'Usuário'}</span>
                {userRole && (
                  <span className="text-xs text-muted-foreground">{getRoleLabel()}</span>
                )}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>Minha Conta</span>
                {userRole && (
                  <span className="text-xs text-muted-foreground font-normal mt-1">
                    Perfil: {getRoleLabel()}
                  </span>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowPasswordChange(true)}>
              <KeyRound className="w-4 h-4 mr-2" />
              Alterar Senha
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Modal de Alteração de Senha */}
      <PasswordChangeModal
        isOpen={showPasswordChange}
        onClose={() => setShowPasswordChange(false)}
      />
    </header>
  )
}
