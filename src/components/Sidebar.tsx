'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  BookOpen,
  BookMarked,
  Search,
  Settings,
  LogOut,
  ChevronRight,
  X,
  Users,
} from 'lucide-react'

interface SidebarProps {
  userRole: string
  userName: string
  isOpen: boolean
  onClose: () => void
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/allgemeine-sv-arbeit', label: 'Allgemeine SV-Arbeit', icon: FileText },
  { href: '/projekte', label: 'Projekte', icon: FolderOpen },
  { href: '/satzung', label: 'SV-Satzung', icon: BookOpen },
  { href: '/chronik', label: 'SV-Chronik', icon: BookMarked },
  { href: '/kapazitaeten', label: 'Kapazitäten', icon: Users },
  { href: '/suche', label: 'Suche', icon: Search },
]

export default function Sidebar({ userRole, userName, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-30
          flex flex-col transition-transform duration-200
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">SV</span>
            </div>
            <span className="font-semibold text-gray-900">SV-App</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${isActive(href)
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
              `}
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {isActive(href) && <ChevronRight size={14} />}
            </Link>
          ))}

          {userRole === 'admin' && (
            <Link
              href="/admin"
              onClick={onClose}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${isActive('/admin')
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
              `}
            >
              <Settings size={18} />
              <span className="flex-1">Admin</span>
              {isActive('/admin') && <ChevronRight size={14} />}
            </Link>
          )}
        </nav>

        {/* User footer */}
        <div className="border-t border-gray-200 px-3 py-3">
          <Link
            href="/profil"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2 mb-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
              {userName.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{userName || 'Unbekannt'}</p>
              <p className="text-xs text-gray-500 capitalize">{userRole}</p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <LogOut size={18} />
            Abmelden
          </button>
        </div>
      </aside>
    </>
  )
}
