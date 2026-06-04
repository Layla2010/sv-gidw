'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { Search, FileText, File, FolderOpen } from 'lucide-react'

interface SearchResult {
  type: 'document' | 'protocol' | 'project' | 'project_file'
  id: string
  title: string
  subtitle: string
  href: string
}

export default function SuchePage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function search() {
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setSearched(true)

    const [docsRes, protocolsRes, projectsRes, filesRes] = await Promise.all([
      supabase.from('documents').select('id, title, updated_at').ilike('title', `%${q}%`).limit(10),
      supabase.from('protocols').select('id, title, meeting_date').ilike('title', `%${q}%`).limit(10),
      supabase.from('projects').select('id, name, description').ilike('name', `%${q}%`).limit(10),
      supabase.from('project_files').select('id, file_name, project_id, created_at').ilike('file_name', `%${q}%`).limit(10),
    ])

    const combined: SearchResult[] = [
      ...(docsRes.data ?? []).map(d => ({
        type: 'document' as const,
        id: d.id,
        title: d.title,
        subtitle: `Dokument · ${format(new Date(d.updated_at), 'd. MMM yyyy', { locale: de })}`,
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

    setResults(combined)
    setLoading(false)
  }

  const iconForType = (type: SearchResult['type']) => {
    if (type === 'document') return <FileText size={18} className="text-blue-500" />
    if (type === 'protocol') return <File size={18} className="text-gray-400" />
    if (type === 'project') return <FolderOpen size={18} className="text-blue-600" />
    return <File size={18} className="text-gray-400" />
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Suche</h1>

      <div className="flex gap-2 mb-6">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="Nach Dokumenten, Protokollen, Projekten oder Dateien suchen…"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>
        <button
          onClick={search}
          disabled={!query.trim() || loading}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Suchen…' : 'Suchen'}
        </button>
      </div>

      {searched && (
        <>
          {results.length === 0 ? (
            <div className="text-center py-12">
              <Search size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500">Keine Ergebnisse für &quot;{query}&quot;</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-500 mb-3">{results.length} Ergebnis{results.length !== 1 ? 'se' : ''}</p>
              {results.map(result => (
                <Link
                  key={`${result.type}-${result.id}`}
                  href={result.href}
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
          )}
        </>
      )}
    </div>
  )
}
