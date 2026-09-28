'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { Search, FileText, File, FolderOpen, Clock, X } from 'lucide-react'
import Fuse from 'fuse.js'

interface SearchResult {
  type: 'document' | 'protocol' | 'project' | 'project_file'
  id: string
  title: string
  subtitle: string
  href: string
}

const RECENT_KEY = 'sv-recent-searches'
const MAX_RECENT = 8

function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') } catch { return [] }
}

function saveRecent(query: string) {
  const prev = getRecent().filter(q => q !== query)
  localStorage.setItem(RECENT_KEY, JSON.stringify([query, ...prev].slice(0, MAX_RECENT)))
}

function removeRecent(query: string) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(getRecent().filter(q => q !== query)))
}

export default function SuchePage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const fuseRef = useRef<Fuse<SearchResult> | null>(null)
  const supabase = createClient()

  useEffect(() => {
    setRecentSearches(getRecent())

    async function loadAll() {
      const [docsRes, protocolsRes, projectsRes, filesRes] = await Promise.all([
        supabase.from('documents').select('id, title, updated_at').not('title', 'eq', '__satzung__'),
        supabase.from('protocols').select('id, title, meeting_date'),
        supabase.from('projects').select('id, name, description'),
        supabase.from('project_files').select('id, file_name, project_id, created_at'),
      ])

      const items: SearchResult[] = [
        ...(docsRes.data ?? []).map(d => ({
          type: 'document' as const,
          id: d.id,
          title: d.title,
          subtitle: `Textfeld · ${format(new Date(d.updated_at), 'd. MMM yyyy', { locale: de })}`,
          href: `/allgemeine-sv-arbeit/${d.id}`,
        })),
        ...(protocolsRes.data ?? []).map(p => ({
          type: 'protocol' as const,
          id: p.id,
          title: p.title,
          subtitle: `Protokoll · ${format(new Date(p.meeting_date), 'd. MMMM yyyy', { locale: de })}`,
          href: '/allgemeine-sv-arbeit',
        })),
        ...(projectsRes.data ?? []).map(p => ({
          type: 'project' as const,
          id: p.id,
          title: p.name,
          subtitle: p.description || 'Projekt',
          href: `/projekte/${p.id}`,
        })),
        ...(filesRes.data ?? []).map(f => ({
          type: 'project_file' as const,
          id: f.id,
          title: f.file_name,
          subtitle: `Projektdatei · ${format(new Date(f.created_at), 'd. MMM yyyy', { locale: de })}`,
          href: `/projekte/${f.project_id}`,
        })),
      ]

      fuseRef.current = new Fuse(items, {
        keys: ['title'],
        threshold: 0.4,
        distance: 100,
        minMatchCharLength: 2,
      })
      setLoading(false)
    }
    loadAll()
  }, [])

  useEffect(() => {
    const q = query.trim()
    if (!q) { setResults([]); return }
    if (!fuseRef.current) return
    setResults(fuseRef.current.search(q).map(r => r.item))
  }, [query])

  function handleResultClick(q: string) {
    saveRecent(q)
    setRecentSearches(getRecent())
  }

  function deleteRecent(q: string, e: React.MouseEvent) {
    e.stopPropagation()
    removeRecent(q)
    setRecentSearches(getRecent())
  }

  const iconForType = (type: SearchResult['type']) => {
    if (type === 'document') return <FileText size={18} className="text-blue-500" />
    if (type === 'protocol') return <File size={18} className="text-gray-400" />
    if (type === 'project') return <FolderOpen size={18} className="text-blue-600" />
    return <File size={18} className="text-gray-400" />
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Suche</h1>

      <div className="relative mb-6">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Nach Dokumenten, Protokollen, Projekten oder Dateien suchen…"
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
          disabled={loading}
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">Laden…</span>
        )}
      </div>

      {!query.trim() && recentSearches.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-medium text-gray-500 mb-2">Letzte Suchen</p>
          <div className="space-y-1">
            {recentSearches.map(q => (
              <div key={q} className="flex items-center gap-2 group">
                <button
                  onClick={() => setQuery(q)}
                  className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg hover:bg-gray-100 text-left"
                >
                  <Clock size={14} className="text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{q}</span>
                </button>
                <button
                  onClick={(e) => deleteRecent(q, e)}
                  className="p-1 text-gray-300 hover:text-gray-500"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {query.trim() && (
        results.length === 0 ? (
          <div className="text-center py-12">
            <Search size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500">Keine Ergebnisse für „{query}"</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-500 mb-3">{results.length} Ergebnis{results.length !== 1 ? 'se' : ''}</p>
            {results.map(result => (
              <Link
                key={`${result.type}-${result.id}`}
                href={result.href}
                onClick={() => handleResultClick(query.trim())}
                className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-200 hover:bg-blue-50 transition-colors"
              >
                {iconForType(result.type)}
                <div>
                  <p className="text-sm font-medium text-gray-900">{result.title}</p>
                  <p className="text-xs text-gray-500">{result.subtitle}</p>
                </div>
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  )
}
