'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import ConfirmDialog from '@/components/ConfirmDialog'

interface ChronikEntry {
  id: string
  datum: string
  aktion: string
  sv_lehrer: string | null
  beschreibung: string | null
  created_at: string
}

function formatDatum(datum: string) {
  if (/^\d{4}$/.test(datum)) return datum
  const parts = datum.split('-')
  if (parts.length === 2) return `${parts[1]}.${parts[0]}`
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`
  return datum
}

function getJahr(datum: string) {
  return datum.split('-')[0]
}

const EMPTY = { datum: '', aktion: '', sv_lehrer: '', beschreibung: '' }

export default function ChronikPage() {
  const [entries, setEntries] = useState<ChronikEntry[]>([])
  const [profile, setProfile] = useState<{ role: string } | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [newEntry, setNewEntry] = useState(EMPTY)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editEntry, setEditEntry] = useState(EMPTY)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setProfile(prof)
    }
    const { data } = await supabase.from('chronik').select('*').order('datum', { ascending: false })
    setEntries(data ?? [])
  }

  function normalizeDatum(d: string): string {
    // TT.MM.JJJJ → JJJJ-MM-TT
    const match = d.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
    if (match) return `${match[3]}-${match[2].padStart(2,'0')}-${match[1].padStart(2,'0')}`
    return d.trim()
  }

  async function addEntry() {
    if (!newEntry.datum.trim() || !newEntry.aktion.trim()) return
    await supabase.from('chronik').insert({
      datum: normalizeDatum(newEntry.datum),
      aktion: newEntry.aktion.trim(),
      sv_lehrer: newEntry.sv_lehrer.trim() || null,
      beschreibung: newEntry.beschreibung.trim() || null,
    })
    setNewEntry(EMPTY)
    setShowForm(false)
    loadData()
  }

  async function saveEdit() {
    if (!editingId || !editEntry.aktion.trim()) return
    await supabase.from('chronik').update({
      datum: normalizeDatum(editEntry.datum),
      aktion: editEntry.aktion.trim(),
      sv_lehrer: editEntry.sv_lehrer.trim() || null,
      beschreibung: editEntry.beschreibung.trim() || null,
    }).eq('id', editingId)
    setEditingId(null)
    loadData()
  }

  async function deleteEntry(id: string) {
    await supabase.from('chronik').delete().eq('id', id)
    setConfirmDeleteId(null)
    loadData()
  }

  const isAdmin = profile?.role === 'admin'

  // Nach Jahr gruppieren
  const grouped = entries.reduce<Record<string, ChronikEntry[]>>((acc, entry) => {
    const jahr = getJahr(entry.datum)
    if (!acc[jahr]) acc[jahr] = []
    acc[jahr].push(entry)
    return acc
  }, {})

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {confirmDeleteId && (
        <ConfirmDialog
          message="Dieser Chronik-Eintrag wird unwiderruflich gelöscht."
          onConfirm={() => deleteEntry(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">SV-Chronik</h1>
          <p className="text-sm text-gray-500 mt-0.5">Geschichte der Schülervertretung</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setShowForm(!showForm); setNewEntry(EMPTY) }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
          >
            <Plus size={16} /> Neuer Eintrag
          </button>
        )}
      </div>

      {/* Neuer Eintrag Formular */}
      {showForm && (
        <div className="mb-8 p-5 bg-white border border-blue-200 rounded-xl space-y-3">
          <h2 className="font-medium text-gray-900">Neuer Eintrag</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Datum *</label>
              <input
                type="text"
                value={newEntry.datum}
                onChange={e => setNewEntry({ ...newEntry, datum: e.target.value })}
                placeholder="10.06.2025 oder 2025"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">SV-Lehrer*in</label>
              <input
                type="text"
                value={newEntry.sv_lehrer}
                onChange={e => setNewEntry({ ...newEntry, sv_lehrer: e.target.value })}
                placeholder="Name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ereignis *</label>
            <input
              type="text"
              value={newEntry.aktion}
              onChange={e => setNewEntry({ ...newEntry, aktion: e.target.value })}
              placeholder="Was ist passiert?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Beschreibung</label>
            <textarea
              value={newEntry.beschreibung}
              onChange={e => setNewEntry({ ...newEntry, beschreibung: e.target.value })}
              placeholder="Weitere Details…"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
              Abbrechen
            </button>
            <button onClick={addEntry} disabled={!newEntry.datum || !newEntry.aktion}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              Speichern
            </button>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-8">
        {Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([jahr, jahresEntries]) => (
          <div key={jahr}>
            {/* Jahres-Überschrift */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-lg font-bold text-gray-900">{jahr}</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div className="space-y-2 ml-2">
              {jahresEntries.map(entry => (
                <div key={entry.id} className="relative pl-5 before:absolute before:left-0 before:top-2 before:w-2 before:h-2 before:rounded-full before:bg-blue-400">
                  {editingId === entry.id ? (
                    <div className="bg-white border border-blue-200 rounded-xl p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <input type="text" value={editEntry.datum}
                          onChange={e => setEditEntry({ ...editEntry, datum: e.target.value })}
                          placeholder="10.06.2025"
                          className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <input type="text" value={editEntry.sv_lehrer}
                          onChange={e => setEditEntry({ ...editEntry, sv_lehrer: e.target.value })}
                          className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="SV-Lehrer*in" />
                      </div>
                      <input type="text" value={editEntry.aktion}
                        onChange={e => setEditEntry({ ...editEntry, aktion: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ereignis" />
                      <textarea value={editEntry.beschreibung}
                        onChange={e => setEditEntry({ ...editEntry, beschreibung: e.target.value })}
                        rows={2}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder="Beschreibung" />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:text-gray-600"><X size={15} /></button>
                        <button onClick={saveEdit} className="p-1.5 text-green-600 hover:text-green-700"><Check size={15} /></button>
                      </div>
                    </div>
                  ) : (
                    <div className="group flex items-start gap-2 py-1">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-xs text-gray-400 flex-shrink-0">{formatDatum(entry.datum)}</span>
                          <span className="text-sm font-medium text-gray-900">{entry.aktion}</span>
                          {entry.sv_lehrer && (
                            <span className="text-xs text-gray-500">· {entry.sv_lehrer}</span>
                          )}
                        </div>
                        {entry.beschreibung && (
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{entry.beschreibung}</p>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button onClick={() => {
                            setEditingId(entry.id)
                            setEditEntry({ datum: formatDatum(entry.datum), aktion: entry.aktion, sv_lehrer: entry.sv_lehrer ?? '', beschreibung: entry.beschreibung ?? '' })
                          }} className="p-1 text-gray-300 hover:text-blue-500">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => setConfirmDeleteId(entry.id)} className="p-1 text-gray-300 hover:text-red-500">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
