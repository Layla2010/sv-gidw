'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/components/ProfileContext'

export default function ProfilPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const supabase = createClient()
  const router = useRouter()
  const { refreshProfile } = useProfile()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setEmail(user.email ?? '')
      const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      setFullName(data?.full_name ?? '')
    }
    load()
  }, [])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setProfileError('')
    setProfileSuccess(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email ?? '',
      full_name: fullName.trim(),
    })
    setSaving(false)
    if (error) { setProfileError('Fehler: ' + error.message); return }
    await refreshProfile()
    setProfileSuccess(true)
    setTimeout(() => setProfileSuccess(false), 3000)
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess(false)
    if (newPassword.length < 8) { setPasswordError('Passwort muss mindestens 8 Zeichen lang sein.'); return }
    if (newPassword !== confirmPassword) { setPasswordError('Passwörter stimmen nicht überein.'); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSaving(false)
    if (error) { setPasswordError('Fehler: ' + error.message); return }
    setNewPassword('')
    setConfirmPassword('')
    setPasswordSuccess(true)
    setTimeout(() => setPasswordSuccess(false), 3000)
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Mein Profil</h1>

      {/* Name */}
      <form onSubmit={saveProfile} className="bg-white border border-gray-200 rounded-xl p-5 mb-4 space-y-4">
        <h2 className="font-semibold text-gray-800">Angaben</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Vor- und Nachname"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
          />
        </div>
        {profileError && <p className="text-sm text-red-600">{profileError}</p>}
        {profileSuccess && <p className="text-sm text-green-600">Name gespeichert ✓</p>}
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Speichern…' : 'Speichern'}
        </button>
      </form>

      {/* Passwort ändern */}
      <form onSubmit={savePassword} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Passwort ändern</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Neues Passwort</label>
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Mindestens 8 Zeichen"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Passwort bestätigen</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="••••••••"
          />
        </div>
        {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
        {passwordSuccess && <p className="text-sm text-green-600">Passwort geändert ✓</p>}
        <button
          type="submit"
          disabled={saving || !newPassword}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          Passwort ändern
        </button>
      </form>
    </div>
  )
}
