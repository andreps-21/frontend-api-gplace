 "use client"

import type React from "react"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useEffect, useState } from "react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isMobile, setIsMobile] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const apply = () => {
      const matches = window.innerWidth <= 1023
      setIsMobile(matches)
      if (!matches) setMobileSidebarOpen(false)
    }
    apply()
    window.addEventListener("resize", apply)
    return () => window.removeEventListener("resize", apply)
  }, [])

  return (
    <ProtectedRoute>
      <div className="flex h-svh max-h-svh min-h-0 overflow-hidden bg-background">
        <DashboardSidebar
          isMobile={isMobile}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />
        <div className="flex flex-col flex-1 overflow-hidden">
          <DashboardHeader isMobile={isMobile} onOpenMenu={() => setMobileSidebarOpen(true)} />
          <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3 sm:p-5 md:p-6">{children}</main>
        </div>

        {isMobile && mobileSidebarOpen ? (
          <button
            type="button"
            aria-label="Fechar menu lateral"
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-background/50 backdrop-blur-[1px] lg:hidden"
          />
        ) : null}
      </div>
    </ProtectedRoute>
  )
}
