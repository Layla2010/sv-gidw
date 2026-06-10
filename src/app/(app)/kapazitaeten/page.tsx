'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

const STATI = [
  { value: 'verfuegbar', label: 'Verfügbar', color: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-500' },
  { value: 'eingeschraenkt', label: 'Eingeschränkt', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500' },
  { value: 'ausgelastet', label: 'Ausgelastet', color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' },
]

function StatusBadge({ value }: { value: string }) {
  const s = STATI.find(s => s.value === value) ?? STATI[0]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

export default function KapazitaetenPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [currentRes, allRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('profiles').select('*').order('full_name'),
    ])
    setCurrentUser(currentRes.data)
    setProfiles(allRes.data ?? [])
    setLoading(false)
  }

  async function setStatus(id: string, kapazitaet: string) {
    await supabase.from('profiles').update({ kapazitaet }).eq('id', id)
    setProfiles(profiles.map(p => p.id === id ? { ...p, kapazitaet } : p))
    if (currentUser?.id === id) setCurrentUser({ ...currentUser, kapazitaet })
  }

  const canEdit = (profileId: string) =>
    currentUser?.role === 'admin' || currentUser?.id === profileId

  if (loading) return <div className="p-4 md:p-6 text-gray-500">Laden…</div>

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Kapazitäten</h1>
      <p className="text-sm text-gray-500 mb-6">Wer hat gerade Zeit für neue Aufgaben?</p>

      <div className="space-y-3">
        {profiles.map(profile => (
          <div key={profile.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
            {/* Avatar */}
            <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-700 flex-shrink-0">
              {(profile.full_name || profile.email).charAt(0).toUpperCase()}
            </div>

            {/* Name + Rolle */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile.full_name || profile.email}
                {profile.id === currentUser?.id && (
                  <span className="ml-2 text-xs text-gray-400">(du)</span>
                )}
              </p>
              <p className="text-xs text-gray-500 capitalize">{profile.role}</p>
            </div>

            {/* Status */}
            {canEdit(profile.id) ? (
              <div className="flex gap-2 flex-wrap justify-end">
                {STATI.map(s => (
                  <button
                    key={s.value}
                    onClick={() => setStatus(profile.id, s.value)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all
                      ${(profile.kapazitaet ?? 'verfuegbar') === s.value
                        ? `${s.color} ring-2 ring-offset-1 ring-current`
                        : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-600'
                      }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${(profile.kapazitaet ?? 'verfuegbar') === s.value ? s.dot : 'bg-gray-300'}`} />
                    {s.label}
                  </button>
                ))}
              </div>
            ) : (
              <StatusBadge value={profile.kapazitaet ?? 'verfuegbar'} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
