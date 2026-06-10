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
  const [email, setEmail] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      // Token explizit aus dem URL-Hash lesen und Session setzen
      // Das überschreibt eine bestehende Session zuverlässig
      const hash = window.location.hash.substring(1)
      const params = new URLSearchParams(hash)
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (accessToken && refreshToken) {
        const { data: { session }, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (session) {
          setEmail(session.user.email ?? '')
          setReady(true)
        } else {
          setError('Ungültiger oder abgelaufener Einladungslink.' + (error ? ` (${error.message})` : ''))
        }
      } else {
        // Kein Token in der URL — normaler Login-Flow
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setReady(true)
        } else {
          setError('Kein Einladungslink gefunden. Bitte nutze den Link aus der E-Mail.')
        }
      }
    }
    init()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 5) {
      setError('Passwort muss mindestens 5 Zeichen lang sein.')
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
            {email && (
              <p className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg mt-2">
                Account: <strong>{email}</strong>
              </p>
            )}
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
                  minLength={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Mindestens 5 Zeichen"
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
