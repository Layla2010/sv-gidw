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
  { href: '/dashboard',           label: 'Dashboard',           icon: LayoutDashboard, color: 'text-blue-400',   bg: 'bg-blue-500/20' },
  { href: '/allgemeine-sv-arbeit',label: 'Allgemeine SV-Arbeit',icon: FileText,         color: 'text-violet-400', bg: 'bg-violet-500/20' },
  { href: '/projekte',            label: 'Projekte',            icon: FolderOpen,       color: 'text-amber-400',  bg: 'bg-amber-500/20' },
  { href: '/satzung',             label: 'SV-Satzung',          icon: BookOpen,         color: 'text-emerald-400',bg: 'bg-emerald-500/20' },
  { href: '/chronik',             label: 'SV-Chronik',          icon: BookMarked,       color: 'text-rose-400',   bg: 'bg-rose-500/20' },
  { href: '/kapazitaeten',        label: 'Kapazitäten',         icon: Users,            color: 'text-cyan-400',   bg: 'bg-cyan-500/20' },
  { href: '/suche',               label: 'Suche',               icon: Search,           color: 'text-gray-400',   bg: 'bg-gray-500/20' },
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
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-slate-900 z-30
        flex flex-col transition-transform duration-200
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/sv-logo.png" alt="SV Logo" className="h-16 w-auto object-contain" />
          </div>
          <button onClick={onClose} className="lg:hidden p-1 text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon, color, bg }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${active
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'}
                `}
              >
                <span className={`p-1.5 rounded-lg ${active ? bg : 'bg-transparent'}`}>
                  <Icon size={16} className={active ? color : ''} />
                </span>
                <span className="flex-1">{label}</span>
                {active && <span className={`w-1.5 h-1.5 rounded-full ${color.replace('text-', 'bg-')}`} />}
              </Link>
            )
          })}

          {userRole === 'admin' && (
            <Link
              href="/admin"
              onClick={onClose}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${isActive('/admin')
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'}
              `}
            >
              <span className={`p-1.5 rounded-lg ${isActive('/admin') ? 'bg-orange-500/20' : 'bg-transparent'}`}>
                <Settings size={16} className={isActive('/admin') ? 'text-orange-400' : ''} />
              </span>
              <span className="flex-1">Admin</span>
              {isActive('/admin') && <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />}
            </Link>
          )}
        </nav>

        {/* User footer */}
        <div className="border-t border-slate-700/50 px-3 py-3">
          <Link
            href="/profil"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2 mb-1 rounded-xl hover:bg-white/5 transition-colors group"
          >
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {userName.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{userName || 'Unbekannt'}</p>
              <p className="text-xs text-slate-400 capitalize">{userRole}</p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <LogOut size={16} />
            Abmelden
          </button>
        </div>
      </aside>
    </>
  )
}
