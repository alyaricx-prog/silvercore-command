'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { Profile, Assignment } from '@/lib/types'

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!prof) { router.push('/auth/login'); return }
      setProfile(prof)

      const query = supabase
        .from('assignments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (prof.role === 'employee') {
        query.eq('assigned_to', user.id)
      }

      const { data: assigns } = await query
      setAssignments(assigns || [])
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

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg">SilverCore</h1>
          <p className="text-xs text-gray-400 capitalize">{profile?.role} · {profile?.group_name || 'No group'}</p>
        </div>
        <button onClick={handleSignOut} className="text-xs text-gray-400 hover:text-white transition">
          Sign out
        </button>
      </header>

      <div className="px-4 py-6 max-w-2xl mx-auto">
        <h2 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">
          {profile?.role === 'employee' ? 'My Assignments' : 'All Assignments'}
        </h2>

        {assignments.length === 0 ? (
          <div className="bg-gray-900 rounded-xl p-8 text-center">
            <p className="text-gray-500 text-sm">No assignments yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map(a => (
              <div key={a.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-sm">{a.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                    a.priority === 'urgent' ? 'bg-red-900 text-red-300' :
                    a.priority === 'high' ? 'bg-orange-900 text-orange-300' :
                    a.priority === 'normal' ? 'bg-blue-900 text-blue-300' :
                    'bg-gray-800 text-gray-400'
                  }`}>{a.priority}</span>
                </div>
                {a.description && <p className="text-xs text-gray-400 mt-1">{a.description}</p>}
                <div className="flex items-center gap-3 mt-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    a.status === 'completed' ? 'bg-green-900 text-green-300' :
                    a.status === 'in_progress' ? 'bg-yellow-900 text-yellow-300' :
                    a.status === 'pending' ? 'bg-gray-800 text-gray-400' :
                    'bg-gray-800 text-gray-400'
                  }`}>{a.status.replace('_', ' ')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
