'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { ProfileProvider, useProfile } from '@/components/ProfileContext'
import { Menu } from 'lucide-react'

function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { profile } = useProfile()

  return (
    <div className="flex h-full bg-gray-50">
      <Sidebar
        userRole={profile?.role ?? 'mitglied'}
        userName={profile?.full_name || profile?.email || ''}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="lg:hidden flex items-center gap-3 px-4 h-16 bg-white border-b border-gray-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center">
            <img src="/sv-logo.png" alt="SV Logo" className="h-8 object-contain" />
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProvider>
      <AppShell>{children}</AppShell>
    </ProfileProvider>
  )
}
