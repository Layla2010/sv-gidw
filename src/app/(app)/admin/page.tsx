'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { UserPlus, Shield, User, Trash2, Mail } from 'lucide-react'
import type { Profile } from '@/types'
import ConfirmDialog from '@/components/ConfirmDialog'

export default function AdminPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'mitglied'>('mitglied')
  const [inviteTempPassword, setInviteTempPassword] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const supabase = createClient()

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [currentRes, allRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('profiles').select('*').order('created_at'),
    ])
    setCurrentUser(currentRes.data)
    setProfiles(allRes.data ?? [])
  }

  useEffect(() => { loadData() }, [])

  async function inviteUser() {
    if (!inviteEmail.trim()) { setInviteError('Anmeldename ist erforderlich.'); return }
    if (inviteTempPassword.length < 5) { setInviteError('Temporäres Passwort muss mindestens 5 Zeichen haben.'); return }
    setLoading(true)
    setInviteError('')
    setInviteSuccess('')

    const username = inviteEmail.trim().toLowerCase().replace(/\s+/g, '.')
    const email = username.includes('@') ? username : `${username}@gidw-online.de`

    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token ?? ''}`,
      },
      body: JSON.stringify({ email, full_name: inviteName.trim(), role: inviteRole, temp_password: inviteTempPassword }),
    })
    const json = await res.json()
    if (!res.ok || json.error) {
      setInviteError(`Account konnte nicht erstellt werden: ${json.error ?? 'Unbekannter Fehler'}`)
      setLoading(false)
      return
    }

    setInviteSuccess(`Account für „${inviteName.trim() || inviteEmail.trim()}" erstellt. Login: ${inviteEmail.trim().toLowerCase().replace(/\s+/g, '.')}@gidw-online.de`)
    setInviteEmail('')
    setInviteName('')
    setInviteRole('mitglied')
    setInviteTempPassword('')
    setLoading(false)
    loadData()
  }

  async function updateRole(id: string, role: 'admin' | 'mitglied') {
    if (id === currentUser?.id) { alert('Du kannst deine eigene Rolle nicht ändern.'); return }
    await supabase.from('profiles').update({ role }).eq('id', id)
    loadData()
  }

  async function deleteUser(id: string) {
    await supabase.from('profiles').delete().eq('id', id)
    setConfirmDeleteId(null)
    loadData()
  }

  if (currentUser?.role !== 'admin') {
    return (
      <div className="p-4 md:p-6 text-center">
        <p className="text-gray-500">Du hast keine Berechtigung für diesen Bereich.</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {confirmDeleteId && (() => {
        const user = profiles.find(p => p.id === confirmDeleteId)
        return user ? (
          <ConfirmDialog
            message={`Der Account von "${user.full_name || user.email}" wird unwiderruflich gelöscht.`}
            onConfirm={() => deleteUser(confirmDeleteId)}
            onCancel={() => setConfirmDeleteId(null)}
          />
        ) : null
      })()}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Admin — Nutzerverwaltung</h1>
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <UserPlus size={16} /> Mitglied hinzufügen
        </button>
      </div>

      {showInvite && (
        <div className="mb-6 p-5 bg-white border border-gray-200 rounded-xl space-y-4">
          <h2 className="font-semibold text-gray-900">Neues Mitglied hinzufügen</h2>
          <p className="text-sm text-gray-500">Der Account wird direkt erstellt. Teile E-Mail und temporäres Passwort mit der Person — sie kann es danach im Profil ändern.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Anmeldename *</label>
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                <input
                  type="text"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="layla.nachname"
                  className="flex-1 px-3 py-2 text-sm focus:outline-none"
                  autoFocus
                />
                {!inviteEmail.includes('@') && (
                  <span className="px-2 text-sm text-gray-400 bg-gray-50 border-l border-gray-300 py-2">@gidw-online.de</span>
                )}
              </div>
              {!inviteEmail.includes('@') && inviteEmail && (
                <p className="text-xs text-gray-400 mt-1">→ {inviteEmail.toLowerCase().replace(/\s+/g, '.')}@gidw-online.de</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Benutzername</label>
              <input
                type="text"
                value={inviteName}
                onChange={e => setInviteName(e.target.value)}
                placeholder="Vor- und Nachname"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temporäres Passwort *</label>
              <input
                type="text"
                value={inviteTempPassword}
                onChange={e => setInviteTempPassword(e.target.value)}
                placeholder="Mindestens 5 Zeichen"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rolle</label>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as 'admin' | 'mitglied')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="mitglied">Mitglied</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          {inviteError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{inviteError}</p>}
          {inviteSuccess && <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">{inviteSuccess}</p>}
          <div className="flex gap-2">
            <button
              onClick={inviteUser}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              <UserPlus size={14} /> {loading ? 'Erstellen…' : 'Account erstellen'}
            </button>
            <button onClick={() => setShowInvite(false)} className="px-3 py-2 text-gray-600 text-sm">Abbrechen</button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">E-Mail</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Dabei seit</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Rolle</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {profiles.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                      {p.full_name?.charAt(0) || p.email.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900">{p.full_name || '—'}</span>
                    {p.id === currentUser?.id && (
                      <span className="text-xs text-gray-400">(du)</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{p.email}</td>
                <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                  {format(new Date(p.created_at), 'd. MMM yyyy', { locale: de })}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={p.role}
                    onChange={e => updateRole(p.id, e.target.value as 'admin' | 'mitglied')}
                    disabled={p.id === currentUser?.id}
                    className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border border-gray-200 bg-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="mitglied">Mitglied</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  {p.id !== currentUser?.id && (
                    <button
                      onClick={() => p.id !== currentUser?.id && setConfirmDeleteId(p.id)}
                      className="p-1 text-gray-300 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  )
}
