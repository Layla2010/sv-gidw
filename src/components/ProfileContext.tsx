'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

interface ProfileContextValue {
  profile: Profile | null
  refreshProfile: () => Promise<void>
}

const ProfileContext = createContext<ProfileContextValue>({
  profile: null,
  refreshProfile: async () => {},
})

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const supabase = createClient()

  const refreshProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(data)
  }, [])

  useEffect(() => { refreshProfile() }, [])

  return (
    <ProfileContext.Provider value={{ profile, refreshProfile }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  return useContext(ProfileContext)
}
