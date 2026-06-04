'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Supabase puts the invite token in the URL hash.
    // The client library picks it up automatically on load and creates a session.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true)
      } else {
        setError('Ungültiger oder abgelaufener Einladungslink.')
      }
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen lang sein.')
      return
    }
    if (password !== confirm) {
      setError('Passwörter stimmen nicht überein.')
      return
    }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError('Fehler: ' + error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-4">
              <span className="text-white font-bold text-lg">SV</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Passwort festlegen</h1>
            <p className="text-sm text-gray-500 mt-1">Willkommen in der SV-App!</p>
          </div>

          {!ready && !error && (
            <p className="text-sm text-gray-500 text-center">Einladung wird geprüft…</p>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg text-center">{error}</p>
          )}

          {ready && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Neues Passwort
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Mindestens 8 Zeichen"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Passwort bestätigen
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Speichern…' : 'Passwort speichern & einloggen'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
