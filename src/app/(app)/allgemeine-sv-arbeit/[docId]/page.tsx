'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'

export default function DocumentPage() {
  const params = useParams()
  const docId = params.docId as string
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from('documents').select('*').eq('id', docId).single()
      if (error || !data) { setNotFound(true); return }
      setTitle(data.title)
      setContent(data.content)
    }
    load()
  }, [docId])

  const save = useCallback(async () => {
    setSaving(true)
    await supabase.from('documents').update({ title, content, updated_at: new Date().toISOString() }).eq('id', docId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [title, content, docId])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); save() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [save])

  if (notFound) return (
    <div className="p-6 text-center">
      <p className="text-gray-500">Dokument nicht gefunden.</p>
      <Link href="/allgemeine-sv-arbeit" className="text-blue-600 hover:underline text-sm mt-2 inline-block">Zurück</Link>
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/allgemeine-sv-arbeit" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={18} />
        </Link>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="flex-1 text-2xl font-semibold text-gray-900 border-b-2 border-transparent focus:border-blue-500 focus:outline-none bg-transparent pb-1"
        />
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          <Save size={14} />
          {saving ? 'Speichern…' : saved ? 'Gespeichert ✓' : 'Speichern'}
        </button>
      </div>

      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        className="w-full min-h-[70vh] px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        placeholder="Text eingeben…"
        autoFocus
      />
    </div>
  )
}
