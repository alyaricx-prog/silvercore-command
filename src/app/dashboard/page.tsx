'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { Profile, Assignment } from '@/lib/types'

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: prof, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profError) { setError(profError.message) }
      if (prof) setProfile(prof)

      setLoading(false)
    }
    load()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (loading) return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </main>
  )

  if (error) return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-red-400">Error: {error}</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg">SilverCore</h1>
          <p className="text-xs text-gray-400 capitalize">{profile?.role || 'No role'} · {profile?.group_name || 'No group'}</p>
        </div>
        <button onClick={handleSignOut} className="text-xs text-gray-400 hover:text-white transition">
          Sign out
        </button>
      </header>
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <p className="text-gray-400 text-sm">Welcome, {profile?.full_name || 'User'}</p>
      </div>
    </main>
  )
}
