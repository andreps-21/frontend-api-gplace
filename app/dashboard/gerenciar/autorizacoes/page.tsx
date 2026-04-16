"use client"

import React from 'react'
import { useUserRole } from '@/lib/use-user-role'
import { AccessDenied } from '@/components/ui/access-denied'
import { RoleManagement } from '@/components/authorization/role-management'

export default function AutorizacoesPage() {
  const { canAccessAuthorizations } = useUserRole()
  
  if (!canAccessAuthorizations) {
    return <AccessDenied />
  }

  return (
    <div className="container mx-auto py-6">
      <RoleManagement />
    </div>
  )
}