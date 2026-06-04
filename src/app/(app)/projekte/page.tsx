'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { Plus, FolderOpen, Trash2, Users } from 'lucide-react'
import type { Project } from '@/types'

const TEMPLATES = [
  { value: 'overnight', label: 'Übernachtungs-Event (z.B. Lesenacht, AVN)' },
  { value: 'daytrip', label: 'Tagesausflug (z.B. Heideparkfahrt)' },
  { value: 'meeting', label: 'Versammlung / Treffen' },
]

export default function ProjektePage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [showNew, setShowNew] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [hasParticipants, setHasParticipants] = useState(false)
  const [template, setTemplate] = useState<string>('overnight')
  const supabase = createClient()
  const router = useRouter()

  async function loadProjects() {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
    setProjects(data ?? [])
  }

  useEffect(() => { loadProjects() }, [])

  async function createProject() {
    if (!name.trim()) return
    const { data } = await supabase
      .from('projects')
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        has_participant_list: hasParticipants,
        participant_template: hasParticipants ? template : null,
      })
      .select()
      .single()
    if (data) {
      router.push(`/projekte/${data.id}`)
    }
  }

  async function deleteProject(id: string) {
    if (!confirm('Projekt und alle Inhalte wirklich löschen?')) return
    await supabase.from('projects').delete().eq('id', id)
    loadProjects()
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Projekte</h1>
        <button
          onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={16} /> Neues Projekt
        </button>
      </div>

      {showNew && (
        <div className="mb-6 p-5 bg-white border border-gray-200 rounded-xl space-y-4">
          <h2 className="font-semibold text-gray-900">Neues Projekt</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="z.B. Lesenacht 2025"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung (optional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Kurze Beschreibung des Projekts…"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={hasParticipants}
                onChange={e => setHasParticipants(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Teilnehmer*innenliste benötigt
            </label>
          </div>
          {hasParticipants && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vorlage</label>
              <select
                value={template}
                onChange={e => setTemplate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TEMPLATES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={createProject}
              disabled={!name.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Erstellen
            </button>
            <button
              onClick={() => setShowNew(false)}
              className="px-3 py-2 text-gray-600 hover:text-gray-900 text-sm"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {!showNew && projects.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <FolderOpen size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Noch keine Projekte</p>
          <p className="text-sm text-gray-400 mt-1">Erstelle ein neues Projekt um zu beginnen.</p>
        </div>
      ) : !showNew ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {projects.map(project => (
            <div
              key={project.id}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-200 transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FolderOpen size={20} className="text-blue-600" />
                </div>
                <button
                  onClick={() => deleteProject(project.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <Link href={`/projekte/${project.id}`}>
                <h3 className="font-semibold text-gray-900 hover:text-blue-600 mb-1">{project.name}</h3>
                {project.description && (
                  <p className="text-sm text-gray-500 line-clamp-2 mb-2">{project.description}</p>
                )}
              </Link>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-xs text-gray-400">
                  {format(new Date(project.created_at), 'd. MMM yyyy', { locale: de })}
                </span>
                {project.has_participant_list && (
                  <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    <Users size={11} /> Teilnehmerliste
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
