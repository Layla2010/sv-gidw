'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Save, Eye, Edit2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

export default function DocumentPage() {
  const params = useParams()
  const router = useRouter()
  const docId = params.docId as string
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', docId)
        .single()
      if (error || !data) { setNotFound(true); return }
      setTitle(data.title)
      setContent(data.content)
    }
    load()
  }, [docId])

  const save = useCallback(async () => {
    setSaving(true)
    await supabase
      .from('documents')
      .update({ title, content, updated_at: new Date().toISOString() })
      .eq('id', docId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [title, content, docId])

  useEffect(() => {
    if (!editing) return
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        save()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [editing, save])

  if (notFound) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Dokument nicht gefunden.</p>
        <Link href="/allgemeine-sv-arbeit" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
          Zurück zur Übersicht
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/allgemeine-sv-arbeit"
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          {editing ? (
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="text-2xl font-semibold text-gray-900 w-full border-b-2 border-blue-500 focus:outline-none bg-transparent pb-1"
            />
          ) : (
            <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          )}
        </div>
        <div className="flex items-center gap-2">
          {editing && (
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? 'Speichern…' : saved ? 'Gespeichert ✓' : 'Speichern'}
            </button>
          )}
          <button
            onClick={() => { if (editing) save(); setEditing(!editing) }}
            className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            {editing ? <><Eye size={14} /> Vorschau</> : <><Edit2 size={14} /> Bearbeiten</>}
          </button>
        </div>
      </div>

      {editing ? (
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          className="w-full min-h-[60vh] px-4 py-3 border border-gray-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          placeholder="Markdown-Text eingeben…"
        />
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-6 min-h-[60vh] prose prose-sm max-w-none">
          {content ? (
            <ReactMarkdown>{content}</ReactMarkdown>
          ) : (
            <p className="text-gray-400 italic">Dieses Dokument ist noch leer. Klicke auf &quot;Bearbeiten&quot; um zu starten.</p>
          )}
        </div>
      )}

      {editing && (
        <p className="text-xs text-gray-400 mt-2">
          Markdown wird unterstützt · ⌘S / Strg+S zum Speichern
        </p>
      )}
    </div>
  )
}
