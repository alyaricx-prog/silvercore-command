'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import PageSkeleton from '@/components/Skeleton'
import type { Profile, CustomFieldDef } from '@/lib/types'

const ENTITIES = ['assignment', 'customer', 'deal_log'] as const
const FIELD_TYPES = ['text', 'number', 'select', 'boolean', 'date'] as const

export default function CustomFieldsPage() {
  const [profile, setProfile]   = useState<Profile | null>(null)
  const [fields, setFields]     = useState<CustomFieldDef[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [msg, setMsg]           = useState('')
  const [saving, setSaving]     = useState(false)

  const [form, setForm] = useState({
    entity: 'assignment' as typeof ENTITIES[number],
    field_key: '',
    label: '',
    field_type: 'text' as typeof FIELD_TYPES[number],
    options: '',
    required: false,
  })

  const router  = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof || (prof.role !== 'host' && prof.role !== 'cohost')) {
        router.push('/dashboard'); return
      }
      setProfile(prof)
      const { data: f } = await supabase.from('custom_field_defs').select('*')
        .eq('organisation_id', prof.organisation_id).order('entity').order('label')
      setFields(f || [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true); setMsg('')
    const key = form.field_key.trim().toLowerCase().replace(/\s+/g, '_')
    const { data, error } = await supabase.from('custom_field_defs').insert({
      organisation_id: profile.organisation_id,
      entity: form.entity,
      field_key: key,
      label: form.label.trim(),
      field_type: form.field_type,
      options: form.field_type === 'select'
        ? form.options.split(',').map(s => s.trim()).filter(Boolean)
        : null,
      required: form.required,
    }).select().single()
    if (error) { setMsg('Error: ' + error.message) }
    else {
      setFields(prev => [...prev, data])
      setForm({ entity: 'assignment', field_key: '', label: '', field_type: 'text', options: '', required: false })
      setShowForm(false)
      setMsg('Custom field added.')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('custom_field_defs').delete().eq('id', id)
    setFields(prev => prev.filter(f => f.id !== id))
  }

  if (loading) return <PageSkeleton variant="list" />

  const grouped = ENTITIES.reduce((acc, e) => {
    acc[e] = fields.filter(f => f.entity === e)
    return acc
  }, {} as Record<string, CustomFieldDef[]>)

  return (
    <main className="sc-enter min-h-screen bg-page text-hi pb-28">
      <header className="px-5 pt-12 pb-4 border-b border-rim flex items-center gap-3">
        <button onClick={() => router.back()} className="text-dim hover:text-hi transition text-lg">←</button>
        <div>
          <p className="text-xs text-dim uppercase tracking-widest mb-0.5">Settings</p>
          <h1 className="text-xl font-bold">Custom Fields</h1>
        </div>
      </header>

      <div className="px-5 py-4 space-y-4">
        <p className="text-sm text-lo">Add extra fields to Assignments, Customers, or Deal Logs. Fields appear on the relevant forms for your whole team.</p>

        <button onClick={() => setShowForm(v => !v)}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition text-sm">
          {showForm ? 'Cancel' : '+ Add Custom Field'}
        </button>

        {msg && <div className={`px-4 py-3 rounded-xl text-sm ${msg.startsWith('Error') ? 'bg-red-900/40 text-red-300' : 'bg-green-900/40 text-green-300'}`}>{msg}</div>}

        {showForm && (
          <form onSubmit={handleSave} className="bg-card border border-rim rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-lo mb-1 block">Applies To</label>
                <select value={form.entity} onChange={e => setForm(f => ({ ...f, entity: e.target.value as any }))}
                  className="w-full bg-well border border-rim rounded-xl px-3 py-3 text-sm text-hi focus:outline-none focus:border-blue-500">
                  <option value="assignment">Assignment</option>
                  <option value="customer">Customer</option>
                  <option value="deal_log">Deal Log</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-lo mb-1 block">Field Type</label>
                <select value={form.field_type} onChange={e => setForm(f => ({ ...f, field_type: e.target.value as any }))}
                  className="w-full bg-well border border-rim rounded-xl px-3 py-3 text-sm text-hi focus:outline-none focus:border-blue-500">
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="select">Select (dropdown)</option>
                  <option value="boolean">Yes / No</option>
                  <option value="date">Date</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-lo mb-1 block">Label *</label>
              <input required value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder="e.g. Contract Value"
                className="w-full bg-well border border-rim rounded-xl px-4 py-3 text-sm text-hi placeholder-dim focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-xs text-lo mb-1 block">Field Key (auto-generated from label)</label>
              <input value={form.field_key} onChange={e => setForm(f => ({ ...f, field_key: e.target.value }))}
                placeholder="e.g. contract_value"
                className="w-full bg-well border border-rim rounded-xl px-4 py-3 text-sm text-hi placeholder-dim focus:outline-none focus:border-blue-500" />
            </div>
            {form.field_type === 'select' && (
              <div>
                <label className="text-xs text-lo mb-1 block">Options (comma-separated)</label>
                <input value={form.options} onChange={e => setForm(f => ({ ...f, options: e.target.value }))}
                  placeholder="Option A, Option B, Option C"
                  className="w-full bg-well border border-rim rounded-xl px-4 py-3 text-sm text-hi placeholder-dim focus:outline-none focus:border-blue-500" />
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.required} onChange={e => setForm(f => ({ ...f, required: e.target.checked }))}
                className="rounded" />
              <span className="text-sm text-lo">Required field</span>
            </label>
            <button type="submit" disabled={saving || !form.label.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-well disabled:text-dim text-white font-semibold py-3 rounded-xl transition">
              {saving ? 'Saving…' : 'Add Field'}
            </button>
          </form>
        )}

        {ENTITIES.map(entity => grouped[entity].length > 0 && (
          <div key={entity}>
            <h2 className="text-xs text-dim uppercase tracking-widest mb-2 capitalize">{entity.replace('_', ' ')} Fields</h2>
            <div className="space-y-2">
              {grouped[entity].map(f => (
                <div key={f.id} className="bg-card border border-rim rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-hi">{f.label}</p>
                    <p className="text-xs text-dim capitalize">{f.field_type}{f.required ? ' · required' : ''}</p>
                  </div>
                  <button onClick={() => handleDelete(f.id)}
                    className="text-xs text-red-400 hover:text-red-300 transition px-2 py-1">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {fields.length === 0 && !showForm && (
          <p className="text-dim text-sm text-center py-8">No custom fields defined yet.</p>
        )}
      </div>
      <Nav role={profile!.role} />
    </main>
  )
}
